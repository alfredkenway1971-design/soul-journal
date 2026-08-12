import { supabase } from "@/integrations/supabase/client";
import { getLanguageName, type AppLanguage } from "@/contexts/LanguageContext";

export const useJournalAPI = (appLanguage?: AppLanguage) => {
  const langName = getLanguageName(appLanguage || "en");
  const transcribeAudio = async (
    audioBlob: Blob,
    languageOverride?: string
  ): Promise<{ text: string; detectedLanguage: string | null }> => {
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);
    const base64Audio = await base64Promise;

    // NOTE: we intentionally do NOT send the app UI language. The transcript must
    // stay in the language actually spoken; translation happens later on demand.
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio: base64Audio, languageOverride },
    });

    if (error) {
      let message = error.message;
      try {
        const ctx = (error as any)?.context;
        if (ctx) {
          const body = await ctx.clone?.().json?.();
          if (body?.error) message = body.error;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);

    return { text: data.text, detectedLanguage: data.language ?? null };
  };


  const fetchStyleSamples = async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('journal_entries')
        .select('enhanced_text, original_transcription')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return (data || [])
        .map((r: any) => r.enhanced_text || r.original_transcription || '')
        .filter(Boolean);
    } catch (err) {
      console.error('fetchStyleSamples error:', err);
      return [];
    }
  };

  const enhanceText = async (text: string, tone: string = 'natural'): Promise<string> => {
    const styleSamples = await fetchStyleSamples();
    const { data, error } = await supabase.functions.invoke('enhance-text', {
      body: { text, tone, language: langName, styleSamples },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    return data.enhancedText;
  };

  const expandText = async (text: string): Promise<string> => {
    const styleSamples = await fetchStyleSamples();
    const { data, error } = await supabase.functions.invoke('enhance-text', {
      body: { text, tone: 'expand', language: langName, styleSamples },
    });
    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    return data.enhancedText;
  };

  const generateTitle = async (text: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('enhance-text', {
      body: { 
        text, 
        tone: 'title',
        customPrompt: 'Generate a short, evocative title (3-6 words max) for this journal entry. Return ONLY the title, nothing else:' 
      },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    return data.enhancedText.replace(/["']/g, '').trim();
  };

  const detectMood = async (text: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('enhance-text', {
      body: {
        text,
        tone: 'mood-detect',
        customPrompt: 'Analyze the sentiment of this journal entry and respond with EXACTLY one word from this list: happy, good, fine, sad, unhappy. Nothing else, just the single word:',
      },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);

    const mood = data.enhancedText.trim().toLowerCase();
    const validMoods = ['happy', 'good', 'fine', 'sad', 'unhappy'];
    return validMoods.includes(mood) ? mood : 'fine';
  };

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: { text, targetLanguage },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    return data.translatedText;
  };

  const generateVoice = async (text: string, voiceId?: string, entryId?: string, textType?: 'entry' | 'reflection'): Promise<string> => {
    // Check cache first if entryId is provided
    // IMPORTANT: Only use voice-cache/ paths (AI-generated), never raw recordings
    if (entryId) {
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('audio_url, reflection_audio_url')
        .eq('id', entryId)
        .single();

      const cachedPath = textType === 'reflection' 
        ? (entry as any)?.reflection_audio_url 
        : entry?.audio_url;

      if (cachedPath && cachedPath.startsWith('voice-cache/')) {
        console.log('Using cached AI voice from storage:', cachedPath);
        const { data: signedData } = await supabase.storage
          .from('journal-audio')
          .createSignedUrl(cachedPath, 3600);
        if (signedData?.signedUrl) {
          return signedData.signedUrl;
        }
      }
    }

    // Fetch user's voice clone ID and gender preference
    let selectedVoiceId = voiceId;
    let userGender = 'male';
    if (!selectedVoiceId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('voice_clone_id, gender')
          .eq('id', user.id)
          .single();
        if (profile?.voice_clone_id) {
          selectedVoiceId = profile.voice_clone_id;
        }
        if ((profile as any)?.gender) {
          userGender = (profile as any).gender;
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const response = await fetch('/api/generate-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ text, voiceId: selectedVoiceId, language: appLanguage || 'en', gender: userGender }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = { error: response.ok ? "Voice generation failed" : `Voice generation failed (${response.status})` };
    }
    if (!response.ok) throw new Error(data.error || 'Voice generation failed');
    if (data.error) throw new Error(data.error);
    
    return `data:audio/mpeg;base64,${data.audioContent}`;
  };

  const generateSoulReflection = async (entryText: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('goals, fears, strengths, worldview, soul_profile_summary')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase.functions.invoke('generate-soul-reflection', {
      body: {
        entryText,
        goals: profile?.goals || [],
        fears: (profile as any)?.fears || [],
        strengths: (profile as any)?.strengths || [],
        worldview: (profile as any)?.worldview || null,
        soulProfileSummary: (profile as any)?.soul_profile_summary || null,
        language: langName,
      },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);

    // Store mode as prefix: [MODE]reflection text
    const mode = data.mode || 'blend';
    return `[${mode.toUpperCase()}]${data.reflection}`;
  };

  const uploadAudio = async (audioBlob: Blob, userId: string): Promise<string> => {
    const fileName = `${userId}/${Date.now()}.webm`;
    
    const { data, error } = await supabase.storage
      .from('journal-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
      });

    if (error) throw new Error(error.message);
    
    return data.path;
  };

  const uploadPhoto = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('journal-photos')
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) throw new Error(error.message);
    
    return data.path;
  };

  const saveEntry = async (entry: {
    userId: string;
    title?: string;
    originalTranscription: string;
    enhancedText: string;
    mood: string;
    moodScore?: number | null;
    playbackLanguage: string;
    audioUrl?: string;
    richContent?: string | null;
    weather?: any;
    location?: any;
    timeOfDay?: string | null;
    durationSeconds?: number | null;
    detectedLanguage?: string | null;
  }) => {

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: entry.userId,
        title: entry.title,
        original_transcription: entry.originalTranscription,
        enhanced_text: entry.enhancedText,
        mood: entry.mood,
        mood_score: entry.moodScore ?? null,
        playback_language: entry.playbackLanguage,
        audio_url: entry.audioUrl,
        rich_content: entry.richContent ?? null,
        weather: entry.weather ?? null,
        location: entry.location ?? null,
        time_of_day: entry.timeOfDay ?? null,
        duration_seconds: entry.durationSeconds ?? null,
        detected_language: entry.detectedLanguage ?? null,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    return data;
  };

  const saveEntryMedia = async (entryId: string, mediaType: 'audio' | 'photo', storagePath: string) => {
    const { error } = await supabase
      .from('entry_media')
      .insert({
        entry_id: entryId,
        media_type: mediaType,
        storage_path: storagePath,
      });

    if (error) throw new Error(error.message);
  };

  const getEntries = async (userId: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    return data;
  };

  const getEntryMedia = async (entryId: string) => {
    const { data, error } = await supabase
      .from('entry_media')
      .select('*')
      .eq('entry_id', entryId);

    if (error) throw new Error(error.message);
    
    return data;
  };

  const getEntryById = async (entryId: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error) throw new Error(error.message);
    
    return data;
  };

  const deleteEntry = async (entryId: string) => {
    // First delete associated media
    const { error: mediaError } = await supabase
      .from('entry_media')
      .delete()
      .eq('entry_id', entryId);

    if (mediaError) throw new Error(mediaError.message);

    // Then delete the entry
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw new Error(error.message);
  };

  const getSignedUrl = async (bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  };

  return {
    transcribeAudio,
    enhanceText,
    expandText,
    generateTitle,
    detectMood,
    translateText,
    generateVoice,
    generateSoulReflection,
    uploadAudio,
    uploadPhoto,
    saveEntry,
    saveEntryMedia,
    getEntries,
    getEntryMedia,
    getEntryById,
    deleteEntry,
    getSignedUrl,
  };
};
