import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, Trash2, Volume2, ChevronDown, ChevronUp, Pencil, Check, X, Sparkles, Heart, Flame, Blend, ListTree } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTitleCase } from "@/hooks/useTitleCase";
import { hasVoiceForLanguage, normalizeLang } from "@/lib/voiceProfiles";
import {
  useSubscription,
  STRIPE_IDS,
  VOICE_REPLAY_PRICE,
  VOICE_REPLAY_BUNDLE_PRICE,
  VOICE_REPLAY_BUNDLE_SIZE,
} from "@/contexts/SubscriptionContext";
import { getReplaysUsed, incrementReplaysUsed } from "@/lib/voiceReplayQuota";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import RelatedEntriesCard from "@/components/RelatedEntriesCard";
import type { Mood } from "@/components/MoodSelector";
import { dirFor } from "@/lib/textDirection";
import { removeCachedEntryAudio } from "@/lib/audioCache";
import {
  AlertDialog,

  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const moodEmojis: Record<Mood, string> = {
  happy: "😄",
  good: "😊",
  fine: "😐",
  sad: "😢",
  unhappy: "😔",
};

interface EntryData {
  id: string;
  title?: string | null;
  enhanced_text: string | null;
  detected_language?: string | null;
  original_transcription: string | null;
  mood: string | null;
  playback_language: string | null;
  created_at: string;
  audio_url?: string | null;
  soul_reflection?: string | null;
}

interface MediaData {
  id: string;
  media_type: string;
  storage_path: string;
}

const EntryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const titleCase = useTitleCase();
  const api = useJournalAPI(language);
  const { isPremium, limits, voiceCredits } = useSubscription();
  
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [media, setMedia] = useState<MediaData[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [genSeconds, setGenSeconds] = useState(0);
  const [promptLang, setPromptLang] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [isSavingBody, setIsSavingBody] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showReplayUpsell, setShowReplayUpsell] = useState(false);
  const [buyingReplays, setBuyingReplays] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // v5 voice strategy: replay (cloned voice) is Premium-only, capped at 20/month
  // + paid voice credits. Free tier gets NO voice replay (native STT entry only).
  const canUseReplay = (): boolean => {
    if (!isPremium) return false;
    const allowance = limits.voiceReplaysPerMonth;
    return getReplaysUsed() < allowance + voiceCredits;
  };

  const buyReplays = async (bundle: boolean) => {
    setBuyingReplays(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: bundle ? STRIPE_IDS.voiceBundle : STRIPE_IDS.voiceCredit,
          mode: "payment",
          lang: localStorage.getItem("app-language") || "en",
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        setShowReplayUpsell(false);
      } else {
        toast({
          title: t("common.error"),
          description: data?.error ?? "Checkout error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error buying replays:", error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Checkout error",
        variant: "destructive",
      });
    } finally {
      setBuyingReplays(false);
    }
  };

  useEffect(() => {
    const fetchEntry = async () => {
      if (!id || !user) return;
      
      try {
        const entryData = await api.getEntryById(id);
        setEntry(entryData);
        
        const mediaData = await api.getEntryMedia(id);
        setMedia(mediaData);
        
        // Get signed URLs for photos
        const photos = mediaData.filter(m => m.media_type === 'photo');
        const urls = await Promise.all(
          photos.map(p => api.getSignedUrl('journal-photos', p.storage_path))
        );
        setPhotoUrls(urls.filter(Boolean) as string[]);
      } catch (error) {
        console.error('Error fetching entry:', error);
        toast({
          title: t("common.error"),
          description: t("entry.loadFailed"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntry();
  }, [id, user]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await api.deleteEntry(id);
      toast({
        title: t("entry.deleted"),
        description: t("entry.deletedDesc"),
      });
      navigate("/");
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: t("common.error"),
        description: t("entry.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(entry?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!id || !editedTitle.trim()) return;

    const cleanTitle = titleCase(editedTitle.trim());
    setIsSavingTitle(true);
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ title: cleanTitle })
        .eq('id', id);
      
      if (error) throw error;
      
      setEntry(prev => prev ? { ...prev, title: cleanTitle } : null);
      setIsEditingTitle(false);
      toast({
        title: t("entry.titleUpdated"),
        description: t("entry.titleUpdatedDesc"),
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: t("common.error"),
        description: t("entry.titleFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const handleStartEditBody = () => {
    setEditedBody(entry?.enhanced_text || entry?.original_transcription || "");
    setIsEditingBody(true);
  };

  const handleCancelEditBody = () => {
    setIsEditingBody(false);
    setEditedBody("");
  };

  // Edited/enhanced text invalidates the cached voice for this entry, so
  // playback regenerates instead of replaying the old text. Raw recordings
  // (non voice-cache/ paths) are never touched.
  const invalidateVoiceCache = async () => {
    if (!id) return;
    setGeneratedAudioUrl(null);
    setIsPlaying(false);
    await removeCachedEntryAudio(id);
    if (entry?.audio_url?.startsWith("voice-cache/")) {
      try {
        await supabase
          .from('journal_entries')
          .update({ audio_url: null } as any)
          .eq('id', id);
      } catch (err) {
        console.warn('Failed to clear stale voice cache path:', err);
      }
    }
  };

  const handleSaveBody = async () => {
    if (!id || !editedBody.trim()) return;
    const cleanBody = editedBody.trim();
    setIsSavingBody(true);
    try {
      const patch: Record<string, unknown> = { enhanced_text: cleanBody };
      // If the entry was never enhanced, mirror the edit into the original
      // transcription too so the "Original Transcription" section isn't empty.
      if (!entry?.enhanced_text && !entry?.original_transcription) {
        patch.original_transcription = cleanBody;
      }
      const { error } = await supabase
        .from('journal_entries')
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;

      await invalidateVoiceCache();
      setEntry(prev => prev ? { ...prev, enhanced_text: cleanBody, audio_url: null } : null);
      setIsEditingBody(false);
      toast({
        title: t("entry.bodyUpdated"),
        description: t("entry.bodyUpdatedDesc"),
      });
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: t("common.error"),
        description: t("entry.bodyFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSavingBody(false);
    }
  };

  const handleEnhanceBody = async (tone: string = 'natural') => {
    if (!id) return;
    const source = entry?.enhanced_text || entry?.original_transcription || "";
    if (!source.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await api.enhanceText(source, tone, (entry as any)?.detected_language || undefined);
      const { error } = await supabase
        .from('journal_entries')
        .update({ enhanced_text: enhanced } as any)
        .eq('id', id);
      if (error) throw error;

      await invalidateVoiceCache();
      setEntry(prev => prev ? { ...prev, enhanced_text: enhanced, audio_url: null } : null);
      toast({
        title: t("entry.enhanced"),
        description: t("entry.enhancedDesc"),
      });
    } catch (error) {
      console.error('Error enhancing entry:', error);
      toast({
        title: t("entry.enhanceFailed"),
        description: error instanceof Error ? error.message : t("entry.enhanceFailed"),
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Live elapsed counter while voice is generating — makes long entries feel
  // like progress instead of a hang
  useEffect(() => {
    if (!isGeneratingVoice) {
      setGenSeconds(0);
      return;
    }
    const interval = setInterval(() => setGenSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isGeneratingVoice]);

  const handleGenerateVoice = async () => {
    if (!entry || !entry.enhanced_text) return;
    // v5: voice replay is Premium-only and capped (20/mo + purchased credits)
    if (!isPremium) {
      toast({
        title: t("entry.voicePremiumRequired"),
        description: t("entry.voicePremiumRequiredDesc"),
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }
    if (!canUseReplay()) {
      setShowReplayUpsell(true);
      return;
    }
    
    setIsGeneratingVoice(true);
    
    try {
      // Only translate when the playback language differs from the entry's own
      // language — e.g. French entry + French playback needs NO translation
      // (a wasted slow AI round-trip before TTS). Fish reads any language.
      const playbackLang = normalizeLang(entry.playback_language);
      const entryDetected = normalizeLang((entry as any)?.detected_language);
      let textForVoice = entry.enhanced_text;
      if (playbackLang && playbackLang !== "en" && (!entryDetected || entryDetected !== playbackLang)) {
        try {
          textForVoice = await api.translateText(entry.enhanced_text, entry.playback_language!);
        } catch (translateError) {
          // Translation unavailable — Fish Audio is multilingual, so read the
          // entry in its original language instead of failing playback.
          console.warn('Translation failed, using original text:', translateError);
          textForVoice = entry.enhanced_text;
        }
      }
      
      const audioUrl = await api.generateVoice(textForVoice, undefined, id, 'entry');
      setGeneratedAudioUrl(audioUrl);
      incrementReplaysUsed();
      // Auto-play once ready (matches the reflection flow)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);

      // Suggest adding a voice profile for this entry's language (once per language)
      const langCode = normalizeLang((entry as any)?.detected_language);
      if (langCode && !hasVoiceForLanguage(langCode)) {
        const flagKey = `sj-voice-prompt-${langCode}`;
        if (!localStorage.getItem(flagKey)) {
          localStorage.setItem(flagKey, "1");
          setPromptLang(langCode);
        }
      }
    } catch (error) {
      console.error('Error generating voice:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate voice";
      
      let userMessage = errorMessage;
      if (errorMessage.includes('unusual_activity') || errorMessage.includes('Free Tier')) {
        userMessage = "ElevenLabs free tier limit reached. Please upgrade your ElevenLabs API key to a paid plan in Settings → Voice to continue using voice playback.";
      }
      
      toast({
        title: t("entry.voiceFailed"),
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleGenerateVoiceForText = async (text: string) => {
    // v5: voice replay is Premium-only and capped (20/mo + purchased credits)
    if (!isPremium) {
      toast({
        title: t("entry.voicePremiumRequired"),
        description: t("entry.voicePremiumRequiredDesc"),
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }
    if (!canUseReplay()) {
      setShowReplayUpsell(true);
      return;
    }
    setIsGeneratingVoice(true);
    try {
      const audioUrl = await api.generateVoice(text, undefined, id, 'reflection');
      setGeneratedAudioUrl(audioUrl);
      incrementReplaysUsed();
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    } catch (error) {
      console.error('Error generating voice:', error);
      toast({
        title: t("entry.voiceFailed"),
        description: error instanceof Error ? error.message : "Failed to generate voice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen gradient-warm flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">{t("entry.notFound")}</p>
        <Button onClick={() => navigate("/")}>{t("entry.goHome")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Hidden audio element */}
      {generatedAudioUrl && (
        <audio
          ref={audioRef}
          src={generatedAudioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="h-8 text-base font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') handleCancelEditTitle();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-500"
                      onClick={handleSaveTitle}
                      disabled={isSavingTitle}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancelEditTitle}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground truncate">
                      {titleCase(entry.title) || t("entry.untitled")}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={handleEditTitle}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatDate(entry.created_at)}
                </p>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-destructive">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("entry.deleteConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your journal entry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Mood & Date Card */}
        <motion.div
          className="glass-card rounded-2xl p-6 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">{moodEmojis[entry.mood as Mood]}</span>
          </div>
          <div>
            <p className="font-medium capitalize text-foreground">{entry.mood}</p>
            <p className="text-sm text-muted-foreground">
              Playback: {languageNames[entry.playback_language] || entry.playback_language}
            </p>
          </div>
        </motion.div>

        {/* Enhanced Text — editable, with AI enhance after save */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Your Story
            </h3>
            {!isEditingBody && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={handleStartEditBody}
                >
                  <Pencil className="w-3 h-3" />
                  {t("entry.editEntry")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs text-primary"
                  onClick={() => handleEnhanceBody('natural')}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? (
                    <motion.div
                      className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isEnhancing ? t("record.enhancing") : t("record.enhanceWithAI")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs text-primary"
                  onClick={() => handleEnhanceBody('structured')}
                  disabled={isEnhancing}
                >
                  <ListTree className="w-3.5 h-3.5" />
                  {t("entry.enhanceStructured")}
                </Button>
              </div>
            )}
          </div>

          {isEditingBody ? (
            <div className="space-y-3">
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                dir={dirFor(entry.detected_language)}
                autoFocus
                placeholder={t("entry.editEntry")}
                className="w-full min-h-[160px] px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-foreground font-journal text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={handleCancelEditBody}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl gradient-primary"
                  onClick={handleSaveBody}
                  disabled={isSavingBody || !editedBody.trim()}
                >
                  {isSavingBody ? t("record.saving") : t("entry.save")}
                </Button>
              </div>
            </div>
          ) : (
            <p
              dir={dirFor(entry.detected_language)}
              className="font-journal text-foreground leading-relaxed whitespace-pre-wrap"
            >
              {entry.enhanced_text}
            </p>
          )}
        </motion.div>

        {/* Voice Playback */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Listen To Your Story
          </h3>
          
          {!generatedAudioUrl ? (
            <>
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-xl"
                onClick={handleGenerateVoice}
                disabled={isGeneratingVoice}
              >
                {isGeneratingVoice ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Generating Voice...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Generate Voice Playback
                  </>
                )}
              </Button>
              {isGeneratingVoice && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {t("entry.voiceLongHint")} ({genSeconds}s)
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="w-14 h-14 rounded-full gradient-amber shadow-glow"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>
              <div className="flex-1">
                <p className="font-medium text-sm">{t("entry.voicePlayback")}</p>
                <p className="text-muted-foreground text-xs">
                  {isPlaying ? t("entry.playing") : t("entry.tapToPlay")}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Per-language voice suggestion */}
        {promptLang && (
          <motion.div
            className="max-w-lg mx-auto px-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-premium rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t("voice.promptAddVoice").replace("{lang}", LANGUAGES.find((l) => l.code === promptLang)?.name || promptLang)}
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => navigate("/settings/voice")}
              >
                {t("voice.addVoice")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Soul Mirror Reflection */}
        {entry.soul_reflection && (() => {
          // Parse mode prefix: [NURTURE], [CHALLENGE], or [BLEND]
          const modeMatch = entry.soul_reflection.match(/^\[(NURTURE|CHALLENGE|BLEND)\]/i);
          const mode = modeMatch ? modeMatch[1].toLowerCase() : 'blend';
          const reflectionText = modeMatch 
            ? entry.soul_reflection.slice(modeMatch[0].length) 
            : entry.soul_reflection;

          const modeConfig = {
            nurture: {
              label: 'Nurture',
              icon: Heart,
              bg: 'bg-emerald-500/15',
              text: 'text-emerald-600 dark:text-emerald-400',
              border: 'border-emerald-500/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(160 60% 50% / 0.10))',
              borderColor: 'hsl(160 60% 50% / 0.25)',
            },
            challenge: {
              label: 'Challenge',
              icon: Flame,
              bg: 'bg-amber-500/15',
              text: 'text-amber-600 dark:text-amber-400',
              border: 'border-amber-500/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(35 90% 55% / 0.10))',
              borderColor: 'hsl(35 90% 55% / 0.25)',
            },
            blend: {
              label: 'Blend',
              icon: Sparkles,
              bg: 'bg-primary/10',
              text: 'text-primary',
              border: 'border-primary/30',
              gradient: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.12))',
              borderColor: 'hsl(var(--primary) / 0.2)',
            },
          };

          const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.blend;
          const ModeIcon = config.icon;

          return (
            <motion.div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: config.gradient,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${config.borderColor}`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-primary tracking-wide">
                    Message From Your Soul
                  </h3>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${config.bg} ${config.text} ${config.border} border`}>
                  <ModeIcon className="w-3 h-3" />
                  {config.label}
                </div>
              </div>
              <p className="font-journal text-foreground leading-relaxed italic text-base">
                "{reflectionText}"
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 gap-1 text-xs text-primary"
                onClick={() => {
                  if (reflectionText) {
                    handleGenerateVoiceForText(reflectionText);
                  }
                }}
                disabled={isGeneratingVoice}
              >
                <Volume2 className="w-3 h-3" />
                Listen To Reflection
              </Button>
            </motion.div>
          );
        })()}

        <motion.div
          className="glass-card rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            className="w-full p-4 flex items-center justify-between"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              Original Transcription
            </h3>
            {showOriginal ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {showOriginal && (
            <motion.div
              className="px-4 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <p
                dir={dirFor(entry.detected_language)}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {entry.original_transcription}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Related Entries */}
        {entry.enhanced_text && user && (
          <RelatedEntriesCard
            userId={user.id}
            entryId={entry.id}
            text={entry.enhanced_text}
          />
        )}

        {/* Photo Gallery */}
        {photoUrls.length > 0 && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Photos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {photoUrls.map((url, index) => (
                <motion.img
                  key={index}
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* v5: voice replay counter (Premium: 20/month + purchased credits) */}
      {isPremium && generatedAudioUrl && (
        <div className="px-4 pb-2 -mt-2 text-xs text-muted-foreground text-center">
          {t("entry.replaysUsed")}: {getReplaysUsed()}/{limits.voiceReplaysPerMonth + voiceCredits}
        </div>
      )}

      {/* v5: over-limit voice replay upsell (0,50 $ / replay, 10 for 4,99 $) */}
      <Dialog open={showReplayUpsell} onOpenChange={setShowReplayUpsell}>
        <DialogContent className="max-w-sm p-5 text-center">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("entry.replaysLimitTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{t("entry.replaysLimitDesc")}</p>
          <div className="space-y-2">
            <Button
              className="w-full h-12 rounded-xl gap-2"
              onClick={() => buyReplays(false)}
              disabled={buyingReplays}
            >
              <Sparkles className="w-4 h-4" />
              1 {t("entry.replayUnit")} — {VOICE_REPLAY_PRICE.toFixed(2).replace(".", ",")} $
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl gap-2"
              onClick={() => buyReplays(true)}
              disabled={buyingReplays}
            >
              <Sparkles className="w-4 h-4" />
              {VOICE_REPLAY_BUNDLE_SIZE} {t("entry.replayUnitPlural")} — {VOICE_REPLAY_BUNDLE_PRICE.toFixed(2).replace(".", ",")} $
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default EntryDetailPage;
