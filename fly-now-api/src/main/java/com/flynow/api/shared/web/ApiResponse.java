package com.flynow.api.shared.web;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public record ApiResponse<T>(
        boolean success,
        String code,
        String message,
        T data,
        Map<String, String> fieldErrors,
        Instant timestamp
) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, null, message, data, null, Instant.now());
    }

    public static ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>(false, code, message, null, null, Instant.now());
    }

    public static ApiResponse<Void> validationError(String message, Map<String, String> fieldErrors) {
        Map<String, String> immutableErrors = Collections.unmodifiableMap(new LinkedHashMap<>(fieldErrors));
        return new ApiResponse<>(false, "VALIDATION_ERROR", message, null, immutableErrors, Instant.now());
    }
}
