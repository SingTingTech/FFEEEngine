package com.safevalidator.form.runtime.controller;

import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.api.Result;
import com.safevalidator.form.runtime.dto.FormRecord;
import com.safevalidator.form.runtime.dto.FormSubmitRequest;
import com.safevalidator.form.runtime.dto.FormSubmitResult;
import com.safevalidator.form.runtime.service.FormDataService;
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
@RequestMapping("/api/forms/{formId}/records")
public class FormDataController {

    private final FormDataService dataService;

    public FormDataController(FormDataService dataService) {
        this.dataService = dataService;
    }

    @PostMapping
    public Result<FormSubmitResult> submit(@PathVariable Long formId,
                                            @Valid @RequestBody FormSubmitRequest req) {
        FormSubmitRequest effective = new FormSubmitRequest(formId, req.data(), req.children());
        return Result.ok(dataService.submit(effective));
    }

    @GetMapping
    public Result<PageResult<FormRecord>> page(@PathVariable Long formId, PageQuery query) {
        return Result.ok(dataService.page(formId, query));
    }

    @GetMapping("/{recordId}")
    public Result<FormRecord> get(@PathVariable Long formId, @PathVariable Long recordId) {
        return Result.ok(dataService.getById(formId, recordId));
    }

    @DeleteMapping("/{recordId}")
    public Result<Void> delete(@PathVariable Long formId, @PathVariable Long recordId) {
        dataService.delete(formId, recordId);
        return Result.ok();
    }

    @GetMapping("/{recordId}/children/{childFormId}")
    public Result<List<FormRecord>> listChildren(@PathVariable Long formId,
                                                  @PathVariable Long recordId,
                                                  @PathVariable Long childFormId) {
        return Result.ok(dataService.listChildren(formId, recordId, childFormId));
    }
}