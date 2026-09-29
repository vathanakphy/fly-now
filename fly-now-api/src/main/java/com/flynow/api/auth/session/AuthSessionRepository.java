package com.flynow.api.auth.session;

import com.flynow.api.entities.AuthSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AuthSession s join fetch s.user where s.tokenHash = :tokenHash")
    Optional<AuthSession> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    List<AuthSession> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<AuthSession> findByIdAndUserId(UUID id, Long userId);

    @Modifying
    @Query("update AuthSession s set s.revokedAt = :now, s.revocationReason = :reason "
            + "where s.user.id = :userId and s.revokedAt is null")
    int revokeAllByUserId(@Param("userId") Long userId, @Param("reason") String reason, @Param("now") Instant now);

    @Modifying
    @Query("update AuthSession s set s.revokedAt = :now, s.revocationReason = :reason "
            + "where s.familyId = :familyId and s.revokedAt is null")
    int revokeFamily(@Param("familyId") UUID familyId, @Param("reason") String reason, @Param("now") Instant now);
}
