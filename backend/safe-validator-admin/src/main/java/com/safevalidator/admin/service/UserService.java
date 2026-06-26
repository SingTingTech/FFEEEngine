package com.safevalidator.admin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.safevalidator.admin.dto.UserCreateRequest;
import com.safevalidator.admin.dto.UserUpdateRequest;
import com.safevalidator.admin.dto.UserVO;
import com.safevalidator.admin.entity.SysRole;
import com.safevalidator.admin.entity.SysUser;
import com.safevalidator.admin.mapper.SysRoleMapper;
import com.safevalidator.admin.mapper.SysUserMapper;
import com.safevalidator.admin.mapper.SysUserRoleMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

@Service
public class UserService {

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(SysUserMapper userMapper, SysRoleMapper roleMapper,
                       SysUserRoleMapper userRoleMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.roleMapper = roleMapper;
        this.userRoleMapper = userRoleMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public PageResult<UserVO> page(PageQuery query) {
        IPage<SysUser> page = new Page<>(query.pageNum(), query.pageSize());
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.keyword())) {
            wrapper.like(SysUser::getUsername, query.keyword())
                    .or().like(SysUser::getRealName, query.keyword());
        }
        wrapper.orderByDesc(SysUser::getCreateTime);
        IPage<SysUser> result = userMapper.selectPage(page, wrapper);

        List<UserVO> vos = result.getRecords().stream().map(this::toVO).toList();
        return PageResult.of(vos, result.getTotal(), query.pageNum(), query.pageSize());
    }

    public UserVO getById(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        return toVO(user);
    }

    @Transactional
    public Long create(UserCreateRequest req) {
        Long existing = userMapper.selectCount(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, req.username())
        );
        if (existing > 0) throw new BizException(ErrorCode.USERNAME_DUPLICATE);

        SysUser user = new SysUser();
        user.setUsername(req.username());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setRealName(req.realName());
        user.setEmail(req.email());
        user.setPhone(req.phone());
        user.setStatus(req.status() == null ? 1 : req.status());
        userMapper.insert(user);

        if (req.roleIds() != null && !req.roleIds().isEmpty()) {
            for (Long roleId : req.roleIds()) {
                userRoleMapper.insert(user.getId(), roleId);
            }
        }
        return user.getId();
    }

    @Transactional
    public void update(Long id, UserUpdateRequest req) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);

        if (StringUtils.hasText(req.password())) {
            user.setPassword(passwordEncoder.encode(req.password()));
        }
        if (StringUtils.hasText(req.username())) user.setUsername(req.username());
        if (req.realName() != null) user.setRealName(req.realName());
        if (req.email() != null) user.setEmail(req.email());
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.status() != null) user.setStatus(req.status());
        userMapper.updateById(user);

        if (req.roleIds() != null) {
            userRoleMapper.deleteByUserId(id);
            for (Long roleId : req.roleIds()) {
                userRoleMapper.insert(id, roleId);
            }
        }
    }

    @Transactional
    public void delete(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        userMapper.deleteById(id);
        userRoleMapper.deleteByUserId(id);
    }

    private UserVO toVO(SysUser user) {
        List<SysRole> roles = roleMapper.queryRolesByUserId(user.getId());
        List<String> roleNames = roles == null ? Collections.emptyList()
                : roles.stream().map(SysRole::getName).toList();
        return new UserVO(
                user.getId(), user.getUsername(), user.getRealName(),
                user.getEmail(), user.getPhone(), user.getStatus(),
                user.getLastLoginAt(), user.getCreateTime(), roleNames
        );
    }
}
