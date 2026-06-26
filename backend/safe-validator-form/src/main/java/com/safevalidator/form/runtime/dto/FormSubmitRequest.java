package com.safevalidator.form.runtime.dto;

import java.util.List;
import java.util.Map;

public record FormSubmitRequest(
        Long formId,
        Map<String, Object> data,
        List<ChildSubmit> children
) {}