package com.flynow.api.auth.mail;

import com.flynow.api.auth.AuthProperties;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.auth.token.SecureTokenService.IssuedToken;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthMailService {

    private final JavaMailSender mailSender;
    private final AuthProperties properties;

    public void sendPasswordReset(UserAccount user, IssuedToken token) {
        String url = properties.getFrontendUrl() + "/reset-password?token=" + token.serialized();
        send(user.getEmail(), "Reset your Fly Now password", "Reset your password using this link:\n" + url);
    }

    private void send(String recipient, String subject, String body) {
        if (!properties.isMailEnabled()) {
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getMailFrom());
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
