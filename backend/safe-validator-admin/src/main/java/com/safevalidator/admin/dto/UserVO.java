package com.safevalidator.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public record UserVO(
        Long id,
        String username,
        String realName,
        String email,
        String phone,
        Integer status,
        LocalDateTime lastLoginAt,
        LocalDateTime createTime,
        List<String> roles
) {}
