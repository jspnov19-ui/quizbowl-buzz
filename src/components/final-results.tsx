import { Link } from "@tanstack/react-router";
import {
  playerStatLine,
  playerTossupPoints,
  playerTuh,
  pp20tuh,
  teamPPB,
  totalTossupsAsked,
  type Player,
  type QuestionEvent,
  type SubstitutionEvent,
  type Team,
} from "@/lib/game";

export function FinalResults({
  code,
  teams,
  players,
  events,
  subEvents,
}: {
  code: string;
  teams: Team[];
  players: Player[];
  events: QuestionEvent[];
  subEvents: SubstitutionEvent[];
}) {
  const t1 = teams[0];
  const t2 = teams[1];
  const s1 = t1?.score ?? 0;
  const s2 = t2?.score ?? 0;
  const total = totalTossupsAsked(events);

  function resultFor(teamId?: string) {
    if (!t1 || !t2 || !teamId) return "—";
    if (s1 === s2) return "Tie";
    const winId = s1 > s2 ? t1.id : t2.id;
    return teamId === winId ? "Win" : "Loss";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <div className="font-mono text-sm">
          Final · Room <span className="font-bold text-primary tracking-widest">{code}</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 mt-2 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Final Score</div>
        <div className="text-4xl sm:text-5xl font-extrabold mt-1">
          <span style={{ color: "var(--team-1)" }}>{s1}</span>
          <span className="text-muted-foreground mx-3">—</span>
          <span style={{ color: "var(--team-2)" }}>{s2}</span>
        </div>
        <div className="mt-2 text-lg font-semibold">
          {s1 === s2 ? "Tie" : s1 > s2 ? `${t1?.name ?? "Team 1"} wins` : `${t2?.name ?? "Team 2"} wins`}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 mt-6 grid gap-4 sm:grid-cols-2 pb-12">
        {teams.map((team) => {
          const teamPlayers = players.filter((p) => p.team_id === team.id);
          const ppb = teamPPB(events, team.id);
          const bonusEvents = events.filter(
            (e) => e.team_id === team.id && e.bonus_points !== null && e.bonus_points !== undefined,
          );
          const bonusHeard = bonusEvents.length;
          const bonusTotal = bonusEvents.reduce((s, e) => s + (e.bonus_points ?? 0), 0);
          return (
            <div key={team.id} className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="font-bold text-lg">{team.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <Stat label="Result" value={resultFor(team.id)} />
                <Stat label="Points" value={team.score ?? 0} />
                <Stat
                  label="Bonus"
                  value={
                    bonusHeard > 0
                      ? `${bonusTotal}/${bonusHeard * 30} (${bonusHeard} heard, PPB ${ppb?.toFixed(2) ?? "—"})`
                      : "—"
                  }
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-1.5 pr-2">Player</th>
                      <th className="py-1.5 px-2 text-right">TUH</th>
                      <th className="py-1.5 px-2 text-right">P</th>
                      <th className="py-1.5 px-2 text-right">TU</th>
                      <th className="py-1.5 px-2 text-right">I</th>
                      <th className="py-1.5 pl-2 text-right">PP20TUH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-2 italic text-muted-foreground">No players</td>
                      </tr>
                    ) : (
                      teamPlayers.map((p) => {
                        const { p15, p10, n5 } = playerStatLine(events, p.id);
                        const tuh = playerTuh(p, total, subEvents);
                        const tossupPts = playerTossupPoints(events, p.id);
                        const pp = pp20tuh(tossupPts, tuh);
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-1.5 pr-2 truncate">
                              {p.name}
                              {p.is_substitute && (
                                <span className="ml-1 text-xs text-muted-foreground">(sub)</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">{tuh}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{p15}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{p10}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{n5}</td>
                            <td className="py-1.5 pl-2 text-right font-mono font-semibold">
                              {pp === null ? "—" : pp.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}
