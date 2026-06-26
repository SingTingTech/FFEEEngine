package com.safevalidator.common.security;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long currentUserId() {
        return currentUserIdOrNull()
                .orElseThrow(() -> new BizException(ErrorCode.UNAUTHORIZED));
    }

    public static Optional<Long> currentUserIdOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof AuthenticatedUser u) {
            return Optional.ofNullable(u.userId());
        }
        return Optional.empty();
    }

    public record AuthenticatedUser(Long userId, String username) {}
}
