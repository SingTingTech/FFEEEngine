package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormRelationship;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormRelationshipMapper extends BaseMapper<FormRelationship> {
    List<FormRelationship> selectBySchemaId(@Param("schemaId") Long schemaId);
    List<FormRelationship> selectByParentFormId(@Param("parentFormId") Long parentFormId);
    List<FormRelationship> selectByChildFormId(@Param("childFormId") Long childFormId);
}