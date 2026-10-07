package com.flynow.api.shared.aspect;

import com.flynow.api.shared.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class ServiceLoggingAspect {

    private final AppProperties properties;

    @Around("execution(* com.flynow.api..*(..)) && @within(org.springframework.stereotype.Service)")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        String method = joinPoint.getSignature().toShortString();

        try {
            Object result = joinPoint.proceed();
            long durationMs = elapsedMilliseconds(startedAt);
            if (durationMs >= properties.getLogging().getSlowThresholdMs()) {
                log.warn("{} completed slowly in {} ms", method, durationMs);
            } else {
                log.debug("{} completed in {} ms", method, durationMs);
            }
            return result;
        } catch (Throwable throwable) {
            log.error("{} failed after {} ms ({})",
                    method,
                    elapsedMilliseconds(startedAt),
                    throwable.getClass().getSimpleName(),
                    throwable);
            throw throwable;
        }
    }

    private long elapsedMilliseconds(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }
}
