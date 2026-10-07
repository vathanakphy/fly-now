package com.flynow.api.user.service;

import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.entities.UserRole;
import com.flynow.api.auth.service.RefreshSessionService;
import com.flynow.api.shared.exception.BadRequestException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.shared.web.PageResponse;
import com.flynow.api.user.dto.response.UserResponse;
import com.flynow.api.user.mapper.UserMapper;
import com.flynow.api.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserAccountRepository userRepository;
    private final RefreshSessionService sessionService;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(Pageable pageable) {
        return PageResponse.from(userRepository.findAll(pageable).map(userMapper::toResponse));
    }

    @Transactional
    public UserResponse changeStatus(Long actorId, Long userId, AccountStatus status) {
        if (actorId.equals(userId) && status != AccountStatus.ACTIVE) {
            throw new BadRequestException("Administrators cannot lock or disable their own account");
        }
        UserAccount user = requireUser(userId);
        user.adminSetStatus(status);
        sessionService.revokeAll(userId, "ADMIN_STATUS_CHANGE");
        return userMapper.toResponse(user);
    }

    @Transactional
    public UserResponse changeRole(Long actorId, Long userId, UserRole role) {
        if (actorId.equals(userId) && role != UserRole.ADMIN) {
            throw new BadRequestException("Administrators cannot remove their own administrator role");
        }
        UserAccount user = requireUser(userId);
        user.adminSetRole(role);
        sessionService.revokeAll(userId, "ADMIN_ROLE_CHANGE");
        return userMapper.toResponse(user);
    }

    private UserAccount requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }
}
