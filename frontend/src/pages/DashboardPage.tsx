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
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-dota-text-primary mb-1">
            My Matches
          </h1>
          {data && (
            <p className="text-sm text-dota-text-muted">
              {data.total} matches found
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="dota-btn flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">{refreshing ? 'Fetching...' : 'Refresh'}</span>
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={() => fetchPage(page)} />}

      {!loading && data && (
        <>
          {data.matches.length === 0 ? (
            <div className="dota-card p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dota-bg-dark mb-4">
                <svg className="w-8 h-8 text-dota-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-dota-text-primary mb-2">No matches found</h3>
              <p className="text-dota-text-muted mb-6">
                Click "Refresh" to fetch your recent games from the Dota 2 API.
              </p>
              <button onClick={handleRefresh} disabled={refreshing} className="dota-btn-gold">
                Fetch Matches
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.matches.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-dota-surface border border-gray-700/50 text-dota-text-secondary hover:text-dota-text-primary hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        page === pageNum
                          ? 'bg-dota-gold text-dota-bg-dark'
                          : 'bg-dota-surface border border-gray-700/50 text-dota-text-secondary hover:text-dota-text-primary hover:border-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchPage(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-dota-surface border border-gray-700/50 text-dota-text-secondary hover:text-dota-text-primary hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
