import { createFileRoute, Link } from "@tanstack/react-router";
import { useTournament } from "@/hooks/use-tournament";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/tournaments/$slug/players/$playerId")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Player" }] }),
  component: PlayerDetail,
});

function PlayerDetail() {
  const { slug, playerId } = Route.useParams();
  const { tournament, teams, players, loading, notFound } = useTournament(slug);
  if (notFound) return <Fallback slug={slug} title="Not found" />;
  if (loading || !tournament) return <Fallback slug={slug} title="Loading…" />;
  const player = players.find((p) => p.id === playerId);
  if (!player) return <Fallback slug={slug} title="Player not found" />;
  const team = teams.find((t) => t.id === player.tournament_team_id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-3xl mx-auto">
        <Link to="/tournaments/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to {tournament.name}
        </Link>
        <h1 className="text-3xl font-bold">{player.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {team ? (
            <Link to="/tournaments/$slug/teams/$teamId" params={{ slug, teamId: team.id }} className="hover:text-primary">{team.name}</Link>
          ) : "Unassigned"}
        </p>

        <div className="mt-6 bg-card border rounded-2xl p-5 text-sm text-muted-foreground italic">
          Per-game tossup statistics (TUH, P, TU, I, PP20TUH) will appear here once games are linked to this player via the live buzzer module.
        </div>
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
