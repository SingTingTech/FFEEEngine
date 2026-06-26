package com.safevalidator.form.runtime.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.mapping.dto.ColumnInfo;
import com.safevalidator.form.mapping.registry.ColumnIntrospector;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/db")
public class DbSchemaController {

    private final ColumnIntrospector introspector;

    public DbSchemaController(ColumnIntrospector introspector) {
        this.introspector = introspector;
    }

    @GetMapping("/tables")
    public Result<List<String>> listTables() {
        return Result.ok(introspector.listUserTables());
    }

    @GetMapping("/tables/{table}/columns")
    public Result<List<ColumnInfo>> listColumns(@PathVariable String table) {
        return Result.ok(introspector.listColumns(table));
    }
}