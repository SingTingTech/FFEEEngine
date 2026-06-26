package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.SectionVO;
import com.safevalidator.form.schema.dto.UpdateSectionRequest;
import com.safevalidator.form.schema.service.FormSectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/forms/{formId}/sections")
public class FormSectionController {

    private final FormSectionService sectionService;

    public FormSectionController(FormSectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    public Result<List<SectionVO>> list(@PathVariable Long formId) {
        return Result.ok(sectionService.listByFormId(formId));
    }

    @PostMapping
    public Result<Long> create(@PathVariable Long formId, @Valid @RequestBody CreateSectionRequest req) {
        return Result.ok(sectionService.create(formId, req));
    }

    @PutMapping("/{sectionId}")
    public Result<Void> update(@PathVariable Long formId, @PathVariable Long sectionId,
                                @Valid @RequestBody UpdateSectionRequest req) {
        sectionService.update(formId, sectionId, req);
        return Result.ok();
    }

    @DeleteMapping("/{sectionId}")
    public Result<Void> delete(@PathVariable Long formId, @PathVariable Long sectionId) {
        sectionService.delete(formId, sectionId);
        return Result.ok();
    }
}
