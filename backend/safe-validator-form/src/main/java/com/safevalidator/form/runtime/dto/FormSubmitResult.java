package com.safevalidator.form.runtime.dto;

import java.util.List;

public record FormSubmitResult(
        Long id,
        Long formId,
        Integer formVersion,
        List<ChildSubmitResult> childResults
) {}