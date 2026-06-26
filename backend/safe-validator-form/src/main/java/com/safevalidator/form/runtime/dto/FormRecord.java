package com.safevalidator.form.runtime.dto;

import java.util.List;
import java.util.Map;

public record FormRecord(
        Long id,
        Long formId,
        Integer formVersion,
        Map<String, Object> data,
        List<FormRecord> children
) {}