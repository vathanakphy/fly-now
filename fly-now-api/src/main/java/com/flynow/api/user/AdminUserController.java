package com.flynow.api.user;

import com.flynow.api.user.dto.AccountStatusRequest;
import com.flynow.api.user.dto.UserResponse;
import com.flynow.api.user.dto.UserRoleRequest;
import com.flynow.api.shared.web.ApiResponse;
import com.flynow.api.shared.web.PageResponse;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Users")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final AdminUserService service;

    @GetMapping
    @Operation(summary = "List user accounts")
    public ApiResponse<PageResponse<UserResponse>> list(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ApiResponse.success("Users retrieved", service.list(pageable));
    }

    @PutMapping("/{userId}/status")
    @Operation(summary = "Change a user's account status")
    public ApiResponse<UserResponse> changeStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long userId,
            @Valid @RequestBody AccountStatusRequest request
    ) {
        return ApiResponse.success("User status updated",
                service.changeStatus(Long.valueOf(jwt.getSubject()), userId, request.status()));
    }

    @PutMapping("/{userId}/role")
    @Operation(summary = "Change a user's role")
    public ApiResponse<UserResponse> changeRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long userId,
            @Valid @RequestBody UserRoleRequest request
    ) {
        return ApiResponse.success("User role updated",
                service.changeRole(Long.valueOf(jwt.getSubject()), userId, request.role()));
    }
}
