package com.safevalidator.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UserUpdateRequest(
        @Size(min = 3, max = 64) String username,
        String password,
        String realName,
        @Email String email,
        String phone,
        Integer status,
        List<Long> roleIds
) {}
