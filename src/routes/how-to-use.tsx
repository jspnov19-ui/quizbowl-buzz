import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Zap, Users, Trophy, Eye, Flag, ArrowLeftRight, Keyboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/how-to-use")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | How To Use" },
      { name: "description", content: "Learn how to use Quibbol Buzz for live quizbowl matches." },
    ],
  }),
  component: HowToUse,
});

function HowToUse() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-12 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> Quibbol Buzz
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">How To Use</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything Quibbol Buzz can do — from buzzing to tournament pairings.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card icon={<Trophy className="w-6 h-6 text-primary" />} title="Create a Game">
            <li>1. Click "Create a Game" and pick Teams or Free-for-All mode.</li>
            <li>2. Share the room code with players (and optionally spectators).</li>
            <li>3. As moderator, award +15 / +10 / 0 / -5 on each buzz.</li>
            <li>4. Bonuses (0/10/20/30) are offered after a correct tossup.</li>
            <li>5. Optional match timer for team matches.</li>
          </Card>

          <Card icon={<Users className="w-6 h-6 text-primary" />} title="Join a Game">
            <li>1. Click "Join a Game" and enter the room code.</li>
            <li>2. The moderator can move you between teams or to the bench.</li>
            <li>3. Tap the BUZZ button — or press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Space</kbd> — to buzz in.</li>
          </Card>

          <Card icon={<Zap className="w-6 h-6 text-primary" />} title="Buzzing & Sounds">
            <li>• First buzz locks out other players in real time.</li>
            <li>• Spacebar buzzing works on the player page.</li>
            <li>• Pick a buzz sound (classic, bell, airhorn…) from the sound picker.</li>
            <li>• Mute toggle is available on every page.</li>
          </Card>

          <Card icon={<ArrowLeftRight className="w-6 h-6 text-primary" />} title="Substitutions">
            <li>• Move players between active and substitute positions any time.</li>
            <li>• Each sub in/out is logged against the current question number.</li>
            <li>• Subs appear in the question history and the match-report PDF.</li>
            <li>• Tossups Heard (TUH) and PP20TUH are computed from sub history.</li>
          </Card>

          <Card icon={<Flag className="w-6 h-6 text-destructive" />} title="Protests">
            <li>• Click the red flag in the question history to mark a question protested.</li>
            <li>• Add a short note describing the dispute.</li>
            <li>• Flagged questions show a red flag and the note in the PDF report.</li>
          </Card>

          <Card icon={<Eye className="w-6 h-6 text-primary" />} title="Spectating & Reports">
            <li>• Anyone with the room code can spectate live scores.</li>
            <li>• Moderator can download a full PDF match report any time.</li>
            <li>• Report includes per-team statline, per-player PP20TUH, subs, and protests.</li>
            <li>• FFA reports show the leaderboard plus per-player breakdowns.</li>
          </Card>

          <Card icon={<Trophy className="w-6 h-6 text-primary" />} title="Auto-Advance">
            <li>• Teams: after a bonus is awarded, the next question loads automatically.</li>
            <li>• FFA: after a +10 / +15 (with no bonus), the next question loads automatically.</li>
            <li>• You can still hit "Next question" manually at any time.</li>
          </Card>

          <Card icon={<Keyboard className="w-6 h-6 text-primary" />} title="Tournament Pairings">
            <li>• Visit the Tournament page from the home screen.</li>
            <li>• Enter team count, optional team names, and number of rounds.</li>
            <li>• Get a balanced round-robin schedule with byes handled.</li>
            <li>• Export the schedule as CSV.</li>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <Link to="/tournament" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold">
            Open Tournament Pairings →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">{children}</ul>
    </div>
  );
}
