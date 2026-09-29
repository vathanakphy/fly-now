package com.flynow.api.user.dto;

import com.flynow.api.entities.UserAccount;

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
    public static UserResponse from(UserAccount user) {
        return new UserResponse(
                user.getId(), user.getName(), user.getUsername(), user.getEmail(),
                user.getRole().name(), user.getStatus().name(), user.getCreatedAt()
        );
    }
}
