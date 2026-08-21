-- ═══════════════════════════════════════════════════════════════════════════
-- Soul Journal pricing update — subscriptions schema (web Stripe + mobile RevenueCat)
-- Additive + idempotent: safe on both Supabase projects (web: hxspzfdfyiuouneslkyq,
-- mobile: patudphotrjybhwayigs). New columns are added with IF NOT EXISTS so an
-- existing production table is extended, never rebuilt.
-- ═══════════════════════════════════════════════════════════════════════════

-- Subscriptions table (full spec shape; CREATE IF NOT EXISTS covers fresh DBs)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  revenuecat_app_user_id text,
  revenuecat_original_transaction_id text,
  plan_type text DEFAULT 'free' NOT NULL,
  tier text CHECK (tier IN ('free', 'monthly', 'yearly')),
  status text DEFAULT 'inactive' NOT NULL,
  platform text CHECK (platform IN ('web', 'ios', 'android')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  is_manual_grant boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Extend existing tables (no-op if columns already exist)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text,
  ADD COLUMN IF NOT EXISTS revenuecat_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('free', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('web', 'ios', 'android')),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- RLS (idempotent via pg_policies check)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Users can view their own subscription') THEN
    CREATE POLICY "Users can view their own subscription"
      ON public.subscriptions FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Export credits: paid $2.99 one-off PDF add-ons (increment by stripe-webhook)
CREATE TABLE IF NOT EXISTS public.export_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.export_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own export credits"
  ON public.export_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own export credits"
  ON public.export_credits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
