package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormBusinessKey;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormBusinessKeyMapper extends BaseMapper<FormBusinessKey> {
    List<FormBusinessKey> selectByFormId(@Param("formId") Long formId);
    int deleteByFormId(@Param("formId") Long formId);
}