-- =====================================================
-- V1: Initialize metadata tables for safe-validator
-- =====================================================

-- User table
CREATE TABLE sys_user (
    id            BIGINT       PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL,
    password      VARCHAR(128) NOT NULL,
    real_name     VARCHAR(64),
    email         VARCHAR(128),
    phone         VARCHAR(32),
    status        SMALLINT     NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_user_username ON sys_user(username) WHERE deleted = 0;
CREATE INDEX idx_sys_user_email ON sys_user(email) WHERE deleted = 0;

-- Role table
CREATE TABLE sys_role (
    id          BIGINT       PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    status      SMALLINT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_role_code ON sys_role(code) WHERE deleted = 0;

-- Permission table
CREATE TABLE sys_permission (
    id          BIGINT       PRIMARY KEY,
    parent_id   BIGINT       NOT NULL DEFAULT 0,
    code        VARCHAR(128) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    type        VARCHAR(16)  NOT NULL,
    path        VARCHAR(256),
    icon        VARCHAR(64),
    sort_order  INT          NOT NULL DEFAULT 0,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_permission_code ON sys_permission(code) WHERE deleted = 0;

-- User-Role association
CREATE TABLE sys_user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Role-Permission association
CREATE TABLE sys_role_permission (
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Audit log table
CREATE TABLE sys_audit_log (
    id          BIGINT       PRIMARY KEY,
    user_id     BIGINT,
    username    VARCHAR(64),
    module      VARCHAR(64)  NOT NULL,
    action      VARCHAR(64)  NOT NULL,
    resource_id VARCHAR(128),
    method      VARCHAR(8),
    path        VARCHAR(256),
    ip          VARCHAR(64),
    user_agent  VARCHAR(512),
    status      SMALLINT     NOT NULL DEFAULT 1,
    error_msg   TEXT,
    cost_ms     BIGINT,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_sys_audit_user ON sys_audit_log(user_id, create_time DESC);
CREATE INDEX idx_sys_audit_module ON sys_audit_log(module, create_time DESC);

-- Dict table
CREATE TABLE sys_dict (
    id          BIGINT       PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_dict_code ON sys_dict(code) WHERE deleted = 0;

CREATE TABLE sys_dict_item (
    id          BIGINT       PRIMARY KEY,
    dict_id     BIGINT       NOT NULL,
    label       VARCHAR(128) NOT NULL,
    value       VARCHAR(128) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    status      SMALLINT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_sys_dict_item_dict ON sys_dict_item(dict_id);