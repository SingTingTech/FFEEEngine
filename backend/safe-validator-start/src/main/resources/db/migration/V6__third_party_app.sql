-- =====================================================
-- V6: Third-party application credentials
--
-- An "app" is an external system (e.g. an OA) authorized to call
-- /api/auth/third-party-token and mint a short-lived JWT on behalf
-- of one of its users. The shared secret is stored BCrypt-hashed so
-- a DB dump alone cannot mint tokens.
-- =====================================================

CREATE TABLE sys_third_party_app (
    id          BIGINT       PRIMARY KEY,
    app_id      VARCHAR(64)  NOT NULL,
    app_secret  VARCHAR(128) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    status      SMALLINT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_third_party_app_id ON sys_third_party_app(app_id) WHERE deleted = 0;