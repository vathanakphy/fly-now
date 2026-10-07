package com.flynow.api.shared.mail;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.service.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SmtpEmailServiceTest {

    @Test
    void sendsPasswordResetEmail() {
        RecordingMailSender mailSender = new RecordingMailSender();
        AuthProperties properties = new AuthProperties();
        properties.setFrontendUrl("https://fly-now.example");
        properties.setMailFrom("no-reply@fly-now.example");
        SmtpEmailService service = new SmtpEmailService(mailSender, properties);
        UserAccount user = UserAccount.builder().email("user@example.com").build();
        IssuedToken token = new IssuedToken(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "reset-secret",
                Instant.parse("2030-01-01T00:00:00Z")
        );

        service.sendPasswordReset(user, token);

        SimpleMailMessage message = mailSender.sentMessage;
        assertThat(message.getFrom()).isEqualTo("no-reply@fly-now.example");
        assertThat(message.getTo()).containsExactly("user@example.com");
        assertThat(message.getSubject()).isEqualTo("Reset your Fly Now password");
        assertThat(message.getText()).contains(
                "https://fly-now.example/reset-password?token=11111111-1111-1111-1111-111111111111.reset-secret"
        );
    }

    private static final class RecordingMailSender extends JavaMailSenderImpl {

        private SimpleMailMessage sentMessage;

        @Override
        public void send(SimpleMailMessage message) {
            sentMessage = new SimpleMailMessage(message);
        }
    }
}
