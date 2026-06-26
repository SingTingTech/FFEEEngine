package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.entity.FormBusinessKey;
import com.safevalidator.form.schema.service.FormBusinessKeyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/forms/{formId}/business-key")
public class FormBusinessKeyController {

    private final FormBusinessKeyService service;

    public FormBusinessKeyController(FormBusinessKeyService service) {
        this.service = service;
    }

    @GetMapping
    public Result<List<FormBusinessKey>> get(@PathVariable Long formId) {
        return Result.ok(service.get(formId));
    }

    @PutMapping
    public Result<Void> set(@PathVariable Long formId, @RequestBody List<Long> fieldIdsInOrder) {
        service.set(formId, fieldIdsInOrder);
        return Result.ok();
    }
}