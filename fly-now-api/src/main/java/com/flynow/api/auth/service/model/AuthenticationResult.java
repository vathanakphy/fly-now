package com.flynow.api.auth.service.model;

import com.flynow.api.auth.dto.response.LoginResponse;

import java.time.Instant;

public record AuthenticationResult(
        LoginResponse response,
        String refreshToken,
        Instant refreshExpiresAt
) {
}
