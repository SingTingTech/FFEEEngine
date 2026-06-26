package com.safevalidator.admin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.admin.entity.SysRole;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {
    List<SysRole> queryRolesByUserId(@Param("userId") Long userId);
}