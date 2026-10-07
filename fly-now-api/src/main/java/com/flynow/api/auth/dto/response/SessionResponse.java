package com.flynow.api.auth.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        boolean active,
        String ipAddress,
        String userAgent
) {
}
