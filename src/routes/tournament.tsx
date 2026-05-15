import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Trophy, Download } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/tournament")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | Tournament Pairings" },
      { name: "description", content: "Generate quizbowl tournament pairings and round schedules." },
    ],
  }),
  component: TournamentPage,
});

type Match = { team1: string; team2: string; bye?: boolean; bracket?: string };
type Round = { label: string; phase: "Prelims" | "Playoffs"; matches: Match[] };

// Round-robin (circle method). Returns rounds[ round ][ matches ].
function roundRobin(teams: string[]): Match[][] {
  const t = [...teams];
  if (t.length % 2 === 1) t.push("BYE");
  const n = t.length;
  const rounds: Match[][] = [];
  const arr = [...t];
  for (let r = 0; r < n - 1; r++) {
    const matches: Match[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === "BYE" || b === "BYE") {
        matches.push({ team1: a === "BYE" ? b : a, team2: "BYE", bye: true });
      } else {
        matches.push({ team1: a, team2: b });
      }
    }
    rounds.push(matches);
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return rounds;
}

// Snake-distribute teams into N brackets so they're roughly balanced (and seeded fairly).
function splitIntoBrackets(teams: string[], n: number): string[][] {
  const brackets: string[][] = Array.from({ length: n }, () => []);
  teams.forEach((t, i) => {
    const cycle = Math.floor(i / n);
    const idx = i % n;
    const bIdx = cycle % 2 === 0 ? idx : n - 1 - idx;
    brackets[bIdx].push(t);
  });
  return brackets;
}

function buildPrelims(teams: string[], bracketCount: 1 | 2 | 3, prelimRounds: number): Round[] {
  if (bracketCount === 1) {
    const rr = roundRobin(teams);
    const out: Round[] = [];
    for (let r = 0; r < prelimRounds; r++) {
      out.push({
        label: `Round ${r + 1}`,
        phase: "Prelims",
        matches: rr[r % rr.length],
      });
    }
    return out;
  }

  const brackets = splitIntoBrackets(teams, bracketCount);
  const bracketLabels = ["A", "B", "C"];
  const rrPerBracket = brackets.map((b) => roundRobin(b));
  const out: Round[] = [];
  for (let r = 0; r < prelimRounds; r++) {
    const matches: Match[] = [];
    rrPerBracket.forEach((rr, bi) => {
      const round = rr[r % rr.length] || [];
      round.forEach((m) => matches.push({ ...m, bracket: bracketLabels[bi] }));
    });
    out.push({ label: `Round ${r + 1}`, phase: "Prelims", matches });
  }
  return out;
}

// Build placeholder playoff rounds (top half of each bracket cross over).
function buildPlayoffs(teams: string[], bracketCount: 1 | 2 | 3, playoffRounds: number, prelimRounds: number): Round[] {
  if (playoffRounds <= 0) return [];

  // Playoff teams = top half of each bracket (placeholder seeds)
  let playoffTeams: string[];
  if (bracketCount === 1) {
    const half = Math.max(2, Math.ceil(teams.length / 2));
    playoffTeams = Array.from({ length: half }, (_, i) => `Seed ${i + 1}`);
  } else {
    const brackets = splitIntoBrackets(teams, bracketCount);
    const bracketLabels = ["A", "B", "C"];
    playoffTeams = [];
    brackets.forEach((b, bi) => {
      const top = Math.max(1, Math.ceil(b.length / 2));
      for (let i = 0; i < top; i++) {
        playoffTeams.push(`${bracketLabels[bi]}${i + 1}`);
      }
    });
  }

  const rr = roundRobin(playoffTeams);
  const out: Round[] = [];
  for (let r = 0; r < playoffRounds; r++) {
    out.push({
      label: `Playoff ${r + 1} (R${prelimRounds + r + 1})`,
      phase: "Playoffs",
      matches: rr[r % rr.length],
    });
  }
  return out;
}

