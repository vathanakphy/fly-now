package com.flynow.api.auth.web;

import com.flynow.api.auth.config.AuthProperties;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCookieFactoryTest {

    @Test
    void createsSecureRefreshCookieFromConfiguration() {
        AuthProperties properties = new AuthProperties();
        properties.setRefreshCookieSecure(true);
        RefreshCookieFactory factory = new RefreshCookieFactory(properties);

        String cookie = factory.create("secret", Instant.now().plusSeconds(60)).toString();

        assertThat(cookie)
                .contains("refresh_token=secret")
                .contains("Path=/api/auth")
                .contains("Secure")
                .contains("HttpOnly")
                .contains("SameSite=Strict");
    }

    @Test
    void clearsRefreshCookieImmediately() {
        AuthProperties properties = new AuthProperties();
        RefreshCookieFactory factory = new RefreshCookieFactory(properties);

        assertThat(factory.clear().toString())
                .contains("refresh_token=")
                .contains("Max-Age=0");
    }
}
