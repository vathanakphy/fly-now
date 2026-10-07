package com.flynow.api.shared.config;

import com.flynow.api.auth.config.AuthProperties;
import com.flynow.api.auth.security.JwtProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionConfigurationValidatorTest {

    @Test
    void acceptsSecureProductionConfiguration() {
        ProductionConfigurationValidator validator = validator(true, true, "private", "public",
                "https://fly-now.example");

        assertThatCode(validator::afterPropertiesSet).doesNotThrowAnyException();
    }

    @Test
    void rejectsInsecureRefreshCookie() {
        ProductionConfigurationValidator validator = validator(false, true, "private", "public",
                "https://fly-now.example");

        assertThatThrownBy(validator::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("refresh-cookie-secure");
    }

    private ProductionConfigurationValidator validator(
            boolean secureCookie,
            boolean mailEnabled,
            String privateKey,
            String publicKey,
            String corsOrigin
    ) {
        AuthProperties auth = new AuthProperties();
        auth.setRefreshCookieSecure(secureCookie);
        auth.setMailEnabled(mailEnabled);

        JwtProperties jwt = new JwtProperties();
        jwt.setPrivateKeyBase64(privateKey);
        jwt.setPublicKeyBase64(publicKey);

        AppProperties app = new AppProperties();
        app.getCors().setAllowedOrigins(List.of(corsOrigin));
        return new ProductionConfigurationValidator(auth, jwt, app);
    }
}
