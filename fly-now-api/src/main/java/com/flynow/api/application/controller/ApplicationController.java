package com.flynow.api.application.controller;

import com.flynow.api.application.dto.request.CreateApplicationRequest;
import com.flynow.api.application.dto.request.UpdateApplicationRequest;
import com.flynow.api.application.dto.response.ApplicationResponse;
import com.flynow.api.application.mapper.ApplicationMapper;
import com.flynow.api.application.service.ApplicationService;
import com.flynow.api.application.web.ApplicationApiPaths;
import com.flynow.api.auth.security.AuthenticatedUserIdResolver;
import com.flynow.api.entities.Application;
import com.flynow.api.shared.web.ApiResponse;
import com.flynow.api.shared.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApplicationApiPaths.BASE)
@RequiredArgsConstructor
@Tag(name = "Applications")
@SecurityRequirement(name = "bearerAuth")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final ApplicationMapper applicationMapper;
    private final AuthenticatedUserIdResolver userIdResolver;

    @PostMapping
    @Operation(summary = "Create an application")
    public ResponseEntity<ApiResponse<ApplicationResponse>> create(
            Authentication authentication,
            @Valid @RequestBody CreateApplicationRequest request
    ) {
        Long userId = userIdResolver.require(authentication);
        Application application = applicationService.create(userId, request);
        ApplicationResponse response = applicationMapper.toResponse(application);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application created successfully", response));
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's applications")
    public ApiResponse<PageResponse<ApplicationResponse>> list(
            Authentication authentication,
            @PageableDefault(size = 20, sort = {"updatedAt", "id"}, direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        Long userId = userIdResolver.require(authentication);
        Page<Application> applications = applicationService.list(userId, pageable);
        Page<ApplicationResponse> applicationResponses = applications.map(applicationMapper::toResponse);
        PageResponse<ApplicationResponse> response = PageResponse.from(applicationResponses);

        return ApiResponse.success("Applications retrieved", response);
    }

    @GetMapping(ApplicationApiPaths.BY_ID)
    @Operation(summary = "Get an application owned by the authenticated user")
    public ApiResponse<ApplicationResponse> get(
            Authentication authentication,
            @PathVariable UUID applicationId
    ) {
        Long userId = userIdResolver.require(authentication);
        Application application = applicationService.get(userId, applicationId);
        ApplicationResponse response = applicationMapper.toResponse(application);

        return ApiResponse.success("Application retrieved", response);
    }

    @PutMapping(ApplicationApiPaths.BY_ID)
    @Operation(summary = "Update an application's metadata")
    public ApiResponse<ApplicationResponse> update(
            Authentication authentication,
            @PathVariable UUID applicationId,
            @Valid @RequestBody UpdateApplicationRequest request
    ) {
        Long userId = userIdResolver.require(authentication);
        Application application = applicationService.update(userId, applicationId, request);
        ApplicationResponse response = applicationMapper.toResponse(application);

        return ApiResponse.success("Application updated successfully", response);
    }

    @DeleteMapping(ApplicationApiPaths.BY_ID)
    @Operation(summary = "Delete an application")
    public ApiResponse<Void> delete(
            Authentication authentication,
            @PathVariable UUID applicationId
    ) {
        Long userId = userIdResolver.require(authentication);
        applicationService.delete(userId, applicationId);

        return ApiResponse.success("Application deleted successfully", null);
    }
}
