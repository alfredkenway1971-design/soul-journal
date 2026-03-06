
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS fears text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS strengths text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS worldview text DEFAULT NULL;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS soul_reflection text DEFAULT NULL;
