package com.safevalidator.admin.dto;

import com.safevalidator.admin.dto.LoginResponse.UserInfo;

/**
 * Response body for third-party token issuance.
 *
 * Intentionally only the access token + TTL — no refresh token.
 * Third-party callers are expected to re-mint on demand; this avoids
 * the OA holding long-lived secrets that could be replayed.
 */
public record ThirdPartyTokenResponse(
        String accessToken,
        long expiresIn,
        UserInfo user,
        String appId
) {}