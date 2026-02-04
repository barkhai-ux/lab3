import { useState, useEffect, useCallback } from 'react';
import type { MatchDetailOut, MatchAnalysisOut, TimelineOut } from '../types';
import { getMatch, getAnalysis, getTimeline, triggerAnalysis } from '../api/matches';

interface UseMatchResult {
  match: MatchDetailOut | null;
  analysis: MatchAnalysisOut | null;
  timeline: TimelineOut | null;
  loading: boolean;
  error: string | null;
  analyzing: boolean;
  analyze: () => Promise<void>;
  refetch: () => void;
}

export function useMatch(matchId: number | undefined): UseMatchResult {
  const [match, setMatch] = useState<MatchDetailOut | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysisOut | null>(null);
  const [timeline, setTimeline] = useState<TimelineOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!matchId) return;

    setLoading(true);
    setError(null);

    try {
      const [matchData, analysisData, timelineData] = await Promise.all([
        getMatch(matchId),
        getAnalysis(matchId),
        getTimeline(matchId).catch(() => null),
      ]);

      setMatch(matchData);
      setAnalysis(analysisData);
      setTimeline(timelineData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analyze = useCallback(async () => {
    if (!matchId) return;

    setAnalyzing(true);
    try {
      await triggerAnalysis(matchId);
      // Poll for analysis result
      setTimeout(async () => {
        const result = await getAnalysis(matchId);
        setAnalysis(result);
        setAnalyzing(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
      setAnalyzing(false);
    }
  }, [matchId]);

  return {
    match,
    analysis,
    timeline,
    loading,
    error,
    analyzing,
    analyze,
    refetch: fetchData,
  };
}
