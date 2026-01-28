import { useState, useEffect, useCallback } from 'react';
import type { MatchListOut } from '../types';
import { listMatches, refreshMatches } from '../api/matches';
import MatchCard from '../components/MatchCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function DashboardPage() {
  const [data, setData] = useState<MatchListOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const perPage = 20;

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-dota-accent hover:bg-dota-accent/80 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Fetching...' : 'Refresh Matches'}
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={() => fetchPage(page)} />}

      {!loading && data && (
        <>
          {data.matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No matches found. Click "Refresh Matches" to fetch your recent games.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.matches.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 bg-dota-surface border border-gray-700 rounded text-sm disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-dota-surface border border-gray-700 rounded text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
