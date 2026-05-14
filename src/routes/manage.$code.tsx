import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, teamPPB, type Player, type QuestionEvent, type Team } from "@/lib/game";
import { playBuzz, useMuted } from "@/lib/sound";
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
} from "lucide-react";

export const Route = createFileRoute("/manage/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Manage Game" }] }),
  component: ManagePage,
});

function ManagePage() {
  const { code } = Route.useParams();
  const { game, teams, players, events, loading, notFound } = useGameState(code);

  const [copied, setCopied] = useState(false);
  const [bonusForTeam, setBonusForTeam] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<QuestionEvent | null>(null);
  const { muted, toggle: toggleMute } = useMuted();

  const lastBuzzRef = useRef<string | null>(null);

  useEffect(() => {
    const id = game?.buzzed_player_id ?? null;
    if (id && id !== lastBuzzRef.current) playBuzz(muted);
    lastBuzzRef.current = id;
  }, [game?.buzzed_player_id, muted]);

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
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </main>
    );
  }

  const buzzed = players.find((p) => p.id === game.buzzed_player_id);
  const buzzedTeam = teams.find((t) => t.id === buzzed?.team_id);

  function joinUrl() {
    return `${window.location.origin}/join`;
  }

  async function copyCode() {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function award(points: number) {
    if (!buzzed || !buzzedTeam) return;

    await supabase.from("players")
      .update({ score: buzzed.score + points })
      .eq("id", buzzed.id);

    await supabase.from("teams")
      .update({ score: buzzedTeam.score + points })
      .eq("id", buzzedTeam.id);

    const { data: ev } = await supabase
      .from("question_events")
      .insert({
        game_id: game.id,
        question_number: game.current_question,
        player_id: buzzed.id,
        team_id: buzzedTeam.id,
        points,
      })
      .select()
      .single();

    if (points === 10 || points === 15) {
      setBonusForTeam(buzzedTeam.id);
      setPendingEventId(ev?.id ?? null);

      await supabase.from("games")
        .update({ buzzed_player_id: null, buzz_locked: true })
        .eq("id", game.id);
    } else {
      await supabase.from("games")
        .update({ buzzed_player_id: null, buzz_locked: false })
        .eq("id", game.id);
    }
  }

  async function applyBonus(points: number) {
    if (!bonusForTeam) return;

    const t = teams.find((x) => x.id === bonusForTeam);

    if (t && points > 0) {
      await supabase.from("teams")
        .update({ score: t.score + points })
        .eq("id", t.id);
    }

    if (pendingEventId) {
      await supabase.from("question_events")
        .update({ bonus_points: points })
        .eq("id", pendingEventId);
    }

    setBonusForTeam(null);
    setPendingEventId(null);

    await supabase.from("games")
      .update({ buzz_locked: false, buzzed_player_id: null })
      .eq("id", game.id);
  }

  async function nextQuestion() {
    setBonusForTeam(null);
    setPendingEventId(null);

    await supabase.from("games")
      .update({
        current_question: game.current_question + 1,
        buzzed_player_id: null,
        buzz_locked: false,
      })
      .eq("id", game.id);
  }

  async function clearBuzz() {
    await supabase.from("games")
      .update({ buzzed_player_id: null, buzz_locked: false })
      .eq("id", game.id);
  }

  async function movePlayer(player: Player, toTeamId: string | null, asSub: boolean) {
    await supabase.from("players")
      .update({ team_id: toTeamId, is_substitute: asSub })
      .eq("id", player.id);
  }

  async function renameTeam(team: Team, name: string) {
    await supabase.from("teams")
      .update({ name })
      .eq("id", team.id);

    setEditingTeam(null);
  }

  async function deleteEvent(id: string) {
    await supabase.from("question_events")
      .delete()
      .eq("id", id);
  }

  async function saveEditEvent(updates: { points?: number; player_id?: string | null }) {
    if (!editingEvent) return;

    await supabase.from("question_events")
      .update(updates)
      .eq("id", editingEvent.id);

    setEditingEvent(null);
  }

  const showBonus = bonusForTeam !== null;
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

          <span className="text-xs text-muted-foreground hidden sm:inline">
            at {joinUrl()}
          </span>

          <Link
            to="/watch/$code"
            params={{ code: game.code }}
            className="text-xs inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
          >
            <Eye className="w-4 h-4" /> Spectate
          </Link>

          <button
            onClick={toggleMute}
            className="p-2 rounded-md border bg-card hover:bg-accent"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 mt-2">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Current question
            </div>
            <div className="text-3xl font-bold">#{game.current_question}</div>
          </div>

          <button
            onClick={nextQuestion}
            className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 font-semibold flex items-center gap-2 hover:opacity-90"
          >
            Next question <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mt-4">
        {showBonus ? (
          <div className="bg-card border-2 border-primary rounded-2xl p-5 shadow-md">
            <div className="text-sm text-muted-foreground">Bonus for</div>
            <div className="text-xl font-bold">
              {teams.find((t) => t.id === bonusForTeam)?.name}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[0, 10, 20, 30].map((p) => (
                <button
                  key={p}
                  onClick={() => applyBonus(p)}
                  className="rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-semibold py-3"
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
              <span className="opacity-80 text-base font-normal">
                {" "}· {buzzedTeam?.name}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <ScoreBtn label="-5" onClick={() => award(-5)} variant="danger" />
              <ScoreBtn label="0" onClick={() => award(0)} variant="neutral" />
              <ScoreBtn label="+10" onClick={() => award(10)} variant="primary" />
              <ScoreBtn label="+15" onClick={() => award(15)} variant="primary" />
            </div>

            <button
              onClick={clearBuzz}
              className="mt-2 text-xs underline opacity-80 hover:opacity-100"
            >
              clear buzz
            </button>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-5 shadow-sm text-center text-muted-foreground">
            Waiting for a buzz…
          </div>
        )}
      </section>

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
                  <button
                    onClick={() => setEditingTeam(team.id)}
                    className="font-bold text-lg hover:text-primary text-left"
                  >
                    {team.name}
                  </button>
                )}

                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">{team.score}</div>
                  <div className="text-xs text-muted-foreground">
                    PPB {ppb === null ? "—" : ppb.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase text-muted-foreground">Playing</div>
                <ul className="space-y-1 mt-1">
                  {active.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      events={events}
                      otherTeam={otherTeam}
                      isSub={false}
                      onBench={() => movePlayer(p, p.team_id, true)}
                      onSwap={() => otherTeam && movePlayer(p, otherTeam.id, p.is_substitute)}
                    />
                  ))}
                </ul>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="text-xs uppercase text-muted-foreground">Substitutes</div>
                <ul className="space-y-1 mt-1">
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
              </div>
            </div>
          );
        })}
      </section>

      <HistoryPanel
        events={events}
        teams={teams}
        players={players}
        onDelete={deleteEvent}
        onEdit={(e) => setEditingEvent(e)}
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
    </main>
  );
}

