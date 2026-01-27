import type { MatchPlayerOut } from '../types';

interface Props {
  players: MatchPlayerOut[];
  currentSteamId?: number;
}

export default function PlayerTable({ players, currentSteamId }: Props) {
  const radiant = players.filter((p) => p.player_slot < 128);
  const dire = players.filter((p) => p.player_slot >= 128);

  return (
    <div className="space-y-4">
      <TeamTable
        label="Radiant"
        players={radiant}
        color="text-dota-radiant"
        currentSteamId={currentSteamId}
      />
      <TeamTable
        label="Dire"
        players={dire}
        color="text-dota-dire"
        currentSteamId={currentSteamId}
      />
    </div>
  );
}

function TeamTable({
  label,
  players,
  color,
  currentSteamId,
}: {
  label: string;
  players: MatchPlayerOut[];
  color: string;
  currentSteamId?: number;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${color}`}>{label}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-4">Hero</th>
              <th className="text-center px-2">K</th>
              <th className="text-center px-2">D</th>
              <th className="text-center px-2">A</th>
              <th className="text-center px-2">GPM</th>
              <th className="text-center px-2">XPM</th>
              <th className="text-center px-2">LH</th>
              <th className="text-center px-2">DN</th>
              <th className="text-center px-2">HD</th>
              <th className="text-center px-2">TD</th>
              <th className="text-center px-2">Lvl</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const isMe = currentSteamId !== undefined && p.steam_id === currentSteamId;
              return (
                <tr
                  key={p.player_slot}
                  className={`border-b border-gray-800 ${isMe ? 'bg-dota-accent/30' : ''}`}
                >
                  <td className="py-2 pr-4 font-mono text-gray-300">
                    Hero {p.hero_id}
                    {p.role && (
                      <span className="ml-1 text-xs text-gray-500">
                        (P{p.role})
                      </span>
                    )}
                  </td>
                  <td className="text-center px-2 text-green-400">{p.kills ?? '-'}</td>
                  <td className="text-center px-2 text-red-400">{p.deaths ?? '-'}</td>
                  <td className="text-center px-2 text-blue-400">{p.assists ?? '-'}</td>
                  <td className="text-center px-2 text-dota-gold">{p.gpm ?? '-'}</td>
                  <td className="text-center px-2">{p.xpm ?? '-'}</td>
                  <td className="text-center px-2">{p.last_hits ?? '-'}</td>
                  <td className="text-center px-2">{p.denies ?? '-'}</td>
                  <td className="text-center px-2">{p.hero_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center px-2">{p.tower_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center px-2">{p.level ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
