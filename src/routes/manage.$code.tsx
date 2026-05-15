import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameState } from "@/hooks/use-game-state";
import { playerStatLine, recalcScores, teamPPB, type Player, type QuestionEvent, type Team } from "@/lib/game";
import { downloadMatchReport } from "@/lib/match-report";
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
  Hand,
  DoorClosed,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/manage/$code")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Manage Game" }] }),
  component: ManagePage,
});

function ManagePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { game, teams, players, events, loading, notFound } = useGameState(code);
  const [copied, setCopied] = useState(false);
  const [bonusForTeam, setBonusForTeam] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<QuestionEvent | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const { muted, toggle: toggleMute } = useMuted();

  // Play sound when a new buzz happens
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
    if (!buzzed || !buzzedTeam || !game) return;
    await supabase.from("players").update({ score: buzzed.score + points }).eq("id", buzzed.id);
    await supabase.from("teams").update({ score: buzzedTeam.score + points }).eq("id", buzzedTeam.id);

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
      await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: true }).eq("id", game.id);
    } else {
      await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: false }).eq("id", game.id);
    }
  }

  async function applyBonus(points: number) {
    if (!bonusForTeam || !game) return;
    const t = teams.find((x) => x.id === bonusForTeam);
    if (t && points > 0) {
      await supabase.from("teams").update({ score: t.score + points }).eq("id", t.id);
    }
    if (pendingEventId) {
      await supabase.from("question_events").update({ bonus_points: points }).eq("id", pendingEventId);
    }
    setBonusForTeam(null);
    setPendingEventId(null);
    await supabase.from("games").update({ buzz_locked: false, buzzed_player_id: null }).eq("id", game.id);
  }

  async function nextQuestion() {
    setBonusForTeam(null);
    setPendingEventId(null);
    await supabase
      .from("games")
      .update({ current_question: game!.current_question + 1, buzzed_player_id: null, buzz_locked: false })
      .eq("id", game!.id);
  }

  async function clearBuzz() {
    await supabase.from("games").update({ buzzed_player_id: null, buzz_locked: false }).eq("id", game!.id);
  }

  async function movePlayer(player: Player, toTeamId: string | null, asSub: boolean) {
    await supabase.from("players").update({ team_id: toTeamId, is_substitute: asSub }).eq("id", player.id);
  }

  async function renameTeam(team: Team, name: string) {
    await supabase.from("teams").update({ name }).eq("id", team.id);
    setEditingTeam(null);
  }

  async function deleteEvent(id: string) {
    await supabase.from("question_events").delete().eq("id", id);
  }

  async function saveEditEvent(updates: { points?: number; player_id?: string | null }) {
    if (!editingEvent) return;
    await supabase.from("question_events").update(updates).eq("id", editingEvent.id);
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
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 mt-2">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current question</div>
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
            <div className="text-xl font-bold">{teams.find((t) => t.id === bonusForTeam)?.name}</div>
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
              {buzzed.name} <span className="opacity-80 text-base font-normal">· {buzzedTeam?.name}</span>
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
  // running team scores (chronological)
  const order = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const running: Record<string, { team1: number; team2: number }> = {};
  const totals: Record<string, number> = {};
  for (const t of teams) totals[t.id] = 0;
  for (const e of order) {
    if (e.team_id) {
      totals[e.team_id] = (totals[e.team_id] ?? 0) + (e.points ?? 0) + (e.bonus_points ?? 0);
    }
    const [t1, t2] = teams;
    running[e.id] = {
      team1: t1 ? totals[t1.id] ?? 0 : 0,
      team2: t2 ? totals[t2.id] ?? 0 : 0,
    };
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
                  <th className="text-left px-2 py-1.5">Player</th>
                  <th className="text-left px-2 py-1.5">Team</th>
                  <th className="text-right px-2 py-1.5">Pts</th>
                  <th className="text-right px-2 py-1.5">Bonus</th>
                  <th className="text-right px-2 py-1.5">Score</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {display.map((e) => {
                  const player = players.find((p) => p.id === e.player_id);
                  const team = teams.find((t) => t.id === e.team_id);
                  const r = running[e.id];
                  const t1 = teams[0];
                  const t2 = teams[1];
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="px-2 py-2 font-mono">#{e.question_number}</td>
                      <td className="px-2 py-2">{player?.name ?? "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{team?.name ?? "—"}</td>
                      <td
                        className={`px-2 py-2 text-right font-semibold ${
                          e.points > 0 ? "text-primary" : e.points < 0 ? "text-destructive" : ""
                        }`}
                      >
                        {e.points > 0 ? `+${e.points}` : e.points}
                      </td>
                      <td className="px-2 py-2 text-right text-muted-foreground">
                        {e.bonus_points === null || e.bonus_points === undefined ? "—" : `+${e.bonus_points}`}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">
                        <span style={{ color: "var(--team-1)" }}>{r?.team1 ?? 0}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span style={{ color: "var(--team-2)" }}>{r?.team2 ?? 0}</span>
                        {!t1 || !t2 ? null : null}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => onEdit(e)}
                          className="p-1.5 rounded hover:bg-accent"
                          title="Edit question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          title="Delete from history (does not change score)"
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
              Deleting or editing a question only affects the history & stats — team scores stay as they are.
            </p>
          </div>
        )}
      </div>
    </section>
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
  onSave: (updates: { points?: number; player_id?: string | null }) => void;
}) {
  const [points, setPoints] = useState<number>(event.points);
  const [playerId, setPlayerId] = useState<string | null>(event.player_id);
  const team = teams.find((t) => t.id === event.team_id);
  const teamPlayers = players.filter((p) => p.team_id === event.team_id);

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
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Points</div>
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

        <p className="text-xs text-muted-foreground mt-3">
          Editing only updates this row in history & stats. Team scores are not changed.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={() => onSave({ points, player_id: playerId })}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

