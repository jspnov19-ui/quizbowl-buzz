import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Zap, Users, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | Home" },
      {
        name: "description",
        content:
          "Real-time quizbowl buzzer system with live scoring and multiplayer syncing.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [spectateCode, setSpectateCode] = useState("");

  // 🌑 scroll darkness state
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress = docHeight > 0 ? scrollTop / docHeight : 0;

      setScrollProgress(Math.min(progress, 1));
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function goSpectate(e: React.FormEvent) {
    e.preventDefault();
    const code = spectateCode.trim().toUpperCase();
    if (!code) return;
    navigate({ to: "/watch/$code", params: { code } });
  }

  return (
    <main className="min-h-screen text-foreground bg-gradient-to-b from-[#f4fff6] via-[#d7f5df] to-[#0b1f14] relative">

      {/* 🌑 scroll-based green dark overlay */}
      <div
        className="pointer-events-none fixed inset-0 transition-colors duration-300 z-0"
        style={{
          backgroundColor: `rgba(0, 20, 10, ${scrollProgress * 0.28})`,
        }}
      />

      {/* subtle background grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center px-6 text-center relative z-10">
        <div className="max-w-2xl relative">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Live quizbowl matches
          </div>

          <h1 className="text-6xl font-bold tracking-tight">
            Quibbol Buzz
          </h1>

          <p className="mt-5 text-lg text-muted-foreground">
            A fast, synchronized buzzer system for live quizbowl matches with
            instant scoring and spectator support.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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
          </div>

          <form
            onSubmit={goSpectate}
            className="mt-6 flex justify-center gap-2"
          >
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

          <div className="mt-10 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <span>Scroll to learn more</span>
            <div className="animate-bounce">↓</div>
          </div>
        </div>
      </section>

      {/* TRUST / VALUE STRIP */}
      <section className="py-20 px-6 border-t border-border/40 relative z-10">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6 text-center">

          <div>
            <Zap className="mx-auto w-6 h-6 text-primary mb-2" />
            <p className="font-semibold">Instant buzzing</p>
            <p className="text-sm text-muted-foreground">
              No delay, real-time lockout
            </p>
          </div>

          <div>
            <Trophy className="mx-auto w-6 h-6 text-primary mb-2" />
            <p className="font-semibold">Live scoring</p>
            <p className="text-sm text-muted-foreground">
              Updates across all devices instantly
            </p>
          </div>

          <div>
            <Users className="mx-auto w-6 h-6 text-primary mb-2" />
            <p className="font-semibold">Multiplayer sync</p>
            <p className="text-sm text-muted-foreground">
              Works across phones, tablets, laptops
            </p>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-28 px-6 border-t border-white/10 relative z-10 text-white">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="text-4xl font-bold mb-10">How it works</h2>

          <div className="space-y-6 text-left">

            <div className="p-5 rounded-xl border bg-card text-card-foreground">
              <p className="font-semibold">1. Create a match</p>
              <p className="text-sm text-muted-foreground">
                Host generates a room code for players.
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-card text-card-foreground">
              <p className="font-semibold">2. Players join</p>
              <p className="text-sm text-muted-foreground">
                Join instantly using the shared code.
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-card text-card-foreground">
              <p className="font-semibold">3. Buzz & compete</p>
              <p className="text-sm text-muted-foreground">
                First buzz locks answer and updates scores live.
              </p>
            </div>

          </div>

          <Link
            to="/how-to-use"
            className="inline-block mt-10 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold"
          >
            More Information
          </Link>
        </div>
      </section>

      {/* SPECTATE */}
      <section className="py-28 px-6 border-t border-white/10 relative z-10 text-white">
        <div className="max-w-xl mx-auto text-center">

          <h2 className="text-3xl font-bold">Spectate live matches</h2>

          <p className="mt-3 text-white/70">
            Enter a room code to watch gameplay in real time.
          </p>

          <form
            onSubmit={goSpectate}
            className="mt-6 flex justify-center gap-2"
          >
            <input
              value={spectateCode}
              onChange={(e) =>
                setSpectateCode(e.target.value.toUpperCase())
              }
              maxLength={6}
              placeholder="CODE"
              className="rounded-md border bg-background text-foreground px-3 py-2 uppercase tracking-widest font-mono w-32 text-center"
            />

            <button
              type="submit"
              className="rounded-md bg-card text-card-foreground border px-4 py-2 font-semibold hover:bg-accent"
            >
              Watch
            </button>
          </form>

        </div>
      </section>

    </main>
  );
}
