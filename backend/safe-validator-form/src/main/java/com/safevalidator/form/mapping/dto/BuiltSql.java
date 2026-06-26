package com.safevalidator.form.mapping.dto;

import java.util.List;

public record BuiltSql(String sql, List<Object> params) {}