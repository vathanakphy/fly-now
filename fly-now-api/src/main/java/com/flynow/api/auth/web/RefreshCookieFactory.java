package com.flynow.api.auth.web;

import com.flynow.api.auth.config.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class RefreshCookieFactory {

    public static final String COOKIE_NAME = "refresh_token";

    private final AuthProperties properties;

    public ResponseCookie create(String refreshToken, Instant expiresAt) {
        Duration maxAge = Duration.between(Instant.now(), expiresAt);
        if (maxAge.isNegative()) {
            maxAge = Duration.ZERO;
        }
        return cookie(refreshToken, maxAge);
    }

    public ResponseCookie clear() {
        return cookie("", Duration.ZERO);
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(properties.isRefreshCookieSecure())
                .sameSite("Strict")
                .path(AuthApiPaths.BASE)
                .maxAge(maxAge)
                .build();
    }
}
