package com.flynow.api.auth.token;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from AuthToken t join fetch t.user where t.id = :id and t.type = :type")
    Optional<AuthToken> findByIdAndTypeForUpdate(@Param("id") UUID id, @Param("type") AuthTokenType type);

    @Modifying
    @Query("update AuthToken t set t.usedAt = :now where t.user.id = :userId and t.type = :type and t.usedAt is null")
    int invalidateActive(@Param("userId") Long userId, @Param("type") AuthTokenType type, @Param("now") Instant now);
}
