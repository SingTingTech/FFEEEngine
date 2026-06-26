const ICON_MAP: Record<string, string> = {
  text: '📝', longtext: '📄', number: '🔢', boolean: '✓',
  date: '📅', datetime: '🕐', select: '☑️', multiselect: '🔲',
  file: '📁', reference: '🔗', section: '▢', subform: '📦',
};

export function FieldTypeIcon({ type }: { type: string }) {
  return <span style={{ fontSize: 16, marginRight: 6 }}>{ICON_MAP[type] ?? '❓'}</span>;
}
