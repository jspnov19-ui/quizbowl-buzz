import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament, TPhase, TBracket, TTeam, TPlayer, TRound, TGame } from "@/lib/tournament";

export function useTournament(slug: string | undefined) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [phases, setPhases] = useState<TPhase[]>([]);
  const [brackets, setBrackets] = useState<TBracket[]>([]);
  const [teams, setTeams] = useState<TTeam[]>([]);
  const [players, setPlayers] = useState<TPlayer[]>([]);
  const [rounds, setRounds] = useState<TRound[]>([]);
  const [games, setGames] = useState<TGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let tid: string | null = null;

    async function load() {
      const { data: t } = await (supabase as any)
        .from("tournaments")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (cancelled) return;
      if (!t) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      tid = t.id;
      setTournament(t as Tournament);
      const [ph, br, tm, rd, gm] = await Promise.all([
        (supabase as any).from("tournament_phases").select("*").eq("tournament_id", t.id).order("ord"),
        (supabase as any).from("tournament_brackets").select("*"),
        (supabase as any).from("tournament_teams").select("*").eq("tournament_id", t.id).order("name"),
        (supabase as any).from("tournament_rounds").select("*").eq("tournament_id", t.id).order("number"),
        (supabase as any).from("tournament_games").select("*").eq("tournament_id", t.id).order("created_at"),
      ]);
      if (cancelled) return;
      setPhases((ph.data ?? []) as TPhase[]);
      const phaseIds = new Set((ph.data ?? []).map((x: TPhase) => x.id));
      setBrackets(((br.data ?? []) as TBracket[]).filter((b) => phaseIds.has(b.phase_id)));
      setTeams((tm.data ?? []) as TTeam[]);
      setRounds((rd.data ?? []) as TRound[]);
      setGames((gm.data ?? []) as TGame[]);
      const teamIds = (tm.data ?? []).map((x: TTeam) => x.id);
      if (teamIds.length > 0) {
        const { data: pl } = await (supabase as any)
          .from("tournament_players")
          .select("*")
          .in("tournament_team_id", teamIds);
        if (!cancelled) setPlayers((pl ?? []) as TPlayer[]);
      } else {
        setPlayers([]);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`tournament_${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_games" }, (payload) => {
        const rec = (payload.new ?? payload.old) as TGame;
        if (!tid || rec.tournament_id !== tid) return;
        setGames((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((g) => g.id !== rec.id);
          return [...prev.filter((g) => g.id !== rec.id), payload.new as TGame];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_teams" }, (payload) => {
        const rec = (payload.new ?? payload.old) as TTeam;
        if (!tid || rec.tournament_id !== tid) return;
        setTeams((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((g) => g.id !== rec.id);
          return [...prev.filter((g) => g.id !== rec.id), payload.new as TTeam];
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return { tournament, phases, brackets, teams, players, rounds, games, loading, notFound, setPlayers, setRounds, setPhases, setBrackets };
}
