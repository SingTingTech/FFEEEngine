package com.safevalidator.common.jackson;

import com.fasterxml.jackson.databind.JsonNode;

public class JsonbNodeTypeHandler extends BaseJsonbTypeHandler<JsonNode> {
    public JsonbNodeTypeHandler() {
        super(JsonNode.class);
    }
}