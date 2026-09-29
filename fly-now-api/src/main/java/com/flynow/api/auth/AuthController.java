package com.flynow.api.auth;

import com.flynow.api.auth.AuthService.LoginResult;
import com.flynow.api.auth.dto.ChangePasswordRequest;
import com.flynow.api.auth.dto.EmailRequest;
import com.flynow.api.auth.dto.LoginRequest;
import com.flynow.api.auth.dto.LoginResponse;
import com.flynow.api.auth.dto.RegisterRequest;
import com.flynow.api.auth.dto.RegisterResponse;
import com.flynow.api.auth.dto.ResetPasswordRequest;
import com.flynow.api.auth.session.RefreshSessionService.ClientContext;
import com.flynow.api.auth.session.RefreshSessionService.IssuedSession;
import com.flynow.api.auth.session.RefreshSessionService.SessionView;
import com.flynow.api.shared.web.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthService authService;
    private final AuthProperties properties;

    @GetMapping("/csrf")
    @Operation(summary = "Get a CSRF token")
    public ApiResponse<CsrfResponse> csrf(CsrfToken token) {
        return ApiResponse.success("CSRF token retrieved",
                new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken()));
    }

    @PostMapping("/register")
    @Operation(summary = "Register a user account")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest
    ) {
        RegisterResponse response = authService.register(request, context(servletRequest));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Log in with username and password")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        return tokenResponse(authService.login(request, context(servletRequest)), "Login successful");
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate the refresh token and issue a new access token")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest servletRequest
    ) {
        return tokenResponse(authService.refresh(refreshToken, context(servletRequest)), "Token refreshed");
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke the current refresh session")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest servletRequest
    ) {
        authService.logout(refreshToken, context(servletRequest));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(ApiResponse.success("Logged out successfully", null));
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Revoke every session", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logoutAll(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest servletRequest
    ) {
        authService.logoutAll(userId(jwt), context(servletRequest));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(ApiResponse.success("All sessions were revoked", null));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset instructions")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody EmailRequest request) {
        authService.forgotPassword(request.email());
        return ApiResponse.success("If the account exists, password reset instructions have been sent", null);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset a password using a single-use token")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        authService.resetPassword(request, context(servletRequest));
        return ApiResponse.success("Password reset successfully", null);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change the authenticated user's password", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        authService.changePassword(userId(jwt), request, context(servletRequest));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(ApiResponse.success("Password changed; sign in again", null));
    }

    @GetMapping("/sessions")
    @Operation(summary = "List the authenticated user's sessions", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<SessionView>> sessions(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success("Sessions retrieved", authService.sessions(userId(jwt)));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Revoke one session", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> revokeSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID sessionId
    ) {
        authService.revokeSession(userId(jwt), sessionId);
        return ApiResponse.success("Session revoked", null);
    }

    private ResponseEntity<ApiResponse<LoginResponse>> tokenResponse(LoginResult result, String message) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (result.session() != null) {
            builder.header(HttpHeaders.SET_COOKIE, refreshCookie(result.session()).toString());
        }
        return builder.body(ApiResponse.success(message, result.response()));
    }

    private ResponseCookie refreshCookie(IssuedSession session) {
        Duration maxAge = Duration.between(Instant.now(), session.refreshExpiresAt());
        return ResponseCookie.from(REFRESH_COOKIE, session.refreshToken())
                .httpOnly(true)
                .secure(properties.isRefreshCookieSecure())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(properties.isRefreshCookieSecure())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
    }

    private ClientContext context(HttpServletRequest request) {
        return new ClientContext(
                truncate(request.getRemoteAddr(), 64),
                truncate(request.getHeader("User-Agent"), 500)
        );
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    private String truncate(String value, int maximumLength) {
        return value == null || value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }

    public record CsrfResponse(String headerName, String parameterName, String token) {
    }

}
