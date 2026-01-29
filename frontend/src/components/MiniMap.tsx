import { useState, useMemo } from 'react';
import type { WardPosition } from '../types';

// Dota 2 minimap from OpenDota CDN
const MINIMAP_URL = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/minimap/minimap.png';

// Dota 2 game coordinate bounds
const GAME_COORD_MIN = -8288;
const GAME_COORD_MAX = 8288;
const GAME_COORD_RANGE = GAME_COORD_MAX - GAME_COORD_MIN; // 16576

// Map display size in pixels
const MAP_SIZE = 512;

interface Props {
  wardPositions: WardPosition[];
  matchDuration: number;
}

function formatGameTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Convert Dota 2 game coordinates to minimap pixel position.
 * Game coords: X (-8288 to 8288), Y (-8288 to 8288)
 * Map coords: (0,0) is top-left, (512,512) is bottom-right
 */
function gameToMapCoords(x: number, y: number): { left: number; top: number } {
  // Normalize to 0-1 range
  const normalizedX = (x - GAME_COORD_MIN) / GAME_COORD_RANGE;
  const normalizedY = (y - GAME_COORD_MIN) / GAME_COORD_RANGE;

  return {
    left: normalizedX * MAP_SIZE,
    // Y is inverted (game Y increases upward, screen Y increases downward)
    top: (1 - normalizedY) * MAP_SIZE,
  };
}

interface WardMarkerProps {
  ward: WardPosition;
  isSelected: boolean;
  onClick: () => void;
}

function WardMarker({ ward, isSelected, onClick }: WardMarkerProps) {
  const pos = gameToMapCoords(ward.x, ward.y);

  // Observer = yellow/gold, Sentry = blue
  const baseColor = ward.type === 'observer' ? 'bg-yellow-400' : 'bg-blue-400';
  const borderColor = ward.team === 'radiant' ? 'border-green-400' : 'border-red-400';

  return (
    <button
      onClick={onClick}
      className={`absolute w-3 h-3 rounded-full ${baseColor} border-2 ${borderColor}
        hover:scale-150 hover:z-20 transition-transform cursor-pointer
        ${isSelected ? 'scale-150 z-20 ring-2 ring-white' : 'z-10'}`}
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        transform: 'translate(-50%, -50%)',
      }}
      title={`${ward.type} ward (${ward.team}) @ ${formatGameTime(ward.game_time_secs)}`}
    />
  );
}

interface WardInfoProps {
  ward: WardPosition;
  onClose: () => void;
}

function WardInfo({ ward, onClose }: WardInfoProps) {
  const wardTypeLabel = ward.type === 'observer' ? 'Observer Ward' : 'Sentry Ward';
  const wardColor = ward.type === 'observer' ? 'text-yellow-400' : 'text-blue-400';
  const teamColor = ward.team === 'radiant' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-dota-bg/95 border border-gray-600 rounded-lg p-3 shadow-lg z-30">
      <div className="flex justify-between items-start">
        <div>
          <p className={`font-medium ${wardColor}`}>{wardTypeLabel}</p>
          <p className="text-sm text-gray-300">
            Placed at <span className="text-white font-mono">{formatGameTime(ward.game_time_secs)}</span>
          </p>
          <p className="text-sm">
            Team: <span className={`font-medium ${teamColor}`}>{ward.team === 'radiant' ? 'Radiant' : 'Dire'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Position: ({ward.x.toFixed(0)}, {ward.y.toFixed(0)})
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

interface TimelineSliderProps {
  duration: number;
  value: number;
  onChange: (value: number) => void;
}

function TimelineSlider({ duration, value, onChange }: TimelineSliderProps) {
  return (
    <div className="mt-4 px-2">
      <input
        type="range"
        min={0}
        max={duration}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-dota-gold
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-dota-gold
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0:00</span>
        <span className="text-white font-medium">{formatGameTime(value)}</span>
        <span>{formatGameTime(duration)}</span>
      </div>
    </div>
  );
}

interface LegendProps {
  wardCounts: {
    radiantObs: number;
    radiantSentry: number;
    direObs: number;
    direSentry: number;
  };
}

function Legend({ wardCounts }: LegendProps) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-300 mt-3">
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-green-400 inline-block"></span>
        <span>Radiant Observer ({wardCounts.radiantObs})</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-green-400 inline-block"></span>
        <span>Radiant Sentry ({wardCounts.radiantSentry})</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-red-400 inline-block"></span>
        <span>Dire Observer ({wardCounts.direObs})</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-red-400 inline-block"></span>
        <span>Dire Sentry ({wardCounts.direSentry})</span>
      </div>
    </div>
  );
}

export default function MiniMap({ wardPositions, matchDuration }: Props) {
  const [timeFilter, setTimeFilter] = useState<number>(matchDuration);
  const [selectedWard, setSelectedWard] = useState<WardPosition | null>(null);

  // Filter wards by current time filter
  const visibleWards = useMemo(() => {
    return wardPositions.filter((w) => w.game_time_secs <= timeFilter);
  }, [wardPositions, timeFilter]);

  // Count wards by type and team
  const wardCounts = useMemo(() => {
    return {
      radiantObs: visibleWards.filter((w) => w.team === 'radiant' && w.type === 'observer').length,
      radiantSentry: visibleWards.filter((w) => w.team === 'radiant' && w.type === 'sentry').length,
      direObs: visibleWards.filter((w) => w.team === 'dire' && w.type === 'observer').length,
      direSentry: visibleWards.filter((w) => w.team === 'dire' && w.type === 'sentry').length,
    };
  }, [visibleWards]);

  return (
    <div className="space-y-2">
      {/* Map container */}
      <div className="relative inline-block">
        {/* Minimap background */}
        <div
          className="relative bg-cover bg-center rounded-lg overflow-hidden border border-gray-700"
          style={{
            width: `${MAP_SIZE}px`,
            height: `${MAP_SIZE}px`,
            backgroundImage: `url('${MINIMAP_URL}')`,
          }}
        >
          {/* Ward markers */}
          {visibleWards.map((ward, i) => (
            <WardMarker
              key={`${ward.game_time_secs}-${ward.x}-${ward.y}-${i}`}
              ward={ward}
              isSelected={selectedWard === ward}
              onClick={() => setSelectedWard(selectedWard === ward ? null : ward)}
            />
          ))}

          {/* Selected ward info overlay */}
          {selectedWard && (
            <WardInfo
              ward={selectedWard}
              onClose={() => setSelectedWard(null)}
            />
          )}
        </div>
      </div>

      {/* Timeline slider */}
      <TimelineSlider
        duration={matchDuration}
        value={timeFilter}
        onChange={setTimeFilter}
      />

      {/* Legend */}
      <Legend wardCounts={wardCounts} />

      {/* Ward count summary */}
      <p className="text-sm text-gray-400">
        Showing {visibleWards.length} of {wardPositions.length} wards
        {timeFilter < matchDuration && ` (up to ${formatGameTime(timeFilter)})`}
      </p>
    </div>
  );
}
