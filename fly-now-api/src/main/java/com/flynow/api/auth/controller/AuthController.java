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
import com.flynow.api.auth.service.model.SessionDetails;
import com.flynow.api.auth.session.ClientContext;
import com.flynow.api.auth.web.AuthApiPaths;
import com.flynow.api.auth.web.RefreshCookieFactory;
import com.flynow.api.entities.UserAccount;
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
        CsrfResponse response = new CsrfResponse(
                token.getHeaderName(), token.getParameterName(), token.getToken());

        return ApiResponse.success("CSRF token retrieved", response);
    }

    @PostMapping(AuthApiPaths.REGISTER)
    @Operation(summary = "Register a user account")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        UserAccount user = authService.register(request);
        RegisterResponse response = new RegisterResponse(
                user.getId(), user.getName(), user.getUsername(), user.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping(AuthApiPaths.LOGIN)
    @Operation(summary = "Log in with username and password")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        ClientContext clientContext = context(servletRequest);
        AuthenticationResult result = authService.login(request, clientContext);

        return tokenResponse(result, "Login successful");
    }

    @PostMapping(AuthApiPaths.REFRESH)
    @Operation(summary = "Rotate the refresh token and issue a new access token")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest servletRequest
    ) {
        ClientContext clientContext = context(servletRequest);
        AuthenticationResult result = authService.refresh(refreshToken, clientContext);

        return tokenResponse(result, "Token refreshed");
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
        Long userId = userIdResolver.require(authentication);
        authService.logoutAll(userId);

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
        Long userId = userIdResolver.require(authentication);
        authService.changePassword(userId, request);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieFactory.clear().toString())
                .body(ApiResponse.success("Password changed; sign in again", null));
    }

    @GetMapping(AuthApiPaths.SESSIONS)
    @Operation(summary = "List the authenticated user's sessions", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<SessionResponse>> sessions(Authentication authentication) {
        Long userId = userIdResolver.require(authentication);
        List<SessionDetails> sessions = authService.sessions(userId);
        List<SessionResponse> responses = sessions.stream()
                .map(this::toSessionResponse)
                .toList();

        return ApiResponse.success("Sessions retrieved", responses);
    }

    @DeleteMapping(AuthApiPaths.SESSION_BY_ID)
    @Operation(summary = "Revoke one session", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> revokeSession(
            Authentication authentication,
            @PathVariable UUID sessionId
    ) {
        Long userId = userIdResolver.require(authentication);
        authService.revokeSession(userId, sessionId);

        return ApiResponse.success("Session revoked", null);
    }

    private ResponseEntity<ApiResponse<LoginResponse>> tokenResponse(AuthenticationResult result, String message) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.refreshToken() != null) {
            builder.header(HttpHeaders.SET_COOKIE, refreshCookieFactory
                    .create(result.refreshToken(), result.refreshExpiresAt())
                    .toString());
        }
        LoginResponse response = LoginResponse.authenticated(
                result.accessToken(), result.expiresInSeconds());
        return builder.body(ApiResponse.success(message, response));
    }

    private SessionResponse toSessionResponse(SessionDetails session) {
        return new SessionResponse(
                session.id(),
                session.createdAt(),
                session.expiresAt(),
                session.lastUsedAt(),
                session.active(),
                session.ipAddress(),
                session.userAgent()
        );
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
