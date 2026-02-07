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
  const baseColor = ward.type === 'observer' ? 'bg-dota-gold' : 'bg-blue-400';
  const borderColor = ward.team === 'radiant' ? 'border-dota-radiant' : 'border-dota-dire';
  const glowColor = ward.type === 'observer' ? 'shadow-glow-gold' : 'shadow-blue-400/50';

  return (
    <button
      onClick={onClick}
      className={`absolute w-3 h-3 rounded-full ${baseColor} border-2 ${borderColor}
        hover:scale-150 hover:z-20 transition-all duration-200 cursor-pointer
        ${isSelected ? `scale-150 z-20 ring-2 ring-white ${glowColor}` : 'z-10'}`}
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
  const wardColor = ward.type === 'observer' ? 'text-dota-gold' : 'text-blue-400';
  const teamColor = ward.team === 'radiant' ? 'text-dota-radiant-light' : 'text-dota-dire-light';

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-dota-surface/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 shadow-xl z-30">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${ward.type === 'observer' ? 'bg-dota-gold' : 'bg-blue-400'}`} />
            <p className={`font-semibold ${wardColor}`}>{wardTypeLabel}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-dota-text-secondary">
              Placed at{' '}
              <span className="text-dota-text-primary font-mono bg-dota-bg-dark/50 px-1.5 py-0.5 rounded">
                {formatGameTime(ward.game_time_secs)}
              </span>
            </p>
            <p className="text-dota-text-secondary">
              Team:{' '}
              <span className={`font-medium ${teamColor}`}>
                {ward.team === 'radiant' ? 'Radiant' : 'Dire'}
              </span>
            </p>
          </div>
          <p className="text-xs text-dota-text-muted mt-2 font-mono">
            ({ward.x.toFixed(0)}, {ward.y.toFixed(0)})
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-dota-text-muted hover:text-dota-text-primary transition-colors p-1 rounded hover:bg-dota-surface-light"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-2">
        <svg className="w-4 h-4 text-dota-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-dota-text-secondary">Timeline</span>
      </div>
      <input
        type="range"
        min={0}
        max={duration}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-dota-bg-dark rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-dota-gold
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-glow-gold
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-[0_0_15px_rgba(245,166,35,0.5)]
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:bg-dota-gold
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-xs mt-2">
        <span className="text-dota-text-muted">0:00</span>
        <span className="text-dota-gold font-medium font-mono">{formatGameTime(value)}</span>
        <span className="text-dota-text-muted">{formatGameTime(duration)}</span>
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
    <div className="grid grid-cols-2 gap-3 mt-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-3 rounded-full bg-dota-gold border-2 border-dota-radiant inline-block"></span>
        <span className="text-dota-text-secondary">
          Radiant Obs <span className="text-dota-text-primary font-medium">({wardCounts.radiantObs})</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-dota-radiant inline-block"></span>
        <span className="text-dota-text-secondary">
          Radiant Sentry <span className="text-dota-text-primary font-medium">({wardCounts.radiantSentry})</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-3 rounded-full bg-dota-gold border-2 border-dota-dire inline-block"></span>
        <span className="text-dota-text-secondary">
          Dire Obs <span className="text-dota-text-primary font-medium">({wardCounts.direObs})</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-dota-dire inline-block"></span>
        <span className="text-dota-text-secondary">
          Dire Sentry <span className="text-dota-text-primary font-medium">({wardCounts.direSentry})</span>
        </span>
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
    <div>
      {/* Map container */}
      <div className="relative inline-block">
        {/* Minimap background */}
        <div
          className="relative bg-cover bg-center rounded-lg overflow-hidden border border-gray-700/50 shadow-lg"
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
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-dota-text-muted">
          Showing <span className="text-dota-text-primary font-medium">{visibleWards.length}</span> of{' '}
          <span className="text-dota-text-secondary">{wardPositions.length}</span> wards
        </span>
        {timeFilter < matchDuration && (
          <button
            onClick={() => setTimeFilter(matchDuration)}
            className="text-dota-gold hover:text-dota-gold-light text-xs transition-colors"
          >
            Show all
          </button>
        )}
      </div>
    </div>
  );
}
