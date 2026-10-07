package com.flynow.api.auth.controller;

import com.flynow.api.auth.dto.request.ChangePasswordRequest;
import com.flynow.api.auth.dto.request.EmailRequest;
import com.flynow.api.auth.dto.request.LoginRequest;
import com.flynow.api.auth.dto.request.RegisterRequest;
import com.flynow.api.auth.dto.request.ResetPasswordRequest;
import com.flynow.api.auth.dto.response.CsrfResponse;
import com.flynow.api.auth.dto.response.LoginResponse;
import com.flynow.api.auth.dto.response.RegisterResponse;
import com.flynow.api.auth.dto.response.SessionResponse;
import com.flynow.api.auth.security.AuthenticatedUserIdResolver;
import com.flynow.api.auth.service.AuthService;
import com.flynow.api.auth.service.model.AuthenticationResult;
import com.flynow.api.auth.session.ClientContext;
import com.flynow.api.auth.web.AuthApiPaths;
import com.flynow.api.auth.web.RefreshCookieFactory;
import com.flynow.api.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(AuthApiPaths.BASE)
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final AuthenticatedUserIdResolver userIdResolver;
    private final RefreshCookieFactory refreshCookieFactory;

    @GetMapping(AuthApiPaths.CSRF)
    @Operation(summary = "Get a CSRF token")
    public ApiResponse<CsrfResponse> csrf(CsrfToken token) {
        return ApiResponse.success("CSRF token retrieved",
                new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken()));
    }

    @PostMapping(AuthApiPaths.REGISTER)
    @Operation(summary = "Register a user account")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        RegisterResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping(AuthApiPaths.LOGIN)
    @Operation(summary = "Log in with username and password")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        return tokenResponse(authService.login(request, context(servletRequest)), "Login successful");
    }

    @PostMapping(AuthApiPaths.REFRESH)
    @Operation(summary = "Rotate the refresh token and issue a new access token")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest servletRequest
    ) {
        return tokenResponse(authService.refresh(refreshToken, context(servletRequest)), "Token refreshed");
    }

    @PostMapping(AuthApiPaths.LOGOUT)
    @Operation(summary = "Revoke the current refresh session")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .body(ApiResponse.success("Logged out successfully", null));
    }

    @PostMapping(AuthApiPaths.LOGOUT_ALL)
    @Operation(summary = "Revoke every session", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logoutAll(
            Authentication authentication
    ) {
        authService.logoutAll(userIdResolver.require(authentication));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .body(ApiResponse.success("All sessions were revoked", null));
    }

    @PostMapping(AuthApiPaths.FORGOT_PASSWORD)
    @Operation(summary = "Request password reset instructions")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody EmailRequest request) {
        authService.forgotPassword(request.email());
        return ApiResponse.success("If the account exists, password reset instructions have been sent", null);
    }

    @PostMapping(AuthApiPaths.RESET_PASSWORD)
    @Operation(summary = "Reset a password using a single-use token")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(request);
        return ApiResponse.success("Password reset successfully", null);
    }

    @PostMapping(AuthApiPaths.CHANGE_PASSWORD)
    @Operation(summary = "Change the authenticated user's password", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(userIdResolver.require(authentication), request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .body(ApiResponse.success("Password changed; sign in again", null));
    }

    @GetMapping(AuthApiPaths.SESSIONS)
    @Operation(summary = "List the authenticated user's sessions", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<SessionResponse>> sessions(Authentication authentication) {
        return ApiResponse.success("Sessions retrieved", authService.sessions(userIdResolver.require(authentication)));
    }

    @DeleteMapping(AuthApiPaths.SESSION_BY_ID)
    @Operation(summary = "Revoke one session", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> revokeSession(
            Authentication authentication,
            @PathVariable UUID sessionId
    ) {
        authService.revokeSession(userIdResolver.require(authentication), sessionId);
        return ApiResponse.success("Session revoked", null);
    }

    private ResponseEntity<ApiResponse<LoginResponse>> tokenResponse(AuthenticationResult result, String message) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.refreshToken() != null) {
            builder.header(HttpHeaders.SET_COOKIE, refreshCookieFactory
                    .create(result.refreshToken(), result.refreshExpiresAt())
                    .toString());
        }
        return builder.body(ApiResponse.success(message, result.response()));
    }

    private ClientContext context(HttpServletRequest request) {
        return new ClientContext(
                truncate(request.getRemoteAddr(), 64),
                truncate(request.getHeader("User-Agent"), 500)
        );
    }

    private String truncate(String value, int maximumLength) {
        return value == null || value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }
}
