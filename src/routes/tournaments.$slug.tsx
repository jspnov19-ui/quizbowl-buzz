import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTournament } from "@/hooks/use-tournament";
import { computeStandings } from "@/lib/tournament";
import { ArrowLeft, Settings, Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/tournaments/$slug")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Tournament" }] }),
  component: TournamentOverview,
});

type Tab = "standings" | "schedule" | "players";

function TournamentOverview() {
  const { slug } = Route.useParams();
  const { tournament, teams, players, rounds, games, phases, loading, notFound } = useTournament(slug);
  const [tab, setTab] = useState<Tab>("standings");
  const [phaseId, setPhaseId] = useState<string | null>(null);

  const filteredGames = useMemo(() => {
    if (!phaseId) return games;
    return games.filter((g) => g.phase_id === phaseId);
  }, [games, phaseId]);

  const standings = useMemo(() => computeStandings(teams, filteredGames), [teams, filteredGames]);

  if (notFound) return <Centered title="Tournament not found" />;
  if (loading || !tournament) return <Centered title="Loading…" />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-6xl mx-auto">
        <Link to="/tournaments" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> All tournaments
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Trophy className="w-3.5 h-3.5" /> {tournament.status}
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">{tournament.name}</h1>
            <p className="text-sm text-muted-foreground">
              {teams.length} teams · {players.length} players · {rounds.length} rounds · {games.length} matches
            </p>
          </div>
          <Link
            to="/tournaments/$slug/manage"
            params={{ slug }}
            className="inline-flex items-center gap-2 rounded-lg bg-card border px-4 py-2 hover:bg-accent"
          >
            <Settings className="w-4 h-4" /> Manage
          </Link>
        </div>

        {phases.length > 0 && (
          <div className="mt-5 flex gap-2 flex-wrap items-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Phase:</span>
            <button
              onClick={() => setPhaseId(null)}
              className={`px-3 py-1 rounded-full text-xs border ${phaseId === null ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
            >
              All
            </button>
            {phases.map((p) => (
              <button
                key={p.id}
                onClick={() => setPhaseId(p.id)}
                className={`px-3 py-1 rounded-full text-xs border ${phaseId === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2 border-b">
          {(["standings", "schedule", "players"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "standings" ? "Standings" : t === "schedule" ? "Schedule" : "Individuals"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "standings" && (
            <div className="bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-3">Team</th>
                    <th className="text-right p-3">W</th>
                    <th className="text-right p-3">L</th>
                    <th className="text-right p-3">T</th>
                    <th className="text-right p-3">PF</th>
                    <th className="text-right p-3">PA</th>
                    <th className="text-right p-3">PPG</th>
                    <th className="text-right p-3">PAPG</th>
                    <th className="text-right p-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.length === 0 ? (
                    <tr><td colSpan={9} className="p-4 italic text-muted-foreground text-center">No teams yet</td></tr>
                  ) : standings.map((s) => (
                    <tr key={s.team.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="p-3 font-semibold">
                        <Link to="/tournaments/$slug/teams/$teamId" params={{ slug, teamId: s.team.id }} className="hover:text-primary">
                          {s.team.name}
                        </Link>
                      </td>
                      <td className="p-3 text-right font-mono">{s.wins}</td>
                      <td className="p-3 text-right font-mono">{s.losses}</td>
                      <td className="p-3 text-right font-mono">{s.ties}</td>
                      <td className="p-3 text-right font-mono">{s.pf}</td>
                      <td className="p-3 text-right font-mono">{s.pa}</td>
                      <td className="p-3 text-right font-mono">{s.ppg.toFixed(1)}</td>
                      <td className="p-3 text-right font-mono">{s.papg.toFixed(1)}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${s.margin > 0 ? "text-primary" : s.margin < 0 ? "text-destructive" : ""}`}>
                        {s.margin > 0 ? "+" : ""}{s.margin.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "schedule" && (
            <div className="bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-3">Round</th>
                    <th className="text-left p-3">Team A</th>
                    <th className="text-center p-3">Score</th>
                    <th className="text-left p-3">Team B</th>
                    <th className="text-right p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 italic text-muted-foreground text-center">No matches scheduled</td></tr>
                  ) : filteredGames.map((g) => {
                    const ta = teams.find((t) => t.id === g.team_a_id);
                    const tb = teams.find((t) => t.id === g.team_b_id);
                    const rd = rounds.find((r) => r.id === g.round_id);
                    return (
                      <tr key={g.id} className="border-b last:border-0">
                        <td className="p-3 font-mono">R{rd?.number ?? "?"}</td>
                        <td className="p-3">{ta?.name ?? "—"}</td>
                        <td className="p-3 text-center font-mono font-semibold">
                          {g.status === "final" ? `${g.score_a ?? 0} – ${g.score_b ?? 0}` : "—"}
                        </td>
                        <td className="p-3">{tb?.name ?? "—"}</td>
                        <td className="p-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === "final" ? "bg-primary/10 text-primary" : g.status === "live" ? "bg-buzz/20" : "bg-muted text-muted-foreground"}`}>
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "players" && (
            <div className="bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-3">Player</th>
                    <th className="text-left p-3">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr><td colSpan={2} className="p-4 italic text-muted-foreground text-center">No players yet</td></tr>
                  ) : players.map((p) => {
                    const t = teams.find((x) => x.id === p.tournament_team_id);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">
                          <Link to="/tournaments/$slug/players/$playerId" params={{ slug, playerId: p.id }} className="hover:text-primary">
                            {p.name}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">{t?.name ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Centered({ title }: { title: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <Link to="/tournaments" className="mt-3 inline-block text-primary">← All tournaments</Link>
      </div>
    </main>
  );
}
