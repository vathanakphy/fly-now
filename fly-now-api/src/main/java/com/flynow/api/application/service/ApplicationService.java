package com.flynow.api.application.service;

import com.flynow.api.application.dto.request.CreateApplicationRequest;
import com.flynow.api.application.dto.request.UpdateApplicationRequest;
import com.flynow.api.application.repository.ApplicationRepository;
import com.flynow.api.entities.Application;
import com.flynow.api.entities.ApplicationLifecycleState;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.shared.exception.ConflictException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserAccountRepository userRepository;

    @Transactional
    public Application create(Long userId, CreateApplicationRequest request) {
        String slug = request.slug().trim();
        ensureSlugAvailable(userId, slug);

        UserAccount owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
        Application application = Application.builder()
                .owner(owner)
                .name(request.name().trim())
                .slug(slug)
                .description(normalizeDescription(request.description()))
                .lifecycleState(ApplicationLifecycleState.DRAFT)
                .build();

        return save(application);
    }

    @Transactional(readOnly = true)
    public Page<Application> list(Long userId, Pageable pageable) {
        return applicationRepository.findAllByOwner_IdAndDeletedAtIsNull(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Application get(Long userId, UUID applicationId) {
        return requireOwnedApplication(userId, applicationId);
    }

    @Transactional
    public Application update(Long userId, UUID applicationId, UpdateApplicationRequest request) {
        Application application = requireOwnedApplication(userId, applicationId);
        String slug = request.slug().trim();
        if (applicationRepository.existsByOwner_IdAndSlugAndIdNotAndDeletedAtIsNull(
                userId, slug, applicationId)) {
            throw slugConflict();
        }

        application.updateMetadata(
                request.name().trim(),
                slug,
                normalizeDescription(request.description())
        );
        return save(application);
    }

    @Transactional
    public void delete(Long userId, UUID applicationId) {
        Application application = requireOwnedApplication(userId, applicationId);
        application.softDelete(Instant.now());
    }

    private Application requireOwnedApplication(Long userId, UUID applicationId) {
        return applicationRepository.findByIdAndOwner_IdAndDeletedAtIsNull(applicationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Application was not found"));
    }

    private void ensureSlugAvailable(Long userId, String slug) {
        if (applicationRepository.existsByOwner_IdAndSlugAndDeletedAtIsNull(userId, slug)) {
            throw slugConflict();
        }
    }

    private Application save(Application application) {
        try {
            return applicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException exception) {
            throw slugConflict();
        }
    }

    private ConflictException slugConflict() {
        return new ConflictException("An application with this slug already exists");
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }
}
