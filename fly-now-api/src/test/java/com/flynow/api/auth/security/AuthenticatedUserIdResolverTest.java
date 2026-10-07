package com.flynow.api.auth.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthenticatedUserIdResolverTest {

    private final AuthenticatedUserIdResolver resolver = new AuthenticatedUserIdResolver();

    @Test
    void resolvesAuthenticatedJwtSubject() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("42")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60))
                .build();

        assertThat(resolver.require(UsernamePasswordAuthenticationToken.authenticated(
                jwt,
                "not-used",
                List.of()
        ))).isEqualTo(42L);
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> resolver.require(null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }
}
