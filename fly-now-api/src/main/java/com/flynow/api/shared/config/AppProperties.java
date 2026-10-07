package com.flynow.api.shared.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app")
@Validated
@Getter
@Setter
public class AppProperties {

    @Valid
    private Cors cors = new Cors();
    @Valid
    private Pagination pagination = new Pagination();
    @Valid
    private Logging logging = new Logging();

    @Getter
    @Setter
    public static class Cors {
        @NotEmpty
        private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:3000"));
    }

    @Getter
    @Setter
    public static class Pagination {
        @Positive
        private int maxPageSize = 100;
    }

    @Getter
    @Setter
    public static class Logging {
        @Positive
        private long slowThresholdMs = 500;
    }
}
