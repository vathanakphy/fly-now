package com.flynow.api.shared.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(
        title = "Fly Now API",
        description = "Fly Now REST API"
), tags = {
        @Tag(name = "Authentication", description = "Registration, login, tokens and passwords"),
        @Tag(name = "Users", description = "Authenticated user profile management"),
        @Tag(name = "Admin Users", description = "Administrator account management")
})
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Access token returned by login or refresh"
)
public class OpenApiConfig {
}
