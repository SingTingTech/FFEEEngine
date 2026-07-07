package com.safevalidator.common.jackson;

import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigInteger;

/**
 * Jackson config: serialize Long and BigInteger as String to avoid
 * JavaScript Number precision loss (max safe integer = 2^53 - 1 ≈ 9.007e15).
 *
 * MyBatis-Plus ASSIGN_ID generates IDs around 2e18 which lose the last 3-4 digits
 * when parsed by JavaScript Number — turning 2071404513371828226 into 2071404513371828200.
 * Serializing as String preserves exact value; the frontend treats IDs as strings.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public SimpleModule longAsStringModule() {
        SimpleModule module = new SimpleModule("LongAsStringModule");
        module.addSerializer(Long.class, ToStringSerializer.instance);
        module.addSerializer(Long.TYPE, ToStringSerializer.instance);
        module.addSerializer(BigInteger.class, ToStringSerializer.instance);
        return module;
    }
}
