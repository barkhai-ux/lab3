import StatCard from '../common/StatCard';
import type { AggregateInsights, HeroPerformance } from '../../types';

interface Props {
  insights: AggregateInsights | null;
  heroes: HeroPerformance[];
  loading: boolean;
}

export default function QuickInsightsPanel({ insights, heroes, loading }: Props) {
  if (loading) {
    return (
      <div className="panel p-4">
        <div className="panel-header mb-4 px-0 pt-0 border-0">Quick Insights</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-3 bg-dota-accent rounded w-16 mb-2"></div>
              <div className="h-6 bg-dota-accent rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="panel p-4">
        <div className="panel-header mb-4 px-0 pt-0 border-0">Quick Insights</div>
        <p className="text-dota-text-muted text-sm">No insights data available</p>
      </div>
    );
  }

  const bestHero = heroes.length > 0
    ? heroes.reduce((best, h) => {
        const winRate = h.matches_played > 0 ? h.wins / h.matches_played : 0;
        const bestWinRate = best.matches_played > 0 ? best.wins / best.matches_played : 0;
        return winRate > bestWinRate ? h : best;
      })
    : null;

  const avgKDA = heroes.length > 0
    ? heroes.reduce((sum, h) => sum + (h.avg_kills + h.avg_assists) / Math.max(h.avg_deaths, 1), 0) / heroes.length
    : 0;

  const avgGPM = heroes.length > 0
    ? heroes.reduce((sum, h) => sum + h.avg_gpm, 0) / heroes.length
    : 0;

  return (
    <div className="panel p-4">
      <div className="panel-header mb-4 px-0 pt-0 border-0">Quick Insights</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Win Rate"
          value={`${(insights.win_rate * 100).toFixed(1)}%`}
          color={insights.win_rate >= 0.5 ? 'radiant' : 'dire'}
        />
        <StatCard
          label="Total Matches"
          value={insights.total_matches}
        />
        <StatCard
          label="Avg Score"
          value={insights.avg_overall_score !== null ? Math.round(insights.avg_overall_score) : '-'}
          color="gold"
        />
        <StatCard
          label="Avg KDA"
          value={avgKDA.toFixed(2)}
        />
        <StatCard
          label="Avg GPM"
          value={Math.round(avgGPM)}
          color="gold"
        />
        <StatCard
          label="Best Hero"
          value={bestHero ? `${((bestHero.wins / bestHero.matches_played) * 100).toFixed(0)}% WR` : '-'}
        />
      </div>
    </div>
  );
}
