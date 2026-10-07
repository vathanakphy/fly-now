package com.flynow.api.auth.session;

import java.time.Instant;
import java.util.UUID;

public record IssuedSession(
        UUID sessionId,
        String accessToken,
        String refreshToken,
        Instant refreshExpiresAt
) {
}
