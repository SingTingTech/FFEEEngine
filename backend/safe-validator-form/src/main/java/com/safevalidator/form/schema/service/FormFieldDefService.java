package com.safevalidator.form.schema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateFieldRequest;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.schema.dto.UpdateFieldRequest;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FormFieldDefService {

    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;
    private final ObjectMapper objectMapper;

    public FormFieldDefService(FormFieldDefMapper fieldMapper, FormSchemaService schemaService,
                               ObjectMapper objectMapper) {
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
        this.objectMapper = objectMapper;
    }

    public Long addField(Long formId, CreateFieldRequest req) {
        FormSchema s = schemaService.getCurrentSchema(formId);
        // uniqueness check
        Long existing = fieldMapper.selectCount(
                new LambdaQueryWrapper<FormFieldDef>()
                        .eq(FormFieldDef::getSchemaId, s.getId())
                        .eq(FormFieldDef::getCode, req.code()));
        if (existing > 0) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "字段 code 重复: " + req.code());
        }
        // mapped form requires target_column
        if (s.getTargetTable() != null && (req.targetColumn() == null || req.targetColumn().isBlank())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "已映射表单的每个字段必须配置 targetColumn");
        }
        // unmapped form must NOT have target_column
        if (s.getTargetTable() == null && req.targetColumn() != null && !req.targetColumn().isBlank()) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "未映射表单不能配置 targetColumn");
        }

        FormFieldDef def = new FormFieldDef();
        def.setSchemaId(s.getId());
        def.setCode(req.code());
        def.setName(req.name());
        def.setType(req.type());
        def.setRequired(Boolean.TRUE.equals(req.required()));
        def.setDefaultValue(req.defaultValue());
        def.setSortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder(s.getId()));
        def.setConfig(toJson(req.config()));
        def.setValidation(toJson(req.validation()));
        def.setTargetColumn(req.targetColumn());
        def.setSectionId(parseSectionId(req.sectionId()));
        def.setIsLinkField(false);
        fieldMapper.insert(def);
        return def.getId();
    }

    public void updateField(Long fieldId, UpdateFieldRequest req) {
        FormFieldDef def = fieldMapper.selectById(fieldId);
        if (def == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        if (Boolean.TRUE.equals(def.getIsLinkField())) {
            throw new BizException(ErrorCode.FORM_FIELD_IN_USE, "链接字段不可修改");
        }
        if (req.name() != null) def.setName(req.name());
        if (req.type() != null) def.setType(req.type());
        if (req.required() != null) def.setRequired(req.required());
        if (req.defaultValue() != null) def.setDefaultValue(req.defaultValue());
        if (req.sortOrder() != null) def.setSortOrder(req.sortOrder());
        if (req.config() != null) def.setConfig(toJson(req.config()));
        if (req.validation() != null) def.setValidation(toJson(req.validation()));
        if (req.targetColumn() != null) def.setTargetColumn(req.targetColumn());
        fieldMapper.updateById(def);
    }

    public void deleteField(Long fieldId) {
        FormFieldDef def = fieldMapper.selectById(fieldId);
        if (def == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        if (Boolean.TRUE.equals(def.getIsLinkField())) {
            throw new BizException(ErrorCode.FORM_FIELD_IN_USE, "链接字段不可删除");
        }
        fieldMapper.deleteById(fieldId);
    }

    public FormFieldDef getById(Long fieldId) {
        FormFieldDef f = fieldMapper.selectById(fieldId);
        if (f == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        return f;
    }

    private int nextOrder(Long schemaId) {
        return fieldMapper.selectBySchemaId(schemaId).size();
    }

    private String toJson(Map<String, Object> map) {
        if (map == null) return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private Long parseSectionId(String sectionId) {
        if (sectionId == null || sectionId.isBlank()) return null;
        // Client-side temp ids (e.g. "tmp-0") are only valid within a single
        // publishNewVersion request — the backend builds a clientId→serverId
        // map there. The single addField endpoint has no such map, so it must
        // reject tmp-* ids explicitly rather than silently dropping the
        // sectionId (which would orphan the field from its section).
        if (sectionId.startsWith("tmp-")) {
            throw new BizException(ErrorCode.BAD_REQUEST,
                    "sectionId 不能是临时 ID（" + sectionId + "）。请先发布（publishNewVersion）让临时段获得真实 ID，"
                            + "或通过 publishNewVersion 一次性提交 section + field。");
        }
        try {
            return Long.parseLong(sectionId);
        } catch (NumberFormatException e) {
            throw new BizException(ErrorCode.BAD_REQUEST,
                    "sectionId 格式无效: " + sectionId);
        }
    }
}