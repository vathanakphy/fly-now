package com.flynow.api.user.controller;

import com.flynow.api.auth.security.AuthenticatedUserIdResolver;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.shared.web.ApiResponse;
import com.flynow.api.shared.web.PageResponse;
import com.flynow.api.user.dto.request.AccountStatusRequest;
import com.flynow.api.user.dto.request.UserRoleRequest;
import com.flynow.api.user.dto.response.UserResponse;
import com.flynow.api.user.mapper.UserMapper;
import com.flynow.api.user.service.AdminUserService;
import com.flynow.api.user.web.AdminUserApiPaths;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AdminUserApiPaths.BASE)
@RequiredArgsConstructor
@Tag(name = "Admin Users")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final AdminUserService service;
    private final UserMapper userMapper;
    private final AuthenticatedUserIdResolver userIdResolver;

    @GetMapping
    @Operation(summary = "List user accounts")
    public ApiResponse<PageResponse<UserResponse>> list(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<UserAccount> users = service.list(pageable);
        Page<UserResponse> userResponses = users.map(userMapper::toResponse);
        PageResponse<UserResponse> response = PageResponse.from(userResponses);

        return ApiResponse.success("Users retrieved", response);
    }

    @PutMapping(AdminUserApiPaths.STATUS_BY_USER_ID)
    @Operation(summary = "Change a user's account status")
    public ApiResponse<UserResponse> changeStatus(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody AccountStatusRequest request
    ) {
        Long actorId = userIdResolver.require(authentication);
        UserAccount user = service.changeStatus(actorId, userId, request.status());
        UserResponse response = userMapper.toResponse(user);

        return ApiResponse.success("User status updated", response);
    }

    @PutMapping(AdminUserApiPaths.ROLE_BY_USER_ID)
    @Operation(summary = "Change a user's role")
    public ApiResponse<UserResponse> changeRole(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody UserRoleRequest request
    ) {
        Long actorId = userIdResolver.require(authentication);
        UserAccount user = service.changeRole(actorId, userId, request.role());
        UserResponse response = userMapper.toResponse(user);

        return ApiResponse.success("User role updated", response);
    }
}
