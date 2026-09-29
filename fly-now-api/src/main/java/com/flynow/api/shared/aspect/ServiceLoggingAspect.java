package com.flynow.api.shared.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Slf4j
public class ServiceLoggingAspect {

    @Around("execution(* com.flynow.api..*(..)) && @within(org.springframework.stereotype.Service)")
    public Object logExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.currentTimeMillis();
        String method = joinPoint.getSignature().toShortString();

        try {
            Object result = joinPoint.proceed();
            log.info("{} completed in {} ms", method, System.currentTimeMillis() - startedAt);
            return result;
        } catch (Exception exception) {
            log.error("{} failed after {} ms", method, System.currentTimeMillis() - startedAt);
            throw exception;
        }
    }
}
