package com.flynow.api.auth.service;

import com.flynow.api.auth.dto.request.ChangePasswordRequest;
import com.flynow.api.auth.dto.request.LoginRequest;
import com.flynow.api.auth.dto.request.RegisterRequest;
import com.flynow.api.auth.dto.request.ResetPasswordRequest;
import com.flynow.api.auth.security.JwtProperties;
import com.flynow.api.auth.security.PasswordSafetyService;
import com.flynow.api.auth.service.model.AuthenticationResult;
import com.flynow.api.auth.service.model.SessionDetails;
import com.flynow.api.auth.session.ClientContext;
import com.flynow.api.auth.session.IssuedSession;
import com.flynow.api.entities.AuthTokenType;
import com.flynow.api.auth.service.SecureTokenService.IssuedToken;
import com.flynow.api.shared.exception.BadRequestException;
import com.flynow.api.shared.exception.ConflictException;
import com.flynow.api.shared.exception.ForbiddenException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.shared.mail.EmailService;
import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.user.repository.UserAccountRepository;
import com.flynow.api.user.service.AccountSecurityService;
import com.flynow.api.entities.UserRole;
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
    private final EmailService emailService;
    private final AccountSecurityService accountSecurityService;
    private final PasswordSafetyService passwordSafetyService;

    @Transactional
    public UserAccount register(RegisterRequest request) {
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

        return user;
    }

    @Transactional
    public AuthenticationResult login(LoginRequest request, ClientContext context) {
        String username = normalize(request.username());
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, request.password()));
        } catch (AuthenticationException exception) {
            accountSecurityService.recordLoginFailure(username);
            throw new BadCredentialsException("Invalid username or password");
        }

        UserAccount user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
        ensureActive(user);
        return completeLogin(user, context);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public AuthenticationResult refresh(String refreshToken, ClientContext context) {
        IssuedSession session = sessionService.rotate(refreshToken, context);
        return authenticatedResult(session);
    }

    @Transactional
    public void logout(String refreshToken) {
        sessionService.revokeToken(refreshToken, "LOGOUT");
    }

    @Transactional
    public void logoutAll(Long userId) {
        UserAccount user = requireUser(userId);
        user.invalidateAccessTokens();
        sessionService.revokeAll(userId, "LOGOUT_ALL");
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(normalize(email))
                .filter(user -> user.getStatus() != AccountStatus.DISABLED)
                .ifPresent(user -> {
                    IssuedToken token = secureTokenService.issueActionToken(user, AuthTokenType.PASSWORD_RESET);
                    emailService.sendPasswordReset(user, token);
                });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        UserAccount user = secureTokenService.consume(request.token(), AuthTokenType.PASSWORD_RESET);
        changePassword(user, request.newPassword());
        sessionService.revokeAll(user.getId(), "PASSWORD_RESET");
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        UserAccount user = requireUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        changePassword(user, request.newPassword());
        sessionService.revokeAll(userId, "PASSWORD_CHANGED");
    }

    @Transactional(readOnly = true)
    public List<SessionDetails> sessions(Long userId) {
        return sessionService.list(userId);
    }

    @Transactional
    public void revokeSession(Long userId, UUID sessionId) {
        sessionService.revokeSession(userId, sessionId);
    }

    private AuthenticationResult completeLogin(UserAccount user, ClientContext context) {
        user.recordSuccessfulLogin(Instant.now());
        IssuedSession session = sessionService.issue(user, context);
        return authenticatedResult(session);
    }

    private AuthenticationResult authenticatedResult(IssuedSession session) {
        return new AuthenticationResult(
                session.accessToken(),
                jwtProperties.expirationSeconds(),
                session.refreshToken(),
                session.refreshExpiresAt()
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
}
