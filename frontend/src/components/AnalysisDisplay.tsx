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
  if (score >= 70) return 'bg-gradient-to-br from-dota-radiant to-dota-radiant-dark';
  if (score >= 40) return 'bg-gradient-to-br from-yellow-500 to-yellow-600';
  return 'bg-gradient-to-br from-dota-dire to-dota-dire-dark';
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function severityConfig(severity: string | null): { border: string; bg: string; text: string; icon: React.ReactNode } {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-dota-dire/50',
        bg: 'bg-dota-dire/10',
        text: 'text-dota-dire-light',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case 'warning':
      return {
        border: 'border-yellow-500/50',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    default:
      return {
        border: 'border-dota-radiant/50',
        bg: 'bg-dota-radiant/10',
        text: 'text-dota-radiant-light',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
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
    <div className={`border-l-2 ${config.border} ${config.bg} rounded-r-lg p-4`}>
      <div className="flex items-start gap-3">
        <span className={`${config.text} flex-shrink-0 mt-0.5`}>{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${config.text}`}>{finding.title}</span>
            {finding.category && (
              <span className="text-xs px-2 py-0.5 rounded bg-dota-surface text-dota-text-muted">
                {finding.category}
              </span>
            )}
            {finding.game_time_secs !== null && (
              <span className="text-xs text-dota-text-muted font-mono bg-dota-bg-dark/50 px-2 py-0.5 rounded">
                @ {formatGameTime(finding.game_time_secs)}
              </span>
            )}
          </div>
          {finding.description && (
            <p className="text-sm text-dota-text-secondary mt-1.5">{finding.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingSection({ title, findings, icon }: { title: string; findings: FindingOut[]; icon: React.ReactNode }) {
  if (findings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-dota-text-secondary flex items-center gap-2">
        <span>{icon}</span>
        {title}
        <span className="text-xs bg-dota-surface px-2 py-0.5 rounded-full text-dota-text-muted">
          {findings.length}
        </span>
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
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-dota-text-secondary font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={isTeamAhead ? 'text-dota-radiant' : 'text-dota-text-muted'}>
            {formatValue(teamValue)}
          </span>
          <span className="text-dota-text-muted">vs</span>
          <span className={!isTeamAhead ? 'text-dota-dire' : 'text-dota-text-muted'}>
            {formatValue(enemyValue)}
          </span>
        </div>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-dota-bg-dark">
        <div
          className={`transition-all duration-500 ${isTeamAhead ? 'bg-dota-radiant' : 'bg-dota-radiant/50'}`}
          style={{ width: `${teamPercent}%` }}
        />
        <div
          className={`transition-all duration-500 ${!isTeamAhead ? 'bg-dota-dire' : 'bg-dota-dire/50'}`}
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
    <div className={`rounded-xl border overflow-hidden ${isCurrentPlayer ? 'border-dota-gold/50' : 'border-gray-700/50'}`}>
      {/* Header with gradient */}
      <div className={`px-4 py-3 ${isCurrentPlayer ? 'bg-gradient-to-r from-dota-gold/20 to-transparent' : 'bg-dota-surface-light/50'}`}>
        <div className="flex items-center gap-3">
          {heroIcon && (
            <div className="hero-portrait w-14 h-8">
              <img src={heroIcon} alt={heroName} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <div className={`font-semibold ${isCurrentPlayer ? 'text-dota-gold' : 'text-dota-text-primary'}`}>
              {heroName}
            </div>
            <div className="text-xs text-dota-text-muted">
              {isCurrentPlayer ? 'Your Performance' : 'Teammate'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-dota-bg-dark/30">
        {/* KDA Display */}
        <div className="flex items-center justify-center gap-2 text-3xl font-bold mb-2">
          <span className="text-dota-radiant">{player.kills ?? 0}</span>
          <span className="text-dota-text-muted text-xl">/</span>
          <span className="text-dota-dire">{player.deaths ?? 0}</span>
          <span className="text-dota-text-muted text-xl">/</span>
          <span className="text-dota-accent-light">{player.assists ?? 0}</span>
        </div>

        <div className="text-center text-sm text-dota-text-muted mb-4">
          KDA Ratio:{' '}
          <span className={`font-semibold ${kda >= 3 ? 'text-dota-radiant' : kda >= 2 ? 'text-dota-gold' : 'text-dota-dire'}`}>
            {kda.toFixed(2)}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">GPM</div>
            <div className="text-dota-gold font-semibold text-base">{player.gpm ?? 0}</div>
          </div>
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">XPM</div>
            <div className="text-dota-text-primary font-semibold text-base">{player.xpm ?? 0}</div>
          </div>
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">Last Hits</div>
            <div className="text-dota-text-primary font-semibold text-base">{player.last_hits ?? 0}</div>
          </div>
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">Denies</div>
            <div className="text-dota-text-primary font-semibold text-base">{player.denies ?? 0}</div>
          </div>
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">Hero DMG</div>
            <div className="text-dota-text-primary font-semibold text-base">{((player.hero_damage ?? 0) / 1000).toFixed(1)}k</div>
          </div>
          <div className="stat-box">
            <div className="text-dota-text-muted uppercase tracking-wider text-[10px]">Tower DMG</div>
            <div className="text-dota-text-primary font-semibold text-base">{((player.tower_damage ?? 0) / 1000).toFixed(1)}k</div>
          </div>
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
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-dota-text-secondary flex items-center gap-2">
        <svg className="w-4 h-4 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Lane Outcomes
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {lanes.map(lane => {
          const laneFinding = laneFindings.find(f =>
            f.title?.includes(lane) || f.data?.lane_name === lane
          );
          const won = laneFinding?.title?.includes('won');
          const lost = laneFinding?.title?.includes('lost');

          return (
            <div
              key={lane}
              className={`p-4 rounded-lg text-center border transition-all ${
                won ? 'bg-dota-radiant/10 border-dota-radiant/30' :
                lost ? 'bg-dota-dire/10 border-dota-dire/30' :
                'bg-dota-bg-dark/50 border-gray-700/30'
              }`}
            >
              <div className="text-xs text-dota-text-muted mb-2 uppercase tracking-wider">{lane}</div>
              <div className={`text-sm font-semibold flex items-center justify-center gap-1.5 ${
                won ? 'text-dota-radiant-light' : lost ? 'text-dota-dire-light' : 'text-dota-text-muted'
              }`}>
                {won && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {lost && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
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
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-dota-text-primary">Match Analysis</h3>
        </div>
        {analysis.overall_score !== null && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-dota-text-muted uppercase tracking-wider">Score</div>
              <div className="text-sm text-dota-text-secondary font-medium">{Math.round(analysis.overall_score)}/100</div>
            </div>
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg ${scoreColor(analysis.overall_score)}`}
            >
              {scoreGrade(analysis.overall_score)}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="bg-gradient-to-r from-dota-surface to-dota-bg-dark border border-gray-700/50 rounded-xl p-4">
          <p className="text-dota-text-secondary leading-relaxed">{analysis.summary}</p>
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
          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="px-4 py-3 bg-dota-surface-light/50 border-b border-gray-700/30">
              <h4 className="text-sm font-medium text-dota-text-secondary flex items-center gap-2">
                <span className="text-dota-radiant">Your Team</span>
                <span className="text-dota-text-muted">vs</span>
                <span className="text-dota-dire">Enemy Team</span>
              </h4>
            </div>
            <div className="p-4 bg-dota-bg-dark/30 space-y-4">
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

      {/* Lane Outcomes */}
      <LaneOutcomes findings={analysis.findings} />

      {/* Findings by severity */}
      <div className="space-y-6">
        <FindingSection
          title="Critical Issues"
          findings={criticalFindings}
          icon={
            <svg className="w-4 h-4 text-dota-dire" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <FindingSection
          title="Areas for Improvement"
          findings={warningFindings}
          icon={
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <FindingSection
          title="Positive Observations"
          findings={infoFindings}
          icon={
            <svg className="w-4 h-4 text-dota-radiant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {analysis.findings.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-dota-text-muted mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-dota-text-muted">No detailed findings available for this match.</p>
        </div>
      )}
    </div>
  );
}
