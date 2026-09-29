package com.flynow.api.auth;

import com.flynow.api.auth.audit.AuthAuditService;
import com.flynow.api.auth.dto.ChangePasswordRequest;
import com.flynow.api.auth.dto.LoginRequest;
import com.flynow.api.auth.dto.LoginResponse;
import com.flynow.api.auth.dto.RegisterRequest;
import com.flynow.api.auth.dto.RegisterResponse;
import com.flynow.api.auth.dto.ResetPasswordRequest;
import com.flynow.api.auth.mail.AuthMailService;
import com.flynow.api.auth.security.JwtProperties;
import com.flynow.api.auth.security.PasswordSafetyService;
import com.flynow.api.auth.session.RefreshSessionService;
import com.flynow.api.auth.session.RefreshSessionService.ClientContext;
import com.flynow.api.auth.session.RefreshSessionService.IssuedSession;
import com.flynow.api.auth.session.RefreshSessionService.SessionView;
import com.flynow.api.auth.token.AuthTokenType;
import com.flynow.api.auth.token.SecureTokenService;
import com.flynow.api.auth.token.SecureTokenService.IssuedToken;
import com.flynow.api.shared.exception.BadRequestException;
import com.flynow.api.shared.exception.ConflictException;
import com.flynow.api.shared.exception.ForbiddenException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.user.AccountStatus;
import com.flynow.api.user.UserAccount;
import com.flynow.api.user.UserAccountRepository;
import com.flynow.api.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtProperties jwtProperties;
    private final SecureTokenService secureTokenService;
    private final RefreshSessionService sessionService;
    private final AuthMailService mailService;
    private final AccountSecurityService accountSecurityService;
    private final AuthAuditService auditService;
    private final PasswordSafetyService passwordSafetyService;

    @Transactional
    public RegisterResponse register(RegisterRequest request, ClientContext context) {
        String username = normalize(request.username());
        String email = normalize(request.email());
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("Username is already in use");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email is already in use");
        }

        Instant now = Instant.now();
        passwordSafetyService.requireSafe(request.password());
        UserAccount user = UserAccount.builder()
                .name(request.name().trim())
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role(UserRole.USER)
                .status(AccountStatus.ACTIVE)
                .passwordChangedAt(now)
                .failedLoginAttempts(0)
                .tokenVersion(0)
                .build();

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Username or email is already in use");
        }

        auditService.record(user, "REGISTERED", true, context.ipAddress(), context.userAgent(), null);
        return new RegisterResponse(user.getId(), user.getName(), user.getUsername(), user.getEmail());
    }

    @Transactional
    public LoginResult login(LoginRequest request, ClientContext context) {
        String username = normalize(request.username());
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, request.password()));
        } catch (AuthenticationException exception) {
            accountSecurityService.recordLoginFailure(username, context.ipAddress(), context.userAgent());
            throw new BadCredentialsException("Invalid username or password");
        }

        UserAccount user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
        ensureActive(user);
        return completeLogin(user, context);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public LoginResult refresh(String refreshToken, ClientContext context) {
        try {
            IssuedSession session = sessionService.rotate(refreshToken, context);
            auditService.record(null, "TOKEN_REFRESHED", true, context.ipAddress(), context.userAgent(), null);
            return authenticatedResult(session);
        } catch (BadRequestException exception) {
            auditService.record(null, "TOKEN_REFRESH_FAILED", false,
                    context.ipAddress(), context.userAgent(), exception.getMessage());
            throw exception;
        }
    }

    @Transactional
    public void logout(String refreshToken, ClientContext context) {
        sessionService.revokeToken(refreshToken, "LOGOUT");
        auditService.record(null, "LOGOUT", true, context.ipAddress(), context.userAgent(), null);
    }

    @Transactional
    public void logoutAll(Long userId, ClientContext context) {
        UserAccount user = requireUser(userId);
        user.invalidateAccessTokens();
        sessionService.revokeAll(userId, "LOGOUT_ALL");
        auditService.record(user, "LOGOUT_ALL", true, context.ipAddress(), context.userAgent(), null);
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(normalize(email))
                .filter(user -> user.getStatus() != AccountStatus.DISABLED)
                .ifPresent(user -> {
                    IssuedToken token = secureTokenService.issueActionToken(user, AuthTokenType.PASSWORD_RESET);
                    mailService.sendPasswordReset(user, token);
                });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, ClientContext context) {
        UserAccount user = secureTokenService.consume(request.token(), AuthTokenType.PASSWORD_RESET);
        changePassword(user, request.newPassword());
        sessionService.revokeAll(user.getId(), "PASSWORD_RESET");
        auditService.record(user, "PASSWORD_RESET", true, context.ipAddress(), context.userAgent(), null);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request, ClientContext context) {
        UserAccount user = requireUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        changePassword(user, request.newPassword());
        sessionService.revokeAll(userId, "PASSWORD_CHANGED");
        auditService.record(user, "PASSWORD_CHANGED", true, context.ipAddress(), context.userAgent(), null);
    }

    @Transactional(readOnly = true)
    public List<SessionView> sessions(Long userId) {
        return sessionService.list(userId);
    }

    @Transactional
    public void revokeSession(Long userId, UUID sessionId) {
        sessionService.revokeSession(userId, sessionId);
    }

    private LoginResult completeLogin(UserAccount user, ClientContext context) {
        user.recordSuccessfulLogin(Instant.now());
        IssuedSession session = sessionService.issue(user, context);
        auditService.record(user, "LOGIN_SUCCEEDED", true, context.ipAddress(), context.userAgent(), null);
        return authenticatedResult(session);
    }

    private LoginResult authenticatedResult(IssuedSession session) {
        return new LoginResult(
                LoginResponse.authenticated(session.accessToken(), jwtProperties.expirationSeconds()),
                session
        );
    }

    private void changePassword(UserAccount user, String newPassword) {
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("New password must be different from the current password");
        }
        passwordSafetyService.requireSafe(newPassword);
        user.changePassword(passwordEncoder.encode(newPassword), Instant.now());
    }

    private UserAccount requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }

    private void ensureActive(UserAccount user) {
        user.unlockIfExpired(Instant.now());
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new ForbiddenException("The account is not active");
        }
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    public record LoginResult(LoginResponse response, IssuedSession session) {
    }
}
