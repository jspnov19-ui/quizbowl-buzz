import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createTournament, type Tournament } from "@/lib/tournament";
import { ThemeToggle } from "@/components/theme-toggle";
import { Trophy, Plus, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/tournaments")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Tournament Hub" }] }),
  component: TournamentsList,
});

function TournamentsList() {
  const navigate = useNavigate();
  const [list, setList] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      setList((data ?? []) as Tournament[]);
      setLoading(false);
    })();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const t = await createTournament(name.trim());
      navigate({ to: "/tournaments/$slug/manage", params: { slug: t.slug } });
    } catch (err) {
      console.error(err);
      setError("Failed to create tournament");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-10">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" /> Tournament Hub
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Live tournaments</h1>
          <p className="mt-3 text-muted-foreground">
            Run a multi-round tournament: teams, phases, brackets, schedule, and live leaderboards.
          </p>
        </div>

        <form onSubmit={onCreate} className="mt-8 bg-card border rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tournament name"
            className="flex-1 rounded-lg border bg-background px-4 py-2.5"
            maxLength={80}
          />
          <button
            disabled={creating || !name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {creating ? "Creating…" : "Create tournament"}
          </button>
        </form>
        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

        <div className="mt-8">
          <h2 className="font-semibold mb-3">Your tournaments</h2>
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground text-sm italic">No tournaments yet.</div>
          ) : (
            <ul className="grid gap-3">
              {list.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/tournaments/$slug"
                    params={{ slug: t.slug }}
                    className="block bg-card border rounded-xl px-4 py-3 hover:bg-accent transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">/{t.slug} · {t.status}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
