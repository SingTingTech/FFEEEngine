package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysPermission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysPermissionMapper extends BaseMapper<SysPermission> {
    List<SysPermission> queryPermissionsByUserId(@Param("userId") Long userId);
}