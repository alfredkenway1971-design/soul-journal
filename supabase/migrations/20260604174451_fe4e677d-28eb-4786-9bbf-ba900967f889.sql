ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_font text,
  ADD COLUMN IF NOT EXISTS app_font_size integer;