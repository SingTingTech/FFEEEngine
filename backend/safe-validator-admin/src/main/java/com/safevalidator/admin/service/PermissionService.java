package com.safevalidator.admin.service;

import com.safevalidator.admin.dto.PermissionNode;
import com.safevalidator.admin.entity.SysPermission;
import com.safevalidator.admin.mapper.SysPermissionMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PermissionService {

    private final SysPermissionMapper permissionMapper;

    public PermissionService(SysPermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    public List<PermissionNode> tree() {
        List<SysPermission> all = permissionMapper.selectList(null);
        Map<Long, List<SysPermission>> byParent = all.stream()
                .collect(Collectors.groupingBy(SysPermission::getParentId));

        return buildChildren(0L, byParent);
    }

    private List<PermissionNode> buildChildren(Long parentId, Map<Long, List<SysPermission>> byParent) {
        List<SysPermission> children = byParent.getOrDefault(parentId, List.of());
        List<PermissionNode> nodes = new ArrayList<>();
        for (SysPermission p : children) {
            nodes.add(new PermissionNode(
                    p.getId(), p.getParentId(), p.getCode(), p.getName(),
                    p.getType(), p.getPath(), p.getIcon(), p.getSortOrder(),
                    buildChildren(p.getId(), byParent)
            ));
        }
        return nodes;
    }
}
