package com.flynow.api.auth.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import com.flynow.api.user.AccountStatus;
import com.flynow.api.user.UserAccount;
import com.flynow.api.user.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;

@Configuration
@RequiredArgsConstructor
public class JwtKeyConfig {

    private final JwtProperties properties;
    private final UserAccountRepository userRepository;

    @Bean
    public KeyPair jwtKeyPair() {
        try {
            if (hasText(properties.getPrivateKeyBase64()) && hasText(properties.getPublicKeyBase64())) {
                KeyFactory factory = KeyFactory.getInstance("RSA");
                PrivateKey privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(
                        Base64.getDecoder().decode(properties.getPrivateKeyBase64())
                ));
                PublicKey publicKey = factory.generatePublic(new X509EncodedKeySpec(
                        Base64.getDecoder().decode(properties.getPublicKeyBase64())
                ));
                return new KeyPair(publicKey, privateKey);
            }

            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to load JWT RSA keys", exception);
        }
    }

    @Bean
    public JwtEncoder jwtEncoder(KeyPair jwtKeyPair) {
        RSAKey rsaKey = new RSAKey.Builder((RSAPublicKey) jwtKeyPair.getPublic())
                .privateKey((RSAPrivateKey) jwtKeyPair.getPrivate())
                .keyID(properties.getKeyId())
                .build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(rsaKey)));
    }

    @Bean
    public JwtDecoder jwtDecoder(KeyPair jwtKeyPair) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) jwtKeyPair.getPublic())
                .signatureAlgorithm(SignatureAlgorithm.RS256)
                .build();

        OAuth2TokenValidator<Jwt> issuer = JwtValidators.createDefaultWithIssuer(properties.getIssuer());
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains(properties.getAudience())
                ? OAuth2TokenValidatorResult.success()
                : failure("invalid_audience", "The token audience is invalid");
        OAuth2TokenValidator<Jwt> account = this::validateAccount;
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuer, audience, account));
        return decoder;
    }

    private OAuth2TokenValidatorResult validateAccount(Jwt jwt) {
        try {
            Long userId = Long.valueOf(jwt.getSubject());
            UserAccount user = userRepository.findById(userId).orElse(null);
            Number tokenVersion = jwt.getClaim("token_version");
            if (user == null || user.getStatus() == AccountStatus.DISABLED
                    || (user.getStatus() == AccountStatus.LOCKED
                    && user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now()))
                    || tokenVersion == null || tokenVersion.intValue() != user.getTokenVersion()) {
                return failure("invalid_account", "The account or token is no longer active");
            }
            return OAuth2TokenValidatorResult.success();
        } catch (RuntimeException exception) {
            return failure("invalid_subject", "The token subject is invalid");
        }
    }

    private OAuth2TokenValidatorResult failure(String code, String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error(code, description, null));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
