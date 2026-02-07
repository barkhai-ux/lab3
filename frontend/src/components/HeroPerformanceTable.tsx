import type { HeroPerformance } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';

interface Props {
  heroes: HeroPerformance[];
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return 'text-dota-radiant-light';
  if (winRate >= 50) return 'text-dota-text-primary';
  if (winRate >= 40) return 'text-dota-text-secondary';
  return 'text-dota-dire-light';
}

export default function HeroPerformanceTable({ heroes }: Props) {
  if (heroes.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto text-dota-text-muted mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-dota-text-muted text-sm">No hero data available yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-dota-text-muted text-xs bg-dota-bg-dark/50">
            <th className="text-left py-2.5 pl-4 pr-2 font-medium">Hero</th>
            <th className="text-center px-2 font-medium">Games</th>
            <th className="text-center px-2 font-medium">W</th>
            <th className="text-center px-2 font-medium">L</th>
            <th className="text-center px-2 font-medium">Win%</th>
            <th className="text-center px-2 font-medium">K</th>
            <th className="text-center px-2 font-medium">D</th>
            <th className="text-center px-2 font-medium">A</th>
            <th className="text-center px-2 font-medium">GPM</th>
            <th className="text-center px-2 font-medium">XPM</th>
            <th className="text-center px-2 pr-4 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((h, idx) => {
            const winRate =
              h.matches_played > 0
                ? (h.wins / h.matches_played) * 100
                : 0;
            const isLast = idx === heroes.length - 1;

            return (
              <tr
                key={h.hero_id}
                className={`
                  ${!isLast ? 'border-b border-gray-700/30' : ''}
                  hover:bg-dota-surface-light/50 transition-colors
                `}
              >
                <td className="py-2.5 pl-4 pr-2">
                  <div className="flex items-center gap-2">
                    {getHeroIcon(h.hero_id) ? (
                      <div className="hero-portrait w-9 h-6">
                        <img
                          src={getHeroIcon(h.hero_id)}
                          alt={getHeroName(h.hero_id)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <span className="text-dota-text-primary font-medium">
                      {getHeroName(h.hero_id)}
                    </span>
                  </div>
                </td>
                <td className="text-center px-2 text-dota-text-secondary">{h.matches_played}</td>
                <td className="text-center px-2 text-dota-radiant font-medium">{h.wins}</td>
                <td className="text-center px-2 text-dota-dire font-medium">{h.losses}</td>
                <td className="text-center px-2">
                  <span className={`font-semibold ${getWinRateColor(winRate)}`}>
                    {winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-center px-2 text-dota-text-secondary">{h.avg_kills.toFixed(1)}</td>
                <td className="text-center px-2 text-dota-text-secondary">{h.avg_deaths.toFixed(1)}</td>
                <td className="text-center px-2 text-dota-text-secondary">{h.avg_assists.toFixed(1)}</td>
                <td className="text-center px-2 text-dota-gold">{h.avg_gpm.toFixed(0)}</td>
                <td className="text-center px-2 text-dota-text-secondary">{h.avg_xpm.toFixed(0)}</td>
                <td className="text-center px-2 pr-4">
                  {h.avg_score !== null ? (
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded bg-dota-gold/20 text-dota-gold font-semibold">
                      {h.avg_score.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-dota-text-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
