package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.SectionVO;
import com.safevalidator.form.schema.dto.UpdateSectionRequest;
import com.safevalidator.form.schema.entity.FormSection;
import com.safevalidator.form.schema.mapper.FormSectionMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FormSectionService {

    private final FormSectionMapper sectionMapper;
    private final FormSchemaService schemaService;

    public FormSectionService(FormSectionMapper sectionMapper, FormSchemaService schemaService) {
        this.sectionMapper = sectionMapper;
        this.schemaService = schemaService;
    }

    public List<SectionVO> listByFormId(Long formId) {
        var schema = schemaService.getCurrentSchema(formId);
        return sectionMapper.selectBySchemaId(schema.getId()).stream()
                .map(this::toVO).toList();
    }

    public Long create(Long formId, CreateSectionRequest req) {
        var schema = schemaService.getCurrentSchema(formId);
        FormSection section = new FormSection();
        section.setSchemaId(schema.getId());
        section.setName(req.name());
        section.setDescription(req.description());
        section.setSortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder(schema.getId()));
        sectionMapper.insert(section);
        return section.getId();
    }

    public void update(Long formId, Long sectionId, UpdateSectionRequest req) {
        FormSection s = sectionMapper.selectById(sectionId);
        if (s == null) throw new BizException(ErrorCode.SECTION_NOT_FOUND);
        if (req.name() != null) s.setName(req.name());
        if (req.description() != null) s.setDescription(req.description());
        if (req.sortOrder() != null) s.setSortOrder(req.sortOrder());
        sectionMapper.updateById(s);
    }

    public void delete(Long formId, Long sectionId) {
        sectionMapper.deleteById(sectionId);
    }

    private int nextOrder(Long schemaId) {
        return sectionMapper.selectBySchemaId(schemaId).size();
    }

    public SectionVO toVO(FormSection s) {
        return new SectionVO(s.getId(), s.getSchemaId(), s.getName(),
                s.getDescription(), s.getSortOrder(),
                s.getCreateTime(), s.getUpdateTime());
    }
}
