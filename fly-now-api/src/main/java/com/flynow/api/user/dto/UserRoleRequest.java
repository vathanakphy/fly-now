package com.flynow.api.user.dto;

import com.flynow.api.user.UserRole;
import jakarta.validation.constraints.NotNull;

public record UserRoleRequest(@NotNull UserRole role) {
}
