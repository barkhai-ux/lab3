import { useState, useEffect } from 'react';
import type { MatchListOut, AggregateInsights, HeroPerformance } from '../types';
import { listMatches } from '../api/matches';
import { getInsights, getHeroPerformance } from '../api/insights';
import MatchInputPanel from '../components/dashboard/MatchInputPanel';
import QuickInsightsPanel from '../components/dashboard/QuickInsightsPanel';
import RecentMatchesPanel from '../components/dashboard/RecentMatchesPanel';
import DataTable, { Column } from '../components/common/DataTable';
import { getHeroName, getHeroIcon } from '../data/heroes';

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchListOut | null>(null);
  const [insights, setInsights] = useState<AggregateInsights | null>(null);
  const [heroes, setHeroes] = useState<HeroPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listMatches(1, 10),
      getInsights(),
      getHeroPerformance(),
    ])
      .then(([matchData, insightsData, heroData]) => {
        setMatches(matchData);
        setInsights(insightsData);
        setHeroes(heroData);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const heroColumns: Column<HeroPerformance>[] = [
    {
      key: 'hero',
      header: 'Hero',
      sortKey: (row) => getHeroName(row.hero_id),
      render: (row) => (
        <div className="flex items-center gap-2">
          {getHeroIcon(row.hero_id) && (
            <img
              src={getHeroIcon(row.hero_id)}
              alt={getHeroName(row.hero_id)}
              className="w-8 h-[22px] object-cover rounded-sm"
            />
          )}
          <span className="text-dota-text-primary">{getHeroName(row.hero_id)}</span>
        </div>
      ),
    },
    {
      key: 'matches',
      header: 'Matches',
      align: 'center',
      sortKey: 'matches_played',
      render: (row) => row.matches_played,
    },
    {
      key: 'winrate',
      header: 'Win%',
      align: 'center',
      sortKey: (row) => row.matches_played > 0 ? row.wins / row.matches_played : 0,
      render: (row) => {
        const wr = row.matches_played > 0 ? (row.wins / row.matches_played) * 100 : 0;
        return (
          <span className={wr >= 50 ? 'text-dota-radiant' : 'text-dota-dire'}>
            {wr.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'kda',
      header: 'KDA',
      align: 'center',
      sortKey: (row) => (row.avg_kills + row.avg_assists) / Math.max(row.avg_deaths, 1),
      render: (row) => (
        <span className="font-mono text-stat">
          <span className="text-dota-radiant">{row.avg_kills.toFixed(1)}</span>
          <span className="text-dota-text-muted">/</span>
          <span className="text-dota-dire">{row.avg_deaths.toFixed(1)}</span>
          <span className="text-dota-text-muted">/</span>
          <span className="text-blue-400">{row.avg_assists.toFixed(1)}</span>
        </span>
      ),
    },
    {
      key: 'gpm',
      header: 'GPM',
      align: 'center',
      sortKey: 'avg_gpm',
      render: (row) => <span className="text-dota-gold font-mono">{Math.round(row.avg_gpm)}</span>,
    },
    {
      key: 'xpm',
      header: 'XPM',
      align: 'center',
      sortKey: 'avg_xpm',
      render: (row) => <span className="font-mono">{Math.round(row.avg_xpm)}</span>,
    },
    {
      key: 'score',
      header: 'Score',
      align: 'center',
      sortKey: 'avg_score',
      render: (row) => (
        <span className={`font-mono ${row.avg_score !== null && row.avg_score >= 70 ? 'text-dota-radiant' : ''}`}>
          {row.avg_score !== null ? Math.round(row.avg_score) : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Match Input */}
      <MatchInputPanel />

      {/* Quick Insights + Recent Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickInsightsPanel
          insights={insights}
          heroes={heroes}
          loading={loading}
        />
        <RecentMatchesPanel
          matches={matches?.matches ?? []}
          loading={loading}
        />
      </div>

      {/* Hero Performance Table */}
      <div className="panel">
        <div className="panel-header">Hero Performance</div>
        <div className="p-4">
          <DataTable
            data={heroes}
            columns={heroColumns}
            keyExtractor={(row) => row.hero_id}
            initialSortKey="matches"
            initialSortOrder="desc"
          />
        </div>
      </div>
    </div>
  );
}
