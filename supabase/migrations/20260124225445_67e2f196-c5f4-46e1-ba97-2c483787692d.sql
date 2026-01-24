-- Add goals and interests columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN interests TEXT[] DEFAULT '{}';

-- Create coaching_insights table to store AI-generated insights
CREATE TABLE public.coaching_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'daily_tip', 'challenge', 'wellness_alert', 'goal_progress'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_goal TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on coaching_insights
ALTER TABLE public.coaching_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for coaching_insights
CREATE POLICY "Users can view their own insights"
ON public.coaching_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
ON public.coaching_insights
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
ON public.coaching_insights
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert insights (via edge function with service role)
CREATE POLICY "Service role can insert insights"
ON public.coaching_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);