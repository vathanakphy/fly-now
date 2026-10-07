package com.flynow.api.application.mapper;

import com.flynow.api.application.dto.response.ApplicationResponse;
import com.flynow.api.entities.Application;
import org.springframework.stereotype.Component;

@Component
public class ApplicationMapper {

    public ApplicationResponse toResponse(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getName(),
                application.getSlug(),
                application.getDescription(),
                application.getLifecycleState().name(),
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }
}
