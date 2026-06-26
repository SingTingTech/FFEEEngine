package com.safevalidator.form;

import com.safevalidator.form.runtime.dto.FormRecord;
import com.safevalidator.form.runtime.dto.FormSubmitRequest;
import com.safevalidator.form.runtime.dto.FormSubmitResult;
import com.safevalidator.form.runtime.service.FormDataService;
import com.safevalidator.form.schema.dto.CreateFieldRequest;
import com.safevalidator.form.schema.dto.CreateFormRequest;
import com.safevalidator.form.schema.dto.UpdateSchemaRequest;
import com.safevalidator.form.schema.service.FormSchemaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = TestApplication.class)
@Testcontainers
class E2ESmokeTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("sv_form_e2e")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired FormSchemaService schemaService;
    @Autowired FormDataService dataService;

    @Test
    void createUnmappedFormAndSubmit() {
        // 1. Create form
        Long formId = schemaService.createForm(new CreateFormRequest("订单", null, null));

        // 2. Publish version with fields
        schemaService.publishNewVersion(formId, new UpdateSchemaRequest(
                "订单", null,
                List.of(
                        new CreateFieldRequest("customer_name", "客户", "text", true, null, 1, null,
                                Map.of("required", true, "minLength", 2, "maxLength", 128, "requiredMessage", "客户名称不能为空"), null, null),
                        new CreateFieldRequest("total_amount", "总金额", "number", true, null, 2, null,
                                Map.of("required", true, "min", 0), null, null)
                ),
                null, null));

        // 3. Submit record
        FormSubmitResult result = dataService.submit(new FormSubmitRequest(
                formId, Map.of("customer_name", "ACME", "total_amount", 999), null));

        assertThat(result.id()).isNotNull();
        // Initial form is v1; publishNewVersion then bumps to v2 (the active version).
        assertThat(result.formVersion()).isEqualTo(2);

        // 4. Read back
        FormRecord record = dataService.getById(formId, result.id());
        assertThat(record.data().get("customer_name")).isEqualTo("ACME");
        assertThat(record.data().get("total_amount")).isEqualTo(999);

        // 5. Delete
        dataService.delete(formId, result.id());
        assertThatThrownBy(() -> dataService.getById(formId, result.id()))
                .hasMessageContaining("不存在");
    }
}