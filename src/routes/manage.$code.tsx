import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, recalcScores, teamPPB, type Player, type QuestionEvent, type SubstitutionEvent, type Team } from "@/lib/game";
import { downloadMatchReport } from "@/lib/match-report";
import { playBuzz, unlockAudio, useMuted, useSoundChoice } from "@/lib/sound";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundPicker } from "@/components/sound-picker";
import { MatchTimerControls } from "@/components/match-timer";
import {
  Copy,
  Check,
  ArrowRight,
  ArrowLeftRight,
  ChevronUp,
  ChevronDown,
  Zap,
  Volume2,
  VolumeX,
  Trash2,
  Pencil,
  Eye,
  X,
  Hand,
  DoorClosed,
  FileText,
  Flag,
} from "lucide-react";

export const Route = createFileRoute("/manage/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Manage Game" }] }),
  component: ManagePage,
});

function ManagePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { game, teams, players, events, subEvents, loading, notFound } = useGameState(code);
  const [copied, setCopied] = useState(false);
  const [bonusForTeam, setBonusForTeam] = useState<string | null>(null);
  const [bonusForPlayer, setBonusForPlayer] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<QuestionEvent | null>(null);
  const [protestingEvent, setProtestingEvent] = useState<QuestionEvent | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const { muted, toggle: toggleMute } = useMuted();
  const { choice: soundChoice } = useSoundChoice();

  // Play sound when a new buzz happens
  const lastBuzzRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game?.buzzed_player_id ?? null;
    if (id && id !== lastBuzzRef.current) playBuzz(muted, soundChoice);
    lastBuzzRef.current = id;
  }, [game?.buzzed_player_id, muted, soundChoice]);

  // Unlock audio on first user interaction (browsers gate AudioContext until then)
  useEffect(() => {
    function unlock() { unlockAudio(); }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);


  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Game not found</h1>
          <Link to="/" className="mt-2 inline-block text-primary">← Home</Link>
        </div>
      </main>
    );
  }
  if (loading || !game) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</main>;
  }

  const buzzed = players.find((p) => p.id === game.buzzed_player_id);
  const buzzedTeam = teams.find((t) => t.id === buzzed?.team_id);

  function joinUrl() {
    return `${window.location.origin}/join`;
  }

  async function copyCode() {
    await navigator.clipboard.writeText(game!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function award(points: number) {
    if (!buzzed || !game) return;
    const teamId = game.mode === "ffa" ? null : buzzedTeam?.id ?? null;
    if (game.mode !== "ffa" && !teamId) return;

    const { data: ev } = await supabase
      .from("question_events")
      .insert({
        game_id: game.id,
        question_number: game.current_question,
        player_id: buzzed.id,
        team_id: teamId,
        points,
      })
      .select()
      .single();

    const offerBonus =
      (points === 10 || points === 15) &&
      (game.mode === "teams" || game.bonuses_enabled);

    if (offerBonus) {
      if (game.mode === "ffa") setBonusForPlayer(buzzed.id);
      else setBonusForTeam(teamId);
      setPendingEventId(ev?.id ?? null);
      await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: true }).eq("id", game.id);
      await recalcScores(game.id);
    } else {
      await recalcScores(game.id);
      // FFA: a correct (10/15) without bonuses → auto advance.
      // Otherwise just clear buzz.
      if (game.mode === "ffa" && (points === 10 || points === 15)) {
        await advance(game.id, game.current_question + 1);
      } else {
        await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: false }).eq("id", game.id);
      }
    }
  }

  async function applyBonus(points: number) {
    if (!game) return;
    if (pendingEventId) {
      await supabase.from("question_events").update({ bonus_points: points }).eq("id", pendingEventId);
    }
    setBonusForTeam(null);
    setBonusForPlayer(null);
    setPendingEventId(null);
    await recalcScores(game.id);
    // Teams: auto-advance after bonus is answered.
    // FFA: also advance (the bonus belongs to the player who got the tossup).
    await advance(game.id, game.current_question + 1);
  }

  async function advance(gameId: string, nextQ: number) {
    await supabase
      .from("games")
      .update({
        current_question: nextQ,
        buzzed_player_id: null,
        buzz_locked: false,
        round_ended: false,
      })
      .eq("id", gameId);
  }

  async function toggleBonusesEnabled(enabled: boolean) {
    if (!game) return;
    await supabase.from("games").update({ bonuses_enabled: enabled }).eq("id", game.id);
  }

  async function nextQuestion() {
    setBonusForTeam(null);
    setPendingEventId(null);
    await advance(game!.id, game!.current_question + 1);
  }

  async function clearBuzz() {
    await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: false }).eq("id", game!.id);
  }

  async function endRound() {
    if (!game) return;
    setBonusForTeam(null);
    setPendingEventId(null);
    await supabase
      .from("games")
      .update({ round_ended: true, buzz_locked: true, buzzed_player_id: null })
      .eq("id", game.id);
  }

  async function closeRoom() {
    if (!game) return;
    await supabase.from("games").update({ status: "closed", buzz_locked: true, buzzed_player_id: null }).eq("id", game.id);
    setConfirmClose(false);
    navigate({ to: "/" });
  }

  async function movePlayer(player: Player, toTeamId: string | null, asSub: boolean) {
    if (!game) return;
    const wasSub = player.is_substitute;
    await supabase.from("players").update({ team_id: toTeamId, is_substitute: asSub }).eq("id", player.id);
    // Log a substitution event if the active/sub state actually changed.
    if (wasSub !== asSub) {
      await supabase.from("substitution_events").insert({
        game_id: game.id,
        question_number: game.current_question,
        player_id: player.id,
        team_id: toTeamId,
        action: asSub ? "out" : "in",
      });
    }
  }

  async function renameTeam(team: Team, name: string) {
    await supabase.from("teams").update({ name }).eq("id", team.id);
    setEditingTeam(null);
  }

  async function deleteEvent(id: string) {
    await supabase.from("question_events").delete().eq("id", id);
    if (game) await recalcScores(game.id);
  }

  async function saveEditEvent(updates: { points?: number; player_id?: string | null; bonus_points?: number | null }) {
    if (!editingEvent) return;
    await supabase.from("question_events").update(updates).eq("id", editingEvent.id);
    setEditingEvent(null);
    if (game) await recalcScores(game.id);
  }

  async function saveProtest(eventId: string, protested: boolean, note: string) {
    await supabase
      .from("question_events")
      .update({ protested, protest_note: protested ? (note || null) : null })
      .eq("id", eventId);
    setProtestingEvent(null);
  }

  function downloadReport() {
    if (!game) return;
    downloadMatchReport({ game, teams, players, events, subEvents });
  }

  const showBonus = bonusForTeam !== null || bonusForPlayer !== null;
  const bonusLabel =
    bonusForTeam
      ? teams.find((t) => t.id === bonusForTeam)?.name ?? ""
      : bonusForPlayer
        ? players.find((p) => p.id === bonusForPlayer)?.name ?? ""
        : "";
  const isFFA = game.mode === "ffa";

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-accent">
      <header className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Share code:</span>
          <button
            onClick={copyCode}
            className="font-mono text-2xl font-bold tracking-widest text-primary bg-card border-2 border-primary/20 px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-accent"
          >
            {game.code}
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-4 h-4" />}
          </button>
          <span className="text-xs text-muted-foreground hidden sm:inline">at {joinUrl()}</span>
          <Link
            to="/watch/$code"
            params={{ code: game.code }}
            className="text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
            title="Open spectator scoreboard"
          >
            <Eye className="w-4 h-4" /> Spectate
          </Link>
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
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
            {isFFA ? "Free for all" : "Teams"}
          </span>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 mt-2">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current question</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              #{game.current_question}
              {game.round_ended && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  round ended
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={endRound}
              disabled={game.round_ended}
              className="rounded-lg px-4 py-2.5 font-semibold flex items-center gap-2 border bg-card hover:bg-accent disabled:opacity-50"
              title="Disable buzzing for this question"
            >
              <Hand className="w-4 h-4" /> End round
            </button>
            <button
              onClick={downloadReport}
              className="rounded-lg px-4 py-2.5 font-semibold flex items-center gap-2 border bg-card hover:bg-accent"
              title="Download match report PDF (moderator only)"
            >
              <FileText className="w-4 h-4" /> Report PDF
            </button>
            <button
              onClick={() => setConfirmClose(true)}
              className="rounded-lg px-4 py-2.5 font-semibold flex items-center gap-2 border border-destructive text-destructive hover:bg-destructive/10"
              title="Permanently close this match"
            >
              <DoorClosed className="w-4 h-4" /> Close room
            </button>
            <button
              onClick={nextQuestion}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-semibold flex items-center gap-2 hover:opacity-90"
            >
              Next question <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-4 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {showBonus ? (
            <div className="bg-card border-2 border-primary rounded-2xl p-5 shadow-md">
              <div className="text-sm text-muted-foreground">Bonus for</div>
              <div className="text-xl font-bold">{bonusLabel}</div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[0, 10, 20, 30].map((p) => (
                  <button
                    key={p}
                    onClick={() => applyBonus(p)}
                    className="rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-semibold py-3 transition-colors"
                  >
                    +{p}
                  </button>
                ))}
              </div>
            </div>
          ) : buzzed ? (
            <div className="bg-buzz text-buzz-foreground rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Zap className="w-4 h-4" /> Buzzed in
              </div>
              <div className="text-2xl font-bold">
                {buzzed.name}
                {!isFFA && buzzedTeam && (
                  <span className="opacity-80 text-base font-normal"> · {buzzedTeam.name}</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <ScoreBtn label="-5" onClick={() => award(-5)} variant="danger" />
                <ScoreBtn label="0" onClick={() => award(0)} variant="neutral" />
                <ScoreBtn label="+10" onClick={() => award(10)} variant="primary" />
                <ScoreBtn label="+15" onClick={() => award(15)} variant="primary" />
              </div>
              <button onClick={clearBuzz} className="mt-2 text-xs underline opacity-80 hover:opacity-100">
                clear buzz
              </button>
            </div>
          ) : (
            <div className="bg-card border rounded-2xl p-5 shadow-sm text-center text-muted-foreground">
              Waiting for a buzz…
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!isFFA && <MatchTimerControls game={game} />}
          {isFFA && (
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Free-for-all settings
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={game.bonuses_enabled}
                  onChange={(e) => toggleBonusesEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="font-medium">Enable bonuses</span>
                  <span className="block text-xs text-muted-foreground">
                    After a +10/+15, award follow-up bonus points to the player.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      {isFFA ? (
        <FfaRoster players={players} events={events} />
      ) : (
        <section className="max-w-6xl mx-auto px-4 mt-6 grid md:grid-cols-2 gap-4">
          {teams.map((team) => {
            const teamPlayers = players.filter((p) => p.team_id === team.id);
            const active = teamPlayers.filter((p) => !p.is_substitute);
            const subs = teamPlayers.filter((p) => p.is_substitute);
            const otherTeam = teams.find((t) => t.id !== team.id);
            const ppb = teamPPB(events, team.id);

            return (
              <div key={team.id} className="bg-card border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  {editingTeam === team.id ? (
                    <input
                      autoFocus
                      defaultValue={team.name}
                      onBlur={(e) => renameTeam(team, e.target.value || team.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameTeam(team, (e.target as HTMLInputElement).value || team.name);
                        if (e.key === "Escape") setEditingTeam(null);
                      }}
                      className="font-bold text-lg bg-background border rounded px-2 py-1"
                    />
                  ) : (
                    <button onClick={() => setEditingTeam(team.id)} className="font-bold text-lg hover:text-primary text-left">
                      {team.name}
                    </button>
                  )}
                  <div className="flex items-baseline gap-2">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: team.side === 1 ? "var(--team-1)" : "var(--team-2)" }}
                    >
                      {team.score}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      PPB {ppb === null ? "—" : ppb.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Playing</div>
                  {active.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic py-1">No active players</div>
                  ) : (
                    <ul className="space-y-1">
                      {active.map((p) => (
                        <PlayerRow
                          key={p.id}
                          player={p}
                          events={events}
                          otherTeam={otherTeam}
                          onBench={() => movePlayer(p, p.team_id, true)}
                          onSwap={() => otherTeam && movePlayer(p, otherTeam.id, p.is_substitute)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 border-t pt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Substitutes</div>
                  {subs.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic py-1">No subs</div>
                  ) : (
                    <ul className="space-y-1">
                      {subs.map((p) => (
                        <PlayerRow
                          key={p.id}
                          player={p}
                          events={events}
                          otherTeam={otherTeam}
                          isSub
                          onBench={() => movePlayer(p, p.team_id, false)}
                          onSwap={() => otherTeam && movePlayer(p, otherTeam.id, p.is_substitute)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <HistoryPanel
        events={events}
        subEvents={subEvents}
        teams={teams}
        players={players}
        onDelete={deleteEvent}
        onEdit={(e) => setEditingEvent(e)}
        onProtest={(e) => setProtestingEvent(e)}
      />

      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          players={players}
          teams={teams}
          onClose={() => setEditingEvent(null)}
          onSave={saveEditEvent}
        />
      )}

      {protestingEvent && (
        <ProtestDialog
          event={protestingEvent}
          onClose={() => setProtestingEvent(null)}
          onSave={(protested, note) => saveProtest(protestingEvent.id, protested, note)}
        />
      )}

      {confirmClose && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setConfirmClose(false)}>
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Close room?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to close this room? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmClose(false)} className="px-4 py-2 rounded-lg border hover:bg-accent">
                Cancel
              </button>
              <button
                onClick={closeRoom}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:opacity-90"
              >
                Confirm close room
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-10" />
    </main>
  );
}

function ScoreBtn({
  label,
  onClick,
  variant,
}: {
  label: string;
  onClick: () => void;
  variant: "primary" | "neutral" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "bg-buzz-foreground text-buzz hover:opacity-90"
      : variant === "danger"
        ? "bg-destructive text-destructive-foreground hover:opacity-90"
        : "bg-buzz-foreground/30 text-buzz-foreground hover:bg-buzz-foreground/50";
  return (
    <button onClick={onClick} className={`rounded-lg font-bold text-lg py-3 ${cls}`}>
      {label}
    </button>
  );
}

function PlayerRow({
  player,
  events,
  otherTeam,
  isSub = false,
  onBench,
  onSwap,
}: {
  player: Player;
  events: QuestionEvent[];
  otherTeam?: Team;
  isSub?: boolean;
  onBench: () => void;
  onSwap: () => void;
}) {
  const { p15, p10, n5 } = playerStatLine(events, player.id);
  return (
    <li className="flex items-center justify-between gap-2 bg-muted/50 hover:bg-muted rounded-lg px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{player.name}</div>
        <div className="text-xs text-muted-foreground">
          score {player.score}
          <span className="ml-2 font-mono">
            {p15} / {p10} / {n5}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onBench}
          title={isSub ? "Move to playing" : "Move to bench"}
          className="p-1.5 rounded hover:bg-background"
        >
          {isSub ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {otherTeam && (
          <button onClick={onSwap} title={`Move to ${otherTeam.name}`} className="p-1.5 rounded hover:bg-background">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function HistoryPanel({
  events,
  subEvents,
  teams,
  players,
  onDelete,
  onEdit,
  onProtest,
}: {
  events: QuestionEvent[];
  subEvents: SubstitutionEvent[];
  teams: Team[];
  players: Player[];
  onDelete: (id: string) => void;
  onEdit: (e: QuestionEvent) => void;
  onProtest: (e: QuestionEvent) => void;
}) {
  type Row =
    | { kind: "q"; e: QuestionEvent; ts: string; q: number }
    | { kind: "sub"; s: SubstitutionEvent; ts: string; q: number };
  const order: Row[] = [
    ...events.map((e): Row => ({ kind: "q", e, ts: e.created_at, q: e.question_number })),
    ...subEvents.map((s): Row => ({ kind: "sub", s, ts: s.created_at, q: s.question_number })),
  ].sort((a, b) => (a.q - b.q) || a.ts.localeCompare(b.ts));

  const running: Record<string, { team1: number; team2: number }> = {};
  const totals: Record<string, number> = {};
  for (const t of teams) totals[t.id] = 0;
  for (const r of order) {
    if (r.kind === "q") {
      const e = r.e;
      if (e.team_id) totals[e.team_id] = (totals[e.team_id] ?? 0) + (e.points ?? 0) + (e.bonus_points ?? 0);
      const [t1, t2] = teams;
      running[e.id] = {
        team1: t1 ? totals[t1.id] ?? 0 : 0,
        team2: t2 ? totals[t2.id] ?? 0 : 0,
      };
    }
  }
  const display = [...order].reverse();

  return (
    <section className="max-w-6xl mx-auto px-4 mt-6">
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Question history</h2>
          <span className="text-xs text-muted-foreground">{events.length} questions answered</span>
        </div>
        {display.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No questions answered yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-1.5">Q</th>
                  <th className="text-left px-2 py-1.5">Player / Event</th>
                  <th className="text-left px-2 py-1.5">Team</th>
                  <th className="text-right px-2 py-1.5">Pts</th>
                  <th className="text-right px-2 py-1.5">Bonus</th>
                  <th className="text-right px-2 py-1.5">Score</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {display.map((row) => {
                  if (row.kind === "sub") {
                    const player = players.find((p) => p.id === row.s.player_id);
                    const team = teams.find((t) => t.id === row.s.team_id);
                    return (
                      <tr key={row.s.id} className="border-t bg-muted/30 italic text-muted-foreground">
                        <td className="px-2 py-1.5 font-mono">#{row.q}</td>
                        <td className="px-2 py-1.5" colSpan={2}>
                          ↺ {player?.name ?? "—"} subbed {row.s.action}
                          {team ? ` · ${team.name}` : ""}
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    );
                  }
                  const e = row.e;
                  const player = players.find((p) => p.id === e.player_id);
                  const team = teams.find((t) => t.id === e.team_id);
                  const r = running[e.id];
                  return (
                    <tr key={e.id} className={`border-t ${e.protested ? "bg-destructive/5" : ""}`}>
                      <td className="px-2 py-2 font-mono">#{e.question_number}</td>
                      <td className="px-2 py-2">
                        {e.protested && (
                          <span title={e.protest_note ?? "Protested"} className="inline-block mr-1 align-middle">
                            <Flag className="inline w-3.5 h-3.5 text-destructive" />
                          </span>
                        )}
                        {player?.name ?? "—"}
                        {e.protested && e.protest_note && (
                          <div className="text-xs text-destructive italic mt-0.5">{e.protest_note}</div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{team?.name ?? "—"}</td>
                      <td className={`px-2 py-2 text-right font-semibold ${e.points > 0 ? "text-primary" : e.points < 0 ? "text-destructive" : ""}`}>
                        {e.points > 0 ? `+${e.points}` : e.points}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {e.bonus_points === null || e.bonus_points === undefined ? "—" : `+${e.bonus_points}`}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">
                        <span style={{ color: "var(--team-1)" }}>{r?.team1 ?? 0}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span style={{ color: "var(--team-2)" }}>{r?.team2 ?? 0}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => onProtest(e)}
                          className={`p-1.5 rounded hover:bg-destructive/10 ${e.protested ? "text-destructive" : "text-muted-foreground"}`}
                          title={e.protested ? "Edit / clear protest" : "Mark as protested"}
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onEdit(e)} className="p-1.5 rounded hover:bg-accent" title="Edit question">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          title="Delete from history (recalculates team scores)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground px-2 mt-2">
              Edits, protests, deletions and substitutions all appear in the match report PDF.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProtestDialog({
  event,
  onClose,
  onSave,
}: {
  event: QuestionEvent;
  onClose: () => void;
  onSave: (protested: boolean, note: string) => void;
}) {
  const [note, setNote] = useState(event.protest_note ?? "");
  const [protested, setProtested] = useState(event.protested);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" /> Protest Q#{event.question_number}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={protested} onChange={(e) => setProtested(e.target.checked)} />
          <span>Mark this question as protested</span>
        </label>
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Note (shown in match report)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={!protested}
            rows={3}
            placeholder="e.g. Disputed answer wording — under review"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-accent">Cancel</button>
          <button
            onClick={() => onSave(protested, note)}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEventDialog({
  event,
  players,
  teams,
  onClose,
  onSave,
}: {
  event: QuestionEvent;
  players: Player[];
  teams: Team[];
  onClose: () => void;
  onSave: (updates: { points?: number; player_id?: string | null; bonus_points?: number | null }) => void;
}) {
  const [points, setPoints] = useState<number>(event.points);
  const [playerId, setPlayerId] = useState<string | null>(event.player_id);
  const [bonusEnabled, setBonusEnabled] = useState<boolean>(
    event.bonus_points !== null && event.bonus_points !== undefined,
  );
  const [bonusPoints, setBonusPoints] = useState<number>(event.bonus_points ?? 0);
  const team = teams.find((t) => t.id === event.team_id);
  // In FFA, team_id is null on events; show all players. Otherwise filter to that team's players.
  const teamPlayers = event.team_id
    ? players.filter((p) => p.team_id === event.team_id)
    : players;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card border rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit question #{event.question_number}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tossup points</div>
          <div className="grid grid-cols-4 gap-2">
            {[-5, 0, 10, 15].map((p) => (
              <button
                key={p}
                onClick={() => setPoints(p)}
                className={`rounded-lg py-2 font-semibold border ${
                  points === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {p > 0 ? `+${p}` : p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Who got it correct {team ? `(${team.name})` : ""}
          </div>
          <select
            value={playerId ?? ""}
            onChange={(e) => setPlayerId(e.target.value || null)}
            className="w-full rounded-lg border bg-background px-3 py-2"
          >
            <option value="">— No one —</option>
            {teamPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Bonus points</div>
            <label className="text-xs flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={bonusEnabled}
                onChange={(e) => setBonusEnabled(e.target.checked)}
              />
              awarded
            </label>
          </div>
          <input
            type="number"
            value={bonusEnabled ? bonusPoints : ""}
            disabled={!bonusEnabled}
            onChange={(e) => setBonusPoints(Number(e.target.value) || 0)}
            min={0}
            step={5}
            placeholder="No bonus"
            className="w-full rounded-lg border bg-background px-3 py-2 disabled:opacity-50"
          />
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Saving recalculates team scores from the full question history.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                points,
                player_id: playerId,
                bonus_points: bonusEnabled ? bonusPoints : null,
              })
            }
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FfaRoster({ players, events }: { players: Player[]; events: QuestionEvent[] }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <section className="max-w-6xl mx-auto px-4 mt-6">
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Players</h2>
          <span className="text-xs text-muted-foreground">{players.length} joined</span>
        </div>
        {ranked.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Waiting for players to join…</div>
        ) : (
          <ul className="divide-y">
            {ranked.map((p, i) => {
              const { p15, p10, n5 } = playerStatLine(events, p.id);
              return (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-right font-mono text-sm text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium truncate">{p.name}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {p15} / {p10} / {n5}
                    </span>
                    <span className="font-bold text-lg" style={{ color: "var(--primary)" }}>
                      {p.score}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

