package com.safevalidator.admin.controller;

import com.safevalidator.admin.dto.RoleRequest;
import com.safevalidator.admin.dto.RoleVO;
import com.safevalidator.admin.service.RoleService;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.api.Result;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('system:role:list')")
    public Result<PageResult<RoleVO>> page(PageQuery query) {
        return Result.ok(roleService.page(query));
    }

    @GetMapping("/all")
    public Result<List<RoleVO>> listAll() {
        return Result.ok(roleService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('system:role:create')")
    public Result<Long> create(@Valid @RequestBody RoleRequest req) {
        return Result.ok(roleService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('system:role:update')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody RoleRequest req) {
        roleService.update(id, req);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('system:role:delete')")
    public Result<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return Result.ok();
    }
}
