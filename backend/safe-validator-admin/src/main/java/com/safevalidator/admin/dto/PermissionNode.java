package com.safevalidator.admin.dto;

import java.util.List;

public record PermissionNode(
        Long id,
        Long parentId,
        String code,
        String name,
        String type,
        String path,
        String icon,
        Integer sortOrder,
        List<PermissionNode> children
) {}
