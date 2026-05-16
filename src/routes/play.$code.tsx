import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, teamPPB, type Player, type QuestionEvent, type Team } from "@/lib/game";
import { playBuzz, unlockAudio, useMuted, useSoundChoice } from "@/lib/sound";
import { Volume2, VolumeX, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundPicker } from "@/components/sound-picker";
import { MatchTimerDisplay } from "@/components/match-timer";
import { FinalResults } from "@/components/final-results";

export const Route = createFileRoute("/play/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Play" }] }),
  component: PlayPage,
});

function PlayPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { game, teams, players, events, subEvents, loading, notFound } = useGameState(code);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const { muted, toggle: toggleMute } = useMuted();
  const { choice: soundChoice } = useSoundChoice();

  useEffect(() => {
    const id = localStorage.getItem(`bb_player_${code.toUpperCase()}`);
    if (!id) {
      navigate({ to: "/join" });
      return;
    }
    setPlayerId(id);
  }, [code, navigate]);

  // Play sound on every new buzz
  const lastBuzzRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game?.buzzed_player_id ?? null;
    if (id && id !== lastBuzzRef.current) playBuzz(muted, soundChoice);
    lastBuzzRef.current = id;
  }, [game?.buzzed_player_id, muted, soundChoice]);

  const me = players.find((p) => p.id === playerId);

  const buzz = useCallback(async () => {
    if (!game || !me) return;
    if (game.buzz_locked || game.buzzed_player_id || game.round_ended) return;
    if (me.is_substitute) return;
    await supabase
      .from("games")
      .update({ buzzed_player_id: me.id, buzz_locked: true })
      .eq("id", game.id)
      .is("buzzed_player_id", null);
  }, [game, me]);

  // Spacebar to buzz + unlock audio on first interaction
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      unlockAudio();
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      buzz();
    }
    function onPointer() { unlockAudio(); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [buzz]);

  if (notFound || (game && game.status === "closed")) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-3xl font-bold">Room closed</h1>
          <p className="mt-2 text-muted-foreground">
            The moderator has ended this match. Thanks for playing!
          </p>
          <Link to="/" className="mt-6 inline-block rounded-lg bg-primary text-primary-foreground px-5 py-2.5 font-semibold">
            Back to home
          </Link>
        </div>
      </main>
    );
  }
  if (loading || !game || !playerId) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</main>;
  }

  const isFFA = game.mode === "ffa";
  const myTeam = !isFFA ? teams.find((t) => t.id === me?.team_id) : undefined;
  const otherTeam = !isFFA ? teams.find((t) => t.id !== me?.team_id) : undefined;

  const buzzedPlayer = players.find((p) => p.id === game.buzzed_player_id);
  const buzzedTeam = !isFFA ? teams.find((t) => t.id === buzzedPlayer?.team_id) : undefined;
  const someoneBuzzed = !!game.buzzed_player_id;
  const meBuzzed = game.buzzed_player_id === me?.id;
  const roundEnded = game.round_ended;
  const canBuzz = me && !me.is_substitute && !someoneBuzzed && !roundEnded;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent">
      <header className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="font-mono text-sm">
          Room <span className="font-bold text-primary tracking-widest">{game.code}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Question <span className="font-bold text-foreground">#{game.current_question}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
            {isFFA ? "FFA" : "Teams"}
          </span>
          <button
            onClick={toggleMute}
            className="p-2 rounded-md border bg-card hover:bg-accent"
            title={muted ? "Unmute buzz sound" : "Mute buzz sound"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <SoundPicker />
          <ThemeToggle />
        </div>
      </header>

      {!isFFA && game.timer_total_seconds && (
        <section className="max-w-4xl mx-auto px-4 mb-2">
          <MatchTimerDisplay game={game} />
        </section>
      )}

      {isFFA ? (
        <FfaTopScores players={players} meId={me?.id} />
      ) : (
        <section className="max-w-4xl mx-auto px-4 grid grid-cols-2 gap-4">
          <ScoreCard label="Your team" team={myTeam} events={events} accent="team-1" />
          <ScoreCard label="Opponent" team={otherTeam} events={events} accent="team-2" />
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 mt-8 flex flex-col items-center">
        <div className="text-sm text-muted-foreground mb-3">
          Playing as <span className="font-semibold text-foreground">{me?.name}</span>
          {me?.is_substitute && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted">substitute</span>}
        </div>

        <button
          onClick={buzz}
          disabled={!canBuzz}
          className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-full font-bold text-3xl transition-all ${
            someoneBuzzed
              ? meBuzzed
                ? "bg-buzz text-buzz-foreground scale-105"
                : "bg-muted text-muted-foreground"
              : canBuzz
                ? "bg-buzz text-buzz-foreground buzz-glow hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {someoneBuzzed ? (
            <div className="flex flex-col items-center">
              <Zap className="w-10 h-10 mb-2" />
              <span className="text-xl">{buzzedPlayer?.name}</span>
              <span className="text-sm font-normal opacity-80">
                {isFFA ? "buzzed in" : `buzzed in${buzzedTeam ? ` · ${buzzedTeam.name}` : ""}`}
              </span>
            </div>
          ) : roundEnded ? (
            <div className="flex flex-col items-center">
              <span className="text-xl">The round has ended</span>
              <span className="text-sm font-normal opacity-80"></span>
            </div>
          ) : me?.is_substitute ? (
            "On bench"
          ) : (
            "BUZZ"
          )}
        </button>

        {me && (
          <div className="mt-3 text-sm text-muted-foreground text-center">
            <div>
              Your score: <span className="font-semibold text-foreground">{me.score}</span>
            </div>
            <div className="font-mono text-xs mt-0.5">
              {(() => {
                const { p15, p10, n5 } = playerStatLine(events, me.id);
                return `${p15} / ${p10} / ${n5}`;
              })()}
              <span className="ml-1 text-muted-foreground/70">(15s / 10s / -5s)</span>
            </div>
          </div>
        )}
      </section>

      {isFFA ? (
        <FfaLeaderboard players={players} events={events} meId={me?.id} />
      ) : (
        <section className="max-w-4xl mx-auto px-4 mt-10 grid grid-cols-2 gap-4 pb-10">
          {teams.map((t) => (
            <Roster
              key={t.id}
              team={t}
              players={players.filter((p) => p.team_id === t.id)}
              events={events}
              meId={me?.id}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function ScoreCard({
  label,
  team,
  events,
  accent,
}: {
  label: string;
  team: Team | undefined;
  events: QuestionEvent[];
  accent: string;
}) {
  const ppb = team ? teamPPB(events, team.id) : null;
  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold truncate">{team?.name ?? "—"}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-4xl font-bold" style={{ color: `var(--${accent})` }}>
          {team?.score ?? 0}
        </div>
        <div className="text-xs text-muted-foreground">PPB {ppb === null ? "—" : ppb.toFixed(1)}</div>
      </div>
    </div>
  );
}

function FfaTopScores({ players, meId }: { players: Player[]; meId?: string }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const me = ranked.find((p) => p.id === meId);
  const myRank = me ? ranked.indexOf(me) + 1 : null;
  const leader = ranked[0];
  return (
    <section className="max-w-4xl mx-auto px-4 grid grid-cols-2 gap-4">
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">You</div>
        <div className="mt-1 font-semibold truncate">{me?.name ?? "—"}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-4xl font-bold text-primary">{me?.score ?? 0}</div>
          <div className="text-xs text-muted-foreground">
            {myRank ? `Rank #${myRank} of ${ranked.length}` : "—"}
          </div>
        </div>
      </div>
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Leader</div>
        <div className="mt-1 font-semibold truncate">{leader?.name ?? "—"}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-4xl font-bold" style={{ color: "var(--team-1)" }}>
            {leader?.score ?? 0}
          </div>
        </div>
      </div>
    </section>
  );
}

function FfaLeaderboard({
  players,
  events,
  meId,
}: {
  players: Player[];
  events: QuestionEvent[];
  meId?: string;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <section className="max-w-4xl mx-auto px-4 mt-10 pb-10">
      <div className="bg-card border rounded-2xl p-4">
        <div className="font-semibold text-sm mb-2">Leaderboard</div>
        {ranked.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No players yet</div>
        ) : (
          <ul className="divide-y">
            {ranked.map((p, i) => {
              const { p15, p10, n5 } = playerStatLine(events, p.id);
              return (
                <li
                  key={p.id}
                  className={`flex justify-between items-center py-2 px-2 rounded ${
                    p.id === meId ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-right font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm">{p.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-right text-sm">
                    {p.score}
                    <span className="ml-2 text-xs">
                      {p15} / {p10} / {n5}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Roster({
  team,
  players,
  events,
  meId,
}: {
  team: Team;
  players: Player[];
  events: QuestionEvent[];
  meId?: string;
}) {
  const active = players.filter((p) => !p.is_substitute);
  const subs = players.filter((p) => p.is_substitute);
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="font-semibold text-sm mb-2">{team.name}</div>
      <ul className="space-y-1">
        {active.map((p) => {
          const { p15, p10, n5 } = playerStatLine(events, p.id);
          return (
            <li
              key={p.id}
              className={`flex justify-between items-center text-sm py-1 px-2 rounded ${p.id === meId ? "bg-accent" : ""}`}
            >
              <span className="truncate">{p.name}</span>
              <span className="font-mono text-muted-foreground text-right">
                {p.score}
                <span className="ml-2 text-xs">
                  {p15} / {p10} / {n5}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {subs.length > 0 && (
        <>
          <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground border-t pt-2">Substitutes</div>
          <ul className="mt-1 space-y-1">
            {subs.map((p) => {
              const { p15, p10, n5 } = playerStatLine(events, p.id);
              return (
                <li
                  key={p.id}
                  className={`flex justify-between text-xs py-0.5 px-2 rounded text-muted-foreground ${p.id === meId ? "bg-accent" : ""}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono">
                    {p.score}
                    <span className="ml-2">
                      {p15} / {p10} / {n5}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
