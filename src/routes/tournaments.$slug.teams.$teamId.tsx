import { createFileRoute, Link } from "@tanstack/react-router";
import { useTournament } from "@/hooks/use-tournament";
import { computeStandings } from "@/lib/tournament";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/tournaments/$slug/teams/$teamId")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Team" }] }),
  component: TeamDetail,
});

function TeamDetail() {
  const { slug, teamId } = Route.useParams();
  const { tournament, teams, players, rounds, games, loading, notFound } = useTournament(slug);
  if (notFound) return <Fallback slug={slug} title="Not found" />;
  if (loading || !tournament) return <Fallback slug={slug} title="Loading…" />;
  const team = teams.find((t) => t.id === teamId);
  if (!team) return <Fallback slug={slug} title="Team not found" />;

  const tp = players.filter((p) => p.tournament_team_id === team.id);
  const myGames = games.filter((g) => g.team_a_id === team.id || g.team_b_id === team.id);
  const s = computeStandings(teams, games).find((x) => x.team.id === team.id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-4xl mx-auto">
        <Link to="/tournaments/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to {tournament.name}
        </Link>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        {s && (
          <p className="text-sm text-muted-foreground mt-1">
            {s.wins}–{s.losses}{s.ties ? `–${s.ties}` : ""} · PPG {s.ppg.toFixed(1)} · PAPG {s.papg.toFixed(1)} · Margin {s.margin >= 0 ? "+" : ""}{s.margin.toFixed(1)}
          </p>
        )}

        <section className="mt-6 bg-card border rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Roster</h2>
          {tp.length === 0 ? <div className="text-sm italic text-muted-foreground">No players</div> :
            <ul className="divide-y">
              {tp.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <Link to="/tournaments/$slug/players/$playerId" params={{ slug, playerId: p.id }} className="hover:text-primary font-medium">{p.name}</Link>
                </li>
              ))}
            </ul>
          }
        </section>

        <section className="mt-6 bg-card border rounded-2xl p-5 overflow-x-auto">
          <h2 className="font-semibold mb-3">Match log</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b"><th className="p-2 text-left">R</th><th className="p-2 text-left">Opponent</th><th className="p-2 text-center">Result</th></tr>
            </thead>
            <tbody>
              {myGames.length === 0 ? <tr><td colSpan={3} className="p-3 italic text-muted-foreground text-center">No matches</td></tr> :
                myGames.map((g) => {
                  const isA = g.team_a_id === team.id;
                  const oppId = isA ? g.team_b_id : g.team_a_id;
                  const opp = teams.find((t) => t.id === oppId);
                  const r = rounds.find((rr) => rr.id === g.round_id);
                  const my = isA ? g.score_a : g.score_b;
                  const th = isA ? g.score_b : g.score_a;
                  return (
                    <tr key={g.id} className="border-b last:border-0">
                      <td className="p-2 font-mono">R{r?.number ?? "?"}</td>
                      <td className="p-2">{opp?.name ?? "—"}</td>
                      <td className="p-2 text-center font-mono">{g.status === "final" ? `${my ?? 0} – ${th ?? 0}` : g.status}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Fallback({ slug, title }: { slug: string; title: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h1 className="text-2xl text-foreground font-semibold">{title}</h1>
        <Link to="/tournaments/$slug" params={{ slug }} className="mt-3 inline-block text-primary">← Tournament</Link>
      </div>
    </main>
  );
}
