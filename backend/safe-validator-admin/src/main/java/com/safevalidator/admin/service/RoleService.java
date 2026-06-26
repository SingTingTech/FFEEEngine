package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.safevalidator.admin.dto.RoleRequest;
import com.safevalidator.admin.dto.RoleVO;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysRolePermissionMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class RoleService {

    private final SysRoleMapper roleMapper;
    private final SysRolePermissionMapper rolePermissionMapper;

    public RoleService(SysRoleMapper roleMapper, SysRolePermissionMapper rolePermissionMapper) {
        this.roleMapper = roleMapper;
        this.rolePermissionMapper = rolePermissionMapper;
    }

    public PageResult<RoleVO> page(PageQuery query) {
        IPage<SysRole> page = new Page<>(query.pageNum(), query.pageSize());
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.keyword())) {
            wrapper.like(SysRole::getName, query.keyword())
                    .or().like(SysRole::getCode, query.keyword());
        }
        wrapper.orderByDesc(SysRole::getCreateTime);
        IPage<SysRole> result = roleMapper.selectPage(page, wrapper);

        List<RoleVO> vos = result.getRecords().stream().map(this::toVO).toList();
        return PageResult.of(vos, result.getTotal(), query.pageNum(), query.pageSize());
    }

    public List<RoleVO> listAll() {
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getStatus, 1)
                        .orderByAsc(SysRole::getCode)
        );
        return roles.stream().map(this::toVO).toList();
    }

    @Transactional
    public Long create(RoleRequest req) {
        Long existing = roleMapper.selectCount(
                new LambdaQueryWrapper<SysRole>().eq(SysRole::getCode, req.code())
        );
        if (existing > 0) throw new BizException(ErrorCode.ROLE_NAME_DUPLICATE);

        SysRole role = new SysRole();
        role.setCode(req.code());
        role.setName(req.name());
        role.setDescription(req.description());
        role.setStatus(req.status() == null ? 1 : req.status());
        roleMapper.insert(role);

        if (req.permissionIds() != null) {
            for (Long pid : req.permissionIds()) {
                rolePermissionMapper.insert(role.getId(), pid);
            }
        }
        return role.getId();
    }

    @Transactional
    public void update(Long id, RoleRequest req) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BizException(ErrorCode.ROLE_NOT_FOUND);

        role.setName(req.name());
        role.setDescription(req.description());
        if (req.status() != null) role.setStatus(req.status());
        roleMapper.updateById(role);

        if (req.permissionIds() != null) {
            rolePermissionMapper.deleteByRoleId(id);
            for (Long pid : req.permissionIds()) {
                rolePermissionMapper.insert(id, pid);
            }
        }
    }

    @Transactional
    public void delete(Long id) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BizException(ErrorCode.ROLE_NOT_FOUND);
        roleMapper.deleteById(id);
        rolePermissionMapper.deleteByRoleId(id);
    }

    private RoleVO toVO(SysRole role) {
        List<Long> permIds = rolePermissionMapper.selectPermissionIdsByRoleId(role.getId());
        return new RoleVO(role.getId(), role.getCode(), role.getName(),
                role.getDescription(), role.getStatus(), permIds);
    }
}
