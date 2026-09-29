package com.flynow.api.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountStatus status;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void recordSuccessfulLogin(Instant now) {
        lastLoginAt = now;
        failedLoginAttempts = 0;
        lockedUntil = null;
        if (status == AccountStatus.LOCKED) {
            status = AccountStatus.ACTIVE;
        }
    }

    public void recordFailedLogin(int maximumAttempts, Instant lockedUntil) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maximumAttempts) {
            status = AccountStatus.LOCKED;
            this.lockedUntil = lockedUntil;
        }
    }

    public void unlockIfExpired(Instant now) {
        if (status == AccountStatus.LOCKED && lockedUntil != null && !lockedUntil.isAfter(now)) {
            status = AccountStatus.ACTIVE;
            failedLoginAttempts = 0;
            lockedUntil = null;
        }
    }

    public void changePassword(String encodedPassword, Instant now) {
        password = encodedPassword;
        passwordChangedAt = now;
        tokenVersion++;
    }

    public void updateProfile(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public void invalidateAccessTokens() {
        tokenVersion++;
    }

    public void adminSetStatus(AccountStatus newStatus) {
        status = newStatus;
        if (newStatus == AccountStatus.ACTIVE) {
            failedLoginAttempts = 0;
            lockedUntil = null;
        }
        tokenVersion++;
    }

    public void adminSetRole(UserRole newRole) {
        role = newRole;
        tokenVersion++;
    }
}
