import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { MatchDetailOut, MatchAnalysisOut, WardPosition, EventOut } from '../types';
import { getMatch, getAnalysis, triggerAnalysis, getTimeline } from '../api/matches';
import PlayerTable from '../components/PlayerTable';
import AnalysisDisplay from '../components/AnalysisDisplay';
import MiniMap from '../components/MiniMap';
import ItemTimings from '../components/ItemTimings';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchDetailOut | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysisOut | null>(null);
  const [itemPurchaseEvents, setItemPurchaseEvents] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const steamId = localStorage.getItem('steam_id');
  const currentSteamId = steamId ? Number(steamId) : undefined;

  // Function to load all match data
  const loadMatchData = async (id: number) => {
    const [matchData, analysisData, timelineData] = await Promise.all([
      getMatch(id),
      getAnalysis(id),
      getTimeline(id, 'item_purchase', 2000).catch(() => ({ events: [] })),
    ]);
    setMatch(matchData);
    setAnalysis(analysisData);
    setItemPurchaseEvents(timelineData.events ?? []);
    return { matchData, analysisData, timelineData };
  };

  useEffect(() => {
    if (!matchId) return;
    const id = Number(matchId);

    setLoading(true);
    setError(null);

    loadMatchData(id)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  const handleAnalyze = async () => {
    if (!matchId) return;
    const id = Number(matchId);
    setAnalyzing(true);
    setError(null);

    try {
      await triggerAnalysis(id);

      // Poll for analysis completion
      const pollForAnalysis = async (attempts = 0): Promise<void> => {
        if (attempts > 30) {
          throw new Error('Analysis is taking longer than expected. Please refresh the page.');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const result = await getAnalysis(id);
          if (result) {
            // Analysis complete - reload all data
            await loadMatchData(id);
            setAnalyzing(false);
          } else {
            // Keep polling
            await pollForAnalysis(attempts + 1);
          }
        } catch {
          // Keep polling on error
          await pollForAnalysis(attempts + 1);
        }
      };

      await pollForAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
      setAnalyzing(false);
    }
  };

  // Extract ward positions from vision control finding
  const wardPositions = useMemo<WardPosition[]>(() => {
    if (!analysis) return [];

    const visionFinding = analysis.findings.find(
      (f) => f.detector_name === 'vision_control' && f.title === 'Vision control map data'
    );

    if (!visionFinding?.data?.ward_positions) return [];

    // Type guard and transform the data
    const rawPositions = visionFinding.data.ward_positions as Array<Record<string, unknown>>;
    return rawPositions
      .filter((w) => w.x != null && w.y != null && w.type != null)
      .map((w) => ({
        type: w.type as 'observer' | 'sentry',
        x: Number(w.x),
        y: Number(w.y),
        game_time_secs: Number(w.game_time_secs ?? 0),
        player_slot: Number(w.player_slot ?? 0),
        team: (w.team as 'radiant' | 'dire') ?? 'radiant',
      }));
  }, [analysis]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!match) return <ErrorMessage message="Match not found" />;

  const isRadiantWin = match.radiant_win;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-dota-text-muted hover:text-dota-text-primary text-sm transition-colors group"
      >
        <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Matches
      </Link>

      {/* Match Header */}
      <div className="dota-card overflow-hidden">
        {/* Victory banner */}
        <div
          className={`h-1 ${isRadiantWin ? 'bg-dota-radiant' : 'bg-dota-dire'}`}
        />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-dota-text-primary">
                  Match Details
                </h1>
                <span className="font-mono text-sm text-dota-text-muted">
                  #{match.match_id}
                </span>
              </div>
              <p className="text-sm text-dota-text-muted">
                {formatDate(match.start_time)}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg font-semibold text-center ${
                isRadiantWin
                  ? 'bg-dota-radiant/20 text-dota-radiant-light border border-dota-radiant/30'
                  : 'bg-dota-dire/20 text-dota-dire-light border border-dota-dire/30'
              }`}
            >
              {isRadiantWin ? 'Radiant Victory' : 'Dire Victory'}
            </div>
          </div>

          {/* Match stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-box">
              <p className="text-xs text-dota-text-muted uppercase tracking-wider mb-1">Duration</p>
              <p className="text-lg font-semibold text-dota-text-primary flex items-center gap-2">
                <svg className="w-4 h-4 text-dota-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(match.duration_secs)}
              </p>
            </div>
            {match.avg_mmr && (
              <div className="stat-box">
                <p className="text-xs text-dota-text-muted uppercase tracking-wider mb-1">Avg MMR</p>
                <p className="text-lg font-semibold text-dota-immortal flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {match.avg_mmr}
                </p>
              </div>
            )}
            <div className="stat-box">
              <p className="text-xs text-dota-text-muted uppercase tracking-wider mb-1">Replay</p>
              <p className={`text-lg font-semibold flex items-center gap-2 ${
                match.replay_state === 'parsed' ? 'text-dota-radiant' : 'text-dota-text-muted'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {match.replay_state === 'parsed' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {match.replay_state === 'parsed' ? 'Parsed' : 'Pending'}
              </p>
            </div>
            <div className="stat-box">
              <p className="text-xs text-dota-text-muted uppercase tracking-wider mb-1">Players</p>
              <p className="text-lg font-semibold text-dota-text-primary flex items-center gap-2">
                <svg className="w-4 h-4 text-dota-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {match.players?.length ?? 10}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="dota-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-dota-text-primary">Players</h2>
        </div>
        <PlayerTable players={match.players} currentSteamId={currentSteamId} />
      </div>

      {/* Item Timings */}
      {(itemPurchaseEvents.length > 0 || match.replay_state === 'parsed') && (
        <div className="dota-card p-6">
          <ItemTimings
            events={itemPurchaseEvents}
            players={match.players}
            currentSteamId={currentSteamId}
            matchDuration={match.duration_secs}
          />
        </div>
      )}

      {/* Analysis */}
      <div className="dota-card p-6">
        {analysis ? (
          <AnalysisDisplay
            analysis={analysis}
            players={match.players}
            currentSteamId={currentSteamId}
            wardPositions={wardPositions}
          />
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dota-gold/10 mb-4">
              <svg className="w-8 h-8 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-dota-text-primary mb-2">
              No analysis available
            </h3>
            <p className="text-dota-text-muted mb-6 max-w-md mx-auto">
              Run our AI-powered analysis to get detailed insights about this match.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="dota-btn-gold inline-flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <LoadingSpinner size="sm" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze Match
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Vision Control Map - Show when we have ward data */}
      {wardPositions.length > 0 && (
        <div className="dota-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-dota-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-dota-text-primary">Vision Control</h2>
          </div>
          <MiniMap
            wardPositions={wardPositions}
            matchDuration={match.duration_secs}
          />
        </div>
      )}
    </div>
  );
}
