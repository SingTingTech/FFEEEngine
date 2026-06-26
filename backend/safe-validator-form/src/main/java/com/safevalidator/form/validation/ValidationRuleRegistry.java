package com.safevalidator.form.validation;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class ValidationRuleRegistry {

    private final Map<String, ValidationRule> rules = new LinkedHashMap<>();

    public ValidationRuleRegistry(List<ValidationRule> ruleBeans) {
        for (ValidationRule r : ruleBeans) {
            rules.put(r.name(), r);
        }
    }

    public ValidationRule get(String name) {
        ValidationRule r = rules.get(name);
        if (r == null) {
            throw new IllegalArgumentException("Unknown validation rule: " + name);
        }
        return r;
    }

    public Optional<ValidationRule> find(String name) {
        return Optional.ofNullable(rules.get(name));
    }

    public List<ValidationRule> listAll() {
        return List.copyOf(rules.values());
    }
}