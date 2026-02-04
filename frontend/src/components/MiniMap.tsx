import { useState, useMemo } from 'react';
import type { WardPosition } from '../types';

const MINIMAP_URL = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/minimap/minimap.png';
const GAME_COORD_MIN = -8288;
const GAME_COORD_MAX = 8288;
const GAME_COORD_RANGE = GAME_COORD_MAX - GAME_COORD_MIN;
const MAP_SIZE = 320; // Reduced from 512

interface Props {
  wardPositions: WardPosition[];
  matchDuration: number;
}

function formatGameTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function gameToMapCoords(x: number, y: number): { left: number; top: number } {
  const normalizedX = (x - GAME_COORD_MIN) / GAME_COORD_RANGE;
  const normalizedY = (y - GAME_COORD_MIN) / GAME_COORD_RANGE;

  return {
    left: normalizedX * MAP_SIZE,
    top: (1 - normalizedY) * MAP_SIZE,
  };
}

function WardMarker({ ward, isSelected, onClick }: {
  ward: WardPosition;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pos = gameToMapCoords(ward.x, ward.y);
  const baseColor = ward.type === 'observer' ? 'bg-yellow-400' : 'bg-blue-400';
  const borderColor = ward.team === 'radiant' ? 'border-dota-radiant' : 'border-dota-dire';

  return (
    <button
      onClick={onClick}
      className={`absolute w-2.5 h-2.5 rounded-full ${baseColor} border-2 ${borderColor} hover:scale-150 hover:z-20 cursor-pointer ${
        isSelected ? 'scale-150 z-20 ring-2 ring-white' : 'z-10'
      }`}
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        transform: 'translate(-50%, -50%)',
      }}
      title={`${ward.type} (${ward.team}) @ ${formatGameTime(ward.game_time_secs)}`}
    />
  );
}

export default function MiniMap({ wardPositions, matchDuration }: Props) {
  const [timeFilter, setTimeFilter] = useState<number>(matchDuration);
  const [selectedWard, setSelectedWard] = useState<WardPosition | null>(null);

  const visibleWards = useMemo(() => {
    return wardPositions.filter((w) => w.game_time_secs <= timeFilter);
  }, [wardPositions, timeFilter]);

  const wardCounts = useMemo(() => {
    return {
      radiantObs: visibleWards.filter((w) => w.team === 'radiant' && w.type === 'observer').length,
      radiantSentry: visibleWards.filter((w) => w.team === 'radiant' && w.type === 'sentry').length,
      direObs: visibleWards.filter((w) => w.team === 'dire' && w.type === 'observer').length,
      direSentry: visibleWards.filter((w) => w.team === 'dire' && w.type === 'sentry').length,
    };
  }, [visibleWards]);

  return (
    <div className="space-y-3">
      {/* Map container */}
      <div className="relative inline-block">
        <div
          className="relative bg-cover bg-center rounded-lg overflow-hidden border border-dota-border"
          style={{
            width: `${MAP_SIZE}px`,
            height: `${MAP_SIZE}px`,
            backgroundImage: `url('${MINIMAP_URL}')`,
          }}
        >
          {visibleWards.map((ward, i) => (
            <WardMarker
              key={`${ward.game_time_secs}-${ward.x}-${ward.y}-${i}`}
              ward={ward}
              isSelected={selectedWard === ward}
              onClick={() => setSelectedWard(selectedWard === ward ? null : ward)}
            />
          ))}

          {selectedWard && (
            <div className="absolute bottom-2 left-2 right-2 bg-dota-bg/95 border border-dota-border rounded p-2 text-stat z-30">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`font-medium ${selectedWard.type === 'observer' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {selectedWard.type === 'observer' ? 'Observer' : 'Sentry'}
                  </span>
                  <span className="text-dota-text-muted mx-2">|</span>
                  <span className={selectedWard.team === 'radiant' ? 'text-dota-radiant' : 'text-dota-dire'}>
                    {selectedWard.team}
                  </span>
                  <span className="text-dota-text-muted mx-2">|</span>
                  <span className="text-dota-text-primary font-mono">
                    {formatGameTime(selectedWard.game_time_secs)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedWard(null)}
                  className="text-dota-text-muted hover:text-dota-text-primary"
                >
                  x
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline slider */}
      <div>
        <input
          type="range"
          min={0}
          max={matchDuration}
          value={timeFilter}
          onChange={(e) => setTimeFilter(Number(e.target.value))}
          className="w-full h-1.5 bg-dota-accent rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-dota-gold [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-label text-dota-text-muted mt-1">
          <span>0:00</span>
          <span className="text-dota-text-primary font-mono">{formatGameTime(timeFilter)}</span>
          <span>{formatGameTime(matchDuration)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-label text-dota-text-muted">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 border border-dota-radiant"></span>
          <span>Obs ({wardCounts.radiantObs})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 border border-dota-radiant"></span>
          <span>Sen ({wardCounts.radiantSentry})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 border border-dota-dire"></span>
          <span>Obs ({wardCounts.direObs})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 border border-dota-dire"></span>
          <span>Sen ({wardCounts.direSentry})</span>
        </div>
      </div>

      <p className="text-label text-dota-text-muted">
        {visibleWards.length} of {wardPositions.length} wards
        {timeFilter < matchDuration && ` (up to ${formatGameTime(timeFilter)})`}
      </p>
    </div>
  );
}
