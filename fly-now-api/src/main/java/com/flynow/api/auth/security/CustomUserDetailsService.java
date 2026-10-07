package com.flynow.api.auth.security;

import com.flynow.api.entities.AccountStatus;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserAccountRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) {
        UserAccount user = userRepository.findByUsername(username.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid username or password"));

        user.unlockIfExpired(java.time.Instant.now());

        boolean enabled = user.getStatus() == AccountStatus.ACTIVE;
        boolean accountNonLocked = user.getStatus() != AccountStatus.LOCKED;

        return new User(
                user.getUsername(),
                user.getPassword(),
                enabled,
                true,
                true,
                accountNonLocked,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
