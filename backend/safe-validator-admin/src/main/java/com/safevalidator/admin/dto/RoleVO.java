package com.safevalidator.admin.dto;

import java.util.List;

public record RoleVO(
        Long id,
        String code,
        String name,
        String description,
        Integer status,
        List<Long> permissionIds
) {}
