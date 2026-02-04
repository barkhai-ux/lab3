import type { EventOut } from '../../types';

interface Props {
  events: EventOut[];
  duration: number;
}

interface ObjectiveEvent {
  time: number;
  type: 'tower' | 'roshan' | 'barracks' | 'teamfight';
  team: 'radiant' | 'dire';
  label: string;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseObjectives(events: EventOut[]): ObjectiveEvent[] {
  return events
    .filter((e) => ['tower_kill', 'roshan_kill', 'barracks_kill', 'teamfight'].includes(e.event_type))
    .map((e) => {
      let type: ObjectiveEvent['type'] = 'tower';
      let label = 'T';

      if (e.event_type === 'tower_kill') {
        type = 'tower';
        label = 'T';
      } else if (e.event_type === 'roshan_kill') {
        type = 'roshan';
        label = 'R';
      } else if (e.event_type === 'barracks_kill') {
        type = 'barracks';
        label = 'B';
      } else if (e.event_type === 'teamfight') {
        type = 'teamfight';
        label = 'F';
      }

      // Determine team from event data
      const team = (e.data?.team as string) === 'dire' || (e.player_slot !== null && e.player_slot >= 128) ? 'dire' : 'radiant';

      return {
        time: e.game_time_secs,
        type,
        team,
        label,
      };
    });
}

export default function ObjectiveTimeline({ events, duration }: Props) {
  const objectives = parseObjectives(events);

  if (objectives.length === 0) {
    return null;
  }

  const typeColors: Record<ObjectiveEvent['type'], string> = {
    tower: 'bg-blue-500',
    roshan: 'bg-yellow-500',
    barracks: 'bg-purple-500',
    teamfight: 'bg-red-500',
  };

  return (
    <div className="panel p-4">
      <div className="panel-header mb-4 px-0 pt-0 border-0">Objective Timeline</div>

      {/* Timeline bar */}
      <div className="relative h-12 bg-dota-bg rounded overflow-hidden">
        {/* Time markers */}
        <div className="absolute inset-0 flex justify-between px-2 text-label text-dota-text-muted">
          <span>0:00</span>
          <span>{formatTime(duration / 4)}</span>
          <span>{formatTime(duration / 2)}</span>
          <span>{formatTime((duration * 3) / 4)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Objective markers */}
        {objectives.map((obj, i) => {
          const leftPercent = (obj.time / duration) * 100;
          const isTop = obj.team === 'radiant';

          return (
            <div
              key={`${obj.type}-${obj.time}-${i}`}
              className={`absolute w-5 h-5 rounded-full ${typeColors[obj.type]} flex items-center justify-center text-label font-bold text-white border-2 ${
                isTop ? 'border-dota-radiant top-1' : 'border-dota-dire bottom-1'
              }`}
              style={{ left: `calc(${leftPercent}% - 10px)` }}
              title={`${obj.type} at ${formatTime(obj.time)} (${obj.team})`}
            >
              {obj.label}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-label text-dota-text-muted">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Tower (T)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          Roshan (R)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          Barracks (B)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          Teamfight (F)
        </div>
      </div>
    </div>
  );
}
