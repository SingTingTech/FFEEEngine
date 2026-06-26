package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.safevalidator.admin.dto.LoginRequest;
import com.safevalidator.admin.dto.LoginResponse;
import com.safevalidator.admin.dto.LoginResponse.UserInfo;
import com.safevalidator.admin.dto.RefreshRequest;
import com.safevalidator.admin.entity.SysPermission;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.entity.SysUser;
import com.safevalidator.admin.mapper.SysPermissionMapper;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysUserMapper;
import com.safevalidator.admin.security.TokenBlacklistService;
import com.safevalidator.admin.security.jwt.JwtProperties;
import com.safevalidator.admin.security.jwt.JwtUtil;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysPermissionMapper permissionMapper;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProps;
    private final PasswordEncoder passwordEncoder;
    private final TokenBlacklistService blacklistService;

    public AuthService(SysUserMapper userMapper, SysRoleMapper roleMapper,
                       SysPermissionMapper permissionMapper, JwtUtil jwtUtil,
                       JwtProperties jwtProps, PasswordEncoder passwordEncoder,
                       TokenBlacklistService blacklistService) {
        this.userMapper = userMapper;
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
        this.jwtUtil = jwtUtil;
        this.jwtProps = jwtProps;
        this.passwordEncoder = passwordEncoder;
        this.blacklistService = blacklistService;
    }

    @Transactional
    public LoginResponse login(LoginRequest req) {
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, req.username())
        );
        if (user == null) {
            throw new BizException(ErrorCode.USER_PASSWORD_INVALID);
        }
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BizException(ErrorCode.USER_PASSWORD_INVALID);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(ErrorCode.USER_DISABLED);
        }

        List<SysRole> roles = queryUserRoles(user.getId());
        List<String> permissions = queryUserPermissions(user.getId());

        String access = jwtUtil.generateAccess(user.getId(), user.getUsername(),
                Map.of("perms", permissions));
        String refresh = jwtUtil.generateRefresh(user.getId(), user.getUsername());

        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);

        List<String> roleCodes = roles.stream().map(SysRole::getCode).toList();
        return new LoginResponse(
                access, refresh, jwtProps.getAccessTokenTtlSeconds(),
                new UserInfo(user.getId(), user.getUsername(), user.getRealName(), roleCodes)
        );
    }

    public LoginResponse refresh(RefreshRequest req) {
        Claims claims;
        try {
            claims = jwtUtil.parse(req.refreshToken());
        } catch (JwtException ex) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }
        if (!JwtUtil.TYPE_REFRESH.equals(claims.get(JwtUtil.CLAIM_TYPE))) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }

        Long userId = claims.get("uid", Long.class);
        SysUser user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == 0) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }

        List<String> permissions = queryUserPermissions(userId);
        List<String> roleCodes = queryUserRoles(userId).stream().map(SysRole::getCode).toList();

        String access = jwtUtil.generateAccess(user.getId(), user.getUsername(),
                Map.of("perms", permissions));

        return new LoginResponse(
                access, req.refreshToken(), jwtProps.getAccessTokenTtlSeconds(),
                new UserInfo(user.getId(), user.getUsername(), user.getRealName(), roleCodes)
        );
    }

    public void logout(String accessToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            blacklistService.blacklist(accessToken);
        }
    }

    private List<SysRole> queryUserRoles(Long userId) {
        return roleMapper.queryRolesByUserId(userId);
    }

    private List<String> queryUserPermissions(Long userId) {
        return permissionMapper.queryPermissionsByUserId(userId).stream()
                .map(SysPermission::getCode)
                .toList();
    }
}