package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class JsonNodeConverterTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final JsonNodeConverter c = new JsonNodeConverter(mapper);

    @Test
    void convertsMap() {
        JsonNode result = (JsonNode) c.convert(Map.of("a", 1, "b", "x"));
        assertThat(result.get("a").asInt()).isEqualTo(1);
        assertThat(result.get("b").asText()).isEqualTo("x");
    }

    @Test
    void convertsList() {
        JsonNode result = (JsonNode) c.convert(List.of(1, 2, 3));
        assertThat(result.isArray()).isTrue();
        assertThat(result.size()).isEqualTo(3);
    }
}
