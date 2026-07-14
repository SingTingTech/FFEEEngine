package com.safevalidator.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/auth/third-party-token.
 *
 * Required: appId, appSecret (the OA's credentials).
 * Optional: userId/username/realName describe the end user the OA is
 * acting for — they end up in the JWT claims so downstream code can
 * audit / scope by identity. expiresInSeconds is capped to a sane
 * upper bound so a misconfigured caller can't mint a year-long
 * token by mistake.
 */
public record ThirdPartyTokenRequest(
        @NotBlank String appId,
        @NotBlank String appSecret,
        String userId,
        String username,
        String realName,
        @Min(60) @Max(7200) Integer expiresInSeconds
) {}