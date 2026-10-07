package com.flynow.api.auth.service.model;

import java.time.Instant;
import java.util.UUID;

public record SessionDetails(
        UUID id,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        boolean active,
        String ipAddress,
        String userAgent
) {
}
