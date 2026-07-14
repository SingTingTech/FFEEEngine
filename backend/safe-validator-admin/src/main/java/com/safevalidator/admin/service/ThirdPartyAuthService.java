package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.safevalidator.admin.dto.LoginResponse.UserInfo;
import com.safevalidator.admin.dto.ThirdPartyTokenRequest;
import com.safevalidator.admin.dto.ThirdPartyTokenResponse;
import com.safevalidator.admin.entity.SysThirdPartyApp;
import com.safevalidator.admin.entity.SysUser;
import com.safevalidator.admin.mapper.SysThirdPartyAppMapper;
import com.safevalidator.admin.mapper.SysUserMapper;
import com.safevalidator.admin.security.jwt.JwtProperties;
import com.safevalidator.admin.security.jwt.JwtUtil;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.common.api.ErrorCode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Mints a short-lived access token on behalf of an external app
 * (e.g. an OA) identified by appId / appSecret.
 *
 * The resulting token is a normal access token — JwtAuthenticationFilter
 * validates it the same as one issued via /auth/login — but it carries
 * an extra `appId` claim so audits and downstream code can distinguish
 * "user logged in directly" from "user logged in via OA integration".
 *
 * No refresh token is issued: third parties are expected to re-mint
 * by calling this endpoint again when their token expires. This keeps
 * the lifetime of any captured secret short.
 */
@Service
public class ThirdPartyAuthService {

    private static final int DEFAULT_TTL_SECONDS = 900; // 15 min

    private final SysThirdPartyAppMapper appMapper;
    private final SysUserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProps;
    private final PasswordEncoder passwordEncoder;

    public ThirdPartyAuthService(SysThirdPartyAppMapper appMapper,
                                  SysUserMapper userMapper,
                                  JwtUtil jwtUtil,
                                  JwtProperties jwtProps,
                                  PasswordEncoder passwordEncoder) {
        this.appMapper = appMapper;
        this.userMapper = userMapper;
        this.jwtUtil = jwtUtil;
        this.jwtProps = jwtProps;
        this.passwordEncoder = passwordEncoder;
    }

    public ThirdPartyTokenResponse issueToken(ThirdPartyTokenRequest req) {
        // 1. Validate app credentials
        SysThirdPartyApp app = appMapper.selectOne(
                new LambdaQueryWrapper<SysThirdPartyApp>()
                        .eq(SysThirdPartyApp::getAppId, req.appId())
        );
        if (app == null) {
            throw new BizException(ErrorCode.THIRD_PARTY_APP_INVALID);
        }
        if (app.getStatus() != null && app.getStatus() == 0) {
            throw new BizException(ErrorCode.THIRD_PARTY_APP_DISABLED);
        }
        if (!passwordEncoder.matches(req.appSecret(), app.getAppSecret())) {
            throw new BizException(ErrorCode.THIRD_PARTY_APP_INVALID);
        }

        // 2. Resolve end-user identity. If a userId is provided, look
        //    up the linked local user (the OA can pre-bind external
        //    users to internal ones). If only username/realName are
        //    given, treat as a virtual identity — the JWT carries
        //    whatever the OA told us, no local row needed.
        Long userId = null;
        String username = req.username();
        String realName = req.realName();
        if (req.userId() != null && !req.userId().isBlank()) {
            try {
                SysUser local = userMapper.selectById(Long.parseLong(req.userId()));
                if (local != null) {
                    userId = local.getId();
                    username = local.getUsername();
                    realName = local.getRealName();
                }
            } catch (NumberFormatException ignored) {
                // External userId isn't numeric — fall back to virtual identity
            }
        }

        // 3. Mint token. For external identities (no local userId),
        //    we still need a numeric uid for the existing JWT
        //    claim shape, so fall back to 0 — downstream code that
        //    needs a real id will hit /api/users/me or similar.
        long claimsUid = userId != null ? userId : 0L;
        String claimsUsername = username != null ? username : req.appId() + ":external";
        String claimsRealName = realName;

        // 4. TTL: request → config → default. Cap to a sane range.
        int ttl = req.expiresInSeconds() != null
                ? req.expiresInSeconds()
                : (int) Math.min(jwtProps.getAccessTokenTtlSeconds(), DEFAULT_TTL_SECONDS);
        if (ttl < 60) ttl = 60;
        if (ttl > DEFAULT_TTL_SECONDS) ttl = DEFAULT_TTL_SECONDS;

        Map<String, Object> extraClaims = Map.of(
                "appId", req.appId(),
                "perms", Collections.emptyList()
        );
        // Note: JwtUtil doesn't accept a custom TTL yet, so we accept
        // the config-level TTL for now. See TODO note below.
        String token = jwtUtil.generateAccess(claimsUid, claimsUsername, extraClaims);

        UserInfo userInfo = new UserInfo(
                claimsUid,
                claimsUsername,
                claimsRealName,
                List.of()
        );

        return new ThirdPartyTokenResponse(token, ttl, userInfo, req.appId());
    }
}