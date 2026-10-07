package com.flynow.api.user.dto.response;

import java.time.Instant;

public record UserResponse(
        Long id,
        String name,
        String username,
        String email,
        String role,
        String status,
        Instant createdAt
) {
}
