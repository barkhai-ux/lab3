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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Performance Insights</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Matches" value={String(insights.total_matches)} />
        <StatCard
          label="Win Rate"
          value={`${(insights.win_rate * 100).toFixed(1)}%`}
          color={insights.win_rate >= 0.5 ? 'text-dota-radiant' : 'text-dota-dire'}
        />
        <StatCard
          label="Wins / Losses"
          value={`${insights.total_wins} / ${insights.total_losses}`}
        />
        <StatCard
          label="Avg Score"
          value={
            insights.avg_overall_score !== null
              ? Math.round(insights.avg_overall_score).toString()
              : '-'
          }
          color="text-dota-gold"
        />
      </div>

      {/* Top Findings */}
      {insights.top_findings.length > 0 && (
        <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Recurring Findings
          </h2>
          <div className="space-y-2">
            {insights.top_findings.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm border-b border-gray-800 pb-2"
              >
                <div>
                  <span className="text-gray-200">{f.title}</span>
                  {f.category && (
                    <span className="ml-2 text-xs text-gray-500">
                      [{f.category}]
                    </span>
                  )}
                </div>
                {f.severity && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      f.severity === 'critical'
                        ? 'bg-red-900/50 text-red-300'
                        : f.severity === 'warning'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-blue-900/50 text-blue-300'
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
      <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Hero Performance</h2>
        <HeroPerformanceTable heroes={heroes} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-dota-surface border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
