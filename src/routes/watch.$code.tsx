import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, teamPPB, type Player, type QuestionEvent, type Team } from "@/lib/game";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/watch/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Spectate" }] }),
  component: WatchPage,
});

function WatchPage() {
  const { code } = Route.useParams();
  const { game, teams, players, events, loading, notFound } = useGameState(code);

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Game not found</h1>
          <Link to="/" className="mt-2 inline-block text-primary">← Home</Link>
        </div>
      </main>
    );
  }
  if (loading || !game) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</main>;
  }

  const buzzed = players.find((p) => p.id === game.buzzed_player_id);
  const buzzedTeam = teams.find((t) => t.id === buzzed?.team_id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
          SPECTATOR
        </div>
        <div className="font-mono text-sm">
          Room <span className="font-bold text-primary tracking-widest">{game.code}</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 mt-2 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Question</div>
        <div className="text-4xl font-bold">#{game.current_question}</div>
      </section>

      <section className="max-w-5xl mx-auto px-4 mt-6 grid sm:grid-cols-2 gap-4">
        {teams.map((t) => (
          <BigTeamCard key={t.id} team={t} events={events} />
        ))}
      </section>

      {buzzed && (
        <section className="max-w-5xl mx-auto px-4 mt-6">
          <div className="bg-buzz text-buzz-foreground rounded-2xl p-5 shadow-lg flex items-center gap-3">
            <Zap className="w-6 h-6" />
            <div>
              <div className="text-sm opacity-90">Buzzed in</div>
              <div className="text-2xl font-bold">
                {buzzed.name} <span className="opacity-80 text-base font-normal">· {buzzedTeam?.name}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 mt-6 grid sm:grid-cols-2 gap-4 pb-10">
        {teams.map((team) => {
          const teamPlayers = players.filter((p) => p.team_id === team.id && !p.is_substitute);
          return (
            <div key={team.id} className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="font-bold text-lg mb-2">{team.name}</div>
              {teamPlayers.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No active players</div>
              ) : (
                <ul className="divide-y">
                  {teamPlayers.map((p) => {
                    const { p15, p10, n5 } = playerStatLine(events, p.id);
                    return (
                      <li key={p.id} className="flex justify-between items-center py-2">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-right">
                          <span className="font-mono font-semibold">{p.score}</span>
                          <span className="ml-2 text-xs font-mono text-muted-foreground">
                            {p15} / {p10} / {n5}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}

function BigTeamCard({ team, events }: { team: Team; events: QuestionEvent[] }) {
  const ppb = teamPPB(events, team.id);
  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm">
      <div className="text-sm uppercase tracking-wider text-muted-foreground">{team.name}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <div
          className="text-6xl font-extrabold"
          style={{ color: team.side === 1 ? "var(--team-1)" : "var(--team-2)" }}
        >
          {team.score}
        </div>
        <div className="text-sm text-muted-foreground">PPB {ppb === null ? "—" : ppb.toFixed(1)}</div>
      </div>
    </div>
  );
}

export type { Player };
