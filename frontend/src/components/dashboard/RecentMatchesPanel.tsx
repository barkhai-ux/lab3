import { Link } from 'react-router-dom';
import type { MatchOut } from '../../types';
import { getHeroName, getHeroIcon } from '../../data/heroes';

interface Props {
  matches: MatchOut[];
  loading: boolean;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export default function RecentMatchesPanel({ matches, loading }: Props) {
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">Recent Matches</div>
        <div className="divide-y divide-dota-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-6 bg-dota-accent rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-dota-accent rounded w-24 mb-1"></div>
                <div className="h-3 bg-dota-accent rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">Recent Matches</div>
        <div className="px-4 py-8 text-center text-dota-text-muted text-sm">
          No recent matches
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">Recent Matches</div>
      <div className="divide-y divide-dota-border">
        {matches.slice(0, 10).map((match) => {
          const heroIcon = match.player_hero_id ? getHeroIcon(match.player_hero_id) : null;
          const heroName = match.player_hero_id ? getHeroName(match.player_hero_id) : 'Unknown';

          return (
            <Link
              key={match.match_id}
              to={`/match/${match.match_id}`}
              className="px-4 py-3 flex items-center gap-3 hover:bg-dota-accent/50"
            >
              {heroIcon ? (
                <img src={heroIcon} alt={heroName} className="w-10 h-6 object-cover rounded" />
              ) : (
                <div className="w-10 h-6 bg-dota-accent rounded"></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-dota-text-primary truncate">{heroName}</div>
                <div className="text-label text-dota-text-muted">
                  {formatDuration(match.duration_secs)}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${match.player_won ? 'text-dota-radiant' : 'text-dota-dire'}`}>
                  {match.player_won ? 'W' : 'L'}
                </div>
                <div className="text-label text-dota-text-muted">
                  {timeAgo(match.start_time)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link
        to="/matches"
        className="block px-4 py-3 text-center text-sm text-dota-text-secondary hover:text-dota-text-primary hover:bg-dota-accent/50 border-t border-dota-border"
      >
        View all matches
      </Link>
    </div>
  );
}
