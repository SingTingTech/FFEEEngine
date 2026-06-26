package com.safevalidator.form.mapping.converter;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

class DateToStringConverterTest {

    private final DateToStringConverter c = new DateToStringConverter();

    @Test
    void formatsLocalDate() {
        assertThat(c.convert(LocalDate.of(2026, 6, 26))).isEqualTo("2026-06-26");
    }

    @Test
    void formatsLocalDateTime() {
        LocalDateTime dt = LocalDateTime.of(2026, 6, 26, 10, 30, 0);
        assertThat(c.convert(dt)).isEqualTo("2026-06-26 10:30:00");
    }

    @Test
    void stringPassThrough() {
        assertThat(c.convert("2026-06-26")).isEqualTo("2026-06-26");
    }

    @Test
    void nullReturnsNull() {
        assertThat(c.convert(null)).isNull();
    }
}
