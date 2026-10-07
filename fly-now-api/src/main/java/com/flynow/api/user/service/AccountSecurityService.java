package com.flynow.api.user.service;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.user.repository.UserAccountRepository;
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
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailure(String username) {
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
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
