-- Batch A: Contextual metadata + granular mood
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS mood_score smallint,
  ADD COLUMN IF NOT EXISTS weather jsonb,
  ADD COLUMN IF NOT EXISTS location jsonb,
  ADD COLUMN IF NOT EXISTS time_of_day text,
  ADD COLUMN IF NOT EXISTS rich_content text;

ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_mood_score_range;
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_mood_score_range
  CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10));

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created
  ON public.journal_entries (user_id, created_at DESC);

-- Opt-in flag for location/weather capture
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS capture_context boolean NOT NULL DEFAULT false;