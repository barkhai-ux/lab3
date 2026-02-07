import { useState, useEffect } from 'react';
import type { AggregateInsights, HeroPerformance } from '../types';
import { getInsights, getHeroPerformance } from '../api/insights';
import HeroPerformanceTable from '../components/HeroPerformanceTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function InsightsPage() {
  const [insights, setInsights] = useState<AggregateInsights | null>(null);
  const [heroes, setHeroes] = useState<HeroPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([getInsights(), getHeroPerformance()])
      .then(([insightsData, heroData]) => {
        setInsights(insightsData);
        setHeroes(heroData);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Failed to load insights',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!insights) return <ErrorMessage message="No insights data" />;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-dota-text-primary mb-1">
          Performance Insights
        </h1>
        <p className="text-sm text-dota-text-muted">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Matches"
          value={String(insights.total_matches)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Win Rate"
          value={`${(insights.win_rate * 100).toFixed(1)}%`}
          color={insights.win_rate >= 0.5 ? 'text-dota-radiant-light' : 'text-dota-dire-light'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label="Wins / Losses"
          value={`${insights.total_wins} / ${insights.total_losses}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
          subValue={
            <div className="flex items-center gap-2 mt-1">
              <span className="text-dota-radiant text-xs">{insights.total_wins}W</span>
              <span className="text-dota-text-muted">/</span>
              <span className="text-dota-dire text-xs">{insights.total_losses}L</span>
            </div>
          }
        />
        <StatCard
          label="Avg Score"
          value={
            insights.avg_overall_score !== null
              ? Math.round(insights.avg_overall_score).toString()
              : '-'
          }
          color="text-dota-gold"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* Top Findings */}
      {insights.top_findings.length > 0 && (
        <div className="dota-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-lg font-semibold text-dota-text-primary">
              Recurring Findings
            </h2>
          </div>
          <div className="space-y-3">
            {insights.top_findings.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-dota-bg-dark/50 border border-gray-700/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1 h-8 rounded-full ${
                      f.severity === 'critical'
                        ? 'bg-dota-dire'
                        : f.severity === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <span className="text-dota-text-primary text-sm font-medium">
                      {f.title}
                    </span>
                    {f.category && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs bg-dota-surface text-dota-text-muted">
                        {f.category}
                      </span>
                    )}
                  </div>
                </div>
                {f.severity && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      f.severity === 'critical'
                        ? 'bg-dota-dire/20 text-dota-dire-light border border-dota-dire/30'
                        : f.severity === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {f.severity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Performance */}
      <div className="dota-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-lg font-semibold text-dota-text-primary">
            Hero Performance
          </h2>
        </div>
        <HeroPerformanceTable heroes={heroes} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  subValue,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
  subValue?: React.ReactNode;
}) {
  return (
    <div className="dota-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-dota-text-muted uppercase tracking-wider font-medium">
          {label}
        </p>
        {icon && (
          <div className="text-dota-text-muted opacity-60">{icon}</div>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${color || 'text-dota-text-primary'}`}>
        {value}
      </p>
      {subValue}
    </div>
  );
}
