package com.flynow.api.auth.security;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.shared.exception.BadRequestException;
import org.springframework.security.authentication.password.CompromisedPasswordDecision;
import org.springframework.security.web.authentication.password.HaveIBeenPwnedRestApiPasswordChecker;
import org.springframework.stereotype.Service;

@Service
public class PasswordSafetyService {

    private final AuthProperties properties;
    private final HaveIBeenPwnedRestApiPasswordChecker checker = new HaveIBeenPwnedRestApiPasswordChecker();

    public PasswordSafetyService(AuthProperties properties) {
        this.properties = properties;
    }

    public void requireSafe(String password) {
        if (!properties.isCompromisedPasswordCheckEnabled()) {
            return;
        }
        CompromisedPasswordDecision decision = checker.check(password);
        if (decision.isCompromised()) {
            throw new BadRequestException("Choose a password that has not appeared in a known data breach");
        }
    }
}
