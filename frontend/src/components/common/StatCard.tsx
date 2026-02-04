interface Props {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  color?: 'default' | 'gold' | 'radiant' | 'dire';
}

export default function StatCard({ label, value, delta, deltaLabel, color = 'default' }: Props) {
  const valueColorClass = {
    default: 'text-dota-text-primary',
    gold: 'text-dota-gold',
    radiant: 'text-dota-radiant',
    dire: 'text-dota-dire',
  }[color];

  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${valueColorClass}`}>{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={`stat-card-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{deltaLabel ? ` ${deltaLabel}` : ''}
        </div>
      )}
    </div>
  );
}
