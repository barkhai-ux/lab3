import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DataPoint {
  time: number;
  goldAdvantage: number;
  xpAdvantage: number;
}

interface Props {
  data: DataPoint[];
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  return `${m}m`;
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1000) {
    return `${(val / 1000).toFixed(1)}k`;
  }
  return val.toString();
}

export default function TimelineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="panel p-4">
        <div className="panel-header mb-4 px-0 pt-0 border-0">Gold/XP Timeline</div>
        <div className="h-64 flex items-center justify-center text-dota-text-muted">
          No timeline data available
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="panel-header mb-4 px-0 pt-0 border-0">Gold/XP Advantage</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2f2f3a' }}
            />
            <YAxis
              tickFormatter={formatValue}
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2f2f3a' }}
              width={45}
            />
            <ReferenceLine y={0} stroke="#2f2f3a" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1c1c24',
                border: '1px solid #2f2f3a',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              labelFormatter={(val) => formatTime(val as number)}
              formatter={(val) => [
                formatValue(Number(val ?? 0)),
                '',
              ]}
            />
            <Line
              type="monotone"
              dataKey="goldAdvantage"
              stroke="#d4a855"
              strokeWidth={2}
              dot={false}
              name="goldAdvantage"
            />
            <Line
              type="monotone"
              dataKey="xpAdvantage"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="xpAdvantage"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 text-label text-dota-text-muted">
        <div className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-dota-gold"></span>
          Gold
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-gray-400" style={{ background: 'repeating-linear-gradient(90deg, #9ca3af 0, #9ca3af 4px, transparent 4px, transparent 6px)' }}></span>
          XP
        </div>
        <span className="ml-auto text-dota-radiant">Radiant advantage</span>
        <span className="text-dota-dire">Dire advantage</span>
      </div>
    </div>
  );
}
