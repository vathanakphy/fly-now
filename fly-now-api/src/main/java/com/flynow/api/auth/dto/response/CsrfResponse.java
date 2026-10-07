package com.flynow.api.auth.dto.response;

public record CsrfResponse(
        String headerName,
        String parameterName,
        String token
) {
}
