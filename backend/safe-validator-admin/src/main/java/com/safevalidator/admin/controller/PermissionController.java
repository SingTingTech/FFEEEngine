package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.PermissionNode;
import com.safevalidator.admin.service.PermissionService;
import com.safevalidator.common.api.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/tree")
    public Result<List<PermissionNode>> tree() {
        return Result.ok(permissionService.tree());
    }
}
