import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findGameByCode } from "@/lib/game";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Join Game" }] }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    try {
      const game = await findGameByCode(code.trim());
      if (!game) {
        setError("Game not found");
        setLoading(false);
        return;
      }
      // assign to team with fewer players (teams mode only)
      let teamId: string | null = null;
      if (game.mode !== "ffa") {
        const { data: teams } = await supabase.from("teams").select("*").eq("game_id", game.id).order("side");
        const { data: players } = await supabase.from("players").select("team_id").eq("game_id", game.id).eq("is_substitute", false);
        const counts = (teams ?? []).map((t) => ({
          t,
          n: (players ?? []).filter((p) => p.team_id === t.id).length,
        }));
        counts.sort((a, b) => a.n - b.n);
        teamId = counts[0]?.t?.id ?? null;
      }

      const { data: player, error: insErr } = await supabase
        .from("players")
        .insert({ game_id: game.id, team_id: teamId, name: name.trim() })
        .select()
        .single();
      if (insErr) throw insErr;

      localStorage.setItem(`bb_player_${game.code}`, player.id);
      navigate({ to: "/play/$code", params: { code: game.code } });
    } catch (err) {
      console.error(err);
      setError("Could not join game");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-accent relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <form onSubmit={submit} className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-lg">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">Join a game</h1>
        <p className="text-muted-foreground text-sm mt-1">Enter your name and the room code.</p>

        <label className="block mt-6 text-sm font-medium">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          placeholder="Alex"
          required
        />

        <label className="block mt-4 text-sm font-medium">Room code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary uppercase tracking-widest font-mono text-lg"
          placeholder="ABC12"
          required
        />

        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join game"}
        </button>
      </form>
    </main>
  );
}
