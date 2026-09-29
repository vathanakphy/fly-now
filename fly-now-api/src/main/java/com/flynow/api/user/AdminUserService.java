package com.flynow.api.user;

import com.flynow.api.auth.audit.AuthAuditService;
import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.entities.UserRole;
import com.flynow.api.user.dto.UserResponse;
import com.flynow.api.auth.session.RefreshSessionService;
import com.flynow.api.shared.exception.BadRequestException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.shared.web.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserAccountRepository userRepository;
    private final RefreshSessionService sessionService;
    private final AuthAuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(Pageable pageable) {
        return PageResponse.from(userRepository.findAll(pageable).map(UserResponse::from));
    }

    @Transactional
    public UserResponse changeStatus(Long actorId, Long userId, AccountStatus status) {
        if (actorId.equals(userId) && status != AccountStatus.ACTIVE) {
            throw new BadRequestException("Administrators cannot lock or disable their own account");
        }
        UserAccount user = requireUser(userId);
        user.adminSetStatus(status);
        sessionService.revokeAll(userId, "ADMIN_STATUS_CHANGE");
        auditService.record(user, "ADMIN_STATUS_CHANGED", true, null, null,
                "actor=" + actorId + ",status=" + status);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse changeRole(Long actorId, Long userId, UserRole role) {
        if (actorId.equals(userId) && role != UserRole.ADMIN) {
            throw new BadRequestException("Administrators cannot remove their own administrator role");
        }
        UserAccount user = requireUser(userId);
        user.adminSetRole(role);
        sessionService.revokeAll(userId, "ADMIN_ROLE_CHANGE");
        auditService.record(user, "ADMIN_ROLE_CHANGED", true, null, null,
                "actor=" + actorId + ",role=" + role);
        return UserResponse.from(user);
    }

    private UserAccount requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }
}
