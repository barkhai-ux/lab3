import type { HeroPerformance } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';

interface Props {
  heroes: HeroPerformance[];
}

export default function HeroPerformanceTable({ heroes }: Props) {
  if (heroes.length === 0) {
    return <p className="text-gray-500 text-sm">No hero data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-700">
            <th className="text-left py-2 pr-4">Hero</th>
            <th className="text-center px-2">Matches</th>
            <th className="text-center px-2">W</th>
            <th className="text-center px-2">L</th>
            <th className="text-center px-2">Win%</th>
            <th className="text-center px-2">Avg K</th>
            <th className="text-center px-2">Avg D</th>
            <th className="text-center px-2">Avg A</th>
            <th className="text-center px-2">Avg GPM</th>
            <th className="text-center px-2">Avg XPM</th>
            <th className="text-center px-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((h) => {
            const winRate =
              h.matches_played > 0
                ? ((h.wins / h.matches_played) * 100).toFixed(1)
                : '0.0';
            return (
              <tr
                key={h.hero_id}
                className="border-b border-gray-800 hover:bg-dota-surface/50"
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    {getHeroIcon(h.hero_id) ? (
                      <img
                        src={getHeroIcon(h.hero_id)}
                        alt={getHeroName(h.hero_id)}
                        className="w-8 h-[22px] object-cover rounded-sm"
                      />
                    ) : null}
                    <span className="text-gray-300">
                      {getHeroName(h.hero_id)}
                    </span>
                  </div>
                </td>
                <td className="text-center px-2">{h.matches_played}</td>
                <td className="text-center px-2 text-green-400">{h.wins}</td>
                <td className="text-center px-2 text-red-400">{h.losses}</td>
                <td className="text-center px-2 text-dota-gold">{winRate}%</td>
                <td className="text-center px-2">{h.avg_kills.toFixed(1)}</td>
                <td className="text-center px-2">{h.avg_deaths.toFixed(1)}</td>
                <td className="text-center px-2">{h.avg_assists.toFixed(1)}</td>
                <td className="text-center px-2">{h.avg_gpm.toFixed(0)}</td>
                <td className="text-center px-2">{h.avg_xpm.toFixed(0)}</td>
                <td className="text-center px-2">
                  {h.avg_score !== null ? h.avg_score.toFixed(0) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