/* ---------------- SCORE BUTTON ---------------- */

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
      ? "bg-primary text-white"
      : variant === "danger"
        ? "bg-red-500 text-white"
        : "bg-gray-400 text-white";

  return (
    <button onClick={onClick} className={`rounded-lg py-2 font-bold ${cls}`}>
      {label}
    </button>
  );
}

/* ---------------- PLAYER ROW ---------------- */

function PlayerRow({
  player,
  events,
  otherTeam,
  isSub,
  onBench,
  onSwap,
}: {
  player: Player;
  events: QuestionEvent[];
  otherTeam?: Team;
  isSub: boolean;
  onBench: () => void;
  onSwap: () => void;
}) {
  const { p15, p10, n5 } = playerStatLine(events, player.id);

  return (
    <li className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
      <div>
        <div className="font-medium">{player.name}</div>
        <div className="text-xs text-muted-foreground">
          {player.score} pts · {p15}/{p10}/{n5}
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={onBench}>
          {isSub ? <ChevronUp /> : <ChevronDown />}
        </button>

        {otherTeam && (
          <button onClick={onSwap}>
            <ArrowLeftRight />
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------------- HISTORY PANEL ---------------- */

function HistoryPanel({
  events,
  teams,
  players,
  onDelete,
  onEdit,
}: {
  events: QuestionEvent[];
  teams: Team[];
  players: Player[];
  onDelete: (id: string) => void;
  onEdit: (e: QuestionEvent) => void;
}) {
  const sorted = [...events].sort(
    (a, b) => a.created_at.localeCompare(b.created_at)
  );

  const totals: Record<string, number> = {};

  teams.forEach((t) => (totals[t.id] = 0));

  return (
    <section className="max-w-6xl mx-auto px-4 mt-6">
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="font-bold text-lg">History</h2>

        <div className="mt-3 space-y-2">
          {sorted.map((e) => {
            const p = players.find((x) => x.id === e.player_id);
            const t = teams.find((x) => x.id === e.team_id);

            return (
              <div
                key={e.id}
                className="flex justify-between border-b py-2 text-sm"
              >
                <div>
                  Q{e.question_number} · {p?.name} · {t?.name}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => onEdit(e)}>
                    <Pencil />
                  </button>
                  <button onClick={() => onDelete(e.id)}>
                    <Trash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- EDIT DIALOG ---------------- */

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
  onSave: (u: { points?: number; player_id?: string | null }) => void;
}) {
  const [points, setPoints] = useState(event.points);
  const [playerId, setPlayerId] = useState<string | null>(event.player_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl w-[400px]">
        <h3 className="font-bold mb-2">Edit Event</h3>

        <div className="space-y-2">
          {[ -5, 0, 10, 15 ].map((p) => (
            <button
              key={p}
              onClick={() => setPoints(p)}
              className="block w-full border rounded p-1"
            >
              {p}
            </button>
          ))}

          <select
            value={playerId ?? ""}
            onChange={(e) => setPlayerId(e.target.value || null)}
            className="w-full border p-1"
          >
            <option value="">No player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => onSave({ points, player_id: playerId })}
            className="bg-blue-500 text-white w-full py-2 rounded"
          >
            Save
          </button>

          <button onClick={onClose} className="w-full mt-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
