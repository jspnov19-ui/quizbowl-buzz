import { supabase } from "@/integrations/supabase/client";

export type Game = {
  id: string;
  code: string;
  current_question: number;
  buzzed_player_id: string | null;
  buzz_locked: boolean;
  status: string;
  round_ended: boolean;
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
  created_at: string;
};

export function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createGame() {
  const code = genCode();
  const { data: game, error } = await supabase
    .from("games")
    .insert({ code })
    .select()
    .single();
  if (error) throw error;
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

export function teamPPB(events: QuestionEvent[], teamId: string) {
  const bonuses = events.filter(
    (e) => e.team_id === teamId && e.bonus_points !== null && e.bonus_points !== undefined,
  );
  if (bonuses.length === 0) return null;
  const total = bonuses.reduce((s, e) => s + (e.bonus_points ?? 0), 0);
  return total / bonuses.length;
}
