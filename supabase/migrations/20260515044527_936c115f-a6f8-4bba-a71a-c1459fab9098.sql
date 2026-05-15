-- Substitution events
CREATE TABLE public.substitution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  question_number integer NOT NULL,
  player_id uuid NOT NULL,
  team_id uuid,
  action text NOT NULL CHECK (action IN ('in','out')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.substitution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_substitution_events"
ON public.substitution_events
FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE public.substitution_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.substitution_events;

CREATE INDEX idx_sub_events_game ON public.substitution_events(game_id, question_number);

-- Protest fields on question_events
ALTER TABLE public.question_events
  ADD COLUMN protested boolean NOT NULL DEFAULT false,
  ADD COLUMN protest_note text;
