-- =====================================================
-- V3: Form engine metadata tables
-- =====================================================

-- Schema metadata (immutable versions)
CREATE TABLE form_schema (
    id            BIGINT       PRIMARY KEY,
    form_id       BIGINT       NOT NULL,
    version       INT          NOT NULL,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    status        SMALLINT     NOT NULL DEFAULT 1,
    target_table  VARCHAR(128),
    is_current    BOOLEAN      NOT NULL DEFAULT false,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_form_schema_form_version ON form_schema(form_id, version) WHERE deleted = 0;
CREATE INDEX idx_form_schema_current ON form_schema(form_id) WHERE is_current = true AND deleted = 0;

-- Field definitions (belong to a specific schema version)
CREATE TABLE form_field_def (
    id            BIGINT       PRIMARY KEY,
    schema_id     BIGINT       NOT NULL,
    code          VARCHAR(64)  NOT NULL,
    name          VARCHAR(128) NOT NULL,
    type          VARCHAR(32)  NOT NULL,
    required      BOOLEAN      NOT NULL DEFAULT false,
    default_value TEXT,
    sort_order    INT          NOT NULL DEFAULT 0,
    config        JSONB,
    validation    JSONB,
    target_column VARCHAR(128),
    is_link_field BOOLEAN      NOT NULL DEFAULT false,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_field_def_schema ON form_field_def(schema_id) WHERE deleted = 0;
CREATE UNIQUE INDEX uk_form_field_def_code ON form_field_def(schema_id, code) WHERE deleted = 0;

-- Parent-child relationships
CREATE TABLE form_relationship (
    id                BIGINT       PRIMARY KEY,
    schema_id         BIGINT       NOT NULL,
    parent_form_id    BIGINT       NOT NULL,
    child_form_id     BIGINT       NOT NULL,
    relation_type     VARCHAR(16)  NOT NULL,
    parent_link_field VARCHAR(64),
    child_link_field  VARCHAR(64)  NOT NULL,
    on_delete         VARCHAR(16)  NOT NULL DEFAULT 'CASCADE',
    create_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by         BIGINT,
    update_by         BIGINT,
    deleted           SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_relationship_schema ON form_relationship(schema_id) WHERE deleted = 0;
CREATE INDEX idx_form_relationship_parent ON form_relationship(parent_form_id) WHERE deleted = 0;
CREATE INDEX idx_form_relationship_child ON form_relationship(child_form_id) WHERE deleted = 0;