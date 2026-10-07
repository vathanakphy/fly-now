package com.flynow.api.application.mapper;

import com.flynow.api.application.dto.response.ApplicationResponse;
import com.flynow.api.entities.Application;
import com.flynow.api.entities.ApplicationLifecycleState;
import com.flynow.api.entities.UserAccount;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationMapperTest {

    @Test
    void mapsEntityWithoutExposingOwner() {
        UUID id = UUID.randomUUID();
        Instant createdAt = Instant.parse("2030-01-01T00:00:00Z");
        Instant updatedAt = Instant.parse("2030-01-02T00:00:00Z");
        Application application = Application.builder()
                .id(id)
                .owner(UserAccount.builder().id(7L).build())
                .name("Payment API")
                .slug("payment-api")
                .description("Handles payments")
                .lifecycleState(ApplicationLifecycleState.DRAFT)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();

        ApplicationResponse response = new ApplicationMapper().toResponse(application);

        assertThat(response).isEqualTo(new ApplicationResponse(
                id,
                "Payment API",
                "payment-api",
                "Handles payments",
                "DRAFT",
                createdAt,
                updatedAt
        ));
    }
}
