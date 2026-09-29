package com.flynow.api.auth.audit;

import com.flynow.api.user.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthAuditService {

    private final AuthAuditEventRepository repository;

    @Transactional
    public void record(
            UserAccount user,
            String eventType,
            boolean success,
            String ipAddress,
            String userAgent,
            String detail
    ) {
        repository.save(AuthAuditEvent.builder()
                .user(user)
                .eventType(eventType)
                .success(success)
                .ipAddress(truncate(ipAddress, 64))
                .userAgent(truncate(userAgent, 500))
                .detail(truncate(detail, 500))
                .createdAt(Instant.now())
                .build());
    }

    private String truncate(String value, int maximumLength) {
        if (value == null || value.length() <= maximumLength) {
            return value;
        }
        return value.substring(0, maximumLength);
    }
}
