package com.safevalidator.admin.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserInfo user
) {
    public record UserInfo(Long id, String username, String realName, List<String> roles) {}
}