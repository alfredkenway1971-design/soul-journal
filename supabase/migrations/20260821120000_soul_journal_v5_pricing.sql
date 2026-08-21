-- ═══════════════════════════════════════════════════════════════════════════
-- SOUL JOURNAL v5.0 PRICING — voice_credits + idempotent export_credits
-- 2026-08-21
--
-- voice_credits: paid voice-replay add-ons (0,50 $ each / 10 for 4,99 $).
--   Webhook grants +N on checkout.session.completed (metadata.type=voice_credit).
--   check-subscription returns the balance; clients add it to the 20/month cap.
-- export_credits: existing $2.99 PDF add-on (re-created IF NOT EXISTS so this
--   migration is safe to run on any environment, including a fresh one).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.voice_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.export_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_credits ENABLE ROW LEVEL SECURITY;

-- Users read their own credit balances (edge functions use the service role and
-- bypass RLS; this policy is for direct client reads if ever needed).
DROP POLICY IF EXISTS "voice_credits_select_own" ON public.voice_credits;
CREATE POLICY "voice_credits_select_own"
  ON public.voice_credits
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "export_credits_select_own" ON public.export_credits;
CREATE POLICY "export_credits_select_own"
  ON public.export_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: credits are only mutated by edge functions
-- with the service role (webhook grants, admin overrides).
