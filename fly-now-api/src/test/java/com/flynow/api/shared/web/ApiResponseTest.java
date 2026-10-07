package com.flynow.api.shared.web;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    void createsSuccessEnvelope() {
        ApiResponse<String> response = ApiResponse.success("Completed", "value");

        assertThat(response.success()).isTrue();
        assertThat(response.code()).isNull();
        assertThat(response.message()).isEqualTo("Completed");
        assertThat(response.data()).isEqualTo("value");
        assertThat(response.fieldErrors()).isNull();
        assertThat(response.timestamp()).isNotNull();
    }

    @Test
    void createsValidationErrorEnvelope() {
        ApiResponse<Void> response = ApiResponse.validationError(
                "Validation failed",
                Map.of("email", "Email must be valid")
        );

        assertThat(response.success()).isFalse();
        assertThat(response.code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.data()).isNull();
        assertThat(response.fieldErrors()).containsEntry("email", "Email must be valid");
    }
}
