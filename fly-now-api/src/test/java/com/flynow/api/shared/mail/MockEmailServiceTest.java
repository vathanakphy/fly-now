package com.flynow.api.shared.mail;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.service.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class MockEmailServiceTest {

    @Test
    void logsPasswordResetTokenAndUrl(CapturedOutput output) {
        AuthProperties properties = new AuthProperties();
        properties.setFrontendUrl("http://localhost:3000");
        MockEmailService service = new MockEmailService(properties);
        UserAccount user = UserAccount.builder().email("user@example.com").build();
        IssuedToken token = new IssuedToken(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "reset-secret",
                Instant.parse("2030-01-01T00:00:00Z")
        );

        service.sendPasswordReset(user, token);

        assertThat(output)
                .contains("Mock password-reset email")
                .contains("recipient=user@example.com")
                .contains("token=11111111-1111-1111-1111-111111111111.reset-secret")
                .contains("resetUrl=http://localhost:3000/reset-password?token=11111111-1111-1111-1111-111111111111.reset-secret");
    }
}
