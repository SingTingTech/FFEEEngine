package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_relationship")
public class FormRelationship {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long schemaId;
    private Long parentFormId;
    private Long childFormId;
    private String relationType;
    private String parentLinkField;
    private String childLinkField;
    private String onDelete;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createBy;
    private Long updateBy;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSchemaId() { return schemaId; }
    public void setSchemaId(Long schemaId) { this.schemaId = schemaId; }
    public Long getParentFormId() { return parentFormId; }
    public void setParentFormId(Long parentFormId) { this.parentFormId = parentFormId; }
    public Long getChildFormId() { return childFormId; }
    public void setChildFormId(Long childFormId) { this.childFormId = childFormId; }
    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }
    public String getParentLinkField() { return parentLinkField; }
    public void setParentLinkField(String parentLinkField) { this.parentLinkField = parentLinkField; }
    public String getChildLinkField() { return childLinkField; }
    public void setChildLinkField(String childLinkField) { this.childLinkField = childLinkField; }
    public String getOnDelete() { return onDelete; }
    public void setOnDelete(String onDelete) { this.onDelete = onDelete; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
    public Long getCreateBy() { return createBy; }
    public void setCreateBy(Long createBy) { this.createBy = createBy; }
    public Long getUpdateBy() { return updateBy; }
    public void setUpdateBy(Long updateBy) { this.updateBy = updateBy; }
    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
}