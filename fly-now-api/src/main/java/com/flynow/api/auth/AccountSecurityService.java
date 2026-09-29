package com.flynow.api.auth;

import com.flynow.api.auth.audit.AuthAuditService;
import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.user.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AccountSecurityService {

    private final UserAccountRepository userRepository;
    private final AuthProperties properties;
    private final AuthAuditService auditService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailure(String username, String ipAddress, String userAgent) {
        UserAccount user = userRepository.findByUsername(normalize(username)).orElse(null);
        if (user != null && user.getStatus() != AccountStatus.DISABLED) {
            user.unlockIfExpired(Instant.now());
            if (user.getStatus() == AccountStatus.ACTIVE) {
                user.recordFailedLogin(
                        properties.getMaxFailedLogins(),
                        Instant.now().plus(Duration.ofMinutes(properties.getLockMinutes()))
                );
            }
        }
        auditService.record(user, "LOGIN_FAILED", false, ipAddress, userAgent, "Invalid credentials or account state");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
