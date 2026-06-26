package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

/** Default fallback when no conversion is needed. Handles any→any. */
@Component
public class PassthroughConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("*"); }
    @Override public Set<String> targetTypes() { return Set.of("*"); }
    @Override public Object convert(Object value) { return value; }
}
