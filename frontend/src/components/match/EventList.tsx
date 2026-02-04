import { useState, useMemo } from 'react';
import type { EventOut } from '../../types';

interface Props {
  events: EventOut[];
}

const EVENT_TYPES = [
  { key: 'kill', label: 'Kills' },
  { key: 'tower_kill', label: 'Towers' },
  { key: 'roshan_kill', label: 'Roshan' },
  { key: 'barracks_kill', label: 'Barracks' },
  { key: 'item_purchase', label: 'Items' },
  { key: 'rune', label: 'Runes' },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function groupEventsByPeriod(events: EventOut[]): Map<string, EventOut[]> {
  const groups = new Map<string, EventOut[]>();

  events.forEach((event) => {
    const period = Math.floor(event.game_time_secs / 300); // 5 min periods
    const label = `${period * 5}-${(period + 1) * 5} min`;

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(event);
  });

  return groups;
}

export default function EventList({ events }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const filteredEvents = useMemo(() => {
    if (!filter) return events;
    return events.filter((e) => e.event_type === filter);
  }, [events, filter]);

  const groupedEvents = useMemo(() => groupEventsByPeriod(filteredEvents), [filteredEvents]);

  const togglePeriod = (period: string) => {
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <div className="panel p-4">
        <div className="panel-header mb-4 px-0 pt-0 border-0">Events</div>
        <div className="text-dota-text-muted text-sm">No event data available</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header flex items-center justify-between">
        <span>Events</span>
        <span className="text-label text-dota-text-muted font-normal">{filteredEvents.length} events</span>
      </div>

      {/* Filter buttons */}
      <div className="px-4 py-3 border-b border-dota-border flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-2 py-1 text-label rounded ${
            filter === null ? 'bg-dota-gold text-dota-bg' : 'bg-dota-accent text-dota-text-secondary hover:text-dota-text-primary'
          }`}
        >
          All
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => setFilter(type.key)}
            className={`px-2 py-1 text-label rounded ${
              filter === type.key ? 'bg-dota-gold text-dota-bg' : 'bg-dota-accent text-dota-text-secondary hover:text-dota-text-primary'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Event groups */}
      <div className="max-h-96 overflow-y-auto">
        {Array.from(groupedEvents.entries()).map(([period, periodEvents]) => (
          <div key={period} className="border-b border-dota-border last:border-0">
            <button
              onClick={() => togglePeriod(period)}
              className="w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-dota-accent/50"
            >
              <span className="text-dota-text-primary">{period}</span>
              <span className="flex items-center gap-2">
                <span className="text-dota-text-muted">{periodEvents.length} events</span>
                <span className="text-dota-text-muted">
                  {expandedPeriods.has(period) ? '−' : '+'}
                </span>
              </span>
            </button>

            {expandedPeriods.has(period) && (
              <div className="px-4 pb-3 space-y-1">
                {periodEvents.map((event, i) => (
                  <div
                    key={`${event.event_type}-${event.game_time_secs}-${i}`}
                    className="flex items-center gap-3 text-stat py-1 pl-4 border-l-2 border-dota-border"
                  >
                    <span className="font-mono text-dota-text-muted w-12">
                      {formatTime(event.game_time_secs)}
                    </span>
                    <span className="text-dota-text-secondary">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    {event.data && Object.keys(event.data).length > 0 && (
                      <span className="text-dota-text-muted truncate">
                        {JSON.stringify(event.data).slice(0, 50)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
