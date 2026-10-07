package com.flynow.api.auth.service;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.repository.AuthSessionRepository;
import com.flynow.api.auth.security.JwtTokenProvider;
import com.flynow.api.auth.service.model.SessionDetails;
import com.flynow.api.auth.session.ClientContext;
import com.flynow.api.auth.session.IssuedSession;
import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.AuthSession;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.shared.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshSessionService {

    private final AuthSessionRepository repository;
    private final SecureTokenService tokenService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthProperties properties;

    @Transactional
    public IssuedSession issue(UserAccount user, ClientContext context) {
        return create(user, UUID.randomUUID(), context);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public IssuedSession rotate(String rawRefreshToken, ClientContext context) {
        String tokenHash = tokenService.hash(requireToken(rawRefreshToken));
        AuthSession current = repository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new BadRequestException("Refresh token is invalid"));
        Instant now = Instant.now();

        if (current.getRevokedAt() != null) {
            repository.revokeFamily(current.getFamilyId(), "REUSE_DETECTED", now);
            throw new BadRequestException("Refresh token reuse was detected");
        }
        if (!current.isActive(now)) {
            throw new BadRequestException("Refresh token is expired");
        }

        current.getUser().unlockIfExpired(now);
        if (current.getUser().getStatus() != AccountStatus.ACTIVE) {
            current.revoke("ACCOUNT_INACTIVE", now);
            throw new BadRequestException("The account is not active");
        }

        IssuedSession replacement = create(current.getUser(), current.getFamilyId(), context);
        current.rotate(replacement.sessionId(), now);
        return replacement;
    }

    @Transactional
    public void revokeToken(String rawRefreshToken, String reason) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        repository.findByTokenHashForUpdate(tokenService.hash(rawRefreshToken))
                .ifPresent(session -> session.revoke(reason, Instant.now()));
    }

    @Transactional
    public void revokeAll(Long userId, String reason) {
        repository.revokeAllByUserId(userId, reason, Instant.now());
    }

    @Transactional(readOnly = true)
    public List<SessionDetails> list(Long userId) {
        Instant now = Instant.now();
        return repository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(session -> new SessionDetails(
                        session.getId(),
                        session.getCreatedAt(),
                        session.getExpiresAt(),
                        session.getLastUsedAt(),
                        session.isActive(now),
                        session.getIpAddress(),
                        session.getUserAgent()
                ))
                .toList();
    }

    @Transactional
    public void revokeSession(Long userId, UUID sessionId) {
        AuthSession session = repository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new BadRequestException("Session was not found"));
        session.revoke("USER_REVOKED", Instant.now());
    }

    private IssuedSession create(UserAccount user, UUID familyId, ClientContext context) {
        String refreshToken = tokenService.randomToken(48);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofDays(properties.getRefreshTokenDays()));
        UUID sessionId = UUID.randomUUID();
        repository.save(AuthSession.builder()
                .id(sessionId)
                .familyId(familyId)
                .user(user)
                .tokenHash(tokenService.hash(refreshToken))
                .createdAt(now)
                .expiresAt(expiresAt)
                .userAgent(context.userAgent())
                .ipAddress(context.ipAddress())
                .build());
        return new IssuedSession(
                sessionId,
                jwtTokenProvider.generateToken(user),
                refreshToken,
                expiresAt
        );
    }

    private String requireToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Refresh token is required");
        }
        return token;
    }

}
