import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTournament } from "@/hooks/use-tournament";
import { TOURNAMENT_LIMITS } from "@/lib/tournament";
import { createGame } from "@/lib/game";
import { ArrowLeft, Plus, Trash2, Play } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/tournaments/$slug/manage")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Manage Tournament" }] }),
  component: ManageTournament,
});

function ManageTournament() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { tournament, phases, brackets, teams, players, rounds, games, loading, notFound } = useTournament(slug);
  const [newTeam, setNewTeam] = useState("");
  const [newPhase, setNewPhase] = useState("");
  const [newRound, setNewRound] = useState("");
  const [newPlayer, setNewPlayer] = useState<Record<string, string>>({});
  const [pairing, setPairing] = useState({ roundId: "", teamA: "", teamB: "", phaseId: "" });

  if (notFound) return <Centered title="Not found" slug={slug} />;
  if (loading || !tournament) return <Centered title="Loading…" slug={slug} />;

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeam.trim() || teams.length >= TOURNAMENT_LIMITS.teams) return;
    await (supabase as any).from("tournament_teams").insert({ tournament_id: tournament!.id, name: newTeam.trim() });
    setNewTeam("");
  }
  async function removeTeam(id: string) {
    if (!confirm("Remove this team?")) return;
    await (supabase as any).from("tournament_teams").delete().eq("id", id);
  }
  async function addPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhase.trim() || phases.length >= TOURNAMENT_LIMITS.phases) return;
    await (supabase as any).from("tournament_phases").insert({ tournament_id: tournament!.id, name: newPhase.trim(), ord: phases.length });
    setNewPhase("");
  }
  async function addRound(e: React.FormEvent) {
    e.preventDefault();
    if (rounds.length >= TOURNAMENT_LIMITS.rounds) return;
    const num = rounds.length + 1;
    await (supabase as any).from("tournament_rounds").insert({ tournament_id: tournament!.id, number: num, label: newRound.trim() || `Round ${num}` });
    setNewRound("");
  }
  async function addPlayer(teamId: string) {
    const name = (newPlayer[teamId] ?? "").trim();
    if (!name) return;
    const count = players.filter((p) => p.tournament_team_id === teamId).length;
    if (count >= TOURNAMENT_LIMITS.playersPerTeam) return;
    await (supabase as any).from("tournament_players").insert({ tournament_team_id: teamId, name });
    setNewPlayer((s) => ({ ...s, [teamId]: "" }));
    // refresh players via reload (realtime not subscribed for players)
    location.reload();
  }
  async function addPairing(e: React.FormEvent) {
    e.preventDefault();
    if (!pairing.roundId || !pairing.teamA || !pairing.teamB || pairing.teamA === pairing.teamB) return;
    await (supabase as any).from("tournament_games").insert({
      tournament_id: tournament!.id,
      round_id: pairing.roundId,
      phase_id: pairing.phaseId || null,
      team_a_id: pairing.teamA,
      team_b_id: pairing.teamB,
      status: "scheduled",
    });
    setPairing({ roundId: pairing.roundId, teamA: "", teamB: "", phaseId: pairing.phaseId });
  }
  async function startLive(tg: { id: string }) {
    const g = await createGame({ mode: "teams" });
    await (supabase as any).from("tournament_games").update({ game_id: g.id, status: "live" }).eq("id", tg.id);
    navigate({ to: "/manage/$code", params: { code: g.code } });
  }
  async function removeGame(id: string) {
    if (!confirm("Remove this match?")) return;
    await (supabase as any).from("tournament_games").delete().eq("id", id);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-5xl mx-auto">
        <Link to="/tournaments/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to {tournament.name}
        </Link>
        <h1 className="text-3xl font-bold">Manage</h1>
        <p className="text-sm text-muted-foreground">Limits: ≤{TOURNAMENT_LIMITS.teams} teams, ≤{TOURNAMENT_LIMITS.phases} phases, ≤{TOURNAMENT_LIMITS.playersPerTeam}/team, ≤{TOURNAMENT_LIMITS.rounds} rounds.</p>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* Teams + players */}
          <section className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-3">Teams ({teams.length}/{TOURNAMENT_LIMITS.teams})</h2>
            <form onSubmit={addTeam} className="flex gap-2 mb-4">
              <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="Team name" className="flex-1 rounded-lg border bg-background px-3 py-2" />
              <button className="rounded-lg bg-primary text-primary-foreground px-4 font-semibold inline-flex items-center gap-1"><Plus className="w-4 h-4" />Add</button>
            </form>
            <ul className="space-y-3">
              {teams.map((t) => {
                const tp = players.filter((p) => p.tournament_team_id === t.id);
                return (
                  <li key={t.id} className="rounded-lg border p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{t.name}</div>
                      <button onClick={() => removeTeam(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <ul className="mt-2 ml-1 text-sm">
                      {tp.map((p) => <li key={p.id} className="text-muted-foreground">· {p.name}</li>)}
                    </ul>
                    {tp.length < TOURNAMENT_LIMITS.playersPerTeam && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={newPlayer[t.id] ?? ""}
                          onChange={(e) => setNewPlayer((s) => ({ ...s, [t.id]: e.target.value }))}
                          placeholder="Add player"
                          className="flex-1 rounded border bg-background px-2 py-1 text-sm"
                        />
                        <button type="button" onClick={() => addPlayer(t.id)} className="text-xs px-2 rounded border hover:bg-accent">Add</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Phases + rounds */}
          <section className="space-y-6">
            <div className="bg-card border rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Phases ({phases.length}/{TOURNAMENT_LIMITS.phases})</h2>
              <form onSubmit={addPhase} className="flex gap-2 mb-3">
                <input value={newPhase} onChange={(e) => setNewPhase(e.target.value)} placeholder="e.g. Prelims" className="flex-1 rounded-lg border bg-background px-3 py-2" />
                <button className="rounded-lg bg-primary text-primary-foreground px-4 font-semibold">Add</button>
              </form>
              <ul className="text-sm">
                {phases.map((p) => <li key={p.id} className="py-1 border-b last:border-0">{p.name}</li>)}
              </ul>
            </div>

            <div className="bg-card border rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Rounds ({rounds.length}/{TOURNAMENT_LIMITS.rounds})</h2>
              <form onSubmit={addRound} className="flex gap-2 mb-3">
                <input value={newRound} onChange={(e) => setNewRound(e.target.value)} placeholder={`Round ${rounds.length + 1} label (optional)`} className="flex-1 rounded-lg border bg-background px-3 py-2" />
                <button className="rounded-lg bg-primary text-primary-foreground px-4 font-semibold">Add round</button>
              </form>
              <ul className="text-sm">
                {rounds.map((r) => <li key={r.id} className="py-1 border-b last:border-0">R{r.number} · {r.label}</li>)}
              </ul>
            </div>
          </section>
        </div>

        {/* Pairings */}
        <section className="mt-6 bg-card border rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Schedule matches ({games.length})</h2>
          <form onSubmit={addPairing} className="grid sm:grid-cols-5 gap-2 mb-4">
            <select value={pairing.roundId} onChange={(e) => setPairing((p) => ({ ...p, roundId: e.target.value }))} className="rounded-lg border bg-background px-3 py-2">
              <option value="">Round…</option>
              {rounds.map((r) => <option key={r.id} value={r.id}>R{r.number}</option>)}
            </select>
            <select value={pairing.phaseId} onChange={(e) => setPairing((p) => ({ ...p, phaseId: e.target.value }))} className="rounded-lg border bg-background px-3 py-2">
              <option value="">No phase</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={pairing.teamA} onChange={(e) => setPairing((p) => ({ ...p, teamA: e.target.value }))} className="rounded-lg border bg-background px-3 py-2">
              <option value="">Team A…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={pairing.teamB} onChange={(e) => setPairing((p) => ({ ...p, teamB: e.target.value }))} className="rounded-lg border bg-background px-3 py-2">
              <option value="">Team B…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="rounded-lg bg-primary text-primary-foreground px-4 font-semibold">Schedule</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b"><th className="p-2 text-left">R</th><th className="p-2 text-left">Match</th><th className="p-2 text-center">Score</th><th className="p-2 text-right">Status</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const ta = teams.find((t) => t.id === g.team_a_id);
                  const tb = teams.find((t) => t.id === g.team_b_id);
                  const r = rounds.find((rr) => rr.id === g.round_id);
                  return (
                    <tr key={g.id} className="border-b last:border-0">
                      <td className="p-2 font-mono">R{r?.number ?? "?"}</td>
                      <td className="p-2">{ta?.name ?? "—"} vs {tb?.name ?? "—"}</td>
                      <td className="p-2 text-center font-mono">{g.status === "final" ? `${g.score_a ?? 0} – ${g.score_b ?? 0}` : "—"}</td>
                      <td className="p-2 text-right">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{g.status}</span>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {g.status === "scheduled" && (
                          <button onClick={() => startLive(g)} className="text-xs px-2 py-1 rounded border hover:bg-accent inline-flex items-center gap-1"><Play className="w-3 h-3" />Start live</button>
                        )}
                        {g.status === "live" && g.game_id && (
                          <Link to="/manage/$code" params={{ code: "" }} search={{}} className="text-xs px-2 py-1 rounded border hover:bg-accent" onClick={async (e) => {
                            e.preventDefault();
                            const { data } = await supabase.from("games").select("code").eq("id", g.game_id!).maybeSingle();
                            if (data?.code) navigate({ to: "/manage/$code", params: { code: data.code } });
                          }}>Open room</Link>
                        )}
                        <button onClick={() => removeGame(g.id)} className="ml-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Centered({ title, slug }: { title: string; slug: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <Link to="/tournaments/$slug" params={{ slug }} className="mt-3 inline-block text-primary">← Tournament</Link>
      </div>
    </main>
  );
}
