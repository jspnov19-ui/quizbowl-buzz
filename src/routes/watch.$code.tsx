import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, teamPPB, type Player, type QuestionEvent, type Team } from "@/lib/game";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MatchTimerDisplay } from "@/components/match-timer";
import { FinalResults } from "@/components/final-results";

export const Route = createFileRoute("/watch/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Spectate" }] }),
  component: WatchPage,
});

function WatchPage() {
  const { code } = Route.useParams();
  const { game, teams, players, events, subEvents, loading, notFound } = useGameState(code);

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

  if (game.status === "closed" && game.mode !== "ffa") {
    return (
      <FinalResults
        code={game.code}
        teams={teams}
        players={players}
        events={events}
        subEvents={subEvents}
      />
    );
  }

  const isFFA = game.mode === "ffa";
  const buzzed = players.find((p) => p.id === game.buzzed_player_id);
  const buzzedTeam = !isFFA ? teams.find((t) => t.id === buzzed?.team_id) : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-2 flex-wrap">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            SPECTATOR · {isFFA ? "FFA" : "TEAMS"}
          </div>
          <div className="font-mono text-sm">
            Room <span className="font-bold text-primary tracking-widest">{game.code}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 mt-2 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Question</div>
        <div className="text-4xl font-bold">#{game.current_question}</div>
      </section>

      {!isFFA && game.timer_total_seconds && (
        <section className="max-w-5xl mx-auto px-4 mt-4">
          <MatchTimerDisplay game={game} />
        </section>
      )}

      {isFFA ? (
        <FfaSpectator players={players} events={events} />
      ) : (
        <>
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
                    {buzzed.name}
                    {buzzedTeam && (
                      <span className="opacity-80 text-base font-normal"> · {buzzedTeam.name}</span>
                    )}
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
        </>
      )}

      {isFFA && buzzed && (
        <section className="max-w-5xl mx-auto px-4 mt-6">
          <div className="bg-buzz text-buzz-foreground rounded-2xl p-5 shadow-lg flex items-center gap-3">
            <Zap className="w-6 h-6" />
            <div>
              <div className="text-sm opacity-90">Buzzed in</div>
              <div className="text-2xl font-bold">{buzzed.name}</div>
            </div>
          </div>
        </section>
      )}
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

function FfaSpectator({ players, events }: { players: Player[]; events: QuestionEvent[] }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <section className="max-w-5xl mx-auto px-4 mt-6 pb-10">
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Leaderboard</div>
        {ranked.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No players yet</div>
        ) : (
          <ul className="divide-y">
            {ranked.map((p, i) => {
              const { p15, p10, n5 } = playerStatLine(events, p.id);
              return (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 text-right font-mono text-lg text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-semibold truncate text-lg">{p.name}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {p15} / {p10} / {n5}
                    </span>
                    <span className="text-3xl font-extrabold" style={{ color: "var(--primary)" }}>
                      {p.score}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export type { Player };
