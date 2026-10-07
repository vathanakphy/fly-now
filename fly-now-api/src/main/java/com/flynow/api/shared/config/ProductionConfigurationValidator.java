package com.flynow.api.shared.config;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.security.JwtProperties;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("prod")
public class ProductionConfigurationValidator implements InitializingBean {

    private final AuthProperties authProperties;
    private final JwtProperties jwtProperties;
    private final AppProperties appProperties;

    public ProductionConfigurationValidator(
            AuthProperties authProperties,
            JwtProperties jwtProperties,
            AppProperties appProperties
    ) {
        this.authProperties = authProperties;
        this.jwtProperties = jwtProperties;
        this.appProperties = appProperties;
    }

    @Override
    public void afterPropertiesSet() {
        require(authProperties.isRefreshCookieSecure(),
                "Production requires app.auth.refresh-cookie-secure=true");
        require(authProperties.isMailEnabled(),
                "Production requires a real email service; mock reset-token logging is disabled");
        require(hasText(jwtProperties.getPrivateKeyBase64()),
                "Production requires app.jwt.private-key-base64");
        require(hasText(jwtProperties.getPublicKeyBase64()),
                "Production requires app.jwt.public-key-base64");
        List<String> allowedOrigins = appProperties.getCors().getAllowedOrigins();
        require(allowedOrigins.stream().allMatch(this::hasText),
                "Production requires at least one nonblank CORS origin");
        require(allowedOrigins.stream()
                        .noneMatch(origin -> origin.contains("localhost") || origin.contains("127.0.0.1")),
                "Production CORS origins must not use localhost");
        require(allowedOrigins.stream().allMatch(origin -> origin.startsWith("https://")),
                "Production CORS origins must use HTTPS");
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
