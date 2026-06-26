package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateRelationshipRequest;
import com.safevalidator.form.schema.dto.RelationshipVO;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormRelationship;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class FormRelationshipService {

    private static final Set<String> VALID_TYPES = Set.of("ONE_TO_ONE", "ONE_TO_MANY");
    private static final Set<String> VALID_ON_DELETE = Set.of("CASCADE", "SET_NULL", "RESTRICT");

    private final FormRelationshipMapper relMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;

    public FormRelationshipService(FormRelationshipMapper relMapper, FormFieldDefMapper fieldMapper,
                                    FormSchemaService schemaService) {
        this.relMapper = relMapper;
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
    }

    @Transactional
    public Long create(Long formId, CreateRelationshipRequest req) {
        if (!VALID_TYPES.contains(req.relationType())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "Invalid relationType: " + req.relationType());
        }
        if (req.onDelete() != null && !VALID_ON_DELETE.contains(req.onDelete())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "Invalid onDelete: " + req.onDelete());
        }
        FormSchema s = schemaService.getCurrentSchema(formId);

        // validate child link field exists and is required
        List<FormFieldDef> childFields = fieldMapper.selectBySchemaId(
                schemaService.getCurrentSchema(req.childFormId()).getId());
        FormFieldDef linkField = childFields.stream()
                .filter(f -> f.getCode().equals(req.childLinkField()))
                .findFirst()
                .orElseThrow(() -> new BizException(ErrorCode.FORM_FIELD_NOT_FOUND,
                        "子表单中找不到字段: " + req.childLinkField()));
        if (!Boolean.TRUE.equals(linkField.getRequired())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "链接字段必须为必填: " + req.childLinkField());
        }

        FormRelationship rel = new FormRelationship();
        rel.setSchemaId(s.getId());
        rel.setParentFormId(req.parentFormId());
        rel.setChildFormId(req.childFormId());
        rel.setRelationType(req.relationType());
        rel.setParentLinkField(req.parentLinkField());
        rel.setChildLinkField(req.childLinkField());
        rel.setOnDelete(req.onDelete() != null ? req.onDelete() : "CASCADE");
        relMapper.insert(rel);

        // mark child link field
        linkField.setIsLinkField(true);
        fieldMapper.updateById(linkField);

        return rel.getId();
    }

    public void delete(Long relId) {
        FormRelationship rel = relMapper.selectById(relId);
        if (rel == null) return;
        relMapper.deleteById(relId);
        // unmark link field
        FormFieldDef f = fieldMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<FormFieldDef>()
                        .eq(FormFieldDef::getSchemaId, rel.getSchemaId())
                        .eq(FormFieldDef::getCode, rel.getChildLinkField()));
        if (f != null && Boolean.TRUE.equals(f.getIsLinkField())) {
            f.setIsLinkField(false);
            fieldMapper.updateById(f);
        }
    }

    public List<RelationshipVO> listByFormId(Long formId) {
        FormSchema s = schemaService.getCurrentSchema(formId);
        return relMapper.selectBySchemaId(s.getId()).stream()
                .map(r -> new RelationshipVO(
                        r.getId(), r.getSchemaId(), r.getParentFormId(), r.getChildFormId(),
                        r.getRelationType(), r.getParentLinkField(), r.getChildLinkField(),
                        r.getOnDelete(), r.getCreateTime()))
                .toList();
    }
}