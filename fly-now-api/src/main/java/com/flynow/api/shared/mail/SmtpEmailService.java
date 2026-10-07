package com.flynow.api.shared.mail;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.service.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.auth", name = "mail-enabled", havingValue = "true")
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    @Override
    public void sendPasswordReset(UserAccount user, IssuedToken token) {
        String resetUrl = properties.getFrontendUrl() + "/reset-password?token=" + token.serialized();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getMailFrom());
        message.setTo(user.getEmail());
        message.setSubject("Reset your Fly Now password");
        message.setText("Reset your password using this link:\n" + resetUrl);
        mailSender.send(message);
    }
}
