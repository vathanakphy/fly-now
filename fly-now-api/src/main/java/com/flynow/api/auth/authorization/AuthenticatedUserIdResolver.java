package com.flynow.api.auth.authorization;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Resolves FlyNow's stable database user ID from the signed JWT subject.
 *
 * <p>The configured JWT authentication name is the username, so ownership
 * checks must not use {@link Authentication#getName()}. The subject is the
 * immutable user ID written by FlyNow when the access token is created.</p>
 */
@Component
public class AuthenticatedUserIdResolver {

    public Optional<Long> resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            return parseSubject(jwtAuthentication.getToken().getSubject());
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return parseSubject(jwt.getSubject());
        }

        return Optional.empty();
    }

    private Optional<Long> parseSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            return Optional.empty();
        }

        try {
            return Optional.of(Long.valueOf(subject));
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }
}
