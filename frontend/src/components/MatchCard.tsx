import { Link } from 'react-router-dom';
import type { MatchOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';

interface Props {
  match: MatchOut;
}

const GAME_MODES: Record<number, string> = {
  0: 'Unknown',
  1: 'All Pick',
  2: 'Captain\'s Mode',
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MatchCard({ match }: Props) {
  const mode = GAME_MODES[match.game_mode] ?? `Mode ${match.game_mode}`;
  const heroName = match.player_hero_id ? getHeroName(match.player_hero_id) : null;
  const heroIcon = match.player_hero_id ? getHeroIcon(match.player_hero_id) : null;

  return (
    <Link
      to={`/match/${match.match_id}`}
      className="block bg-dota-surface border border-gray-700 rounded-lg p-4 hover:border-dota-gold/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {heroIcon && (
            <img
              src={heroIcon}
              alt={heroName ?? ''}
              className="w-10 h-6 object-cover rounded"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm text-gray-200">
              {heroName ?? 'Unknown Hero'}
            </span>
            <span className="text-gray-500 font-mono text-xs">
              #{match.match_id}
            </span>
          </div>
          <span className="text-sm text-gray-300">{mode}</span>
          <span className="text-sm text-gray-400">
            {formatDuration(match.duration_secs)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              match.replay_state === 'parsed'
                ? 'bg-green-900/50 text-green-300'
                : match.replay_state === 'pending'
                  ? 'bg-yellow-900/50 text-yellow-300'
                  : 'bg-gray-700 text-gray-400'
            }`}
          >
            {match.replay_state}
          </span>
          <span
            className={`text-sm font-semibold ${
              match.player_won ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {match.player_won ? 'Won' : 'Lost'}
          </span>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {formatDate(match.start_time)}
        {match.avg_mmr && (
          <span className="ml-3">~{match.avg_mmr} MMR</span>
        )}
      </div>
    </Link>
  );
}
