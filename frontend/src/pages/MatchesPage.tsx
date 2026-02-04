import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchListOut, MatchOut } from '../types';
import { listMatches, refreshMatches } from '../api/matches';
import DataTable, { Column } from '../components/common/DataTable';
import { getHeroName, getHeroIcon } from '../data/heroes';

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

export default function MatchesPage() {
  const [data, setData] = useState<MatchListOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const perPage = 20;
  const navigate = useNavigate();

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listMatches(p, perPage);
      setData(result);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshMatches();
      await fetchPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh matches');
    } finally {
      setRefreshing(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  const columns: Column<MatchOut>[] = [
    {
      key: 'hero',
      header: 'Hero',
      render: (row) => {
        const heroIcon = row.player_hero_id ? getHeroIcon(row.player_hero_id) : null;
        const heroName = row.player_hero_id ? getHeroName(row.player_hero_id) : 'Unknown';
        return (
          <div className="flex items-center gap-2">
            {heroIcon ? (
              <img src={heroIcon} alt={heroName} className="w-10 h-6 object-cover rounded" />
            ) : (
              <div className="w-10 h-6 bg-dota-accent rounded"></div>
            )}
            <span className="text-dota-text-primary">{heroName}</span>
          </div>
        );
      },
    },
    {
      key: 'match_id',
      header: 'Match ID',
      sortKey: 'match_id',
      render: (row) => (
        <span className="font-mono text-dota-text-muted">#{row.match_id}</span>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      render: (row) => (
        <span className={`font-semibold ${row.player_won ? 'text-dota-radiant' : 'text-dota-dire'}`}>
          {row.player_won ? 'Won' : 'Lost'}
        </span>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => GAME_MODES[row.game_mode] ?? `Mode ${row.game_mode}`,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'center',
      sortKey: 'duration_secs',
      render: (row) => <span className="font-mono">{formatDuration(row.duration_secs)}</span>,
    },
    {
      key: 'mmr',
      header: 'MMR',
      align: 'center',
      sortKey: 'avg_mmr',
      render: (row) => row.avg_mmr ? <span className="font-mono">{row.avg_mmr}</span> : '-',
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      sortKey: (row) => new Date(row.start_time).getTime(),
      render: (row) => <span className="text-dota-text-muted">{formatDate(row.start_time)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dota-text-primary">Match History</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary"
        >
          {refreshing ? 'Fetching...' : 'Refresh Matches'}
        </button>
      </div>

      {error && (
        <div className="panel p-4 border-dota-dire">
          <p className="text-dota-dire">{error}</p>
          <button
            onClick={() => fetchPage(page)}
            className="text-sm text-dota-text-secondary hover:text-dota-text-primary mt-2"
          >
            Try again
          </button>
        </div>
      )}

      <div className="panel">
        {loading ? (
          <div className="p-8 text-center text-dota-text-muted">Loading...</div>
        ) : (
          <>
            <div className="p-4">
              <DataTable
                data={data?.matches ?? []}
                columns={columns}
                keyExtractor={(row) => row.match_id}
                onRowClick={(row) => navigate(`/match/${row.match_id}`)}
              />
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t border-dota-border">
                <button
                  onClick={() => fetchPage(page - 1)}
                  disabled={page <= 1}
                  className="btn btn-secondary disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-sm text-dota-text-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={page >= totalPages}
                  className="btn btn-secondary disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
