import { useState, useMemo } from 'react';
import type { EventOut, MatchPlayerOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';
import { getItemIconByName, getItemBenchmark, isKeyItem } from '../data/items';

interface Props {
  events: EventOut[];
  players: MatchPlayerOut[];
  currentSteamId?: number;
  matchDuration: number;
}

interface ItemPurchaseDisplay {
  item: string;
  displayName: string;
  time: number;
  benchmark: number | null;
  isKey: boolean;
}

interface PlayerTimeline {
  player: MatchPlayerOut;
  purchases: ItemPurchaseDisplay[];
  isCurrentPlayer: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMinutes(secs: number): string {
  return `${Math.floor(secs / 60)}m`;
}

function formatItemName(itemName: string): string {
  return itemName
    .replace(/^item_/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTimingStatus(time: number, benchmark: number | null): 'early' | 'ontime' | 'late' | 'verylate' {
  if (!benchmark) return 'ontime';
  const benchmarkSecs = benchmark * 60;
  const diff = time - benchmarkSecs;

  if (diff < -120) return 'early';
  if (diff < 120) return 'ontime';
  if (diff < 360) return 'late';
  return 'verylate';
}

// Game phase definitions
const GAME_PHASES = [
  { name: 'Laning', start: 0, end: 10 * 60, color: 'bg-blue-500/20' },
  { name: 'Mid Game', start: 10 * 60, end: 25 * 60, color: 'bg-purple-500/20' },
  { name: 'Late Game', start: 25 * 60, end: Infinity, color: 'bg-orange-500/20' },
];

// Timeline item tooltip
function ItemTooltip({ purchase, visible }: { purchase: ItemPurchaseDisplay; visible: boolean }) {
  if (!visible) return null;

  const status = getTimingStatus(purchase.time, purchase.benchmark);
  const statusColors = {
    early: 'text-dota-radiant-light',
    ontime: 'text-dota-gold',
    late: 'text-yellow-400',
    verylate: 'text-dota-dire-light',
  };

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
      <div className="bg-dota-surface border border-gray-700/50 rounded-lg p-3 shadow-xl min-w-[160px]">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={getItemIconByName(purchase.item)}
            alt={purchase.displayName}
            className="w-10 h-7 rounded border border-gray-700/50 object-cover"
          />
          <div>
            <div className="font-medium text-dota-text-primary text-sm">{purchase.displayName}</div>
            <div className="text-xs text-dota-text-muted font-mono">{formatTime(purchase.time)}</div>
          </div>
        </div>
        {purchase.benchmark && (
          <div className="text-xs border-t border-gray-700/50 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-dota-text-muted">Benchmark:</span>
              <span className="text-dota-text-secondary">{purchase.benchmark}:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dota-text-muted">Status:</span>
              <span className={statusColors[status]}>
                {status === 'early' ? 'Early' : status === 'ontime' ? 'On Time' : status === 'late' ? 'Late' : 'Very Late'}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700/50" />
    </div>
  );
}

// Single item on the timeline
function TimelineItem({ purchase, position }: { purchase: ItemPurchaseDisplay; position: number }) {
  const [hovered, setHovered] = useState(false);
  const status = getTimingStatus(purchase.time, purchase.benchmark);

  const borderColors = {
    early: 'border-dota-radiant',
    ontime: 'border-dota-gold',
    late: 'border-yellow-500',
    verylate: 'border-dota-dire',
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position}%`, top: '50%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ItemTooltip purchase={purchase} visible={hovered} />
      <div className={`relative transition-transform duration-200 ${hovered ? 'scale-125 z-20' : 'z-10'}`}>
        <img
          src={getItemIconByName(purchase.item)}
          alt={purchase.displayName}
          className={`w-9 h-7 rounded border-2 object-cover cursor-pointer shadow-md ${
            purchase.isKey ? borderColors[status] : 'border-gray-600'
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {purchase.isKey && (
          <div
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
              status === 'early' ? 'bg-dota-radiant' :
              status === 'ontime' ? 'bg-dota-gold' :
              status === 'late' ? 'bg-yellow-500' :
              'bg-dota-dire'
            }`}
          />
        )}
      </div>
    </div>
  );
}

// Visual timeline for a single player
function VisualTimeline({ timeline, maxTime }: { timeline: PlayerTimeline; maxTime: number }) {
  const heroIcon = getHeroIcon(timeline.player.hero_id);
  const heroName = getHeroName(timeline.player.hero_id);

  // Calculate time markers (every 5 minutes)
  const timeMarkers = [];
  for (let t = 0; t <= maxTime; t += 5 * 60) {
    timeMarkers.push(t);
  }

  // Filter to show only significant items on timeline
  const significantPurchases = timeline.purchases.filter(p => p.isKey || p.time > 5 * 60);

  return (
    <div className={`rounded-xl border overflow-hidden ${
      timeline.isCurrentPlayer ? 'border-dota-gold/50' : 'border-gray-700/50'
    }`}>
      {/* Player header */}
      <div className={`px-4 py-2 flex items-center gap-3 ${
        timeline.isCurrentPlayer ? 'bg-gradient-to-r from-dota-gold/20 to-transparent' : 'bg-dota-surface-light/50'
      }`}>
        {heroIcon && (
          <div className="hero-portrait w-12 h-7 flex-shrink-0">
            <img src={heroIcon} alt={heroName} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${timeline.isCurrentPlayer ? 'text-dota-gold' : 'text-dota-text-primary'}`}>
            {heroName}
          </span>
          {timeline.isCurrentPlayer && (
            <span className="ml-2 text-xs text-dota-gold/70">(You)</span>
          )}
        </div>
        <div className="text-xs text-dota-text-muted">
          {timeline.purchases.filter(p => p.isKey).length} key items
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="relative bg-dota-bg-dark/50 px-4 py-6">
        {/* Game phase backgrounds */}
        <div className="absolute inset-x-4 top-0 bottom-0 flex">
          {GAME_PHASES.map((phase, i) => {
            const startPercent = (phase.start / maxTime) * 100;
            const endPercent = Math.min((phase.end / maxTime) * 100, 100);
            const width = endPercent - startPercent;
            if (width <= 0) return null;

            return (
              <div
                key={phase.name}
                className={`${phase.color} ${i === 0 ? 'rounded-l' : ''} ${i === GAME_PHASES.length - 1 || phase.end >= maxTime ? 'rounded-r' : ''}`}
                style={{ width: `${width}%`, marginLeft: i === 0 ? `${startPercent}%` : 0 }}
              >
                <div className="text-[10px] text-dota-text-muted/60 uppercase tracking-wider px-2 pt-1">
                  {phase.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline track */}
        <div className="relative h-12">
          {/* Base track */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-700/50 rounded-full -translate-y-1/2" />

          {/* Time markers */}
          {timeMarkers.map(t => {
            const position = (t / maxTime) * 100;
            return (
              <div
                key={t}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                <div className="w-px h-3 bg-gray-600" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-dota-text-muted font-mono whitespace-nowrap">
                  {formatMinutes(t)}
                </div>
              </div>
            );
          })}

          {/* Item icons on timeline */}
          {significantPurchases.map((purchase, i) => {
            const position = Math.min((purchase.time / maxTime) * 100, 100);
            return (
              <TimelineItem
                key={`${purchase.item}-${purchase.time}-${i}`}
                purchase={purchase}
                position={position}
              />
            );
          })}
        </div>
      </div>

      {/* Item list below timeline */}
      <div className="px-4 py-3 bg-dota-bg-dark/30 border-t border-gray-700/30">
        <div className="flex flex-wrap gap-2">
          {timeline.purchases.map((purchase, i) => {
            const status = getTimingStatus(purchase.time, purchase.benchmark);
            return (
              <div
                key={`${purchase.item}-${i}`}
                className="group relative flex items-center gap-1.5 px-2 py-1 rounded bg-dota-surface-light/50 border border-gray-700/30 hover:border-gray-600 transition-colors"
              >
                <img
                  src={getItemIconByName(purchase.item)}
                  alt={purchase.displayName}
                  className="w-6 h-4 rounded object-cover"
                />
                <span className="text-xs text-dota-text-secondary">{formatTime(purchase.time)}</span>
                {purchase.isKey && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'early' ? 'bg-dota-radiant' :
                    status === 'ontime' ? 'bg-dota-gold' :
                    status === 'late' ? 'bg-yellow-500' :
                    'bg-dota-dire'
                  }`} />
                )}

                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-dota-surface border border-gray-700/50 rounded px-2 py-1 shadow-lg whitespace-nowrap">
                    <span className="text-xs font-medium text-dota-text-primary">{purchase.displayName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ItemTimings({ events, players, currentSteamId, matchDuration }: Props) {
  const [filterTeam, setFilterTeam] = useState<'all' | 'radiant' | 'dire'>('all');
  const [showOnlyCurrentPlayer, setShowOnlyCurrentPlayer] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  // Process events into player timelines
  const playerTimelines = useMemo<PlayerTimeline[]>(() => {
    const purchaseEvents = events.filter(e => e.event_type === 'item_purchase');
    const playerPurchases: Record<number, ItemPurchaseDisplay[]> = {};

    for (const event of purchaseEvents) {
      if (event.player_slot === null) continue;

      const itemName = event.data?.item as string;
      if (!itemName) continue;

      // Skip consumables and basic items
      const skipItems = ['tango', 'clarity', 'flask', 'ward_observer', 'ward_sentry', 'dust', 'smoke_of_deceit', 'tpscroll', 'branches', 'faerie_fire', 'enchanted_mango', 'blood_grenade', 'tome_of_knowledge'];
      const normalizedName = itemName.replace(/^item_/, '');
      if (skipItems.includes(normalizedName)) continue;

      if (!playerPurchases[event.player_slot]) {
        playerPurchases[event.player_slot] = [];
      }

      const existing = playerPurchases[event.player_slot].find(p => p.item === normalizedName);
      if (existing) continue;

      playerPurchases[event.player_slot].push({
        item: normalizedName,
        displayName: formatItemName(normalizedName),
        time: event.game_time_secs,
        benchmark: getItemBenchmark(normalizedName),
        isKey: isKeyItem(normalizedName),
      });
    }

    return players.map(player => ({
      player,
      purchases: (playerPurchases[player.player_slot] ?? []).sort((a, b) => a.time - b.time),
      isCurrentPlayer: currentSteamId !== undefined && player.steam_id === currentSteamId,
    })).filter(t => t.purchases.length > 0);
  }, [events, players, currentSteamId]);

  // Filter timelines
  const filteredTimelines = useMemo(() => {
    let result = playerTimelines;

    if (showOnlyCurrentPlayer) {
      result = result.filter(t => t.isCurrentPlayer);
    }

    if (filterTeam !== 'all') {
      result = result.filter(t => {
        const isRadiant = t.player.player_slot < 128;
        return filterTeam === 'radiant' ? isRadiant : !isRadiant;
      });
    }

    return result.sort((a, b) => {
      if (a.isCurrentPlayer && !b.isCurrentPlayer) return -1;
      if (!a.isCurrentPlayer && b.isCurrentPlayer) return 1;
      return a.player.player_slot - b.player.player_slot;
    });
  }, [playerTimelines, filterTeam, showOnlyCurrentPlayer]);

  // Calculate max time for timeline scaling
  const maxTime = useMemo(() => {
    const maxPurchaseTime = Math.max(...playerTimelines.flatMap(t => t.purchases.map(p => p.time)), 0);
    // Round up to nearest 5 minutes
    return Math.max(Math.ceil(maxPurchaseTime / (5 * 60)) * 5 * 60, matchDuration, 30 * 60);
  }, [playerTimelines, matchDuration]);

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto text-dota-text-muted mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-dota-text-muted">No item timing data available.</p>
        <p className="text-dota-text-muted text-sm mt-1">Replay parsing required for item timings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-dota-text-primary">Item Timings</h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700/50">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-dota-surface text-dota-text-primary'
                  : 'text-dota-text-muted hover:text-dota-text-secondary hover:bg-dota-surface-light'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-dota-surface text-dota-text-primary'
                  : 'text-dota-text-muted hover:text-dota-text-secondary hover:bg-dota-surface-light'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>

          {currentSteamId && (
            <label className="flex items-center gap-2 text-sm text-dota-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyCurrentPlayer}
                onChange={(e) => setShowOnlyCurrentPlayer(e.target.checked)}
                className="rounded border-gray-600 bg-dota-bg-dark text-dota-gold focus:ring-dota-gold/50"
              />
              Only me
            </label>
          )}

          <div className="flex rounded-lg overflow-hidden border border-gray-700/50">
            {(['all', 'radiant', 'dire'] as const).map(team => (
              <button
                key={team}
                onClick={() => setFilterTeam(team)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterTeam === team
                    ? team === 'radiant' ? 'bg-dota-radiant/20 text-dota-radiant-light' :
                      team === 'dire' ? 'bg-dota-dire/20 text-dota-dire-light' :
                      'bg-dota-surface text-dota-text-primary'
                    : 'text-dota-text-muted hover:text-dota-text-secondary hover:bg-dota-surface-light'
                }`}
              >
                {team === 'all' ? 'All' : team.charAt(0).toUpperCase() + team.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-4 text-dota-text-muted">
          <span className="font-medium text-dota-text-secondary">Timing:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-dota-radiant" />
            <span>Early</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-dota-gold" />
            <span>On time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-dota-dire" />
            <span>Very late</span>
          </div>
        </div>
        {viewMode === 'timeline' && (
          <div className="flex items-center gap-4 text-dota-text-muted">
            <span className="font-medium text-dota-text-secondary">Phase:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/20" />
              <span>Laning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500/20" />
              <span>Mid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500/20" />
              <span>Late</span>
            </div>
          </div>
        )}
      </div>

      {/* Player Timelines */}
      {filteredTimelines.length > 0 ? (
        <div className="space-y-4">
          {filteredTimelines.map(timeline => (
            viewMode === 'timeline' ? (
              <VisualTimeline
                key={timeline.player.player_slot}
                timeline={timeline}
                maxTime={maxTime}
              />
            ) : (
              <ListTimeline
                key={timeline.player.player_slot}
                timeline={timeline}
              />
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-dota-text-muted">
          No item timing data for selected filter.
        </div>
      )}
    </div>
  );
}

// List view timeline (original style)
function ListTimeline({ timeline }: { timeline: PlayerTimeline }) {
  const [expanded, setExpanded] = useState(false);
  const heroIcon = getHeroIcon(timeline.player.hero_id);
  const heroName = getHeroName(timeline.player.hero_id);

  const keyPurchases = timeline.purchases.filter(p => p.isKey);
  const displayPurchases = expanded ? timeline.purchases : keyPurchases.slice(0, 6);

  return (
    <div className={`rounded-xl border overflow-hidden ${
      timeline.isCurrentPlayer ? 'border-dota-gold/50' : 'border-gray-700/50'
    }`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${
        timeline.isCurrentPlayer ? 'bg-gradient-to-r from-dota-gold/20 to-transparent' : 'bg-dota-surface-light/50'
      }`}>
        {heroIcon && (
          <div className="hero-portrait w-10 h-6">
            <img src={heroIcon} alt={heroName} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <span className={`font-medium ${timeline.isCurrentPlayer ? 'text-dota-gold' : 'text-dota-text-primary'}`}>
            {heroName}
          </span>
          {timeline.isCurrentPlayer && (
            <span className="ml-2 text-xs text-dota-gold/70">(You)</span>
          )}
        </div>
        <div className="text-xs text-dota-text-muted">
          {keyPurchases.length} key items
        </div>
      </div>

      <div className="p-3 bg-dota-bg-dark/30">
        {displayPurchases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {displayPurchases.map((purchase, i) => {
              const icon = getItemIconByName(purchase.item);
              const status = getTimingStatus(purchase.time, purchase.benchmark);

              return (
                <div
                  key={`${purchase.item}-${purchase.time}-${i}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    purchase.isKey
                      ? 'bg-dota-surface-light border-gray-700/50'
                      : 'bg-dota-bg-dark/30 border-gray-700/30'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={icon}
                      alt={purchase.displayName}
                      className="w-9 h-7 rounded border border-gray-700/50 object-cover"
                    />
                    {purchase.isKey && (
                      <div
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          status === 'early' ? 'bg-dota-radiant' :
                          status === 'ontime' ? 'bg-dota-gold' :
                          status === 'late' ? 'bg-yellow-500' :
                          'bg-dota-dire'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${purchase.isKey ? 'font-medium text-dota-text-primary' : 'text-dota-text-secondary'}`}>
                        {purchase.displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dota-text-muted">
                      <span className="font-mono">{formatTime(purchase.time)}</span>
                      {purchase.benchmark && (
                        <span className="opacity-60">
                          / {purchase.benchmark}:00
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-dota-text-muted text-center py-2">
            No key item timings recorded
          </p>
        )}

        {timeline.purchases.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full text-sm text-dota-gold hover:text-dota-gold-light transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Show less
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show all {timeline.purchases.length} items
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
