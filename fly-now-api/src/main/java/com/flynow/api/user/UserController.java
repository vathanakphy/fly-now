package com.flynow.api.user;

import com.flynow.api.shared.web.ApiResponse;
import com.flynow.api.user.dto.UpdateProfileRequest;
import com.flynow.api.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's profile")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success("Current user retrieved", userService.me(userId(jwt)));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the authenticated user's profile")
    public ApiResponse<UserResponse> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request,
            HttpServletRequest requestContext) {
        return ApiResponse.success("Profile updated successfully", userService.updateProfile(
                userId(jwt),
                request));
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
