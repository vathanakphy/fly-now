package com.flynow.api.user.dto;

import com.flynow.api.user.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record AccountStatusRequest(@NotNull AccountStatus status) {
}
