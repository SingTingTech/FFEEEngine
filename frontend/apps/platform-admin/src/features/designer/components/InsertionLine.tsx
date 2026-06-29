interface Props {
  active: boolean;
}

export function InsertionLine({ active }: Props) {
  if (!active) return null;
  return (
    <div
      style={{
        height: 2,
        background: '#1677ff',
        borderRadius: 1,
        margin: '2px 0',
        pointerEvents: 'none',
      }}
      data-testid="insertion-line"
    />
  );
}