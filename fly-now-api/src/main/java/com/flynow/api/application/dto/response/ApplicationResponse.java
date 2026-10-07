package com.flynow.api.application.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        String name,
        String slug,
        String description,
        String lifecycleState,
        Instant createdAt,
        Instant updatedAt
) {
}
