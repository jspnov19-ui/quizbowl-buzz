
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS round_ended boolean NOT NULL DEFAULT false;
