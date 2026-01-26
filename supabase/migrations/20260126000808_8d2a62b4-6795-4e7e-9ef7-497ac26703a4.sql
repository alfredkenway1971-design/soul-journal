-- Create daily tracking table for sleep and hydration
CREATE TABLE public.daily_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours DECIMAL(3,1),
  hydration_glasses INTEGER DEFAULT 0,
  hydration_goal INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_tracking
CREATE POLICY "Users can view their own tracking data" 
ON public.daily_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking data" 
ON public.daily_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking data" 
ON public.daily_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking data" 
ON public.daily_tracking 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create trigger for updating timestamps
CREATE TRIGGER update_daily_tracking_updated_at
BEFORE UPDATE ON public.daily_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);