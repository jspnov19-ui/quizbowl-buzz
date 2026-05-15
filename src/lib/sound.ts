import { useCallback, useEffect, useState } from "react";

const MUTED_KEY = "bb_muted";
const SOUND_KEY = "bb_sound";

export type SoundChoice = "classic" | "buzzer" | "bell" | "chime" | "beep" | "airhorn";

export const SOUND_OPTIONS: { id: SoundChoice; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Quick descending square buzz" },
  { id: "buzzer", label: "Game show buzzer", description: "Harsh low sawtooth" },
  { id: "bell", label: "Bell", description: "Bright sine ding" },
  { id: "chime", label: "Chime", description: "Two-tone chime" },
  { id: "beep", label: "Beep", description: "Short clean beep" },
  { id: "airhorn", label: "Air horn", description: "Loud rising blast" },
];

export function useMuted() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTED_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  }, [muted]);
  const toggle = useCallback(() => setMuted((m) => !m), []);
  return { muted, toggle };
}

export function useSoundChoice() {
  const [choice, setChoice] = useState<SoundChoice>(() => {
    if (typeof window === "undefined") return "classic";
    const v = localStorage.getItem(SOUND_KEY) as SoundChoice | null;
    return v && SOUND_OPTIONS.some((o) => o.id === v) ? v : "classic";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SOUND_KEY, choice);
  }, [choice]);
  return { choice, setChoice };
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/**
 * Browsers require a user gesture before audio can play. Call this once
 * (e.g. in a useEffect that registers a one-time pointerdown/keydown listener)
 * so subsequent buzzes triggered by realtime updates can play.
 */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function tone(opts: {
  type: OscillatorType;
  freqStart: number;
  freqEnd?: number;
  duration: number;
  gain?: number;
  delay?: number;
}) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const start = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freqStart, start);
  if (opts.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, start + opts.duration);
  }
  const peak = opts.gain ?? 0.25;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.05);
}

export function playBuzz(muted: boolean, choice: SoundChoice = "classic") {
  if (muted) return;
  switch (choice) {
    case "classic":
      tone({ type: "square", freqStart: 880, freqEnd: 440, duration: 0.25 });
      break;
    case "buzzer":
      tone({ type: "sawtooth", freqStart: 220, freqEnd: 160, duration: 0.45, gain: 0.3 });
      break;
    case "bell":
      tone({ type: "sine", freqStart: 1320, duration: 0.5, gain: 0.3 });
      tone({ type: "sine", freqStart: 1980, duration: 0.5, gain: 0.15 });
      break;
    case "chime":
      tone({ type: "sine", freqStart: 880, duration: 0.25, gain: 0.25 });
      tone({ type: "sine", freqStart: 1175, duration: 0.3, gain: 0.25, delay: 0.12 });
      break;
    case "beep":
      tone({ type: "sine", freqStart: 1000, duration: 0.18, gain: 0.3 });
      break;
    case "airhorn":
      tone({ type: "square", freqStart: 280, freqEnd: 520, duration: 0.55, gain: 0.32 });
      tone({ type: "sawtooth", freqStart: 140, freqEnd: 260, duration: 0.55, gain: 0.18 });
      break;
  }
}
