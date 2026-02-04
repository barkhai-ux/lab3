import type { MatchPlayerOut } from '../../types';
import ComparisonBar from '../common/ComparisonBar';

interface Props {
  players: MatchPlayerOut[];
}

export default function TeamComparisonPanel({ players }: Props) {
  const radiant = players.filter((p) => p.player_slot < 128);
  const dire = players.filter((p) => p.player_slot >= 128);

  const sum = (arr: MatchPlayerOut[], key: keyof MatchPlayerOut) =>
    arr.reduce((acc, p) => acc + ((p[key] as number) ?? 0), 0);

  const radiantKills = sum(radiant, 'kills');
  const direKills = sum(dire, 'kills');
  const radiantGold = sum(radiant, 'gpm') * 5; // Approximate total gold
  const direGold = sum(dire, 'gpm') * 5;
  const radiantXP = sum(radiant, 'xpm') * 5;
  const direXP = sum(dire, 'xpm') * 5;
  const radiantHD = sum(radiant, 'hero_damage');
  const direHD = sum(dire, 'hero_damage');
  const radiantTD = sum(radiant, 'tower_damage');
  const direTD = sum(dire, 'tower_damage');
  const radiantLH = sum(radiant, 'last_hits');
  const direLH = sum(dire, 'last_hits');

  return (
    <div className="panel p-4">
      <div className="panel-header mb-4 px-0 pt-0 border-0">Team Comparison</div>
      <div className="space-y-4">
        <ComparisonBar
          label="Total Kills"
          leftValue={radiantKills}
          rightValue={direKills}
        />
        <ComparisonBar
          label="Hero Damage"
          leftValue={radiantHD}
          rightValue={direHD}
          format="k"
        />
        <ComparisonBar
          label="Tower Damage"
          leftValue={radiantTD}
          rightValue={direTD}
          format="k"
        />
        <ComparisonBar
          label="Total Last Hits"
          leftValue={radiantLH}
          rightValue={direLH}
        />
        <ComparisonBar
          label="Total GPM"
          leftValue={radiantGold}
          rightValue={direGold}
        />
        <ComparisonBar
          label="Total XPM"
          leftValue={radiantXP}
          rightValue={direXP}
        />
      </div>
    </div>
  );
}
