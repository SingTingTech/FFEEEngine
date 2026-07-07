package com.safevalidator.form.schema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.*;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormRelationship;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.entity.FormSection;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import com.safevalidator.form.schema.mapper.FormSchemaMapper;
import com.safevalidator.form.schema.mapper.FormSectionMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class FormSchemaService {

    private final FormSchemaMapper schemaMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormRelationshipMapper relMapper;
    private final FormSectionMapper sectionMapper;
    private final ObjectMapper objectMapper;

    public FormSchemaService(FormSchemaMapper schemaMapper, FormFieldDefMapper fieldMapper,
                             FormRelationshipMapper relMapper, FormSectionMapper sectionMapper,
                             ObjectMapper objectMapper) {
        this.schemaMapper = schemaMapper;
        this.fieldMapper = fieldMapper;
        this.relMapper = relMapper;
        this.sectionMapper = sectionMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Long createForm(CreateFormRequest req) {
        FormSchema schema = new FormSchema();
        // MyBatis-Plus ASSIGN_ID populates the id field before INSERT.
        // We pre-compute the id so we can also set form_id = id and satisfy NOT NULL in one insert.
        Long newId = com.baomidou.mybatisplus.core.toolkit.IdWorker.getId();
        schema.setId(newId);
        schema.setFormId(newId);
        schema.setVersion(1);
        schema.setName(req.name());
        schema.setDescription(req.description());
        schema.setStatus(1);
        // Empty string is normalized to null so targetTable is uniformly nullable.
        schema.setTargetTable(normalizeTargetTable(req.targetTable()));
        schema.setIsCurrent(true);
        schemaMapper.insert(schema);
        return schema.getFormId();
    }

    private String normalizeTargetTable(String targetTable) {
        if (targetTable == null || targetTable.isBlank()) return null;
        return targetTable;
    }

    public FormSchema getCurrentSchema(Long formId) {
        FormSchema s = schemaMapper.selectCurrentByFormId(formId);
        if (s == null) throw new BizException(ErrorCode.FORM_NOT_FOUND);
        return s;
    }

    public SchemaDetailVO getCurrentSchemaDetail(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return toDetailVO(s);
    }

    public SchemaDetailVO getVersionDetail(Long formId, int version) {
        FormSchema s = schemaMapper.selectVersionsByFormId(formId).stream()
                .filter(x -> x.getVersion() == version)
                .findFirst()
                .orElseThrow(() -> new BizException(ErrorCode.FORM_NOT_FOUND));
        return toDetailVO(s);
    }

    public List<SchemaVersionVO> listVersions(Long formId) {
        return schemaMapper.selectVersionsByFormId(formId).stream()
                .map(s -> new SchemaVersionVO(
                        s.getId(), s.getFormId(), s.getVersion(),
                        s.getIsCurrent(), s.getName(), s.getCreateTime()))
                .toList();
    }

    @Transactional
    public void deleteForm(Long formId) {
        // Soft-delete all schema versions for this formId
        schemaMapper.softDeleteByFormId(formId);
    }

    public List<FormSchemaVO> listAllCurrent() {
        return schemaMapper.selectAllCurrent().stream()
                .map(this::toFormSchemaVO)
                .toList();
    }

    private FormSchemaVO toFormSchemaVO(FormSchema s) {
        return new FormSchemaVO(
                s.getId(), s.getFormId(), s.getVersion(),
                s.getName(), s.getDescription(), s.getStatus(),
                s.getTargetTable(), s.getIsCurrent(),
                s.getCreateTime(), s.getUpdateTime());
    }

    @Transactional
    public Long publishNewVersion(Long formId, UpdateSchemaRequest req) {
        FormSchema current = getCurrentSchema(formId);
        if (current.getTargetTable() != null) {
            // mapped form: validation happens via MappingEngine; skip
        }

        // 1. unset old current
        schemaMapper.unsetCurrentExcept(formId, null);

        // 2. create new schema
        FormSchema newSchema = new FormSchema();
        newSchema.setFormId(formId);
        newSchema.setVersion(current.getVersion() + 1);
        newSchema.setName(req.name() != null ? req.name() : current.getName());
        newSchema.setDescription(req.description() != null ? req.description() : current.getDescription());
        newSchema.setStatus(current.getStatus());
        newSchema.setTargetTable(current.getTargetTable());
        newSchema.setIsCurrent(true);
        schemaMapper.insert(newSchema);

        // 3. delete old fields, relationships, sections for the current schema
        for (FormFieldDef old : fieldMapper.selectBySchemaId(current.getId())) {
            fieldMapper.deleteById(old.getId());
        }
        for (FormRelationship old : relMapper.selectBySchemaId(current.getId())) {
            relMapper.deleteById(old.getId());
        }
        for (FormSection old : sectionMapper.selectBySchemaId(current.getId())) {
            sectionMapper.deleteById(old.getId());
        }

        // 4. insert sections first; build a map from client-side sectionId (e.g. "tmp-0"
        //    or a server-issued Long stringified) to the newly-generated server id.
        //    The frontend buildUpdateRequest sends the section's current `id` so fields
        //    can reference it and we can remap here.
        java.util.Map<String, Long> sectionIdMap = new java.util.HashMap<>();
        if (req.sections() != null) {
            for (CreateSectionRequest sec : req.sections()) {
                FormSection newSec = new FormSection();
                newSec.setSchemaId(newSchema.getId());
                newSec.setName(sec.name());
                newSec.setDescription(sec.description());
                newSec.setSortOrder(sec.sortOrder() != null ? sec.sortOrder() : 0);
                sectionMapper.insert(newSec);
                if (sec.id() != null && !sec.id().isBlank()) {
                    sectionIdMap.put(sec.id(), newSec.getId());
                }
            }
        }

        // 5. insert fields with remapped sectionId
        if (req.fields() != null) {
            int order = 0;
            for (CreateFieldRequest f : req.fields()) {
                FormFieldDef def = new FormFieldDef();
                def.setSchemaId(newSchema.getId());
                def.setCode(f.code());
                def.setName(f.name());
                def.setType(f.type());
                def.setRequired(Boolean.TRUE.equals(f.required()));
                def.setDefaultValue(f.defaultValue());
                def.setSortOrder(f.sortOrder() != null ? f.sortOrder() : order++);
                def.setConfig(toJson(f.config()));
                def.setValidation(toJson(f.validation()));
                def.setTargetColumn(f.targetColumn());
                // Remap: if field references a section by its client-side id, substitute
                // the newly-inserted server id; else null.
                if (f.sectionId() != null) {
                    Long remapped = sectionIdMap.get(f.sectionId());
                    def.setSectionId(remapped);
                } else {
                    def.setSectionId(null);
                }
                def.setIsLinkField(false);
                fieldMapper.insert(def);
            }
        }

        // 6. insert relationships
        if (req.relationships() != null) {
            for (CreateRelationshipRequest r : req.relationships()) {
                FormRelationship rel = new FormRelationship();
                rel.setSchemaId(newSchema.getId());
                rel.setParentFormId(r.parentFormId());
                rel.setChildFormId(r.childFormId());
                rel.setRelationType(r.relationType());
                rel.setParentLinkField(r.parentLinkField());
                rel.setChildLinkField(r.childLinkField());
                rel.setOnDelete(r.onDelete() != null ? r.onDelete() : "CASCADE");
                relMapper.insert(rel);

                // mark child field as link field
                fieldMapper.clearIsLinkField(newSchema.getId(), r.childLinkField());
            }
        }

        return newSchema.getId();
    }

    public List<FormFieldDefVO> listFields(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return fieldMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toFieldVO)
                .toList();
    }

    public List<FormFieldDefVO> listFieldsBySchemaId(Long schemaId) {
        return fieldMapper.selectBySchemaId(schemaId).stream()
                .map(this::toFieldVO)
                .toList();
    }

    public List<RelationshipVO> listRelationships(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return relMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toRelVO)
                .toList();
    }

    public SchemaDetailVO toDetailVO(FormSchema s) {
        List<FormFieldDefVO> fields = fieldMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toFieldVO)
                .toList();
        List<RelationshipVO> rels = relMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toRelVO)
                .toList();
        List<SectionVO> sections = sectionMapper.selectBySchemaId(s.getId()).stream()
                .map(sec -> new SectionVO(
                        sec.getId(), sec.getSchemaId(), sec.getName(),
                        sec.getDescription(), sec.getSortOrder(),
                        sec.getCreateTime(), sec.getUpdateTime()))
                .toList();
        return new SchemaDetailVO(
                s.getFormId(), s.getVersion(), s.getId(),
                s.getName(), s.getDescription(), s.getTargetTable(),
                s.getIsCurrent(), s.getCreateTime(),
                fields, rels, sections);
    }

    public FormFieldDefVO toFieldVO(FormFieldDef f) {
        return new FormFieldDefVO(
                f.getId(), f.getSchemaId(), f.getCode(), f.getName(), f.getType(),
                f.getRequired(), f.getDefaultValue(), f.getSortOrder(),
                parseJsonMap(f.getConfig()), parseJsonMap(f.getValidation()),
                f.getTargetColumn(), f.getSectionId(), f.getIsLinkField(),
                f.getCreateTime(), f.getUpdateTime());
    }

    public RelationshipVO toRelVO(FormRelationship r) {
        return new RelationshipVO(
                r.getId(), r.getSchemaId(), r.getParentFormId(), r.getChildFormId(),
                r.getRelationType(), r.getParentLinkField(), r.getChildLinkField(),
                r.getOnDelete(), r.getCreateTime());
    }

    private String toJson(Map<String, Object> map) {
        if (map == null) return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "JSON serialize failed: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}