import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | Home" },
      {
        name: "description",
        content:
          "Run live quizbowl matches with in app scoring and real-time buzzing.",
      },
      { property: "og:title", content: "Quibbol Buzz" },
      {
        property: "og:description",
        content:
          "Live quizbowl buzzer system with scoring, spectating, and match control.",
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
    <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background to-accent">
      <div className="w-full max-w-xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          Live quizbowl buzzer system
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold tracking-tight text-foreground">
          Quibbol Buzz
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-lg text-muted-foreground">
          A fast, real-time quizbowl platform for buzzing, scoring, and spectating live matches.
        </p>

        {/* Main actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/create"
            className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition"
          >
            Create Game
          </Link>

          <Link
            to="/join"
            className="rounded-xl bg-card border border-border px-6 py-3 font-semibold hover:bg-accent transition"
          >
            Join Game
          </Link>

          <Link
            to="/how-to-use"
            className="rounded-xl bg-card border border-border px-6 py-3 font-semibold hover:bg-accent transition"
          >
            How to Use
          </Link>
        </div>

        {/* Spectate */}
        <form
          onSubmit={goSpectate}
          className="mt-8 flex items-center justify-center gap-2 text-sm"
        >
          <Eye className="w-4 h-4 text-muted-foreground" />

          <input
            id="spectate"
            value={spectateCode}
            onChange={(e) =>
              setSpectateCode(e.target.value.toUpperCase())
            }
            maxLength={6}
            placeholder="SPECTATE CODE"
            className="rounded-md border bg-background px-3 py-2 uppercase tracking-widest font-mono w-40 text-center outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="submit"
            className="rounded-md bg-card border px-3 py-2 font-semibold hover:bg-accent transition"
          >
            Watch
          </button>
        </form>
      </div>
    </main>
  );
}
