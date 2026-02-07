import type { MatchPlayerOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';
import { getItemName, getItemIcon } from '../data/items';

interface Props {
  players: MatchPlayerOut[];
  currentSteamId?: number;
}

function ItemSlot({ itemId }: { itemId: number | undefined }) {
  if (!itemId || itemId === 0) {
    return <div className="w-9 h-7 bg-dota-bg-dark rounded border border-gray-700/50" />;
  }

  const icon = getItemIcon(itemId);
  const name = getItemName(itemId);

  if (!icon) {
    return (
      <div className="w-9 h-7 bg-dota-surface-light rounded border border-gray-700/50 flex items-center justify-center text-xs text-dota-text-muted">
        ?
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={icon}
        alt={name}
        className="w-9 h-7 rounded border border-gray-700/50 object-cover cursor-pointer hover:border-dota-gold/50 transition-all hover:shadow-glow-gold"
      />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dota-surface border border-gray-700/50 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <img src={icon} alt={name} className="w-8 h-6 rounded object-cover" />
          <span className="text-sm font-medium text-dota-gold">{name}</span>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700/50" />
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
  const isRadiant = label === 'Radiant';

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700/30">
      {/* Team header */}
      <div className={`px-4 py-2 flex items-center gap-2 ${
        isRadiant ? 'bg-dota-radiant/10' : 'bg-dota-dire/10'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isRadiant ? 'bg-dota-radiant' : 'bg-dota-dire'
        }`} />
        <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dota-text-muted text-xs bg-dota-bg-dark/50">
              <th className="text-left py-2.5 pl-4 pr-2 font-medium">Hero</th>
              <th className="text-center px-2 font-medium">K</th>
              <th className="text-center px-2 font-medium">D</th>
              <th className="text-center px-2 font-medium">A</th>
              <th className="text-left px-2 font-medium">Items</th>
              <th className="text-center px-2 font-medium">GPM</th>
              <th className="text-center px-2 font-medium">XPM</th>
              <th className="text-center px-2 font-medium">LH</th>
              <th className="text-center px-2 font-medium">DN</th>
              <th className="text-center px-2 font-medium">HD</th>
              <th className="text-center px-2 font-medium">TD</th>
              <th className="text-center px-2 pr-4 font-medium">Lvl</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => {
              const isMe = currentSteamId !== undefined && p.steam_id === currentSteamId;
              const isLast = idx === players.length - 1;
              return (
                <tr
                  key={p.player_slot}
                  className={`
                    ${!isLast ? 'border-b border-gray-700/30' : ''}
                    ${isMe ? 'bg-dota-gold/10' : 'hover:bg-dota-surface-light/50'}
                    transition-colors
                  `}
                >
                  <td className="py-2.5 pl-4 pr-2">
                    <div className="flex items-center gap-2">
                      {isMe && (
                        <div className="w-1 h-6 rounded-full bg-dota-gold" />
                      )}
                      {getHeroIcon(p.hero_id) ? (
                        <div className="hero-portrait w-9 h-6">
                          <img
                            src={getHeroIcon(p.hero_id)}
                            alt={getHeroName(p.hero_id)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <span className={`${isMe ? 'text-dota-gold font-medium' : 'text-dota-text-primary'}`}>
                        {getHeroName(p.hero_id)}
                      </span>
                      {p.role && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-dota-surface text-dota-text-muted">
                          P{p.role}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 text-dota-radiant font-medium">{p.kills ?? '-'}</td>
                  <td className="text-center px-2 text-dota-dire font-medium">{p.deaths ?? '-'}</td>
                  <td className="text-center px-2 text-dota-accent-light font-medium">{p.assists ?? '-'}</td>
                  <td className="px-2">
                    <PlayerItems items={p.items} />
                  </td>
                  <td className="text-center px-2 text-dota-gold">{p.gpm ?? '-'}</td>
                  <td className="text-center px-2 text-dota-text-secondary">{p.xpm ?? '-'}</td>
                  <td className="text-center px-2 text-dota-text-secondary">{p.last_hits ?? '-'}</td>
                  <td className="text-center px-2 text-dota-text-muted">{p.denies ?? '-'}</td>
                  <td className="text-center px-2 text-dota-text-secondary">{p.hero_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center px-2 text-dota-text-secondary">{p.tower_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center px-2 pr-4 text-dota-text-primary font-medium">{p.level ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
