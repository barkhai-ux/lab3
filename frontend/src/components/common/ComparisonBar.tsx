interface Props {
  label: string;
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
  format?: 'number' | 'k' | 'percent';
}

function formatValue(val: number, format: Props['format']): string {
  if (format === 'k') return `${(val / 1000).toFixed(1)}k`;
  if (format === 'percent') return `${val.toFixed(0)}%`;
  return val.toLocaleString();
}

export default function ComparisonBar({
  label,
  leftValue,
  rightValue,
  format = 'number',
}: Props) {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;
  const leftWins = leftValue > rightValue;
  const rightWins = rightValue > leftValue;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-label text-dota-text-muted">
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-stat font-mono w-16 text-right ${leftWins ? 'text-dota-radiant font-semibold' : 'text-dota-text-secondary'}`}>
          {formatValue(leftValue, format)}
        </span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-dota-accent">
          <div
            className={`${leftWins ? 'bg-dota-radiant' : 'bg-dota-radiant/50'}`}
            style={{ width: `${leftPercent}%` }}
          />
          <div
            className={`${rightWins ? 'bg-dota-dire' : 'bg-dota-dire/50'}`}
            style={{ width: `${100 - leftPercent}%` }}
          />
        </div>
        <span className={`text-stat font-mono w-16 ${rightWins ? 'text-dota-dire font-semibold' : 'text-dota-text-secondary'}`}>
          {formatValue(rightValue, format)}
        </span>
      </div>
    </div>
  );
}
