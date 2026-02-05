import { Link } from 'react-router-dom';
import type { MatchOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';

interface Props {
  match: MatchOut;
}

const GAME_MODES: Record<number, string> = {
  0: 'Unknown',
  1: 'All Pick',
  2: "Captain's Mode",
  3: 'Random Draft',
  4: 'Single Draft',
  5: 'All Random',
  22: 'Ranked All Pick',
  23: 'Turbo',
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default function MatchCard({ match }: Props) {
  const mode = GAME_MODES[match.game_mode] ?? `Mode ${match.game_mode}`;
  const heroName = match.player_hero_id ? getHeroName(match.player_hero_id) : null;
  const heroIcon = match.player_hero_id ? getHeroIcon(match.player_hero_id) : null;
  const isWin = match.player_won;

  return (
    <Link
      to={`/match/${match.match_id}`}
      className="group block dota-card p-4 hover:border-dota-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Win/Loss indicator line */}
      <div
        className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${
          isWin ? 'bg-dota-radiant' : 'bg-dota-dire'
        }`}
      />

      <div className="flex items-center gap-4">
        {/* Hero portrait */}
        <div className="relative flex-shrink-0">
          {heroIcon ? (
            <div className="hero-portrait w-16 h-9 rounded overflow-hidden">
              <img
                src={heroIcon}
                alt={heroName ?? ''}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          ) : (
            <div className="w-16 h-9 rounded bg-dota-bg-dark flex items-center justify-center">
              <span className="text-dota-text-muted text-xs">?</span>
            </div>
          )}
        </div>

        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium text-dota-text-primary truncate">
              {heroName ?? 'Unknown Hero'}
            </span>
            <span className={isWin ? 'badge-win' : 'badge-loss'}>
              {isWin ? 'Victory' : 'Defeat'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-dota-text-muted">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(match.duration_secs)}
            </span>
            <span className="px-2 py-0.5 rounded bg-dota-bg-dark/50 text-dota-text-secondary">
              {mode}
            </span>
            {match.avg_mmr && (
              <span className="mmr-badge">
                {match.avg_mmr} MMR
              </span>
            )}
          </div>
        </div>

        {/* Right side - time and ID */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm text-dota-text-secondary mb-1">
            {getTimeAgo(match.start_time)}
          </div>
          <div className="font-mono text-xs text-dota-text-muted">
            #{match.match_id}
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 text-dota-text-muted group-hover:text-dota-gold transition-colors">
          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
