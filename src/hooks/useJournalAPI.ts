import { supabase } from "@/integrations/supabase/client";
import { getLanguageName, type AppLanguage } from "@/contexts/LanguageContext";
import { getVoiceProfiles, normalizeLang } from "@/lib/voiceProfiles";
import { invokeEnhance } from "@/lib/aiText";
import { smartTitleCase } from "@/lib/smartTitleCase";
import { blobToWav } from "@/lib/audioConvert";
import { getCachedAudio, cacheAudio, dataUrlToBlob } from "@/lib/audioCache";

export const useJournalAPI = (appLanguage?: AppLanguage) => {
  const langName = getLanguageName(appLanguage || "en");
  const transcribeAudio = async (
    audioBlob: Blob,
    languageOverride?: string
  ): Promise<{ text: string; detectedLanguage: string | null }> => {
    // Whisper server can't read webm — convert to WAV first (fallback: send as-is)
    let audioToSend = audioBlob;
    try {
      audioToSend = await blobToWav(audioBlob);
    } catch (e) {
      console.warn("webm->wav conversion failed, sending original:", e);
    }
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioToSend);
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

  const enhanceText = async (text: string, tone: string = 'natural', language?: string): Promise<string> => {
    const styleSamples = await fetchStyleSamples();
    // Use the entry's DETECTED language when available (e.g. a French voice
    // entry must stay French even if the app UI is English).
    const data = await invokeEnhance({ text, tone, language: language || langName, styleSamples });
    
    return data.enhancedText;
  };

  const expandText = async (text: string): Promise<string> => {
    const styleSamples = await fetchStyleSamples();
    const data = await invokeEnhance({ text, tone: 'expand', language: langName, styleSamples });
    return data.enhancedText;
  };

  const generateTitle = async (text: string, language?: string): Promise<string> => {
    const titleLang = language || langName;
    const data = await invokeEnhance({ 
      text, 
      tone: 'title',
      language: titleLang,
      customPrompt: `Generate a short, evocative title (3-6 words max) in ${titleLang} for this journal entry. Return ONLY the title, nothing else:` 
    });
    
    return smartTitleCase(data.enhancedText.replace(/["']/g, '').trim());
  };

  const detectMood = async (text: string): Promise<string> => {
    const data = await invokeEnhance({
      text,
      tone: 'mood-detect',
      customPrompt: 'Analyze the sentiment of this journal entry and respond with EXACTLY one word from this list: happy, good, fine, sad, unhappy. Nothing else, just the single word:',
    });

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

  const generateCoachingInsights = async (): Promise<number> => {
    const { data, error } = await supabase.functions.invoke("generate-coaching-insights", {
      body: { language: langName },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as any)?.insightsCount || 0;
  };

  // Feature: Smart Journaling Prompts — 3 personalized prompts grounded in
  // recent entries + goals, in the user's language and calibrated voice.
  const generateJournalingPrompts = async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Recent entries (last 7, keep the 5 non-empty)
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('enhanced_text, original_transcription')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7);
    const recentEntries = (entries || [])
      .map((r: any) => r.enhanced_text || r.original_transcription || '')
      .filter((t: string) => t && t.trim().length > 10)
      .slice(0, 5);

    // Goals
    const { data: profile } = await supabase
      .from('profiles')
      .select('goals')
      .eq('id', user.id)
      .maybeSingle();
    const goals = ((profile as any)?.goals || []).map((g: any) => g?.title || g).filter(Boolean) as string[];

    const styleSamples = await fetchStyleSamples();

    const response = await fetch("/api/journaling-prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user ? { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } : {}),
      },
      body: JSON.stringify({ recentEntries, goals, language: langName, styleSamples }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || "Prompts generation failed");
    if (data.error) throw new Error(data.error);
    return (data.prompts || []).slice(0, 3);
  };

  // Feature: Writing Block Breaker — a sentence starter in the user's voice
  const generateStarter = async (): Promise<string> => {
    const styleSamples = await fetchStyleSamples();
    const data = await invokeEnhance({
      text: "Generate one sentence starter now.",
      tone: 'natural',
      language: langName,
      styleSamples,
      customPrompt: `Write a single natural sentence starter (3-8 words) in ${langName} that the user can complete to begin a journal entry. Mirror their voice. Return ONLY the starter, no quotes, no punctuation at the end.`,
    });
    return (data.enhancedText || "").replace(/["']/g, "").trim();
  };

  // Feature: Writing Block Breaker — one word tied to their recent emotional state
  const generateOneWordPrompt = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('enhanced_text, original_transcription')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    const recent = (entries || [])
      .map((r: any) => r.enhanced_text || r.original_transcription || '')
      .filter((t: string) => t && t.trim().length > 5)
      .join(" ");
    const data = await invokeEnhance({
      text: recent || "No entries yet.",
      tone: 'natural',
      language: langName,
      customPrompt: `Based on this person's recent journal entries, give ONE single word (in ${langName}) that resonates with their current emotional state and could inspire them to write. Return ONLY that one word.`,
    });
    return (data.enhancedText || "").replace(/["']/g, "").trim();
  };

  // Feature: Goal Accountability — scan recent entries for goal mentions
  const scanGoalMentions = async (goals: string[], entries: string[]): Promise<{ goal: string; count: number; sample: string }[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || goals.length === 0) return [];

    const response = await fetch("/api/goal-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user ? { Authorization: "Bearer " + (await supabase.auth.getSession()).data.session?.access_token } : {}),
      },
      body: JSON.stringify({ goals, entries }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || "Goal scan failed");
    if (data.error) throw new Error(data.error);
    return Array.isArray(data.results) ? data.results : [];
  };

  // Feature: Gratitude Auto-Detection — scan entries for gratitude language
  const scanGratitude = async (entries: { id: string; text: string }[]): Promise<{ gratitude: string; category: string; entryIndexes: number[] }[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || entries.length === 0) return [];

    const response = await fetch("/api/gratitude-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user ? { Authorization: "Bearer " + (await supabase.auth.getSession()).data.session?.access_token } : {}),
      },
      body: JSON.stringify({ entries }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || "Gratitude scan failed");
    if (data.error) throw new Error(data.error);
    return Array.isArray(data.items) ? data.items : [];
  };

  const generateVoice = async (text: string, voiceId?: string, entryId?: string, textType?: 'entry' | 'reflection', langHint?: string): Promise<string> => {
    // Check cache first if entryId is provided
    // IMPORTANT: Only use voice-cache/ paths (AI-generated), never raw recordings
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || null;
    let entryLang: string | null = null;
    let playbackLang: string | null = null;
    let entryRow: any = null;
    if (entryId) {
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('audio_url, reflection_audio_url, detected_language, playback_language')
        .eq('id', entryId)
        .single();
      entryRow = entry;

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
      entryLang = normalizeLang((entry as any)?.detected_language);
      playbackLang = normalizeLang((entry as any)?.playback_language);
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
        // Per-language voice routing, keyed by the language of the text being read:
        // explicit hint (record-page preview) -> chosen playback language -> the
        // entry's detected language -> default profile -> legacy DB clone.
        // (playback_language matters most: the text is translated to it before TTS,
        // so the voice must match it — not the original spoken language.)
        const local = getVoiceProfiles();
        const routeLang = normalizeLang(langHint) || playbackLang || entryLang;
        if (routeLang && local.voices[routeLang]) {
          selectedVoiceId = local.voices[routeLang];
        } else if (entryLang && local.voices[entryLang]) {
          selectedVoiceId = local.voices[entryLang];
        } else if (local.defaultLang && local.voices[local.defaultLang]) {
          selectedVoiceId = local.voices[local.defaultLang];
        } else if (profile?.voice_clone_id) {
          selectedVoiceId = profile.voice_clone_id;
        }
        if ((profile as any)?.gender) {
          userGender = (profile as any).gender;
        }
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    // IndexedDB cache: replays of the same entry+voice are instant (no re-synthesis)
    const cacheKey = entryId ? `${entryId}:${textType || "entry"}:${selectedVoiceId || "default"}` : null;
    if (cacheKey) {
      const cached = await getCachedAudio(cacheKey);
      if (cached) {
        console.log("Using cached voice audio:", cacheKey);
        return cached;
      }
    }

    // Durable storage cache: if AI audio was already SAVED for this entry, serve
    // the saved file instantly — no re-synthesis, works on any device, survives
    // browser cache clears.
    if (entryId && userId) {
      const fileName = `${entryId}-${textType || 'entry'}.mp3`;
      const { data: existing } = await supabase.storage
        .from('journal-audio')
        .list(`voice-cache/${userId}`, { search: fileName, limit: 1 });
      if (existing && existing.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('journal-audio')
          .createSignedUrl(`voice-cache/${userId}/${fileName}`, 3600);
        if (signedData?.signedUrl) {
          console.log('Using saved AI voice from storage:', fileName);
          return signedData.signedUrl;
        }
      }
    }

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
    
    const dataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
    if (cacheKey) {
      cacheAudio(cacheKey, dataUrl).catch(() => {});
    }
    // Persist to Supabase storage so future visits (any device) load it instantly
    if (entryId && userId) {
      const fileName = `${entryId}-${textType || 'entry'}.mp3`;
      const storagePath = `voice-cache/${userId}/${fileName}`;
      try {
        const { error: upErr } = await supabase.storage
          .from('journal-audio')
          .upload(storagePath, dataUrlToBlob(dataUrl), { contentType: 'audio/mpeg', upsert: true });
        if (!upErr) {
          // Record the path on the entry — but never clobber a raw recording link
          const col = textType === 'reflection' ? 'reflection_audio_url' : 'audio_url';
          const current = textType === 'reflection' ? entryRow?.reflection_audio_url : entryRow?.audio_url;
          if (!current || String(current).startsWith('voice-cache/')) {
            await supabase
              .from('journal_entries')
              .update({ [col]: storagePath } as any)
              .eq('id', entryId);
          }
        }
      } catch (e) {
        console.warn('Failed to persist voice audio to storage:', e);
      }
    }
    return dataUrl;
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
    generateCoachingInsights,
    generateJournalingPrompts,
    generateStarter,
    generateOneWordPrompt,
    scanGoalMentions,
    scanGratitude,
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
