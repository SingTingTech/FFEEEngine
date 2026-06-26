package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class FileFieldType implements FieldType {

    @Override public String name() { return "file"; }
    @Override public String label() { return "文件"; }
    @Override public String description() { return "上传文件，存为 {url, name, size}"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("maxSize", "最大字节数", "number", false, 10_485_760, List.of()),
                new ConfigSchema.ConfigField("allowedTypes", "允许的 MIME 类型", "string", false, "", List.of()),
                new ConfigSchema.ConfigField("storage", "存储位置", "select", false, "local",
                        List.of(new ConfigSchema.Option("本地", "local"), new ConfigSchema.Option("对象存储", "oss")))
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        // Expect: { url, name, size } (Map or already a structured object)
        return rawValue;
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "maxSize", "allowedTypes");
    }
}
