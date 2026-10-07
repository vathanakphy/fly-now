package com.flynow.api.user.mapper;

import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.entities.UserRole;
import com.flynow.api.user.dto.response.UserResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class UserMapperTest {

    @Test
    void mapsEntityToSafeResponse() {
        Instant createdAt = Instant.parse("2030-01-01T00:00:00Z");
        UserAccount user = UserAccount.builder()
                .id(7L)
                .name("Alice")
                .username("alice")
                .email("alice@example.com")
                .password("encoded-secret")
                .role(UserRole.USER)
                .status(AccountStatus.ACTIVE)
                .createdAt(createdAt)
                .build();

        UserResponse response = new UserMapper().toResponse(user);

        assertThat(response).isEqualTo(new UserResponse(
                7L, "Alice", "alice", "alice@example.com", "USER", "ACTIVE", createdAt
        ));
    }
}
