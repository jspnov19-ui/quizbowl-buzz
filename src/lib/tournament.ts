import { supabase } from "@/integrations/supabase/client";

export const TOURNAMENT_LIMITS = {
  teams: 36,
  phases: 3,
  bracketsPerPhase: 6,
  playersPerTeam: 6,
  rounds: 12,
} as const;

export type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};
export type TPhase = { id: string; tournament_id: string; name: string; ord: number };
export type TBracket = { id: string; phase_id: string; name: string; ord: number };
export type TTeam = { id: string; tournament_id: string; name: string; bracket_id: string | null };
export type TPlayer = { id: string; tournament_team_id: string; name: string };
export type TRound = { id: string; tournament_id: string; number: number; label: string | null };
export type TGame = {
  id: string;
  tournament_id: string;
  round_id: string | null;
  phase_id: string | null;
  bracket_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  game_id: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
};

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `t-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTournament(name: string) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await (supabase as any)
      .from("tournaments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`;
  }
  const { data, error } = await (supabase as any)
    .from("tournaments")
    .insert({ name, slug })
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

// ----- Stats -----

export type TeamStanding = {
  team: TTeam;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  games: number;
  ppg: number;
  papg: number;
  margin: number;
};

export function computeStandings(teams: TTeam[], games: TGame[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  for (const t of teams) {
    map.set(t.id, {
      team: t,
      wins: 0,
      losses: 0,
      ties: 0,
      pf: 0,
      pa: 0,
      games: 0,
      ppg: 0,
      papg: 0,
      margin: 0,
    });
  }
  for (const g of games) {
    if (g.status !== "final") continue;
    if (!g.team_a_id || !g.team_b_id) continue;
    const a = map.get(g.team_a_id);
    const b = map.get(g.team_b_id);
    const sa = g.score_a ?? 0;
    const sb = g.score_b ?? 0;
    if (a) {
      a.pf += sa;
      a.pa += sb;
      a.games += 1;
      if (sa > sb) a.wins++;
      else if (sa < sb) a.losses++;
      else a.ties++;
    }
    if (b) {
      b.pf += sb;
      b.pa += sa;
      b.games += 1;
      if (sb > sa) b.wins++;
      else if (sb < sa) b.losses++;
      else b.ties++;
    }
  }
  for (const s of map.values()) {
    s.ppg = s.games > 0 ? s.pf / s.games : 0;
    s.papg = s.games > 0 ? s.pa / s.games : 0;
    s.margin = s.ppg - s.papg;
  }
  return Array.from(map.values()).sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (x.losses !== y.losses) return x.losses - y.losses;
    return y.margin - x.margin;
  });
}

// On match close, push final score back to a linked tournament game (if any).
export async function syncTournamentGameFromRoom(gameId: string) {
  const { data: tgames } = await (supabase as any)
    .from("tournament_games")
    .select("*")
    .eq("game_id", gameId);
  if (!tgames || tgames.length === 0) return;
  const { data: teams } = await supabase.from("teams").select("*").eq("game_id", gameId).order("side");
  if (!teams || teams.length < 2) return;
  const sa = teams[0].score ?? 0;
  const sb = teams[1].score ?? 0;
  for (const tg of tgames as TGame[]) {
    await (supabase as any)
      .from("tournament_games")
      .update({ score_a: sa, score_b: sb, status: "final" })
      .eq("id", tg.id);
  }
}
