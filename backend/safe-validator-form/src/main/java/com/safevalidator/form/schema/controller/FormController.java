package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.dto.CreateFormRequest;
import com.safevalidator.form.schema.dto.SchemaDetailVO;
import com.safevalidator.form.schema.dto.SchemaVersionVO;
import com.safevalidator.form.schema.dto.UpdateSchemaRequest;
import com.safevalidator.form.schema.service.FormSchemaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/forms")
public class FormController {

    private final FormSchemaService schemaService;

    public FormController(FormSchemaService schemaService) {
        this.schemaService = schemaService;
    }

    @PostMapping
    public Result<Long> create(@Valid @RequestBody CreateFormRequest req) {
        return Result.ok(schemaService.createForm(req));
    }

    @GetMapping("/{formId}")
    public Result<SchemaDetailVO> get(@PathVariable Long formId) {
        return Result.ok(schemaService.getCurrentSchemaDetail(formId));
    }

    @GetMapping("/{formId}/schema")
    public Result<SchemaDetailVO> getSchema(@PathVariable Long formId) {
        return Result.ok(schemaService.getCurrentSchemaDetail(formId));
    }

    @GetMapping("/{formId}/versions")
    public Result<List<SchemaVersionVO>> listVersions(@PathVariable Long formId) {
        return Result.ok(schemaService.listVersions(formId));
    }

    @GetMapping("/{formId}/versions/{version}")
    public Result<SchemaDetailVO> getVersion(@PathVariable Long formId, @PathVariable Integer version) {
        return Result.ok(schemaService.getVersionDetail(formId, version));
    }

    @PutMapping("/{formId}/schema")
    public Result<Long> publishNewVersion(@PathVariable Long formId,
                                          @RequestBody UpdateSchemaRequest req) {
        return Result.ok(schemaService.publishNewVersion(formId, req));
    }
}