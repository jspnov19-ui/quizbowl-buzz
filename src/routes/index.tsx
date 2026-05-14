import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | Home" },
      { name: "description", content: "Run live quizbowl matches with in app scoring and substitution." },
      { property: "og:title", content: "Quizbowl Buzzer App" },
      { property: "og:description", content: "Run live quizbowl matches with real-time buzzing, team scoring, and bonus rounds." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [spectateCode, setSpectateCode] = useState("");

  function goSpectate(e: React.FormEvent) {
    e.preventDefault();
    const code = spectateCode.trim().toUpperCase();
    if (!code) return;
    navigate({ to: "/watch/$code", params: { code } });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background to-accent">
      <div className="w-full max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Zap className="w-4 h-4" /> Live quizbowl scoring
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
          Quibbol Buzz
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
          The fastest way to run a quizbowl match. Buzz in, score teams, and manage rosters in real time.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <Link
            to="/create"
            className="group rounded-2xl bg-primary text-primary-foreground p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl font-semibold">Create a Game</div>
            <div className="mt-1 text-primary-foreground/80 text-sm">Host a match and invite players</div>
          </Link>
          <Link
            to="/join"
            className="group rounded-2xl bg-card border-2 border-border p-8 shadow-sm hover:shadow-md hover:border-primary transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl font-semibold text-foreground">Join a Game</div>
            <div className="mt-1 text-muted-foreground text-sm">Enter a room code to play</div>
          </Link>
        </div>

        <form
          onSubmit={goSpectate}
          className="mt-6 flex items-center justify-center gap-2 text-sm"
        >
          <Eye className="w-4 h-4 text-muted-foreground" />
          <label htmlFor="spectate" className="text-muted-foreground">
            Spectate a game:
          </label>
          <input
            id="spectate"
            value={spectateCode}
            onChange={(e) => setSpectateCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="CODE"
            className="rounded-md border bg-background px-2 py-1 uppercase tracking-widest font-mono w-28 text-center outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-md bg-card border px-3 py-1 font-semibold hover:bg-accent"
          >
            Watch
          </button>
        </form>
      </div>
    </main>
  );
}