function TournamentPage() {
  const [numTeams, setNumTeams] = useState(8);
  const [namesInput, setNamesInput] = useState("");
  const [bracketCount, setBracketCount] = useState<1 | 2 | 3>(1);
  const [prelimRounds, setPrelimRounds] = useState(5);
  const [playoffRounds, setPlayoffRounds] = useState(2);
  const [generated, setGenerated] = useState<{ rounds: Round[]; teams: string[]; rooms: number } | null>(null);

  const teamNames = useMemo(() => {
    const supplied = namesInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const list: string[] = [];
    for (let i = 0; i < numTeams; i++) {
      list.push(supplied[i] ?? `Team ${i + 1}`);
    }
    return list;
  }, [numTeams, namesInput]);

  function generate() {
    if (numTeams < 2) return;
    const prelims = buildPrelims(teamNames, bracketCount, prelimRounds);
    const playoffs = buildPlayoffs(teamNames, bracketCount, playoffRounds, prelimRounds);
    const allRounds = [...prelims, ...playoffs];
    const maxRooms = allRounds.reduce((m, r) => Math.max(m, r.matches.length), 0);
    setGenerated({ rounds: allRounds, teams: teamNames, rooms: maxRooms });
  }

  function exportCsv() {
    if (!generated) return;
    const header = ["Round", "Phase", ...Array.from({ length: generated.rooms }, (_, i) => `Room ${i + 1}`)];
    const lines = [header.join(",")];
    generated.rounds.forEach((rd) => {
      const cells = [rd.label, rd.phase];
      for (let i = 0; i < generated.rooms; i++) {
        const m = rd.matches[i];
        if (!m) cells.push("—");
        else if (m.bye) cells.push(`"${m.team1} (BYE)"`);
        else cells.push(`"${m.bracket ? `[${m.bracket}] ` : ""}${m.team1} vs ${m.team2}"`);
      }
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tournament-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-12 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" /> Tournament Pairings
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Build a tournament schedule</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Pick a single round-robin or split into 2 or 3 prelim brackets, add playoff rounds, and we'll lay out every round across rooms.
          </p>
        </div>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border rounded-2xl p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Teams</label>
            <input
              type="number"
              min={2}
              max={64}
              value={numTeams}
              onChange={(e) => setNumTeams(Math.max(2, Math.min(64, Number(e.target.value) || 2)))}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-lg font-semibold"
            />
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Prelim brackets</label>
            <select
              value={bracketCount}
              onChange={(e) => setBracketCount(Number(e.target.value) as 1 | 2 | 3)}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-lg font-semibold"
            >
              <option value={1}>1 (Whole field RR)</option>
              <option value={2}>2 brackets</option>
              <option value={3}>3 brackets</option>
            </select>
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Prelim rounds</label>
            <input
              type="number"
              min={1}
              max={50}
              value={prelimRounds}
              onChange={(e) => setPrelimRounds(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-lg font-semibold"
            />
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Playoff rounds</label>
            <input
              type="number"
              min={0}
              max={20}
              value={playoffRounds}
              onChange={(e) => setPlayoffRounds(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-lg font-semibold"
            />
          </div>
          <div className="bg-card border rounded-2xl p-5 md:col-span-2 lg:col-span-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Team names (optional)</label>
            <textarea
              value={namesInput}
              onChange={(e) => setNamesInput(e.target.value)}
              placeholder="One per line or comma-separated"
              rows={3}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={generate}
            className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90"
          >
            Generate schedule
          </button>
          {generated && (
            <button
              onClick={exportCsv}
              className="rounded-xl border bg-card px-6 py-3 font-semibold hover:bg-accent inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>

        {generated && (
          <section className="mt-10 space-y-6">
            {(["Prelims", "Playoffs"] as const).map((phase) => {
              const rounds = generated.rounds.filter((r) => r.phase === phase);
              if (rounds.length === 0) return null;
              const rooms = rounds.reduce((m, r) => Math.max(m, r.matches.length), 0);
              return (
                <div key={phase} className="bg-card border rounded-2xl p-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-lg font-bold">{phase}</h2>
                    <span className="text-xs text-muted-foreground">
                      {rounds.length} rounds · {rooms} room{rooms !== 1 ? "s" : ""}
                      {phase === "Playoffs" && " · seeds A1/A2… are placeholders for top finishers"}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 border-b font-semibold sticky left-0 bg-card">Round</th>
                          {Array.from({ length: rooms }, (_, i) => (
                            <th key={i} className="text-left p-2 border-b font-semibold whitespace-nowrap">
                              Room {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rounds.map((rd, ri) => (
                          <tr key={ri} className="border-b last:border-0">
                            <td className="p-2 font-medium align-top sticky left-0 bg-card">{rd.label}</td>
                            {Array.from({ length: rooms }, (_, i) => {
                              const m = rd.matches[i];
                              if (!m) return <td key={i} className="p-2 text-muted-foreground">—</td>;
                              if (m.bye)
                                return (
                                  <td key={i} className="p-2 italic text-muted-foreground">
                                    {m.bracket && <span className="mr-1 text-xs px-1.5 py-0.5 rounded bg-muted">{m.bracket}</span>}
                                    {m.team1} (BYE)
                                  </td>
                                );
                              return (
                                <td key={i} className="p-2 whitespace-nowrap">
                                  {m.bracket && <span className="mr-1 text-xs px-1.5 py-0.5 rounded bg-muted">{m.bracket}</span>}
                                  <span className="font-medium">{m.team1}</span>
                                  <span className="text-muted-foreground mx-1">vs</span>
                                  <span className="font-medium">{m.team2}</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
