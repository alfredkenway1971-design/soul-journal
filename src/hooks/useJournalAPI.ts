import { supabase } from "@/integrations/supabase/client";
import { getLanguageName, type AppLanguage } from "@/contexts/LanguageContext";

export const useJournalAPI = (appLanguage?: AppLanguage) => {
  const langName = getLanguageName(appLanguage || "en");
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
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

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio: base64Audio, language: appLanguage || 'en' },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    return data.text;
  };

  const enhanceText = async (text: string, tone: string = 'natural'): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('enhance-text', {
      body: { text, tone, language: langName },
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

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: { text, targetLanguage },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    return data.translatedText;
  };

  const generateVoice = async (text: string, voiceId?: string): Promise<string> => {
    // Fetch user's voice clone ID if not provided
    let selectedVoiceId = voiceId;
    if (!selectedVoiceId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('voice_clone_id')
          .eq('id', user.id)
          .single();
        if (profile?.voice_clone_id) {
          selectedVoiceId = profile.voice_clone_id;
        }
      }
    }

    const { data, error } = await supabase.functions.invoke('generate-voice', {
      body: { text, voiceId: selectedVoiceId, language: appLanguage || 'en' },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    
    // Return audio URL from base64
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
    playbackLanguage: string;
    audioUrl?: string;
  }) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: entry.userId,
        title: entry.title,
        original_transcription: entry.originalTranscription,
        enhanced_text: entry.enhancedText,
        mood: entry.mood,
        playback_language: entry.playbackLanguage,
        audio_url: entry.audioUrl,
      })
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
    generateTitle,
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
