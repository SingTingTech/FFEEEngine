package com.safevalidator.form.mapping.converter;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

class StringToDateConverterTest {

    private final StringToDateConverter c = new StringToDateConverter();

    @Test
    void parsesIsoDate() {
        assertThat(c.convert("2026-06-26")).isInstanceOf(LocalDate.class);
    }

    @Test
    void parsesIsoDateTime() {
        assertThat(c.convert("2026-06-26T10:30:00")).isInstanceOf(LocalDate.class);
    }

    @Test
    void parsesDateTimeWithSpace() {
        assertThat(c.convert("2026-06-26 10:30:00")).isInstanceOf(LocalDate.class);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> c.convert("not-a-date"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nullReturnsNull() {
        assertThat(c.convert(null)).isNull();
    }

    @Test
    void localDatePassThrough() {
        LocalDate d = LocalDate.of(2026, 1, 1);
        assertThat(c.convert(d)).isEqualTo(d);
    }
}
