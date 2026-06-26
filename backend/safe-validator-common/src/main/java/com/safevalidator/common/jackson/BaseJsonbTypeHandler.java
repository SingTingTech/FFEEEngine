package com.safevalidator.common.jackson;

import com.baomidou.mybatisplus.extension.handlers.AbstractJsonTypeHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.type.JdbcType;
import org.postgresql.util.PGobject;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public abstract class BaseJsonbTypeHandler<T> extends AbstractJsonTypeHandler<T> {

    private static final String JSONB_TYPE = "jsonb";

    protected final Class<T> type;
    protected ObjectMapper objectMapper;

    protected BaseJsonbTypeHandler(Class<T> type) {
        super(type);
        this.type = type;
    }

    public void setObjectMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, T parameter, JdbcType jdbcType) throws SQLException {
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected. Did you register the handler bean?");
            }
            PGobject pg = new PGobject();
            pg.setType(JSONB_TYPE);
            pg.setValue(objectMapper.writeValueAsString(parameter));
            ps.setObject(i, pg);
        } catch (JsonProcessingException e) {
            throw new SQLException("Failed to serialize JSONB value", e);
        }
    }

    @Override
    public T getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return parse(rs.getString(columnName));
    }

    @Override
    public T getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return parse(rs.getString(columnIndex));
    }

    @Override
    public T getNullableResult(java.sql.CallableStatement cs, int columnIndex) throws SQLException {
        return parse(cs.getString(columnIndex));
    }

    public T parse(String json) {
        if (json == null) return null;
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected.");
            }
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize JSONB value", e);
        }
    }

    @Override
    public String toJson(T obj) {
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected.");
            }
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}