-- Add reading and running tracking columns to daily_tracking
ALTER TABLE public.daily_tracking
ADD COLUMN IF NOT EXISTS reading_pages integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reading_goal integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS running_km numeric(4,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS running_goal numeric(4,1) DEFAULT 5;