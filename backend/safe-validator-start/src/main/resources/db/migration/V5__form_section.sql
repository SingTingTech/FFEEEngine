-- =====================================================
-- V5: Form sections (visual grouping, not data structure)
-- =====================================================

-- Section: a visual group on the canvas, doesn't affect form data
CREATE TABLE form_section (
    id            BIGINT       PRIMARY KEY,
    schema_id     BIGINT       NOT NULL,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    sort_order    INT          NOT NULL DEFAULT 0,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_section_schema ON form_section(schema_id) WHERE deleted = 0;

-- Add section_id foreign key to form_field_def
ALTER TABLE form_field_def
    ADD COLUMN section_id BIGINT NULL;

-- No FK constraint; app-level ensures section exists (sections can be deleted with SET NULL semantics)
