package com.safevalidator.admin.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

import java.util.logging.Level;
import java.util.logging.Logger;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = Logger.getLogger(AuditAspect.class.getName());

    private final AuditService auditService;

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    @Pointcut("@annotation(org.springframework.security.access.prepost.PreAuthorize)")
    public void protectedEndpoint() {}

    @Around("protectedEndpoint()")
    public Object audit(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        String module = "unknown";
        String action = pjp.getSignature().getName();
        boolean success = true;
        String errorMsg = null;

        try {
            return pjp.proceed();
        } catch (Throwable ex) {
            success = false;
            errorMsg = ex.getMessage();
            throw ex;
        } finally {
            long cost = System.currentTimeMillis() - start;
            try {
                auditService.record(module, action, null, success, errorMsg, cost);
            } catch (Exception ex) {
                log.log(Level.WARNING, "Failed to dispatch audit record", ex);
            }
        }
    }
}
