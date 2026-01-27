import type { MatchAnalysisOut, FindingOut } from '../types';

interface Props {
  analysis: MatchAnalysisOut;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-600';
  if (score >= 40) return 'bg-yellow-600';
  return 'bg-red-600';
}

function severityColor(severity: string | null): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400 border-red-500/50';
    case 'warning':
      return 'text-yellow-400 border-yellow-500/50';
    default:
      return 'text-blue-400 border-blue-500/50';
  }
}

function formatGameTime(secs: number | null): string {
  if (secs === null) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Finding({ finding }: { finding: FindingOut }) {
  return (
    <div
      className={`border-l-2 pl-3 py-2 ${severityColor(finding.severity)}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{finding.title}</span>
        {finding.severity && (
          <span className="text-xs uppercase opacity-70">
            {finding.severity}
          </span>
        )}
        {finding.game_time_secs !== null && (
          <span className="text-xs text-gray-500">
            @ {formatGameTime(finding.game_time_secs)}
          </span>
        )}
      </div>
      {finding.description && (
        <p className="text-xs text-gray-400 mt-1">{finding.description}</p>
      )}
      {finding.confidence !== null && (
        <div className="mt-1 w-24 h-1 bg-gray-700 rounded overflow-hidden">
          <div
            className="h-full bg-dota-gold rounded"
            style={{ width: `${finding.confidence * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function AnalysisDisplay({ analysis }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">Analysis</h3>
        {analysis.overall_score !== null && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold text-white ${scoreColor(analysis.overall_score)}`}
          >
            {Math.round(analysis.overall_score)}
          </span>
        )}
      </div>

      {analysis.summary && (
        <p className="text-sm text-gray-300 bg-dota-surface border border-gray-700 rounded-lg p-3">
          {analysis.summary}
        </p>
      )}

      {analysis.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Findings</h4>
          {analysis.findings.map((f, i) => (
            <Finding key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
