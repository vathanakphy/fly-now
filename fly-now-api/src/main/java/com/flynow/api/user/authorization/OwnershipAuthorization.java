package com.flynow.api.user.authorization;

import com.flynow.api.auth.security.AuthenticatedUserIdResolver;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Reusable ownership decisions for Spring Security method expressions.
 *
 * <p>The owner ID passed to this component must come from a trusted entity or
 * repository lookup. Never pass an owner ID supplied by an HTTP request.</p>
 */
@Component("ownershipAuthorization")
@RequiredArgsConstructor
public class OwnershipAuthorization {

    private static final String ADMIN_AUTHORITY = "ROLE_ADMIN";

    private final AuthenticatedUserIdResolver userIdResolver;

    public boolean isOwner(Authentication authentication, Long persistedOwnerId) {
        if (persistedOwnerId == null) {
            return false;
        }

        return userIdResolver.resolve(authentication)
                .map(persistedOwnerId::equals)
                .orElse(false);
    }

    public boolean isOwnerOrAdmin(Authentication authentication, Long persistedOwnerId) {
        return hasAdminAuthority(authentication) || isOwner(authentication, persistedOwnerId);
    }

    private boolean hasAdminAuthority(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .anyMatch(authority -> ADMIN_AUTHORITY.equals(authority.getAuthority()));
    }
}
