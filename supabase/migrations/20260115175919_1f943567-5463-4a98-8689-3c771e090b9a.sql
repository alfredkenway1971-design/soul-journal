-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  pin_hash TEXT,
  voice_clone_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create journal_entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  original_transcription TEXT,
  enhanced_text TEXT,
  mood TEXT CHECK (mood IN ('happy', 'good', 'fine', 'sad', 'unhappy')),
  playback_language TEXT DEFAULT 'en',
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entry_media table
CREATE TABLE public.entry_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'photo')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_media ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Journal entries RLS policies
CREATE POLICY "Users can view their own entries" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" ON public.journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Entry media RLS policies
CREATE POLICY "Users can view their own entry media" ON public.entry_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries 
      WHERE journal_entries.id = entry_media.entry_id 
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own entry media" ON public.entry_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries 
      WHERE journal_entries.id = entry_media.entry_id 
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own entry media" ON public.entry_media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries 
      WHERE journal_entries.id = entry_media.entry_id 
      AND journal_entries.user_id = auth.uid()
    )
  );

-- Create trigger for profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('journal-audio', 'journal-audio', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('journal-photos', 'journal-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-clones', 'voice-clones', false);

-- Storage policies for journal-audio
CREATE POLICY "Users can view their own audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for journal-photos
CREATE POLICY "Users can view their own photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'journal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for voice-clones
CREATE POLICY "Users can view their own voice clones" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-clones' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own voice clones" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'voice-clones' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own voice clones" ON storage.objects
  FOR DELETE USING (bucket_id = 'voice-clones' AND auth.uid()::text = (storage.foldername(name))[1]);