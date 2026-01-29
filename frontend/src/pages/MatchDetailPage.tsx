import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { MatchDetailOut, MatchAnalysisOut, WardPosition } from '../types';
import { getMatch, getAnalysis, triggerAnalysis } from '../api/matches';
import PlayerTable from '../components/PlayerTable';
import AnalysisDisplay from '../components/AnalysisDisplay';
import MiniMap from '../components/MiniMap';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const steamId = localStorage.getItem('steam_id');
  const currentSteamId = steamId ? Number(steamId) : undefined;

  useEffect(() => {
    if (!matchId) return;
    const id = Number(matchId);

    setLoading(true);
    setError(null);

    Promise.all([
      getMatch(id),
      getAnalysis(id),
    ])
      .then(([matchData, analysisData]) => {
        setMatch(matchData);
        setAnalysis(analysisData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  const handleAnalyze = async () => {
    if (!matchId) return;
    setAnalyzing(true);
    try {
      await triggerAnalysis(Number(matchId));
      // Poll for analysis after a delay
      setTimeout(async () => {
        const result = await getAnalysis(Number(matchId));
        setAnalysis(result);
        setAnalyzing(false);
      }, 5000);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-gray-400 hover:text-white text-sm"
        >
          &larr; Back
        </Link>
      </div>

      {/* Match Header */}
      <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Match #{match.match_id}</h1>
          <span
            className={`text-lg font-bold ${
              match.radiant_win ? 'text-dota-radiant' : 'text-dota-dire'
            }`}
          >
            {match.radiant_win ? 'Radiant Victory' : 'Dire Victory'}
          </span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <span>Duration: {formatDuration(match.duration_secs)}</span>
          <span>{formatDate(match.start_time)}</span>
          {match.avg_mmr && <span>~{match.avg_mmr} MMR</span>}
          {match.replay_state === 'parsed' && (
            <span className="text-green-400">Replay Parsed</span>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Players</h2>
        <PlayerTable players={match.players} currentSteamId={currentSteamId} />
      </div>

      {/* Analysis */}
      <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
        {analysis ? (
          <AnalysisDisplay
            analysis={analysis}
            players={match.players}
            currentSteamId={currentSteamId}
            wardPositions={wardPositions}
          />
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">
              No analysis available for this match yet.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-6 py-2 bg-dota-gold text-dota-bg font-semibold rounded hover:bg-dota-gold/90 transition-colors disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Match'}
            </button>
          </div>
        )}
      </div>

      {/* Full Vision Control Map (only show if no analysis yet) */}
      {!analysis && wardPositions.length > 0 && (
        <div className="bg-dota-surface border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Vision Control</h2>
          <MiniMap
            wardPositions={wardPositions}
            matchDuration={match.duration_secs}
          />
        </div>
      )}
    </div>
  );
}
