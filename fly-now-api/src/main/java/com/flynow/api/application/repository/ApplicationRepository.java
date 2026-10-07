package com.flynow.api.application.repository;

import com.flynow.api.entities.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Page<Application> findAllByOwner_IdAndDeletedAtIsNull(Long ownerId, Pageable pageable);

    Optional<Application> findByIdAndOwner_IdAndDeletedAtIsNull(UUID id, Long ownerId);

    boolean existsByOwner_IdAndSlugAndDeletedAtIsNull(Long ownerId, String slug);

    boolean existsByOwner_IdAndSlugAndIdNotAndDeletedAtIsNull(Long ownerId, String slug, UUID id);
}
