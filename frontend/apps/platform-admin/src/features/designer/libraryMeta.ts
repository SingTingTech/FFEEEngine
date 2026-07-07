// Shared library→canvas metadata. Mirrors ComponentLibrary.tsx's
// FIELD_CATEGORIES so the drag preview (DragOverlay and Canvas ghost)
// shows the same emoji + Chinese label as the library card itself.
//
// Add new entries here whenever ComponentLibrary adds a new type.

export const LIBRARY_TYPE_META: Record<string, { emoji: string; label: string }> = {
  text:        { emoji: '📝', label: '文本' },
  longtext:    { emoji: '📄', label: '长文本' },
  number:      { emoji: '🔢', label: '数字' },
  date:        { emoji: '📅', label: '日期' },
  datetime:    { emoji: '🕐', label: '日期时间' },
  select:      { emoji: '☑️', label: '单选' },
  multiselect: { emoji: '🔲', label: '多选' },
  section:     { emoji: '▢',  label: '分组' },
  subform:     { emoji: '📦', label: '子表单' },
  boolean:     { emoji: '✓',  label: '布尔' },
  file:        { emoji: '📁', label: '文件' },
  reference:   { emoji: '🔗', label: '引用' },
};