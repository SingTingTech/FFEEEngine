package com.safevalidator.form.schema.service;

import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.TestApplication;
import com.safevalidator.form.schema.dto.CreateFieldRequest;
import com.safevalidator.form.schema.dto.CreateFormRequest;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.UpdateSchemaRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Regression test for the parseSectionId bug: when the frontend sends a
 * tmp-* sectionId (a client-side temp id from in-progress design), the
 * single addField endpoint used to silently drop it to null, orphaning the
 * field from its section. The fix is to reject tmp-* with a clear error
 * so the frontend knows it must publish first.
 */
@SpringBootTest(classes = TestApplication.class)
@Testcontainers
class AddFieldSectionIdTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("sv_form_sectionid_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired FormSchemaService schemaService;
    @Autowired FormFieldDefService fieldService;

    @Test
    void addField_withNullSectionId_succeeds() {
        Long formId = schemaService.createForm(new CreateFormRequest("root-form", null, null, null));
        schemaService.publishNewVersion(formId, new UpdateSchemaRequest(
                "root-form", null, null, null, null));

        Long fieldId = fieldService.addField(formId,
                new CreateFieldRequest("root_field", "根字段", "text", false, null, 0, null,
                        null, null, null));

        assertThat(fieldId).isNotNull();
        // No sectionId was passed → field should be at root
    }

    @Test
    void addField_withValidLongSectionId_succeeds() {
        Long formId = schemaService.createForm(new CreateFormRequest("valid-sec", null, null, null));
        // Publish with a real section
        schemaService.publishNewVersion(formId, new UpdateSchemaRequest(
                "valid-sec", null, null, null,
                List.of(new CreateSectionRequest(null, "段1", null, 0))));

        // Look up the section id that was persisted
        Long realSectionId = schemaService.getCurrentSchemaDetail(formId).sections().get(0).id();

        Long fieldId = fieldService.addField(formId,
                new CreateFieldRequest("in_section", "段内字段", "text", false, null, 0, null,
                        null, null, realSectionId.toString()));

        assertThat(fieldId).isNotNull();
    }

    @Test
    void addField_withTmpSectionId_rejectedWithClearError() {
        Long formId = schemaService.createForm(new CreateFormRequest("tmp-test", null, null, null));
        schemaService.publishNewVersion(formId, new UpdateSchemaRequest(
                "tmp-test", null, null, null, null));

        // Frontend scenario: user just created a new section via addSection()
        // (which gets a tmp-* id), then drops a field into it. With the fix,
        // addField rejects this — frontend must publish first.
        assertThatThrownBy(() -> fieldService.addField(formId,
                new CreateFieldRequest("orphan_field", "孤儿字段", "text", false, null, 0, null,
                        null, null, "tmp-0")))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("tmp-0")
                .hasMessageContaining("临时 ID");

        // And tmp-99 is also rejected
        assertThatThrownBy(() -> fieldService.addField(formId,
                new CreateFieldRequest("orphan2", "孤儿2", "text", false, null, 1, null,
                        null, null, "tmp-99")))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("tmp-99");
    }

    @Test
    void addField_withNonNumericSectionId_rejected() {
        Long formId = schemaService.createForm(new CreateFormRequest("bad-fmt", null, null, null));
        schemaService.publishNewVersion(formId, new UpdateSchemaRequest(
                "bad-fmt", null, null, null, null));

        assertThatThrownBy(() -> fieldService.addField(formId,
                new CreateFieldRequest("bad_field", "坏字段", "text", false, null, 0, null,
                        null, null, "not-a-number-or-tmp")))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("格式无效");
    }
}
