import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { MatchDetailOut, MatchAnalysisOut, WardPosition, TimelineOut } from '../types';
import { getMatch, getAnalysis, getTimeline, triggerAnalysis, fetchReplay } from '../api/matches';
import MatchHeader from '../components/match/MatchHeader';
import TeamComparisonPanel from '../components/match/TeamComparisonPanel';
import TimelineChart from '../components/charts/TimelineChart';
import ObjectiveTimeline from '../components/charts/ObjectiveTimeline';
import EventList from '../components/match/EventList';
import AnalystInsightsPanel from '../components/match/AnalystInsightsPanel';
import PlayerTable from '../components/PlayerTable';
import MiniMap from '../components/MiniMap';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchDetailOut | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysisOut | null>(null);
  const [timeline, setTimeline] = useState<TimelineOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingReplay, setFetchingReplay] = useState(false);

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
      getTimeline(id).catch(() => null),
    ])
      .then(([matchData, analysisData, timelineData]) => {
        setMatch(matchData);
        setAnalysis(analysisData);
        setTimeline(timelineData);
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

  const handleFetchReplay = async () => {
    if (!matchId) return;
    setFetchingReplay(true);
    try {
      await fetchReplay(Number(matchId));
      // Poll for updated match data after a delay
      setTimeout(async () => {
        try {
          const [matchData, timelineData] = await Promise.all([
            getMatch(Number(matchId)),
            getTimeline(Number(matchId)).catch(() => null),
          ]);
          setMatch(matchData);
          setTimeline(timelineData);
        } catch {
          // Ignore polling errors
        }
        setFetchingReplay(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch replay');
      setFetchingReplay(false);
    }
  };

  // Extract ward positions from vision control finding
  const wardPositions = useMemo<WardPosition[]>(() => {
    if (!analysis) return [];

    const visionFinding = analysis.findings.find(
      (f) => f.detector_name === 'vision_control' && f.title === 'Vision control map data'
    );

    if (!visionFinding?.data?.ward_positions) return [];

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

  // Generate timeline chart data from timeline events
  const timelineChartData = useMemo(() => {
    if (!timeline) return [];

    // Look for gold/xp snapshot events
    const snapshots = timeline.events.filter(
      (e) => e.event_type === 'interval' || e.event_type === 'gold_xp_snapshot'
    );

    if (snapshots.length === 0) return [];

    return snapshots
      .filter((e) => e.data?.radiant_gold !== undefined)
      .map((e) => ({
        time: e.game_time_secs,
        goldAdvantage: ((e.data?.radiant_gold as number) ?? 0) - ((e.data?.dire_gold as number) ?? 0),
        xpAdvantage: ((e.data?.radiant_xp as number) ?? 0) - ((e.data?.dire_xp as number) ?? 0),
      }));
  }, [timeline]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!match) return <ErrorMessage message="Match not found" />;

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <MatchHeader
        match={match}
        onFetchReplay={handleFetchReplay}
        fetchingReplay={fetchingReplay}
      />

      {/* Team Comparison + Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamComparisonPanel players={match.players} />
        <TimelineChart data={timelineChartData} />
      </div>

      {/* Objective Timeline */}
      {timeline && timeline.events.length > 0 && (
        <ObjectiveTimeline events={timeline.events} duration={match.duration_secs} />
      )}

      {/* Player Performance Table */}
      <div className="panel">
        <div className="panel-header">Player Performance</div>
        <div className="p-4">
          <PlayerTable players={match.players} currentSteamId={currentSteamId} />
        </div>
      </div>

      {/* Analysis + Event List + Vision Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Panel */}
        <div>
          {analysis ? (
            <AnalystInsightsPanel analysis={analysis} />
          ) : (
            <div className="panel p-6 text-center">
              <p className="text-dota-text-muted mb-4">
                No analysis available for this match yet.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="btn btn-primary"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Match'}
              </button>
            </div>
          )}
        </div>

        {/* Right column: Event List + Vision Map */}
        <div className="space-y-6">
          {timeline && timeline.events.length > 0 && (
            <EventList events={timeline.events} />
          )}

          {wardPositions.length > 0 && (
            <div className="panel p-4">
              <div className="panel-header mb-4 px-0 pt-0 border-0">Vision Control</div>
              <div className="flex justify-center">
                <div className="max-w-sm">
                  <MiniMap
                    wardPositions={wardPositions}
                    matchDuration={match.duration_secs}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
