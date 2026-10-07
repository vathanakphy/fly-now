package com.flynow.api.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Configuration
@ConfigurationProperties(prefix = "app.auth")
@Validated
@Getter
@Setter
public class AuthProperties {

    @Positive
    private long refreshTokenDays;
    @Positive
    private long actionTokenMinutes;
    @Positive
    private int maxFailedLogins;
    @Positive
    private long lockMinutes;
    private boolean refreshCookieSecure;
    @NotBlank
    private String frontendUrl;
    private boolean mailEnabled;
    @NotBlank
    private String mailFrom;
    private boolean compromisedPasswordCheckEnabled;
}
