import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Game, Team, Player, QuestionEvent, SubstitutionEvent } from "@/lib/game";

export function useGameState(code: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<QuestionEvent[]>([]);
  const [subEvents, setSubEvents] = useState<SubstitutionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let gameId: string | null = null;

    async function load() {
      const { data: g } = await supabase
        .from("games")
        .select("*")
        .eq("code", code!.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      if (!g) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      gameId = g.id;
      setGame(g as Game);
      const [{ data: ts }, { data: ps }, { data: ev }, { data: sev }] = await Promise.all([
        supabase.from("teams").select("*").eq("game_id", g.id).order("side"),
        supabase.from("players").select("*").eq("game_id", g.id).order("created_at"),
        supabase.from("question_events").select("*").eq("game_id", g.id).order("created_at"),
        supabase.from("substitution_events").select("*").eq("game_id", g.id).order("created_at"),
      ]);
      if (cancelled) return;
      setTeams((ts ?? []) as Team[]);
      setPlayers((ps ?? []) as Player[]);
      setEvents((ev ?? []) as QuestionEvent[]);
      setSubEvents((sev ?? []) as SubstitutionEvent[]);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`game_${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, (payload) => {
        const rec = (payload.new ?? payload.old) as Game;
        if (gameId && rec?.id === gameId) {
          if (payload.eventType === "DELETE") return;
          setGame(payload.new as Game);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, (payload) => {
        const rec = (payload.new ?? payload.old) as Team;
        if (!gameId || rec.game_id !== gameId) return;
        setTeams((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((t) => t.id !== rec.id);
          const next = [...prev.filter((t) => t.id !== rec.id), payload.new as Team];
          return next.sort((a, b) => a.side - b.side);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, (payload) => {
        const rec = (payload.new ?? payload.old) as Player;
        if (!gameId || rec.game_id !== gameId) return;
        setPlayers((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== rec.id);
          return [...prev.filter((p) => p.id !== rec.id), payload.new as Player];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "question_events" }, (payload) => {
        const rec = (payload.new ?? payload.old) as QuestionEvent;
        if (!gameId || rec.game_id !== gameId) return;
        setEvents((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((e) => e.id !== rec.id);
          const next = [...prev.filter((e) => e.id !== rec.id), payload.new as QuestionEvent];
          return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "substitution_events" }, (payload) => {
        const rec = (payload.new ?? payload.old) as SubstitutionEvent;
        if (!gameId || rec.game_id !== gameId) return;
        setSubEvents((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((e) => e.id !== rec.id);
          const next = [...prev.filter((e) => e.id !== rec.id), payload.new as SubstitutionEvent];
          return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [code]);

  return { game, teams, players, events, subEvents, loading, notFound };
}
