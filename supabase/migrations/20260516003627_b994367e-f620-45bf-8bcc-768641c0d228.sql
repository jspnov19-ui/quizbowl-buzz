
-- 1. Repair games table
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'teams',
  ADD COLUMN IF NOT EXISTS bonuses_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_total_seconds integer,
  ADD COLUMN IF NOT EXISTS timer_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS timer_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS timer_remaining_seconds integer;

-- 2. Repair question_events
ALTER TABLE public.question_events
  ADD COLUMN IF NOT EXISTS protested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS protest_note text;

-- 3. Create substitution_events
CREATE TABLE IF NOT EXISTS public.substitution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  question_number integer NOT NULL,
  player_id uuid NOT NULL,
  team_id uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.substitution_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_all_substitution_events ON public.substitution_events;
CREATE POLICY public_all_substitution_events ON public.substitution_events
  FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.substitution_events;

-- 4. Tournament hub tables
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'setup',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  ord integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phases_tournament ON public.tournament_phases(tournament_id);

CREATE TABLE IF NOT EXISTS public.tournament_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.tournament_phases(id) ON DELETE CASCADE,
  name text NOT NULL,
  ord integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brackets_phase ON public.tournament_brackets(phase_id);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  bracket_id uuid REFERENCES public.tournament_brackets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tteams_tournament ON public.tournament_teams(tournament_id);

CREATE TABLE IF NOT EXISTS public.tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tplayers_team ON public.tournament_players(tournament_team_id);

CREATE TABLE IF NOT EXISTS public.tournament_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  number integer NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trounds_tournament ON public.tournament_rounds(tournament_id);

CREATE TABLE IF NOT EXISTS public.tournament_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.tournament_rounds(id) ON DELETE SET NULL,
  phase_id uuid REFERENCES public.tournament_phases(id) ON DELETE SET NULL,
  bracket_id uuid REFERENCES public.tournament_brackets(id) ON DELETE SET NULL,
  team_a_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  team_b_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled',
  score_a integer,
  score_b integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tgames_tournament ON public.tournament_games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tgames_game ON public.tournament_games(game_id);

-- Enable RLS + public access (match existing app pattern)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_all_tournaments ON public.tournaments;
CREATE POLICY public_all_tournaments ON public.tournaments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_phases ON public.tournament_phases;
CREATE POLICY public_all_tournament_phases ON public.tournament_phases FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_brackets ON public.tournament_brackets;
CREATE POLICY public_all_tournament_brackets ON public.tournament_brackets FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_teams ON public.tournament_teams;
CREATE POLICY public_all_tournament_teams ON public.tournament_teams FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_players ON public.tournament_players;
CREATE POLICY public_all_tournament_players ON public.tournament_players FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_rounds ON public.tournament_rounds;
CREATE POLICY public_all_tournament_rounds ON public.tournament_rounds FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS public_all_tournament_games ON public.tournament_games;
CREATE POLICY public_all_tournament_games ON public.tournament_games FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_games;
