// ── User ──────────────────────────────────────────────

export interface UserOut {
  steam_id: number;
  persona_name: string;
  avatar_url: string | null;
  profile_url: string | null;
  is_public: boolean;
  created_at: string;
  last_login: string | null;
}

// ── Match ─────────────────────────────────────────────

export interface MatchOut {
  match_id: number;
  patch_id: number | null;
  game_mode: number;
  lobby_type: number | null;
  duration_secs: number;
  start_time: string;
  radiant_win: boolean;
  avg_mmr: number | null;
  replay_state: string;
  created_at: string;
}

export interface MatchPlayerOut {
  player_slot: number;
  steam_id: number | null;
  hero_id: number;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  gpm: number | null;
  xpm: number | null;
  last_hits: number | null;
  denies: number | null;
  hero_damage: number | null;
  tower_damage: number | null;
  hero_healing: number | null;
  level: number | null;
  items: Record<string, number> | null;
  lane: number | null;
  role: number | null;
}

export interface MatchDetailOut extends MatchOut {
  players: MatchPlayerOut[];
}

export interface MatchListOut {
  matches: MatchOut[];
  total: number;
  page: number;
  per_page: number;
}

// ── Events / Timeline ─────────────────────────────────

export interface EventOut {
  tick: number;
  game_time_secs: number;
  event_type: string;
  player_slot: number | null;
  data: Record<string, unknown>;
}

export interface TimelineOut {
  match_id: number;
  events: EventOut[];
  total_events: number;
}

// ── Vision / Ward Data ───────────────────────────────

export interface WardPosition {
  type: 'observer' | 'sentry';
  x: number;
  y: number;
  game_time_secs: number;
  player_slot: number;
  team: 'radiant' | 'dire';
}

// ── Analysis ──────────────────────────────────────────

export interface FindingOut {
  detector_name: string;
  category: string | null;
  severity: string | null;
  confidence: number | null;
  title: string | null;
  description: string | null;
  game_time_secs: number | null;
  data: Record<string, unknown> | null;
}

export interface MatchAnalysisOut {
  id: number;
  match_id: number;
  steam_id: number;
  overall_score: number | null;
  summary: string | null;
  created_at: string;
  findings: FindingOut[];
}

// ── Insights ──────────────────────────────────────────

export interface HeroPerformance {
  hero_id: number;
  matches_played: number;
  wins: number;
  losses: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  avg_gpm: number;
  avg_xpm: number;
  avg_score: number | null;
}

export interface AggregateInsights {
  total_matches: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  most_played_heroes: HeroPerformance[];
  avg_overall_score: number | null;
  top_findings: FindingOut[];
}

// ── Task ──────────────────────────────────────────────

export interface TaskStatusOut {
  task_id: string;
  status: string;
  result: Record<string, unknown> | null;
}
