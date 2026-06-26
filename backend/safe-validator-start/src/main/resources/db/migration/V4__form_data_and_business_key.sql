-- =====================================================
-- V4: Form data + business key tables
-- =====================================================

-- Business key (composite key support for upsert)
CREATE TABLE form_business_key (
    id          BIGINT  PRIMARY KEY,
    form_id     BIGINT  NOT NULL,
    field_id    BIGINT  NOT NULL,
    key_order   INT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     SMALLINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_form_business_key_field ON form_business_key(form_id, field_id) WHERE deleted = 0;

-- Universal form_data (only used for unmapped forms)
CREATE TABLE form_data (
    id          BIGINT       PRIMARY KEY,
    form_id     BIGINT       NOT NULL,
    data        JSONB        NOT NULL,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_data_form ON form_data(form_id) WHERE deleted = 0;
CREATE INDEX idx_form_data_data_gin ON form_data USING GIN (data);