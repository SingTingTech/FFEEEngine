package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class FieldTypeRegistry {

    private final Map<String, FieldType> types = new LinkedHashMap<>();

    public FieldTypeRegistry(List<FieldType> fieldTypes) {
        for (FieldType t : fieldTypes) {
            types.put(t.name(), t);
        }
    }

    public FieldType get(String name) {
        FieldType t = types.get(name);
        if (t == null) {
            throw new IllegalArgumentException("Unknown field type: " + name);
        }
        return t;
    }

    public Optional<FieldType> find(String name) {
        return Optional.ofNullable(types.get(name));
    }

    public List<FieldType> listAll() {
        return List.copyOf(types.values());
    }

    public Collection<String> names() {
        return Collections.unmodifiableSet(types.keySet());
    }
}
