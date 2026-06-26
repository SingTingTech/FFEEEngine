package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.dto.CreateFieldRequest;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.schema.dto.UpdateFieldRequest;
import com.safevalidator.form.schema.service.FormFieldDefService;
import com.safevalidator.form.schema.service.FormSchemaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/forms/{formId}/fields")
public class FormFieldDefController {

    private final FormFieldDefService fieldService;
    private final FormSchemaService schemaService;

    public FormFieldDefController(FormFieldDefService fieldService, FormSchemaService schemaService) {
        this.fieldService = fieldService;
        this.schemaService = schemaService;
    }

    @GetMapping
    public Result<List<FormFieldDefVO>> list(@PathVariable Long formId) {
        return Result.ok(schemaService.listFields(formId));
    }

    @PostMapping
    public Result<Long> add(@PathVariable Long formId, @Valid @RequestBody CreateFieldRequest req) {
        return Result.ok(fieldService.addField(formId, req));
    }

    @PutMapping("/{fieldId}")
    public Result<Void> update(@PathVariable Long formId, @PathVariable Long fieldId,
                                @Valid @RequestBody UpdateFieldRequest req) {
        fieldService.updateField(fieldId, req);
        return Result.ok();
    }

    @DeleteMapping("/{fieldId}")
    public Result<Void> delete(@PathVariable Long formId, @PathVariable Long fieldId) {
        fieldService.deleteField(fieldId);
        return Result.ok();
    }
}