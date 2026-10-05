package com.flynow.api.auth.mail;

import com.flynow.api.auth.AuthProperties;
import com.flynow.api.auth.token.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.auth", name = "mail-enabled", havingValue = "false", matchIfMissing = true)
public class MockEmailService implements EmailService {

    private final AuthProperties properties;

    @Override
    public void sendPasswordReset(UserAccount user, IssuedToken token) {
        String resetUrl = properties.getFrontendUrl() + "/reset-password?token=" + token.serialized();
        log.info("Mock password-reset email: recipient={}, token={}, resetUrl={}",
                user.getEmail(), token.serialized(), resetUrl);
    }
}
