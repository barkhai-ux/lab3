import { useState, useCallback } from 'react';
import type { MatchPlayerOut } from '../types';
import { getHeroName, getHeroIcon } from '../data/heroes';
import { getItemName, getItemIcon, getItemDetails } from '../data/items';

interface Props {
  players: MatchPlayerOut[];
  currentSteamId?: number;
}

type SortKey = 'hero' | 'kills' | 'deaths' | 'assists' | 'gpm' | 'xpm' | 'lh' | 'hd' | 'td' | 'level';

function ItemTooltip({ itemId }: { itemId: number }) {
  const details = getItemDetails(itemId);
  const icon = getItemIcon(itemId);
  const name = getItemName(itemId);

  if (!details) {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2">
          {icon && <img src={icon} alt={name} className="w-12 h-9 rounded object-cover" />}
          <span className="text-dota-gold font-semibold">{name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 p-0 overflow-hidden">
      <div className="bg-dota-accent p-3 border-b border-dota-border">
        <div className="flex items-start gap-3">
          {icon && <img src={icon} alt={name} className="w-12 h-9 rounded object-cover flex-shrink-0" />}
          <div>
            <div className="text-dota-gold font-bold text-sm">{details.name}</div>
            {details.cost && (
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <span>{details.cost}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {details.attribs.length > 0 && (
        <div className="p-3 border-b border-dota-border space-y-0.5">
          {details.attribs.map((attr, i) => (
            <div key={i} className="text-xs text-dota-text-secondary">{attr.display}</div>
          ))}
        </div>
      )}

      {details.abilities.length > 0 && (
        <div className="p-3 border-b border-dota-border space-y-2">
          {details.abilities.map((ability, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${ability.type === 'passive' ? 'text-dota-radiant' : 'text-blue-400'}`}>
                  {ability.type === 'passive' ? 'Passive' : 'Active'}: {ability.title}
                </span>
                {ability.type !== 'passive' && details.cd && (
                  <span className="text-xs text-dota-text-muted">CD: {details.cd}s</span>
                )}
              </div>
              <p className="text-xs text-dota-text-muted leading-relaxed">{ability.description}</p>
            </div>
          ))}
        </div>
      )}

      {(details.cd || details.mc) && details.abilities.length === 0 && (
        <div className="px-3 py-2 border-b border-dota-border flex gap-4 text-xs">
          {details.cd && <span className="text-dota-text-muted">Cooldown: {details.cd}s</span>}
          {details.mc && <span className="text-blue-400">Mana: {details.mc}</span>}
        </div>
      )}

      {details.lore && (
        <div className="p-3 bg-dota-bg/50">
          <p className="text-xs text-dota-text-muted italic leading-relaxed">{details.lore}</p>
        </div>
      )}
    </div>
  );
}

function ItemSlot({ itemId }: { itemId: number | undefined }) {
  if (!itemId || itemId === 0) {
    return <div className="w-8 h-6 bg-dota-bg rounded border border-dota-border" />;
  }

  const icon = getItemIcon(itemId);
  const name = getItemName(itemId);

  if (!icon) {
    return (
      <div className="w-8 h-6 bg-dota-accent rounded border border-dota-border flex items-center justify-center text-label text-dota-text-muted">
        ?
      </div>
    );
  }

  return (
    <div className="relative group/item">
      <img
        src={icon}
        alt={name}
        className="w-8 h-6 rounded border border-dota-border object-cover cursor-pointer hover:border-dota-gold"
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dota-surface border border-dota-border rounded-lg shadow-2xl invisible group-hover/item:visible opacity-0 group-hover/item:opacity-100 pointer-events-none"
           style={{ zIndex: 9999 }}>
        <ItemTooltip itemId={itemId} />
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dota-border" />
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const radiant = players.filter((p) => p.player_slot < 128);
  const dire = players.filter((p) => p.player_slot >= 128);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  }, [sortKey]);

  const sortPlayers = useCallback((team: MatchPlayerOut[]) => {
    if (!sortKey) return team;

    return [...team].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case 'hero':
          aVal = getHeroName(a.hero_id);
          bVal = getHeroName(b.hero_id);
          break;
        case 'kills':
          aVal = a.kills ?? 0;
          bVal = b.kills ?? 0;
          break;
        case 'deaths':
          aVal = a.deaths ?? 0;
          bVal = b.deaths ?? 0;
          break;
        case 'assists':
          aVal = a.assists ?? 0;
          bVal = b.assists ?? 0;
          break;
        case 'gpm':
          aVal = a.gpm ?? 0;
          bVal = b.gpm ?? 0;
          break;
        case 'xpm':
          aVal = a.xpm ?? 0;
          bVal = b.xpm ?? 0;
          break;
        case 'lh':
          aVal = a.last_hits ?? 0;
          bVal = b.last_hits ?? 0;
          break;
        case 'hd':
          aVal = a.hero_damage ?? 0;
          bVal = b.hero_damage ?? 0;
          break;
        case 'td':
          aVal = a.tower_damage ?? 0;
          bVal = b.tower_damage ?? 0;
          break;
        case 'level':
          aVal = a.level ?? 0;
          bVal = b.level ?? 0;
          break;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [sortKey, sortOrder]);

  const renderHeader = (key: SortKey, label: string, align: 'left' | 'center' = 'center') => (
    <th
      onClick={() => handleSort(key)}
      className={`${align === 'center' ? 'text-center' : 'text-left'} ${sortKey === key ? 'sorted' : ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key && (
          <span className="text-dota-gold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <TeamTable
        label="Radiant"
        players={sortPlayers(radiant)}
        color="text-dota-radiant"
        currentSteamId={currentSteamId}
        renderHeader={renderHeader}
      />
      <TeamTable
        label="Dire"
        players={sortPlayers(dire)}
        color="text-dota-dire"
        currentSteamId={currentSteamId}
        renderHeader={renderHeader}
      />
    </div>
  );
}

function TeamTable({
  label,
  players,
  color,
  currentSteamId,
  renderHeader,
}: {
  label: string;
  players: MatchPlayerOut[];
  color: string;
  currentSteamId?: number;
  renderHeader: (key: SortKey, label: string, align?: 'left' | 'center') => React.ReactNode;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${color}`}>{label}</h3>
      <div className="overflow-visible">
        <table className="data-table">
          <thead>
            <tr>
              {renderHeader('hero', 'Hero', 'left')}
              {renderHeader('kills', 'K')}
              {renderHeader('deaths', 'D')}
              {renderHeader('assists', 'A')}
              <th className="text-left !cursor-default">Items</th>
              {renderHeader('gpm', 'GPM')}
              {renderHeader('xpm', 'XPM')}
              {renderHeader('lh', 'LH')}
              {renderHeader('hd', 'HD')}
              {renderHeader('td', 'TD')}
              {renderHeader('level', 'Lvl')}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const isMe = currentSteamId !== undefined && p.steam_id === currentSteamId;
              return (
                <tr
                  key={p.player_slot}
                  className={isMe ? 'selected' : ''}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      {getHeroIcon(p.hero_id) ? (
                        <img
                          src={getHeroIcon(p.hero_id)}
                          alt={getHeroName(p.hero_id)}
                          className="w-8 h-[22px] object-cover rounded-sm"
                        />
                      ) : null}
                      <span className="text-dota-text-primary">
                        {getHeroName(p.hero_id)}
                      </span>
                      {p.role && (
                        <span className="text-label text-dota-text-muted">
                          P{p.role}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center font-mono text-dota-radiant">{p.kills ?? '-'}</td>
                  <td className="text-center font-mono text-dota-dire">{p.deaths ?? '-'}</td>
                  <td className="text-center font-mono text-blue-400">{p.assists ?? '-'}</td>
                  <td>
                    <PlayerItems items={p.items} />
                  </td>
                  <td className="text-center font-mono text-dota-gold">{p.gpm ?? '-'}</td>
                  <td className="text-center font-mono">{p.xpm ?? '-'}</td>
                  <td className="text-center font-mono">{p.last_hits ?? '-'}</td>
                  <td className="text-center font-mono">{p.hero_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center font-mono">{p.tower_damage?.toLocaleString() ?? '-'}</td>
                  <td className="text-center font-mono">{p.level ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
