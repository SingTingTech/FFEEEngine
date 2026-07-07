package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormSchema;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormSchemaMapper extends BaseMapper<FormSchema> {
    FormSchema selectCurrentByFormId(@Param("formId") Long formId);
    List<FormSchema> selectVersionsByFormId(@Param("formId") Long formId);
    int unsetCurrentExcept(@Param("formId") Long formId, @Param("exceptSchemaId") Long exceptSchemaId);
    int softDeleteByFormId(@Param("formId") Long formId);
    List<FormSchema> selectAllCurrent();
}