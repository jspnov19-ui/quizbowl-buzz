import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Render a stable placeholder on SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-md border bg-card hover:bg-accent ${className}`}
        aria-label="Toggle theme"
        suppressHydrationWarning
      >
        <Sun className="w-4 h-4 opacity-0" />
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-md border bg-card hover:bg-accent ${className}`}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
