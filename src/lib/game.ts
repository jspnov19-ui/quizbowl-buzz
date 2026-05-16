import { supabase } from "@/integrations/supabase/client";

export type GameMode = "teams" | "ffa";
export type TimerStatus = "idle" | "running" | "paused";

export type Game = {
  id: string;
  code: string;
  current_question: number;
  buzzed_player_id: string | null;
  buzz_locked: boolean;
  status: string;
  round_ended: boolean;
  mode: GameMode;
  bonuses_enabled: boolean;
  timer_total_seconds: number | null;
  timer_status: TimerStatus;
  timer_started_at: string | null;
  timer_remaining_seconds: number | null;
};
export type Team = { id: string; game_id: string; name: string; side: number; score: number };
export type Player = {
  id: string;
  game_id: string;
  team_id: string | null;
  name: string;
  score: number;
  is_substitute: boolean;
};
export type QuestionEvent = {
  id: string;
  game_id: string;
  question_number: number;
  player_id: string | null;
  team_id: string | null;
  points: number;
  bonus_points: number | null;
  protested: boolean;
  protest_note: string | null;
  created_at: string;
};
export type SubstitutionEvent = {
  id: string;
  game_id: string;
  question_number: number;
  player_id: string;
  team_id: string | null;
  action: "in" | "out";
  created_at: string;
};

export function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createGame(opts?: { mode?: GameMode; bonusesEnabled?: boolean }) {
  const code = genCode();
  const mode: GameMode = opts?.mode ?? "teams";
  const bonuses_enabled = opts?.bonusesEnabled ?? true;
  const { data: game, error } = await supabase
    .from("games")
    .insert({ code, mode, bonuses_enabled })
    .select()
    .single();
  if (error) throw error;
  // Always create the two team rows so team-mode flows work; FFA simply ignores them.
  await supabase.from("teams").insert([
    { game_id: game.id, name: "Team 1", side: 1 },
    { game_id: game.id, name: "Team 2", side: 2 },
  ]);
  return game;
}

export async function findGameByCode(code: string) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ----- Stats helpers -----

export function playerStatLine(events: QuestionEvent[], playerId: string) {
  let p15 = 0, p10 = 0, n5 = 0;
  for (const e of events) {
    if (e.player_id !== playerId) continue;
    if (e.points === 15) p15++;
    else if (e.points === 10) p10++;
    else if (e.points === -5) n5++;
  }
  return { p15, p10, n5 };
}

// Tossup-only points for a player (excludes bonus_points). Used for PP20TUH.
export function playerTossupPoints(events: QuestionEvent[], playerId: string) {
  let total = 0;
  for (const e of events) {
    if (e.player_id === playerId) total += e.points ?? 0;
  }
  return total;
}

// Tossups Heard by a player across a fixed number of tossups, taking
// substitution events into account. Mirrors the logic in match-report.ts.
export function playerTuh(
  player: Player,
  totalTossups: number,
  subEvents: SubstitutionEvent[],
): number {
  if (totalTossups === 0) return 0;
  const subs = subEvents
    .filter((s) => s.player_id === player.id)
    .slice()
    .sort((a, b) => a.question_number - b.question_number || a.created_at.localeCompare(b.created_at));
  let active = !player.is_substitute;
  let heard = 0;
  for (let q = 1; q <= totalTossups; q++) {
    while (subs.length > 0 && subs[0].question_number <= q) {
      const ev = subs.shift()!;
      active = ev.action === "in";
    }
    if (active) heard++;
  }
  return heard;
}

export function pp20tuh(tossupPoints: number, tuh: number) {
  if (tuh <= 0) return null;
  return (tossupPoints / tuh) * 20;
}

export function totalTossupsAsked(events: QuestionEvent[]) {
  return events.reduce((m, e) => Math.max(m, e.question_number ?? 0), 0);
}

export function teamPPB(events: QuestionEvent[], teamId: string) {
  const bonuses = events.filter(
    (e) => e.team_id === teamId && e.bonus_points !== null && e.bonus_points !== undefined,
  );
  if (bonuses.length === 0) return null;
  const total = bonuses.reduce((s, e) => s + (e.bonus_points ?? 0), 0);
  return total / bonuses.length;
}

// Compute team & player totals from question_events (source of truth).
export function computeTotals(events: QuestionEvent[]) {
  const teamTotals: Record<string, number> = {};
  const playerTotals: Record<string, number> = {};
  for (const e of events) {
    const pts = (e.points ?? 0) + (e.bonus_points ?? 0);
    if (e.team_id) teamTotals[e.team_id] = (teamTotals[e.team_id] ?? 0) + pts;
    if (e.player_id) playerTotals[e.player_id] = (playerTotals[e.player_id] ?? 0) + (e.points ?? 0) + (e.bonus_points ?? 0);
  }
  return { teamTotals, playerTotals };
}

// Recalculate and persist team & player scores from question_events.
export async function recalcScores(gameId: string) {
  const [{ data: events }, { data: teams }, { data: players }] = await Promise.all([
    supabase.from("question_events").select("*").eq("game_id", gameId),
    supabase.from("teams").select("id, score").eq("game_id", gameId),
    supabase.from("players").select("id, score").eq("game_id", gameId),
  ]);
  const { teamTotals, playerTotals } = computeTotals((events ?? []) as QuestionEvent[]);
  await Promise.all([
    ...(teams ?? []).map((t) => {
      const next = teamTotals[t.id] ?? 0;
      return t.score === next
        ? Promise.resolve()
        : supabase.from("teams").update({ score: next }).eq("id", t.id);
    }),
    ...(players ?? []).map((p) => {
      const next = playerTotals[p.id] ?? 0;
      return p.score === next
        ? Promise.resolve()
        : supabase.from("players").update({ score: next }).eq("id", p.id);
    }),
  ]);
}

// ----- Timer helpers -----

export function getTimerRemaining(game: Pick<Game, "timer_status" | "timer_started_at" | "timer_remaining_seconds" | "timer_total_seconds">): number {
  if (game.timer_status === "idle") return game.timer_total_seconds ?? 0;
  if (game.timer_status === "paused") return game.timer_remaining_seconds ?? 0;
  // running
  const base = game.timer_remaining_seconds ?? game.timer_total_seconds ?? 0;
  const startedAt = game.timer_started_at ? new Date(game.timer_started_at).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, base - elapsed);
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
