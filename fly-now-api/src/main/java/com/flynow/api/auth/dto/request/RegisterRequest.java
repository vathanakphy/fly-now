package com.flynow.api.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 254, message = "Email must not exceed 254 characters")
        String email,

        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must contain between 3 and 50 characters")
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 12, max = 72, message = "Password must contain between 12 and 72 characters")
        String password
) {
}
