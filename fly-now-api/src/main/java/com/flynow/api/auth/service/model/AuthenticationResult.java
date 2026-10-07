package com.flynow.api.auth.service.model;

import java.time.Instant;

public record AuthenticationResult(
        String accessToken,
        long expiresInSeconds,
        String refreshToken,
        Instant refreshExpiresAt
) {
}
