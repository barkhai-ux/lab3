import { useMemo } from 'react';
import type { MatchAnalysisOut, FindingOut, MatchPlayerOut, WardPosition } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';

interface Props {
  analysis: MatchAnalysisOut;
  players?: MatchPlayerOut[];
  currentSteamId?: number;
  wardPositions?: WardPosition[];
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-600';
  if (score >= 40) return 'bg-yellow-600';
  return 'bg-red-600';
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function severityConfig(severity: string | null): { border: string; bg: string; text: string; icon: string } {
  switch (severity) {
    case 'critical':
      return { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400', icon: '⚠' };
    case 'warning':
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: '△' };
    default:
      return { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400', icon: '✓' };
  }
}

function formatGameTime(secs: number | null): string {
  if (secs === null) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Finding({ finding }: { finding: FindingOut }) {
  const config = severityConfig(finding.severity);

  return (
    <div className={`border-l-4 ${config.border} ${config.bg} rounded-r-lg p-3`}>
      <div className="flex items-start gap-3">
        <span className={`text-lg ${config.text}`}>{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${config.text}`}>{finding.title}</span>
            {finding.category && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                {finding.category}
              </span>
            )}
            {finding.game_time_secs !== null && (
              <span className="text-xs text-gray-500 font-mono">
                @ {formatGameTime(finding.game_time_secs)}
              </span>
            )}
          </div>
          {finding.description && (
            <p className="text-sm text-gray-300 mt-1">{finding.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingSection({ title, findings, icon }: { title: string; findings: FindingOut[]; icon: string }) {
  if (findings.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
        <span>{icon}</span>
        {title}
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{findings.length}</span>
      </h4>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <Finding key={i} finding={f} />
        ))}
      </div>
    </div>
  );
}

// Team comparison bar component
function ComparisonBar({ label, teamValue, enemyValue, format = 'number' }: {
  label: string;
  teamValue: number;
  enemyValue: number;
  format?: 'number' | 'k' | 'percent';
}) {
  const total = teamValue + enemyValue;
  const teamPercent = total > 0 ? (teamValue / total) * 100 : 50;
  const isTeamAhead = teamValue > enemyValue;

  const formatValue = (val: number) => {
    if (format === 'k') return `${(val / 1000).toFixed(1)}k`;
    if (format === 'percent') return `${val.toFixed(0)}%`;
    return val.toLocaleString();
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="text-gray-500">
          {formatValue(teamValue)} vs {formatValue(enemyValue)}
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
        <div
          className={`transition-all duration-500 ${isTeamAhead ? 'bg-green-500' : 'bg-green-700'}`}
          style={{ width: `${teamPercent}%` }}
        />
        <div
          className={`transition-all duration-500 ${!isTeamAhead ? 'bg-red-500' : 'bg-red-700'}`}
          style={{ width: `${100 - teamPercent}%` }}
        />
      </div>
    </div>
  );
}

// Player performance card
function PlayerPerformanceCard({ player, isCurrentPlayer }: { player: MatchPlayerOut; isCurrentPlayer: boolean }) {
  const kda = player.deaths ? ((player.kills ?? 0) + (player.assists ?? 0)) / player.deaths : (player.kills ?? 0) + (player.assists ?? 0);
  const heroIcon = getHeroIcon(player.hero_id);
  const heroName = getHeroName(player.hero_id);

  return (
    <div className={`p-4 rounded-xl border ${isCurrentPlayer ? 'border-dota-gold bg-dota-gold/5' : 'border-gray-700 bg-gray-800/30'}`}>
      <div className="flex items-center gap-3 mb-3">
        {heroIcon && (
          <img src={heroIcon} alt={heroName} className="w-12 h-7 object-cover rounded" />
        )}
        <div>
          <div className={`font-semibold ${isCurrentPlayer ? 'text-dota-gold' : 'text-white'}`}>
            {heroName}
          </div>
          <div className="text-xs text-gray-400">
            {isCurrentPlayer ? 'Your Performance' : 'Teammate'}
          </div>
        </div>
      </div>

      {/* KDA Display */}
      <div className="flex items-center justify-center gap-1 text-2xl font-bold mb-3">
        <span className="text-green-400">{player.kills ?? 0}</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{player.deaths ?? 0}</span>
        <span className="text-gray-500">/</span>
        <span className="text-blue-400">{player.assists ?? 0}</span>
      </div>

      <div className="text-center text-sm text-gray-400 mb-4">
        KDA: <span className={`font-semibold ${kda >= 3 ? 'text-green-400' : kda >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
          {kda.toFixed(2)}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">GPM</div>
          <div className="text-white font-semibold">{player.gpm ?? 0}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">XPM</div>
          <div className="text-white font-semibold">{player.xpm ?? 0}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">Last Hits</div>
          <div className="text-white font-semibold">{player.last_hits ?? 0}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">Denies</div>
          <div className="text-white font-semibold">{player.denies ?? 0}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">Hero DMG</div>
          <div className="text-white font-semibold">{((player.hero_damage ?? 0) / 1000).toFixed(1)}k</div>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <div className="text-gray-400">Tower DMG</div>
          <div className="text-white font-semibold">{((player.tower_damage ?? 0) / 1000).toFixed(1)}k</div>
        </div>
      </div>
    </div>
  );
}

// Mini ward map component
const MINIMAP_URL = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/minimap/minimap.png';
const GAME_COORD_MIN = -8288;
const GAME_COORD_MAX = 8288;
const GAME_COORD_RANGE = GAME_COORD_MAX - GAME_COORD_MIN;

function MiniWardMap({ wardPositions }: { wardPositions: WardPosition[] }) {
  const gameToMapCoords = (x: number, y: number) => {
    const normalizedX = (x - GAME_COORD_MIN) / GAME_COORD_RANGE;
    const normalizedY = (y - GAME_COORD_MIN) / GAME_COORD_RANGE;
    return {
      left: `${normalizedX * 100}%`,
      top: `${(1 - normalizedY) * 100}%`,
    };
  };

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-700"
      style={{ backgroundImage: `url('${MINIMAP_URL}')`, backgroundSize: 'cover' }}
    >
      {wardPositions.map((ward, i) => {
        const pos = gameToMapCoords(ward.x, ward.y);
        const baseColor = ward.type === 'observer' ? 'bg-yellow-400' : 'bg-blue-400';
        const borderColor = ward.team === 'radiant' ? 'border-green-400' : 'border-red-400';

        return (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${baseColor} border ${borderColor}`}
            style={{
              left: pos.left,
              top: pos.top,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
}

// Lane outcome visualization
function LaneOutcomes({ findings }: { findings: FindingOut[] }) {
  const laneFindings = findings.filter(f =>
    f.title?.includes('Lane') || f.data?.lane_name
  );

  if (laneFindings.length === 0) return null;

  const lanes = ['Safe Lane', 'Mid Lane', 'Off Lane'];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-400">Lane Outcomes</h4>
      <div className="grid grid-cols-3 gap-2">
        {lanes.map(lane => {
          const laneFinding = laneFindings.find(f =>
            f.title?.includes(lane) || f.data?.lane_name === lane
          );
          const won = laneFinding?.title?.includes('won');
          const lost = laneFinding?.title?.includes('lost');

          return (
            <div
              key={lane}
              className={`p-3 rounded-lg text-center border ${
                won ? 'bg-green-500/10 border-green-500/50' :
                lost ? 'bg-red-500/10 border-red-500/50' :
                'bg-gray-800/30 border-gray-700'
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">{lane}</div>
              <div className={`text-sm font-semibold ${
                won ? 'text-green-400' : lost ? 'text-red-400' : 'text-gray-500'
              }`}>
                {won ? 'Won' : lost ? 'Lost' : 'Even'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisDisplay({ analysis, players, currentSteamId, wardPositions }: Props) {
  const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
  const warningFindings = analysis.findings.filter(f => f.severity === 'warning');
  const infoFindings = analysis.findings.filter(f => f.severity === 'info');

  // Extract team stats from findings
  const teamStats = useMemo(() => {
    const teamFinding = analysis.findings.find(f => f.data?.team_kills !== undefined);
    const goldFinding = analysis.findings.find(f => f.data?.team_avg_gpm !== undefined);
    const towerFinding = analysis.findings.find(f => f.data?.team_tower_damage !== undefined);
    const damageFinding = analysis.findings.find(f => f.data?.team_hero_damage !== undefined);

    return {
      kills: { team: teamFinding?.data?.team_kills as number ?? 0, enemy: teamFinding?.data?.enemy_kills as number ?? 0 },
      gpm: { team: goldFinding?.data?.team_avg_gpm as number ?? 0, enemy: goldFinding?.data?.enemy_avg_gpm as number ?? 0 },
      towerDamage: { team: towerFinding?.data?.team_tower_damage as number ?? 0, enemy: towerFinding?.data?.enemy_tower_damage as number ?? 0 },
      heroDamage: { team: damageFinding?.data?.team_hero_damage as number ?? 0, enemy: damageFinding?.data?.enemy_hero_damage as number ?? 0 },
    };
  }, [analysis.findings]);

  // Find current player
  const currentPlayer = useMemo(() => {
    if (!players || !currentSteamId) return null;
    return players.find(p => p.steam_id === currentSteamId);
  }, [players, currentSteamId]);

  const hasTeamStats = teamStats.kills.team > 0 || teamStats.kills.enemy > 0;

  return (
    <div className="space-y-6">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Match Analysis</h3>
        {analysis.overall_score !== null && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Performance</div>
              <div className="text-sm text-gray-300">{Math.round(analysis.overall_score)}/100</div>
            </div>
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white ${scoreColor(analysis.overall_score)}`}
            >
              {scoreGrade(analysis.overall_score)}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="bg-gradient-to-r from-dota-surface to-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-200">{analysis.summary}</p>
        </div>
      )}

      {/* Visual Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Performance Card */}
        {currentPlayer && (
          <PlayerPerformanceCard player={currentPlayer} isCurrentPlayer={true} />
        )}

        {/* Team Comparison */}
        {hasTeamStats && (
          <div className="p-4 rounded-xl border border-gray-700 bg-gray-800/30">
            <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <span className="text-green-400">Your Team</span>
              <span className="text-gray-500">vs</span>
              <span className="text-red-400">Enemy Team</span>
            </h4>
            <div className="space-y-4">
              {teamStats.kills.team + teamStats.kills.enemy > 0 && (
                <ComparisonBar label="Kills" teamValue={teamStats.kills.team} enemyValue={teamStats.kills.enemy} />
              )}
              {teamStats.gpm.team + teamStats.gpm.enemy > 0 && (
                <ComparisonBar label="Avg GPM" teamValue={teamStats.gpm.team} enemyValue={teamStats.gpm.enemy} />
              )}
              {teamStats.heroDamage.team + teamStats.heroDamage.enemy > 0 && (
                <ComparisonBar label="Hero Damage" teamValue={teamStats.heroDamage.team} enemyValue={teamStats.heroDamage.enemy} format="k" />
              )}
              {teamStats.towerDamage.team + teamStats.towerDamage.enemy > 0 && (
                <ComparisonBar label="Tower Damage" teamValue={teamStats.towerDamage.team} enemyValue={teamStats.towerDamage.enemy} format="k" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lane Outcomes + Ward Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LaneOutcomes findings={analysis.findings} />

        {wardPositions && wardPositions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">Vision Control</h4>
            <MiniWardMap wardPositions={wardPositions} />
            <div className="flex gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Observer
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Sentry
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Findings by severity */}
      <div className="space-y-6">
        <FindingSection
          title="Critical Issues"
          findings={criticalFindings}
          icon="🔴"
        />
        <FindingSection
          title="Areas for Improvement"
          findings={warningFindings}
          icon="🟡"
        />
        <FindingSection
          title="Positive Observations"
          findings={infoFindings}
          icon="🟢"
        />
      </div>

      {analysis.findings.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No detailed findings available for this match.
        </div>
      )}
    </div>
  );
}
