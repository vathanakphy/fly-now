package com.flynow.api.user;

import com.flynow.api.entities.UserAccount;
import com.flynow.api.shared.exception.ConflictException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.user.dto.UpdateProfileRequest;
import com.flynow.api.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserAccountRepository userRepository;
    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return UserResponse.from(requireUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(
            Long userId,
            UpdateProfileRequest request
    ) {
        UserAccount user = requireUser(userId);
        String email = normalize(request.email());
        if (userRepository.existsByEmailAndIdNot(email, userId)) {
            throw new ConflictException("Email is already in use");
        }

        user.updateProfile(request.name().trim(), email);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Email is already in use");
        }
        return UserResponse.from(user);
    }

    private UserAccount requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User was not found"));
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
