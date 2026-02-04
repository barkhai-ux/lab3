import { useState, useEffect, useMemo } from 'react';
import type { AggregateInsights, HeroPerformance } from '../types';
import { getInsights, getHeroPerformance } from '../api/insights';
import DataTable, { Column } from '../components/common/DataTable';
import StatCard from '../components/common/StatCard';
import { getHeroName, getHeroIcon } from '../data/heroes';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: '1', label: 'Carry (1)' },
  { value: '2', label: 'Mid (2)' },
  { value: '3', label: 'Offlane (3)' },
  { value: '4', label: 'Soft Support (4)' },
  { value: '5', label: 'Hard Support (5)' },
];

const MATCH_RANGES = [
  { value: '20', label: 'Last 20 matches' },
  { value: '50', label: 'Last 50 matches' },
  { value: '100', label: 'Last 100 matches' },
];

export default function InsightsPage() {
  const [insights, setInsights] = useState<AggregateInsights | null>(null);
  const [heroes, setHeroes] = useState<HeroPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [heroFilter, setHeroFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [matchRange, setMatchRange] = useState<string>('50');

  useEffect(() => {
    setLoading(true);
    setError(null);

    const lastN = parseInt(matchRange, 10);
    const roleParam = roleFilter ? parseInt(roleFilter, 10) : undefined;

    Promise.all([
      getInsights(undefined, roleParam, lastN),
      getHeroPerformance(lastN),
    ])
      .then(([insightsData, heroData]) => {
        setInsights(insightsData);
        setHeroes(heroData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load insights');
      })
      .finally(() => setLoading(false));
  }, [matchRange, roleFilter]);

  const filteredHeroes = useMemo(() => {
    if (!heroFilter) return heroes;
    const filter = heroFilter.toLowerCase();
    return heroes.filter((h) =>
      getHeroName(h.hero_id).toLowerCase().includes(filter)
    );
  }, [heroes, heroFilter]);

  const uniqueHeroes = useMemo(() => {
    return heroes.map((h) => ({
      id: h.hero_id,
      name: getHeroName(h.hero_id),
    }));
  }, [heroes]);

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
      header: 'Games',
      align: 'center',
      sortKey: 'matches_played',
      render: (row) => row.matches_played,
    },
    {
      key: 'wins',
      header: 'W',
      align: 'center',
      sortKey: 'wins',
      render: (row) => <span className="text-dota-radiant">{row.wins}</span>,
    },
    {
      key: 'losses',
      header: 'L',
      align: 'center',
      sortKey: 'losses',
      render: (row) => <span className="text-dota-dire">{row.losses}</span>,
    },
    {
      key: 'winrate',
      header: 'Win%',
      align: 'center',
      sortKey: (row) => row.matches_played > 0 ? row.wins / row.matches_played : 0,
      render: (row) => {
        const wr = row.matches_played > 0 ? (row.wins / row.matches_played) * 100 : 0;
        return (
          <span className={`font-mono ${wr >= 50 ? 'text-dota-radiant' : 'text-dota-dire'}`}>
            {wr.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'kills',
      header: 'Avg K',
      align: 'center',
      sortKey: 'avg_kills',
      render: (row) => <span className="font-mono">{row.avg_kills.toFixed(1)}</span>,
    },
    {
      key: 'deaths',
      header: 'Avg D',
      align: 'center',
      sortKey: 'avg_deaths',
      render: (row) => <span className="font-mono">{row.avg_deaths.toFixed(1)}</span>,
    },
    {
      key: 'assists',
      header: 'Avg A',
      align: 'center',
      sortKey: 'avg_assists',
      render: (row) => <span className="font-mono">{row.avg_assists.toFixed(1)}</span>,
    },
    {
      key: 'kda',
      header: 'KDA',
      align: 'center',
      sortKey: (row) => (row.avg_kills + row.avg_assists) / Math.max(row.avg_deaths, 1),
      render: (row) => {
        const kda = (row.avg_kills + row.avg_assists) / Math.max(row.avg_deaths, 1);
        return (
          <span className={`font-mono ${kda >= 3 ? 'text-dota-radiant' : kda >= 2 ? 'text-dota-gold' : ''}`}>
            {kda.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'gpm',
      header: 'GPM',
      align: 'center',
      sortKey: 'avg_gpm',
      render: (row) => <span className="font-mono text-dota-gold">{Math.round(row.avg_gpm)}</span>,
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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!insights) return <ErrorMessage message="No insights data" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dota-text-primary">Performance Insights</h1>
      </div>

      {/* Filters */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-label text-dota-text-muted uppercase block mb-1">Hero</label>
            <input
              type="text"
              value={heroFilter}
              onChange={(e) => setHeroFilter(e.target.value)}
              placeholder="Search heroes..."
              className="input w-full"
              list="hero-list"
            />
            <datalist id="hero-list">
              {uniqueHeroes.map((h) => (
                <option key={h.id} value={h.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-label text-dota-text-muted uppercase block mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label text-dota-text-muted uppercase block mb-1">Match Range</label>
            <select
              value={matchRange}
              onChange={(e) => setMatchRange(e.target.value)}
              className="input"
            >
              {MATCH_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Matches"
          value={insights.total_matches}
        />
        <StatCard
          label="Win Rate"
          value={`${(insights.win_rate * 100).toFixed(1)}%`}
          color={insights.win_rate >= 0.5 ? 'radiant' : 'dire'}
        />
        <StatCard
          label="Wins"
          value={insights.total_wins}
          color="radiant"
        />
        <StatCard
          label="Losses"
          value={insights.total_losses}
          color="dire"
        />
        <StatCard
          label="Avg Score"
          value={insights.avg_overall_score !== null ? Math.round(insights.avg_overall_score) : '-'}
          color="gold"
        />
        <StatCard
          label="Heroes Played"
          value={heroes.length}
        />
      </div>

      {/* Top Findings */}
      {insights.top_findings.length > 0 && (
        <div className="panel">
          <div className="panel-header">Recurring Findings</div>
          <div className="divide-y divide-dota-border">
            {insights.top_findings.map((f, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-dota-text-primary">{f.title}</span>
                  {f.category && (
                    <span className="text-label text-dota-text-muted bg-dota-accent px-1.5 py-0.5 rounded">
                      {f.category}
                    </span>
                  )}
                </div>
                {f.severity && (
                  <span
                    className={`text-label px-2 py-0.5 rounded ${
                      f.severity === 'critical'
                        ? 'bg-dota-dire/20 text-dota-dire'
                        : f.severity === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-dota-radiant/20 text-dota-radiant'
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
      <div className="panel">
        <div className="panel-header">
          Hero Performance
          <span className="text-label text-dota-text-muted font-normal ml-2">
            ({filteredHeroes.length} heroes)
          </span>
        </div>
        <div className="p-4">
          <DataTable
            data={filteredHeroes}
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
