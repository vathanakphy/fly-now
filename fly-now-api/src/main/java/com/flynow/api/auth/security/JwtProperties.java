package com.flynow.api.auth.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Configuration
@ConfigurationProperties(prefix = "app.jwt")
@Validated
@Getter
@Setter
public class JwtProperties {

    @NotBlank
    private String issuer;

    @NotBlank
    private String audience;

    @NotBlank
    private String keyId;

    private String privateKeyBase64;

    private String publicKeyBase64;

    @Positive
    private long accessTokenMinutes;

    public long expirationSeconds() {
        return accessTokenMinutes * 60;
    }
}
