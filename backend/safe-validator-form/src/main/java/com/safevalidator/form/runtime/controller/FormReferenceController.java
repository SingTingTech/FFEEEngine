package com.safevalidator.form.runtime.controller;

import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.api.Result;
import com.safevalidator.form.runtime.dto.ReferenceOption;
import com.safevalidator.form.runtime.engine.FormReferenceEngine;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forms/{formId}/records/lookup")
public class FormReferenceController {

    private final FormReferenceEngine engine;

    public FormReferenceController(FormReferenceEngine engine) {
        this.engine = engine;
    }

    @GetMapping
    public Result<PageResult<ReferenceOption>> lookup(@PathVariable Long formId,
                                                      @RequestParam(required = false) String keyword,
                                                      PageQuery query) {
        return Result.ok(engine.lookup(formId, keyword, query));
    }
}