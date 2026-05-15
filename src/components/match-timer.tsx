import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, getTimerRemaining, type Game } from "@/lib/game";

function useTick(active: boolean) {
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

export function MatchTimerDisplay({ game }: { game: Game }) {
  useTick(game.timer_status === "running");
  if (!game.timer_total_seconds) return null;
  const remaining = getTimerRemaining(game);
  const total = game.timer_total_seconds;
  const pct = total ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const danger = remaining <= 30 && remaining > 0;
  const expired = remaining === 0 && game.timer_status !== "idle";

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Timer className="w-3.5 h-3.5" />
          Match timer
        </div>
        <div className="text-xs text-muted-foreground capitalize">
          {expired ? "time up" : game.timer_status}
        </div>
      </div>
      <div
        className={`mt-1 font-mono font-bold tabular-nums text-4xl ${
          expired ? "text-destructive" : danger ? "text-destructive" : "text-foreground"
        }`}
      >
        {formatTime(remaining)}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${expired || danger ? "bg-destructive" : "bg-primary"} transition-[width] duration-300`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

export function MatchTimerControls({ game }: { game: Game }) {
  useTick(game.timer_status === "running");
  const [draftMinutes, setDraftMinutes] = useState<string>(
    game.timer_total_seconds ? String(Math.round(game.timer_total_seconds / 60)) : "10",
  );

  if (game.mode !== "teams") return null;

  const remaining = getTimerRemaining(game);

  async function setDuration() {
    const mins = Math.max(1, Math.min(180, Math.floor(Number(draftMinutes) || 10)));
    const total = mins * 60;
    await supabase
      .from("games")
      .update({
        timer_total_seconds: total,
        timer_remaining_seconds: total,
        timer_status: "idle",
        timer_started_at: null,
      })
      .eq("id", game.id);
  }

  async function start() {
    const total = game.timer_total_seconds ?? Math.max(1, Math.floor(Number(draftMinutes) || 10)) * 60;
    await supabase
      .from("games")
      .update({
        timer_total_seconds: total,
        timer_remaining_seconds: total,
        timer_status: "running",
        timer_started_at: new Date().toISOString(),
      })
      .eq("id", game.id);
  }

  async function pause() {
    await supabase
      .from("games")
      .update({
        timer_status: "paused",
        timer_remaining_seconds: remaining,
        timer_started_at: null,
      })
      .eq("id", game.id);
  }

  async function resume() {
    await supabase
      .from("games")
      .update({
        timer_status: "running",
        timer_started_at: new Date().toISOString(),
      })
      .eq("id", game.id);
  }

  async function restart() {
    if (!game.timer_total_seconds) return;
    await supabase
      .from("games")
      .update({
        timer_status: "running",
        timer_remaining_seconds: game.timer_total_seconds,
        timer_started_at: new Date().toISOString(),
      })
      .eq("id", game.id);
  }

  const hasTimer = !!game.timer_total_seconds;
  const status = game.timer_status;

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Timer className="w-3.5 h-3.5" /> Match timer
        </div>
        {hasTimer && (
          <div className="text-xs text-muted-foreground capitalize">{status}</div>
        )}
      </div>

      {hasTimer && (
        <div className="font-mono font-bold tabular-nums text-3xl mb-3">
          {formatTime(remaining)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="number"
            min={1}
            max={180}
            value={draftMinutes}
            onChange={(e) => setDraftMinutes(e.target.value)}
            className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-muted-foreground text-xs">min</span>
        </label>
        <button
          onClick={setDuration}
          className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
          title="Save duration"
        >
          Set
        </button>

        {status === "idle" && (
          <button
            onClick={start}
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold hover:opacity-90"
          >
            <Play className="w-3.5 h-3.5" /> Start
          </button>
        )}
        {status === "running" && (
          <button
            onClick={pause}
            className="inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-accent"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
        )}
        {status === "paused" && (
          <button
            onClick={resume}
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold hover:opacity-90"
          >
            <Play className="w-3.5 h-3.5" /> Continue
          </button>
        )}
        {hasTimer && (
          <button
            onClick={restart}
            className="inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-accent"
            title="Reset and start from full duration"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restart
          </button>
        )}
      </div>
    </div>
  );
}
