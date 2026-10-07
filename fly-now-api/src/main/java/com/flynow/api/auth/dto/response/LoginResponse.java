package com.flynow.api.auth.dto.response;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds
) {

    public static LoginResponse authenticated(String accessToken, long expiresInSeconds) {
        return new LoginResponse(accessToken, "Bearer", expiresInSeconds);
    }
}
