
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'teams',
  ADD COLUMN IF NOT EXISTS bonuses_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_total_seconds integer,
  ADD COLUMN IF NOT EXISTS timer_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS timer_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS timer_remaining_seconds integer;
