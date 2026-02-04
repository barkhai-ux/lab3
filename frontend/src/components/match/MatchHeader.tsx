import { Link } from 'react-router-dom';
import type { MatchDetailOut } from '../../types';

interface Props {
  match: MatchDetailOut;
  onFetchReplay?: () => void;
  fetchingReplay?: boolean;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getReplayStateDisplay(state: string): { label: string; color: string } {
  switch (state) {
    case 'parsed':
      return { label: 'Parsed', color: 'text-dota-radiant' };
    case 'ready':
      return { label: 'Ready', color: 'text-dota-gold' };
    case 'pending':
    case 'downloading':
      return { label: 'Downloading...', color: 'text-blue-400' };
    case 'parsing':
      return { label: 'Parsing...', color: 'text-blue-400' };
    case 'unavailable':
      return { label: 'Unavailable', color: 'text-dota-text-muted' };
    case 'expired':
      return { label: 'Expired', color: 'text-dota-dire' };
    default:
      return { label: state || 'Unknown', color: 'text-dota-text-muted' };
  }
}

export default function MatchHeader({ match, onFetchReplay, fetchingReplay }: Props) {
  const replayState = getReplayStateDisplay(match.replay_state);
  const canFetchReplay = match.replay_state !== 'parsed' &&
                         match.replay_state !== 'parsing' &&
                         match.replay_state !== 'downloading' &&
                         match.replay_state !== 'unavailable' &&
                         match.replay_state !== 'expired';

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Link
            to="/matches"
            className="text-dota-text-muted hover:text-dota-text-primary text-sm"
          >
            Back
          </Link>
          <span className="text-dota-border">|</span>
          <span className="font-mono text-dota-text-secondary">#{match.match_id}</span>
          <span
            className={`text-sm font-semibold ${
              match.radiant_win ? 'text-dota-radiant' : 'text-dota-dire'
            }`}
          >
            {match.radiant_win ? 'Radiant Victory' : 'Dire Victory'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-dota-text-muted">
          <span className="font-mono">{formatDuration(match.duration_secs)}</span>
          {match.avg_mmr && (
            <>
              <span className="text-dota-border">|</span>
              <span>{match.avg_mmr} MMR</span>
            </>
          )}
          {match.patch_id && (
            <>
              <span className="text-dota-border">|</span>
              <span>Patch {match.patch_id}</span>
            </>
          )}
          <span className="text-dota-border">|</span>
          <span className={replayState.color}>{replayState.label}</span>
          {canFetchReplay && onFetchReplay && (
            <button
              onClick={onFetchReplay}
              disabled={fetchingReplay}
              className="text-label px-2 py-1 bg-dota-accent hover:bg-dota-accent/80 rounded text-dota-text-primary disabled:opacity-50"
            >
              {fetchingReplay ? 'Fetching...' : 'Fetch Replay'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
