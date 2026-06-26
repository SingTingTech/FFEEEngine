package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.entity.FormBusinessKey;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.mapper.FormBusinessKeyMapper;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class FormBusinessKeyService {

    private final FormBusinessKeyMapper keyMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;

    public FormBusinessKeyService(FormBusinessKeyMapper keyMapper, FormFieldDefMapper fieldMapper,
                                  FormSchemaService schemaService) {
        this.keyMapper = keyMapper;
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
    }

    public List<FormBusinessKey> get(Long formId) {
        return keyMapper.selectByFormId(formId);
    }

    @Transactional
    public void set(Long formId, List<Long> fieldIdsInOrder) {
        if (fieldIdsInOrder == null) fieldIdsInOrder = List.of();

        // validate all field IDs belong to this form's current schema and are required
        var schema = schemaService.getCurrentSchema(formId);
        var currentFields = fieldMapper.selectBySchemaId(schema.getId());
        List<FormFieldDef> resolved = new ArrayList<>();
        for (Long fid : fieldIdsInOrder) {
            FormFieldDef f = currentFields.stream()
                    .filter(x -> x.getId().equals(fid))
                    .findFirst()
                    .orElseThrow(() -> new BizException(ErrorCode.FORM_FIELD_NOT_FOUND,
                            "字段不属于此表单: " + fid));
            if (!Boolean.TRUE.equals(f.getRequired())) {
                throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                        "业务主键字段必须必填: " + f.getCode());
            }
            resolved.add(f);
        }

        // delete old + insert new
        keyMapper.deleteByFormId(formId);
        int order = 1;
        for (FormFieldDef f : resolved) {
            FormBusinessKey k = new FormBusinessKey();
            k.setFormId(formId);
            k.setFieldId(f.getId());
            k.setKeyOrder(order++);
            keyMapper.insert(k);
        }
    }
}