import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Zap, Users, Trophy, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | Home" },
      {
        name: "description",
        content:
          "Run live quizbowl matches with real-time buzzing and scoring.",
      },
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
    <main className="bg-gradient-to-br from-background to-accent text-foreground">

      {/* HERO SECTION */}
      <section className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Live quizbowl buzzer system
          </div>

          <h1 className="text-6xl font-bold tracking-tight">
            Quibbol Buzz
          </h1>

          <p className="mt-5 text-lg text-muted-foreground">
            A real-time quizbowl platform for buzzing, scoring, and managing live matches.
          </p>

          <div className="mt-10 flex justify-center">
            <ArrowDown className="animate-bounce text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="min-h-screen flex items-center px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center">

          <div className="p-6 rounded-2xl border bg-card">
            <Zap className="mx-auto w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold">Fast Buzzing</h3>
            <p className="text-muted-foreground mt-2">
              Real-time buzzer system with instant lockout.
            </p>
          </div>

          <div className="p-6 rounded-2xl border bg-card">
            <Trophy className="mx-auto w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold">Live Scoring</h3>
            <p className="text-muted-foreground mt-2">
              Track points and match progress instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl border bg-card">
            <Users className="mx-auto w-8 h-8 text-primary mb-3" />
            <h3 className="text-xl font-semibold">Multiplayer</h3>
            <p className="text-muted-foreground mt-2">
              Play across devices with synced gameplay.
            </p>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="min-h-screen flex items-center px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-10 text-center">
            How it works
          </h2>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border bg-card">
              <h3 className="font-semibold text-lg">1. Create a game</h3>
              <p className="text-muted-foreground">
                Host a match and generate a room code.
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h3 className="font-semibold text-lg">2. Players join</h3>
              <p className="text-muted-foreground">
                Players enter the room code to connect.
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h3 className="font-semibold text-lg">3. Buzz & score</h3>
              <p className="text-muted-foreground">
                First buzz locks in answers and updates scores live.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/create"
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold"
            >
              Start a Game
            </Link>
          </div>
        </div>
      </section>

      {/* SPECTATE SECTION */}
      <section className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-4">Spectate a match</h2>
          <p className="text-muted-foreground mb-6">
            Enter a room code to watch live gameplay.
          </p>

          <form onSubmit={goSpectate} className="flex gap-2 justify-center">
            <input
              value={spectateCode}
              onChange={(e) =>
                setSpectateCode(e.target.value.toUpperCase())
              }
              maxLength={6}
              placeholder="CODE"
              className="rounded-md border bg-background px-3 py-2 uppercase tracking-widest font-mono w-32 text-center"
            />

            <button
              type="submit"
              className="rounded-md bg-card border px-4 py-2 font-semibold hover:bg-accent"
            >
              Watch
            </button>
          </form>

          <div className="mt-10">
            <Link
              to="/join"
              className="text-primary underline text-sm"
            >
              Or join a game instead →
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
