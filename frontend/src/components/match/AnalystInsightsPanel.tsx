import { useMemo } from 'react';
import type { MatchAnalysisOut, FindingOut } from '../../types';

interface Props {
  analysis: MatchAnalysisOut;
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-dota-radiant';
  if (score >= 40) return 'text-dota-gold';
  return 'text-dota-dire';
}

function formatGameTime(secs: number | null): string {
  if (secs === null) return '';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function severityIndicator(severity: string | null): { label: string; color: string } {
  switch (severity) {
    case 'critical':
      return { label: 'CRITICAL', color: 'text-dota-dire' };
    case 'warning':
      return { label: 'WARNING', color: 'text-yellow-400' };
    default:
      return { label: 'INFO', color: 'text-dota-radiant' };
  }
}

function FindingItem({ finding }: { finding: FindingOut }) {
  const indicator = severityIndicator(finding.severity);

  return (
    <div className="py-2 border-b border-dota-border/50 last:border-0">
      <div className="flex items-start gap-3">
        <span className={`text-label font-mono ${indicator.color}`}>{indicator.label}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-dota-text-primary">{finding.title}</span>
            {finding.game_time_secs !== null && (
              <span className="text-label text-dota-text-muted font-mono">
                @ {formatGameTime(finding.game_time_secs)}
              </span>
            )}
            {finding.category && (
              <span className="text-label text-dota-text-muted bg-dota-accent px-1.5 py-0.5 rounded">
                {finding.category}
              </span>
            )}
          </div>
          {finding.description && (
            <p className="text-stat text-dota-text-secondary mt-1">{finding.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalystInsightsPanel({ analysis }: Props) {
  const criticalFindings = analysis.findings.filter((f) => f.severity === 'critical');
  const warningFindings = analysis.findings.filter((f) => f.severity === 'warning');
  const infoFindings = analysis.findings.filter((f) => f.severity === 'info');

  // Extract key metrics
  const turningPoints = useMemo(() => {
    return analysis.findings.filter(
      (f) => f.category === 'turning_point' || f.title?.toLowerCase().includes('turning') || f.title?.toLowerCase().includes('key moment')
    );
  }, [analysis.findings]);

  return (
    <div className="panel">
      <div className="panel-header">Analysis Insights</div>

      {/* Performance Score */}
      <div className="p-4 border-b border-dota-border">
        <div className="flex items-center gap-4">
          {analysis.overall_score !== null && (
            <div className="flex items-center gap-3">
              <div
                className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-bold ${scoreColor(analysis.overall_score)} bg-dota-bg`}
              >
                {scoreGrade(analysis.overall_score)}
              </div>
              <div>
                <div className="text-label text-dota-text-muted uppercase">Performance Score</div>
                <div className="text-xl font-mono text-dota-text-primary">
                  {Math.round(analysis.overall_score)}/100
                </div>
              </div>
            </div>
          )}
        </div>

        {analysis.summary && (
          <p className="mt-3 text-sm text-dota-text-secondary">{analysis.summary}</p>
        )}
      </div>

      {/* Turning Points */}
      {turningPoints.length > 0 && (
        <div className="p-4 border-b border-dota-border">
          <h4 className="text-label uppercase text-dota-text-muted mb-2">Turning Points</h4>
          <div className="space-y-1">
            {turningPoints.slice(0, 3).map((f, i) => (
              <FindingItem key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {/* Critical Issues */}
      {criticalFindings.length > 0 && (
        <div className="p-4 border-b border-dota-border">
          <h4 className="text-label uppercase text-dota-text-muted mb-2">
            Critical Issues ({criticalFindings.length})
          </h4>
          <div className="space-y-1">
            {criticalFindings.slice(0, 5).map((f, i) => (
              <FindingItem key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warningFindings.length > 0 && (
        <div className="p-4 border-b border-dota-border">
          <h4 className="text-label uppercase text-dota-text-muted mb-2">
            Areas for Improvement ({warningFindings.length})
          </h4>
          <div className="space-y-1">
            {warningFindings.slice(0, 5).map((f, i) => (
              <FindingItem key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {/* Positive Observations */}
      {infoFindings.length > 0 && (
        <div className="p-4">
          <h4 className="text-label uppercase text-dota-text-muted mb-2">
            Positive Observations ({infoFindings.length})
          </h4>
          <div className="space-y-1">
            {infoFindings.slice(0, 5).map((f, i) => (
              <FindingItem key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {analysis.findings.length === 0 && (
        <div className="p-8 text-center text-dota-text-muted">
          No detailed findings available for this match.
        </div>
      )}
    </div>
  );
}
