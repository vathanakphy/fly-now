package com.flynow.api.auth.token;

import com.flynow.api.auth.AuthProperties;
import com.flynow.api.user.UserAccount;
import com.flynow.api.shared.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecureTokenService {

    private final AuthTokenRepository repository;
    private final AuthProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public IssuedToken issueActionToken(UserAccount user, AuthTokenType type) {
        return issue(user, type, randomToken(32), Duration.ofMinutes(properties.getActionTokenMinutes()));
    }

    @Transactional
    public UserAccount consume(String serializedToken, AuthTokenType expectedType) {
        TokenParts parts = parse(serializedToken);
        AuthToken token = repository.findByIdAndTypeForUpdate(parts.id(), expectedType)
                .orElseThrow(() -> new BadRequestException("The token is invalid or expired"));
        Instant now = Instant.now();
        if (!token.isUsable(now) || !constantTimeEquals(token.getTokenHash(), hash(parts.secret()))) {
            throw new BadRequestException("The token is invalid or expired");
        }
        token.consume(now);
        return token.getUser();
    }

    private IssuedToken issue(UserAccount user, AuthTokenType type, String secret, Duration lifetime) {
        Instant now = Instant.now();
        repository.invalidateActive(user.getId(), type, now);
        UUID id = UUID.randomUUID();
        repository.save(AuthToken.builder()
                .id(id)
                .user(user)
                .type(type)
                .tokenHash(hash(secret))
                .createdAt(now)
                .expiresAt(now.plus(lifetime))
                .build());
        return new IssuedToken(id, secret, now.plus(lifetime));
    }

    public String randomToken(int bytes) {
        byte[] value = new byte[bytes];
        secureRandom.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    public String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.US_ASCII),
                actual.getBytes(StandardCharsets.US_ASCII)
        );
    }

    private TokenParts parse(String value) {
        if (value == null) {
            throw new BadRequestException("The token is invalid or expired");
        }
        int separator = value.indexOf('.');
        try {
            if (separator < 1 || separator == value.length() - 1) {
                throw new IllegalArgumentException();
            }
            return new TokenParts(UUID.fromString(value.substring(0, separator)), value.substring(separator + 1));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("The token is invalid or expired");
        }
    }

    public record IssuedToken(UUID id, String secret, Instant expiresAt) {

        public String serialized() {
            return id + "." + secret;
        }
    }

    private record TokenParts(UUID id, String secret) {
    }
}
