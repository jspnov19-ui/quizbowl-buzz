import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createGame, type GameMode } from "@/lib/game";
import { ThemeToggle } from "@/components/theme-toggle";
import { Users, User } from "lucide-react";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Create Game" }] }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>("teams");
  const [bonusesEnabled, setBonusesEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setCreating(true);
    setError(null);
    try {
      const game = await createGame({ mode, bonusesEnabled });
      navigate({ to: "/manage/$code", params: { code: game.code } });
    } catch (e) {
      console.error(e);
      setError("Failed to create game");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-accent">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg bg-card border rounded-2xl p-8 shadow-lg">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">Create a game</h1>
        <p className="text-muted-foreground text-sm mt-1">Pick a format, then share the room code.</p>

        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Game format</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("teams")}
              className={`rounded-xl border-2 p-4 text-left transition ${
                mode === "teams" ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              <Users className="w-5 h-5 text-primary mb-2" />
              <div className="font-semibold">Teams</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Two teams compete with bonuses and PPB.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("ffa")}
              className={`rounded-xl border-2 p-4 text-left transition ${
                mode === "ffa" ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              <User className="w-5 h-5 text-primary mb-2" />
              <div className="font-semibold">Free for all</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Every player keeps their own score.
              </div>
            </button>
          </div>
        </div>

        {mode === "ffa" && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border p-3">
            <input
              id="bonuses"
              type="checkbox"
              checked={bonusesEnabled}
              onChange={(e) => setBonusesEnabled(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor="bonuses" className="text-sm">
              <div className="font-medium">Enable bonus rounds</div>
              <div className="text-xs text-muted-foreground">
                After a correct buzz, the moderator can award the player follow-up bonus points.
              </div>
            </label>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

        <button
          onClick={start}
          disabled={creating}
          className="mt-6 w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create game"}
        </button>
      </div>
    </main>
  );
}
