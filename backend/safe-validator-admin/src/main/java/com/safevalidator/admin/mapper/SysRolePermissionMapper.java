package com.safevalidator.admin.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysRolePermissionMapper {
    int insert(@Param("roleId") Long roleId, @Param("permissionId") Long permissionId);
    int deleteByRoleId(@Param("roleId") Long roleId);
    List<Long> selectPermissionIdsByRoleId(@Param("roleId") Long roleId);
}
