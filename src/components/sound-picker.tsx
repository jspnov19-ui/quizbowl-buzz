import { useState } from "react";
import { Music2, Play } from "lucide-react";
import { SOUND_OPTIONS, useSoundChoice, useMuted, playBuzz, type SoundChoice } from "@/lib/sound";

export function SoundPicker({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { choice, setChoice } = useSoundChoice();
  const { muted } = useMuted();

  const current = SOUND_OPTIONS.find((s) => s.id === choice);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-md border bg-card hover:bg-accent flex items-center gap-1.5 text-sm"
        title="Choose buzzer sound"
        aria-label="Choose buzzer sound"
      >
        <Music2 className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">{current?.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 z-40 bg-popover text-popover-foreground border rounded-lg shadow-xl p-2">
            <div className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              Buzzer sound
            </div>
            <ul className="mt-1 space-y-0.5">
              {SOUND_OPTIONS.map((s) => (
                <li key={s.id}>
                  <div
                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                      choice === s.id ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <button
                      onClick={() => setChoice(s.id as SoundChoice)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </button>
                    <button
                      onClick={() => playBuzz(muted, s.id)}
                      className="p-1.5 rounded hover:bg-background"
                      title="Preview"
                      aria-label={`Preview ${s.label}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {muted && (
              <div className="mt-2 px-2 py-1.5 rounded bg-muted text-xs text-muted-foreground">
                Sound is muted — unmute to hear buzzes.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
