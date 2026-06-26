-- =====================================================
-- V2: Seed admin user, default role, base permissions
-- =====================================================

-- Admin user (password: admin123, BCrypt strength 10)
INSERT INTO sys_user (id, username, password, real_name, status, create_time, update_time, deleted)
VALUES (1, 'admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', 'Administrator', 1,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Default roles
INSERT INTO sys_role (id, code, name, description, status, create_time, update_time, deleted) VALUES
    (1, 'admin',    '系统管理员', '拥有所有权限',                 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (2, 'operator', '操作员',     '日常操作权限，不含用户管理',   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Assign admin role to admin user
INSERT INTO sys_user_role (user_id, role_id) VALUES (1, 1);

-- Base permissions
INSERT INTO sys_permission (id, parent_id, code, name, type, sort_order, create_time, update_time, deleted) VALUES
    (1,  0, 'system',     '系统管理',  'menu',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (10, 1, 'system:user',     '用户管理', 'menu',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (11, 10, 'system:user:list',   '查看用户', 'action', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (12, 10, 'system:user:create', '创建用户', 'action', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (13, 10, 'system:user:update', '更新用户', 'action', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (14, 10, 'system:user:delete', '删除用户', 'action', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (20, 1, 'system:role',     '角色管理', 'menu',  2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (21, 20, 'system:role:list',   '查看角色', 'action', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (22, 20, 'system:role:create', '创建角色', 'action', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (23, 20, 'system:role:update', '更新角色', 'action', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (24, 20, 'system:role:delete', '删除角色', 'action', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Bind all permissions to admin role
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
    (1, 1), (1, 10), (1, 11), (1, 12), (1, 13), (1, 14),
    (1, 20), (1, 21), (1, 22), (1, 23), (1, 24);