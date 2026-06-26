package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormFieldDef;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormFieldDefMapper extends BaseMapper<FormFieldDef> {
    List<FormFieldDef> selectBySchemaId(@Param("schemaId") Long schemaId);
    int clearIsLinkField(@Param("schemaId") Long schemaId, @Param("fieldCode") String fieldCode);
}