package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.dto.CreateRelationshipRequest;
import com.safevalidator.form.schema.dto.RelationshipVO;
import com.safevalidator.form.schema.service.FormRelationshipService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/forms/{formId}/relationships")
public class FormRelationshipController {

    private final FormRelationshipService relService;

    public FormRelationshipController(FormRelationshipService relService) {
        this.relService = relService;
    }

    @GetMapping
    public Result<List<RelationshipVO>> list(@PathVariable Long formId) {
        return Result.ok(relService.listByFormId(formId));
    }

    @PostMapping
    public Result<Long> create(@PathVariable Long formId, @Valid @RequestBody CreateRelationshipRequest req) {
        return Result.ok(relService.create(formId, req));
    }

    @DeleteMapping("/{relId}")
    public Result<Void> delete(@PathVariable Long formId, @PathVariable Long relId) {
        relService.delete(relId);
        return Result.ok();
    }
}