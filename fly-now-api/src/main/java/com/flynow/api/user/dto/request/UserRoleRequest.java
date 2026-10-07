package com.flynow.api.user.dto.request;

import com.flynow.api.entities.UserRole;
import jakarta.validation.constraints.NotNull;

public record UserRoleRequest(@NotNull UserRole role) {
}
