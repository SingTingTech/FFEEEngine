package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormSection;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormSectionMapper extends BaseMapper<FormSection> {
    List<FormSection> selectBySchemaId(@Param("schemaId") Long schemaId);
}
