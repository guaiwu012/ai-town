export default function BattleVitalBattery({ value, max, compact = false }: { value: number; max: number; compact?: boolean }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const tone = ratio <= 0.3 ? 'red' : ratio <= 0.6 ? 'yellow' : 'green';
  return (
    <span
      className={`battle-vital-battery ${compact ? 'is-compact' : ''}`}
      data-tone={tone}
      role="img"
      aria-label={`生命 ${Math.ceil(value)}/${max}`}
      title={`生命 ${Math.ceil(value)}/${max}`}
    />
  );
}
