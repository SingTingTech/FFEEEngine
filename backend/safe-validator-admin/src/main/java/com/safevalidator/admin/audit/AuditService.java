package com.safevalidator.admin.audit;

import com.safevalidator.admin.entity.SysAuditLog;
import com.safevalidator.admin.mapper.SysAuditLogMapper;
import com.safevalidator.common.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class AuditService {

    private static final Logger log = Logger.getLogger(AuditService.class.getName());

    private final SysAuditLogMapper auditLogMapper;

    public AuditService(SysAuditLogMapper auditLogMapper) {
        this.auditLogMapper = auditLogMapper;
    }

    @Async("auditExecutor")
    public void record(String module, String action, String resourceId, boolean success, String errorMsg, long costMs) {
        try {
            SysAuditLog logEntry = new SysAuditLog();
            logEntry.setUserId(SecurityUtils.currentUserIdOrNull().orElse(null));
            logEntry.setModule(module);
            logEntry.setAction(action);
            logEntry.setResourceId(resourceId);
            logEntry.setStatus(success ? 1 : 0);
            logEntry.setErrorMsg(errorMsg);
            logEntry.setCostMs(costMs);
            logEntry.setCreateTime(LocalDateTime.now());

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                logEntry.setMethod(req.getMethod());
                logEntry.setPath(req.getRequestURI());
                logEntry.setIp(req.getRemoteAddr());
                logEntry.setUserAgent(req.getHeader("User-Agent"));
            }

            auditLogMapper.insert(logEntry);
        } catch (Exception ex) {
            log.log(Level.WARNING, "Failed to record audit log", ex);
        }
    }
}
