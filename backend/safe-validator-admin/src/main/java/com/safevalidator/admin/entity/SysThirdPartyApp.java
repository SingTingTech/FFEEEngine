package com.safevalidator.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.safevalidator.common.entity.BaseEntity;

/**
 * Registered external app (e.g. an OA system) that can call
 * /api/auth/third-party-token to mint a short-lived JWT.
 *
 * appSecret is stored BCrypt-hashed; comparing it uses
 * PasswordEncoder.matches() which is constant-time.
 */
@TableName("sys_third_party_app")
public class SysThirdPartyApp extends BaseEntity {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String appId;
    /** BCrypt hash of the secret. Never store the plaintext. */
    private String appSecret;
    private String name;
    private String description;
    private Integer status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAppId() { return appId; }
    public void setAppId(String appId) { this.appId = appId; }
    public String getAppSecret() { return appSecret; }
    public void setAppSecret(String appSecret) { this.appSecret = appSecret; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
}