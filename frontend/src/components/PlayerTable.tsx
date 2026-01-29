import type { MatchPlayerOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';
import { getItemName, getItemIcon } from '../data/items';

interface Props {
  players: MatchPlayerOut[];
  currentSteamId?: number;
}

function ItemSlot({ itemId }: { itemId: number | undefined }) {
  if (!itemId || itemId === 0) {
    return <div className="w-9 h-7 bg-gray-800 rounded border border-gray-700" />;
  }

  const icon = getItemIcon(itemId);
  const name = getItemName(itemId);

  if (!icon) {
    return (
      <div className="w-9 h-7 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-400">
        ?
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={icon}
        alt={name}
        className="w-9 h-7 rounded border border-gray-600 object-cover cursor-pointer hover:border-dota-gold transition-colors"
      />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <img src={icon} alt={name} className="w-8 h-6 rounded object-cover" />
          <span className="text-sm font-medium text-dota-gold">{name}</span>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-600" />
      </div>
    </div>
  );
}

function PlayerItems({ items }: { items: Record<string, number> | null }) {
  if (!items) return null;

  const itemIds = [
    items.item_0,
    items.item_1,
    items.item_2,
    items.item_3,
    items.item_4,
    items.item_5,
  ];

  return (
    <div className="flex gap-0.5">
      {itemIds.map((id, i) => (
        <ItemSlot key={i} itemId={id} />
      ))}
    </div>
  );
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
              <th className="text-left px-2">Items</th>
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
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      {getHeroIcon(p.hero_id) ? (
                        <img
                          src={getHeroIcon(p.hero_id)}
                          alt={getHeroName(p.hero_id)}
                          className="w-8 h-[22px] object-cover rounded-sm"
                        />
                      ) : null}
                      <span className="text-gray-300">
                        {getHeroName(p.hero_id)}
                      </span>
                      {p.role && (
                        <span className="text-xs text-gray-500">
                          (P{p.role})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 text-green-400">{p.kills ?? '-'}</td>
                  <td className="text-center px-2 text-red-400">{p.deaths ?? '-'}</td>
                  <td className="text-center px-2 text-blue-400">{p.assists ?? '-'}</td>
                  <td className="px-2">
                    <PlayerItems items={p.items} />
                  </td>
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
