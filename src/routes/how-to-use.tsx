import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Zap, Users, Trophy, Eye } from "lucide-react";

export const Route = createFileRoute("/how-to-use")({
  head: () => ({
    meta: [
      { title: "Quibbol Buzz | How To Use" },
      {
        name: "description",
        content: "Learn how to use Quibbol Buzz for live quizbowl matches.",
      },
    ],
  }),
  component: HowToUse,
});

function HowToUse() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Quibbol Buzz
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            How To Use
          </h1>

          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            How to run a quizbowl match using quibbol buzz, with all the features.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Create a Game</h2>
            </div>

            <ol className="space-y-3 text-muted-foreground">
              <li>1. Click “Create a Game” on the home page.</li>
              <li>2. Enter team names and share the room code with players.</li>
              <li>3. Start the match and give points to players from the prompts.</li>
              <li>4. Click next question to go to the next question.</li>
            </ol>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Join a Game</h2>
            </div>

            <ol className="space-y-3 text-muted-foreground">
              <li>1. Click “Join a Game”.</li>
              <li>2. Enter the room code from the moderator.</li>
              <li>3. Moderator can switch your team and substitute players in and out.</li>
              <li>4. Use the buzzer during gameplay.</li>
            </ol>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Buzzing</h2>
            </div>

            <ul className="space-y-3 text-muted-foreground">
              <li>• The first buzz locks out other players.</li>
              <li>• Moderators can reset buzzing between questions.</li>
              <li>• Real-time updates sync instantly across devices.</li>
              <li>• Players and moderators can enable audio feedback for buzzes.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Spectating</h2>
            </div>

            <ul className="space-y-3 text-muted-foreground">
              <li>• Enter a room code in the spectate box.</li>
              <li>• Watch scores and buzzes live.</li>
              <li>• Spectators cannot interact with gameplay.</li>
              <li>• Great for coaches, staffers, and audiences.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
