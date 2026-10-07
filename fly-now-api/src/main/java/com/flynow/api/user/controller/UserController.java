package com.flynow.api.user.controller;

import com.flynow.api.auth.security.AuthenticatedUserIdResolver;
import com.flynow.api.shared.web.ApiResponse;
import com.flynow.api.user.dto.request.UpdateProfileRequest;
import com.flynow.api.user.dto.response.UserResponse;
import com.flynow.api.user.service.UserService;
import com.flynow.api.user.web.UserApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(UserApiPaths.BASE)
@RequiredArgsConstructor
@Tag(name = "Users")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;
    private final AuthenticatedUserIdResolver userIdResolver;

    @GetMapping(UserApiPaths.ME)
    @Operation(summary = "Get the authenticated user's profile")
    public ApiResponse<UserResponse> me(Authentication authentication) {
        return ApiResponse.success("Current user retrieved", userService.me(userIdResolver.require(authentication)));
    }

    @PutMapping(UserApiPaths.ME)
    @Operation(summary = "Update the authenticated user's profile")
    public ApiResponse<UserResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.success("Profile updated successfully", userService.updateProfile(
                userIdResolver.require(authentication),
                request));
    }
}
