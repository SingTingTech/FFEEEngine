package com.safevalidator.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Standard error codes")
public enum ErrorCode {

    SUCCESS(0, "ok"),
    BAD_REQUEST(40000, "请求参数错误"),
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    FORBIDDEN(40300, "权限不足"),
    NOT_FOUND(40400, "资源不存在"),
    CONFLICT(40900, "资源冲突"),

    USER_NOT_FOUND(50001, "用户不存在"),
    USER_PASSWORD_INVALID(50002, "用户名或密码错误"),
    USER_DISABLED(50003, "用户已禁用"),
    USERNAME_DUPLICATE(50004, "用户名已存在"),

    ROLE_NOT_FOUND(51001, "角色不存在"),
    ROLE_NAME_DUPLICATE(51002, "角色名称已存在"),
    ROLE_IN_USE(51003, "角色正在使用中，无法删除"),

    TOKEN_INVALID(52001, "令牌无效"),
    TOKEN_EXPIRED(52002, "令牌已过期"),
    TOKEN_BLACKLISTED(52003, "令牌已撤销"),

    FORM_NOT_FOUND(53001, "表单不存在"),
    FORM_FIELD_NOT_FOUND(53002, "表单字段不存在"),
    FORM_DATA_NOT_FOUND(53003, "表单数据不存在"),
    FORM_VALIDATION_FAILED(53004, "表单校验失败"),
    FORM_DUPLICATE_BUSINESS_KEY(53005, "业务主键重复"),
    FORM_RELATIONSHIP_BLOCKED(53006, "存在子数据，无法删除"),
    FORM_MAPPING_INVALID(53007, "字段映射配置无效"),
    FORM_REFERENCE_NOT_FOUND(53008, "引用的记录不存在"),
    FORM_FIELD_IN_USE(53009, "字段被引用，无法删除"),
    SECTION_NOT_FOUND(53010, "分组不存在"),

    SYSTEM_ERROR(99999, "系统异常");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int code() { return code; }
    public String message() { return message; }
}
