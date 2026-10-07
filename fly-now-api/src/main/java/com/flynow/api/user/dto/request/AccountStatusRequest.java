package com.flynow.api.user.dto.request;

import com.flynow.api.entities.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record AccountStatusRequest(@NotNull AccountStatus status) {
}
