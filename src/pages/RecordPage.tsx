import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import { X, Type, Smile, Sparkles, Wand2, Play, Volume2, Camera, ImagePlus, Trash2, PartyPopper, Star, RefreshCcw, Lightbulb, Check, AudioLines } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mood } from "@/components/MoodSelector";
import MoodSlider, { moodToScore } from "@/components/MoodSlider";
import RichTextEditor from "@/components/RichTextToolbar";
import LanguageSelector, { Language } from "@/components/LanguageSelector";
import RecentEntryCard from "@/components/premium/RecentEntryCard";
import AIInsightCard from "@/components/premium/AIInsightCard";
import { SPOKEN_LANGUAGE_OPTIONS, dirFor } from "@/lib/textDirection";
import { captureEntryContext } from "@/lib/contextCapture";
import { createNativeSpeech, isNativeSpeechSupported, type NativeSpeechHandle } from "@/lib/nativeSpeech";

import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useSubscription, FREE_LIMITS, PREMIUM_ENTITLEMENTS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { loadAIPrefs } from "@/lib/goalAccountability";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Lock } from "lucide-react";

type RecordingStep = "main" | "write" | "mood" | "enhance" | "language" | "complete";

const RecordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const api = useJournalAPI(language);
  const { canCreateTextEntry, canCreateAudioEntry, canUseCoaching, textLimitReached, audioLimitReached, textEntriesToday, audioEntriesThisWeek } = useUsageLimits();
  
  const [step, setStep] = useState<RecordingStep>("main");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [richContent, setRichContent] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [spokenLanguage, setSpokenLanguage] = useState<string>("auto");
  const [enhancedText, setEnhancedText] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [captureContext, setCaptureContext] = useState(false);
  const [recentEntry, setRecentEntry] = useState<{ id: string; title: string; preview: string; date: Date; mood: Mood } | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [postInsight, setPostInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  // Native device dictation (free, $0 API calls)
  const [isDictating, setIsDictating] = useState(false);
  const speechRef = useRef<NativeSpeechHandle | null>(null);
  const dictationTextRef = useRef("");
  // Smart Journaling Prompts (Feature: personalized prompts on the write screen)
  const [prompts, setPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsHidden, setPromptsHidden] = useState(false);
  const promptsFetchedRef = useRef(false);
  // Writing Block Breaker (Feature: 30s inactivity nudge, once per session)
  const [blockNudge, setBlockNudge] = useState<{ starter?: string; word?: string } | null>(null);
  const blockShownRef = useRef(false);
  const lastTypedRef = useRef(Date.now());
  // Dream Reflection (Feature 8: 🌙 Rêve tag + poetic post-save reflection)
  const [isDream, setIsDream] = useState(false);
  const [dreamReflection, setDreamReflection] = useState<string | null>(null);
  const [dreamLoading, setDreamLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    const photoLimit = isPremium ? PREMIUM_ENTITLEMENTS.photosPerEntry : FREE_LIMITS.photosPerEntry;
    const room = Math.max(0, photoLimit - photos.length);
    if (room <= 0) {
      toast({ title: "Photo limit reached", description: `Up to ${photoLimit} photos per entry.`, variant: "destructive" });
      return;
    }
    const accepted = newFiles.slice(0, room);
    setPhotos(prev => [...prev, ...accepted]);
    setPhotoPreviewUrls(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))]);
    if (newFiles.length > room) {
      toast({ title: "Photo limit reached", description: `Up to ${photoLimit} photos per entry.`, variant: "destructive" });
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch profile name + capture preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, capture_context')
        .eq('id', user.id)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name.split(' ')[0]);
      }
      if ((profile as any)?.capture_context) {
        setCaptureContext(true);
      }

      // Fetch recent entry
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, title, enhanced_text, original_transcription, mood, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (entries && entries.length > 0) {
        const entry = entries[0];
        setRecentEntry({
          id: entry.id,
          title: entry.title || "Evening Reflection",
          preview: entry.enhanced_text || entry.original_transcription || "Feeling calm after the...",
          date: new Date(entry.created_at),
          mood: (entry.mood as Mood) || "fine",
        });
      }
    };
    
    fetchData();
  }, [user]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use lower bitrate for longer recordings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000, // Lower bitrate for longer recordings
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe
        setIsProcessing(true);
        try {
          const { text, detectedLanguage } = await api.transcribeAudio(audioBlob, spokenLanguage);
          setTranscription(text);
          setDetectedLanguage(detectedLanguage);
          // Auto-detect mood from transcription
          try {
            const detectedMood = await api.detectMood(text);
            const m = detectedMood as Mood;
            setSelectedMood(m);
            setMoodScore(moodToScore(m));
          } catch (moodErr) {
            console.error('Mood detection error:', moodErr);
          }
          setStep("enhance");
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: "Transcription Failed",
            description: error instanceof Error ? error.message : "Failed to transcribe audio",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      // Request data every 10 seconds to prevent memory issues with long recordings
      mediaRecorder.start(10000);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!canCreateAudioEntry) {
        toast({
          title: "Audio Limit Reached",
          description: `Free plan allows ${1} audio entry per week. Upgrade for unlimited.`,
          variant: "destructive",
        });
        navigate("/pricing");
        return;
      }
      // Reset recording duration and start timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      startRecording();
    }
  };

  const handleWriteClick = () => {
    if (!canCreateTextEntry) {
      toast({
        title: "Text Entry Limit Reached",
        description: `Free plan allows ${2} text entries per day. Upgrade for unlimited.`,
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }
    setStep("write");
  };

  // ── Native device dictation (free, $0 API calls) ─────────────────────
  const finalizeDictation = () => {
    const text = (dictationTextRef.current || "").trim();
    if (!text) {
      toast({
        title: t("record.noSpeech"),
        variant: "destructive",
      });
      return;
    }
    setTranscription(text);
    setStep("enhance");
    // Auto-detect mood (same as the audio transcription path)
    try {
      api
        .detectMood(text)
        .then((m) => {
          const mood = m as Mood;
          setSelectedMood(mood);
          setMoodScore(moodToScore(mood));
        })
        .catch((moodErr) => console.error("Mood detection error:", moodErr));
    } catch (moodErr) {
      console.error("Mood detection error:", moodErr);
    }
  };

  const handleDictateClick = () => {
    if (isDictating) {
      speechRef.current?.stop();
      speechRef.current = null;
      setIsDictating(false);
      finalizeDictation();
      return;
    }
    if (!canCreateTextEntry) {
      toast({
        title: "Text Entry Limit Reached",
        description: `Free plan allows ${2} text entries per day. Upgrade for unlimited.`,
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }
    if (!isNativeSpeechSupported()) {
      toast({
        title: t("record.dictateUnsupported"),
        variant: "destructive",
      });
      return;
    }
    dictationTextRef.current = "";
    const handle = createNativeSpeech({
      lang: spokenLanguage && spokenLanguage !== "auto" ? spokenLanguage : undefined,
      onResult: (transcript) => {
        dictationTextRef.current = transcript;
        setTranscription(transcript);
      },
      onError: () => {
        setIsDictating(false);
        speechRef.current = null;
        toast({
          title: t("record.dictateUnsupported"),
          variant: "destructive",
        });
      },
      onEnd: () => setIsDictating(false),
    });
    if (handle) {
      speechRef.current = handle;
      setIsDictating(true);
    } else {
      toast({
        title: t("record.dictateUnsupported"),
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnhance = async () => {
    setIsProcessing(true);
    try {
      // Keep the entry in its DETECTED language (French stays French, etc.)
      const enhanced = await api.enhanceText(transcription, 'natural', detectedLanguage || undefined);
      setEnhancedText(enhanced);
      
      // Auto-generate title
      if (!entryTitle) {
        setIsGeneratingTitle(true);
        try {
          const title = await api.generateTitle(enhanced, detectedLanguage || undefined);
          setEntryTitle(title);
        } catch (titleError) {
          console.error('Title generation error:', titleError);
          // Continue without title if generation fails
        } finally {
          setIsGeneratingTitle(false);
        }
      }
      
      setStep("language");
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!enhancedText) return;
    setIsProcessing(true);
    try {
      let textForVoice = enhancedText;
      if (selectedLanguage !== 'en' && detectedLanguage !== selectedLanguage) {
        textForVoice = await api.translateText(enhancedText, selectedLanguage);
      }
      const audioUrl = await api.generateVoice(textForVoice, undefined, undefined, undefined, selectedLanguage);
      setGeneratedAudioUrl(audioUrl);
      toast({
        title: "Voice Generated! 🎙️",
        description: "Your entry is ready to play.",
      });
    } catch (error) {
      console.error('Voice generation error:', error);
      toast({
        title: "Voice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate voice",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadLatestInsight = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("coaching_insights")
        .select("content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.content) setPostInsight(data.content);
    } catch (error) {
      console.error("Failed to fetch latest insight:", error);
    }
  };

  // Smart Journaling Prompts — generate once when the write step opens
  useEffect(() => {
    if (step !== "write" || promptsFetchedRef.current) return;
    promptsFetchedRef.current = true;
    setPromptsLoading(true);
    api.generateJournalingPrompts()
      .then((p) => setPrompts(Array.isArray(p) ? p : []))
      .catch((err) => { console.warn("Journaling prompts failed:", err); setPrompts([]); })
      .finally(() => setPromptsLoading(false));
  }, [step]);

  // Writing Block Breaker — nudge after 30s of inactivity on a blank write screen
  useEffect(() => {
    if (step !== "write" || blockShownRef.current) return;
    const interval = setInterval(() => {
      if (blockShownRef.current) return;
      if (Date.now() - lastTypedRef.current < 30000) return;
      if (transcription || richContent) return; // only on a blank screen
      blockShownRef.current = true;
      setBlockNudge({});
      api.generateStarter().then((s) => s && setBlockNudge((p) => ({ ...p, starter: s }))).catch(() => {});
      api.generateOneWordPrompt().then((w) => w && setBlockNudge((p) => ({ ...p, word: w }))).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [step, transcription, richContent]);

  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const insertIntoEntry = (text: string) => {
    const clean = (richContent || "").replace(/<br\s*\/?>\s*$/g, "");
    const next = clean ? `${clean}<div>${escapeHtml(text)}</div>` : `<div>${escapeHtml(text)}</div>`;
    setRichContent(next);
    setTranscription((transcription + " " + text).trim());
    lastTypedRef.current = Date.now();
  };

  const refreshPrompts = () => {
    setPromptsLoading(true);
    api.generateJournalingPrompts()
      .then((p) => setPrompts(Array.isArray(p) ? p : []))
      .catch((err) => { console.warn("Journaling prompts failed:", err); setPrompts([]); })
      .finally(() => setPromptsLoading(false));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      let audioPath: string | undefined;
      if (audioBlob) {
        audioPath = await api.uploadAudio(audioBlob, user.id);
      }

      // Auto-generate title if still empty
      let finalTitle = entryTitle;
      if (!finalTitle && enhancedText) {
        try {
          finalTitle = await api.generateTitle(enhancedText);
        } catch (titleError) {
          console.error('Title generation error:', titleError);
          finalTitle = `Entry ${new Date().toLocaleDateString()}`;
        }
      }

      // Capture contextual metadata (weather/location/time-of-day)
      const ctx = await captureEntryContext(captureContext);

      const entry = await api.saveEntry({
        userId: user.id,
        title: finalTitle || `Entry ${new Date().toLocaleDateString()}`,
        originalTranscription: transcription,
        enhancedText: enhancedText,
        mood: selectedMood || "fine",
        moodScore: moodScore,
        playbackLanguage: selectedLanguage,
        audioUrl: audioPath,
        richContent: richContent || null,
        weather: ctx.weather,
        location: ctx.location,
        timeOfDay: ctx.time_of_day,
        durationSeconds: recordingDuration > 0 ? recordingDuration : null,
        detectedLanguage: detectedLanguage,
      });

      // Upload photos and save media references
      if (entry?.id && photos.length > 0) {
        for (const photo of photos) {
          try {
            const storagePath = await api.uploadPhoto(photo, user.id);
            await api.saveEntryMedia(entry.id, 'photo', storagePath);
          } catch (photoErr) {
            console.error('Failed to upload photo:', photoErr);
          }
        }
      }

      // Generate Soul Mirror reflection in the background
      if (entry?.id && enhancedText) {
        api.generateSoulReflection(enhancedText).then(async (reflection) => {
          try {
            await supabase
              .from('journal_entries')
              .update({ soul_reflection: reflection } as any)
              .eq('id', entry.id);
          } catch (err) {
            console.error('Failed to save soul reflection:', err);
          }
        }).catch(err => console.error('Soul reflection error:', err));
      }
      
      setStep("complete");
      toast({
        title: "Entry Saved! ✨",
        description: "Your journal entry has been saved.",
      });

      // Reactive AI Insight: generate a fresh insight tied to what was just
      // written (throttled to 1/day, respects the free-tier coaching cap).
      // Uses the existing generate-coaching-insights fn — the new entry is
      // inside its 7-day window, so the insight references this entry.
      const todayKey = `sj-auto-insight-${new Date().toDateString()}`;
      const willAutoGenerate = canUseCoaching && !localStorage.getItem(todayKey);
      if (willAutoGenerate) {
        localStorage.setItem(todayKey, "1");
        setInsightLoading(true);
        api.generateCoachingInsights()
          .catch((err) => console.warn("Auto insight generation skipped:", err))
          .finally(() => {
            loadLatestInsight();
            setInsightLoading(false);
          });
      } else {
        loadLatestInsight();
      }

      // Dream Reflection (Feature 8): tagged as a dream → poetic reflection
      // tied to the dream + recent waking-life entries (post-save, once)
      if (entry?.id && isDream && loadAIPrefs().dreamReflection) {
        try {
          const stored = JSON.parse(localStorage.getItem("sj-dream-entries") || "[]");
          if (!stored.includes(entry.id)) {
            stored.push(entry.id);
            localStorage.setItem("sj-dream-entries", JSON.stringify(stored));
          }
        } catch {}
        setDreamLoading(true);
        api.reflectOnDream(enhancedText, getLanguageName(language))
          .then((reflection) => setDreamReflection(reflection || null))
          .catch((err) => console.warn("Dream reflection failed:", err))
          .finally(() => setDreamLoading(false));
      }

      setTimeout(() => navigate("/"), willAutoGenerate ? 6000 : 2000);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Hidden audio element */}
      {generatedAudioUrl && (
        <audio
          ref={audioRef}
          src={generatedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">{t("record.newEntry")}</p>
              <h1 className="text-2xl text-foreground">
                <span className="font-normal">{t("record.howAreYou")}</span>
                <span className="font-display italic">{displayName}</span>
                <span className="font-normal">?</span>
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
              onClick={() => navigate("/")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 space-y-6">
        {/* Main Recording View */}
        {step === "main" && (
          <AnimatePresence>
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Usage Limits Banner */}
              {(textLimitReached || audioLimitReached) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3"
                >
                  <Lock className="w-5 h-5 text-destructive shrink-0" />
                  <div className="text-sm">
                    {textLimitReached && <p className="text-destructive font-medium">{t("record.textEntriesCount").replace("{count}", String(textEntriesToday))}</p>}
                    {audioLimitReached && <p className="text-destructive font-medium">{t("record.audioEntriesCount").replace("{count}", String(audioEntriesThisWeek))}</p>}
                    <button onClick={() => navigate("/pricing")} className="text-primary underline text-xs mt-1">{t("record.upgradeUnlimited")}</button>
                  </div>
                </motion.div>
              )}

              {/* Voice Record Button / Native Dictation */}
              <div className="flex flex-col items-center py-8">
                {isDictating ? (
                  <motion.button
                    className="voice-record-btn w-40 h-40 rounded-full flex items-center justify-center recording"
                    onClick={handleDictateClick}
                    whileTap={{ scale: 0.95 }}
                  >
                    <AudioLines className="w-12 h-12 text-white animate-pulse" />
                  </motion.button>
                ) : (
                  <motion.button
                    className={`voice-record-btn w-40 h-40 rounded-full flex items-center justify-center ${
                      isRecording ? "recording" : ""
                    } ${audioLimitReached && !isRecording ? "opacity-50" : ""}`}
                    onClick={handleRecordClick}
                    whileTap={{ scale: 0.95 }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : audioLimitReached ? (
                      <Lock className="w-12 h-12 text-white" />
                    ) : (
                      <Mic className="w-12 h-12 text-white" />
                    )}
                  </motion.button>
                )}
                <p className="mt-4 text-muted-foreground">
                  {isDictating
                    ? t("record.dictating")
                    : isRecording 
                    ? t("record.recordingTime").replace("{time}", formatDuration(recordingDuration))
                    : isProcessing 
                    ? t("record.processing")
                    : audioLimitReached
                    ? t("record.audioLimitReached")
                    : t("record.tapToRecordAssessment")}
                </p>
              </div>

              {/* Spoken language override */}
              <div className="flex justify-center">
                <select
                  value={spokenLanguage}
                  onChange={(e) => setSpokenLanguage(e.target.value)}
                  className="glass-premium rounded-full px-4 py-2 text-sm bg-transparent text-foreground outline-none"
                  aria-label="Spoken language"
                >
                  {SPOKEN_LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="text-foreground">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  className={`rounded-full px-5 gap-2 ${textLimitReached ? "opacity-50" : ""}`}
                  onClick={handleWriteClick}
                >
                   {textLimitReached ? <Lock className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                   {t("record.writeLimit")}{textLimitReached ? ` (${t("record.limitReached")})` : ""}
                </Button>
                {(isNativeSpeechSupported() || isDictating) && (
                  <Button
                    variant={isDictating ? "default" : "outline"}
                    className="rounded-full px-5 gap-2"
                    onClick={handleDictateClick}
                  >
                    <AudioLines className="w-4 h-4" />
                    {isDictating ? t("record.dictateStop") : t("record.dictate")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="rounded-full px-5 gap-2"
                  onClick={() => setStep("mood")}
                >
                  <Smile className="w-4 h-4" />
                  {t("record.mood")}
                </Button>
              </div>


              {/* Recent Entries */}
              {recentEntry && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="section-label">{t("record.recentEntries")}</p>
                    <button 
                      className="text-sm font-medium text-foreground"
                      onClick={() => navigate("/calendar")}
                    >
                      {t("record.viewAll")}
                    </button>
                  </div>
                  <RecentEntryCard
                    id={recentEntry.id}
                    title={recentEntry.title}
                    preview={recentEntry.preview.substring(0, 40) + "..."}
                    date={recentEntry.date}
                    mood={recentEntry.mood}
                    onClick={() => navigate(`/entry/${recentEntry.id}`)}
                  />
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Write Mode */}
        {step === "write" && (
          <motion.div
            className="glass-premium p-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RichTextEditor
              value={richContent}
              placeholder={t("record.whatsOnMind")}
              onChange={(html, plain) => {
                lastTypedRef.current = Date.now();
                if (blockNudge) setBlockNudge(null);
                setRichContent(html);
                setTranscription(plain);
              }}
              minHeight={220}
            />

            {/* Smart Journaling Prompts */}
            {!promptsHidden && (prompts.length > 0 || promptsLoading) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {t("record.promptsTitle")}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={refreshPrompts}
                      disabled={promptsLoading}
                      aria-label={t("record.promptsRefresh")}
                    >
                      <RefreshCcw className={`w-3.5 h-3.5 ${promptsLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPromptsHidden(true)}
                      aria-label={t("common.cancel")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {promptsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("record.promptsGenerating")}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {prompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => insertIntoEntry(p)}
                        className="shrink-0 max-w-[260px] text-left text-sm bg-white/70 dark:bg-white/10 border border-border/50 rounded-2xl px-3 py-2.5 hover:border-primary/50 hover:bg-primary/5 transition-colors text-foreground"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Writing Block Breaker */}
            {blockNudge && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2"
              >
                <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  {t("record.blockBreakerTitle")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {blockNudge.starter && (
                    <button
                      onClick={() => insertIntoEntry(blockNudge.starter!)}
                      className="text-sm bg-white/80 dark:bg-white/10 border border-border/50 rounded-xl px-3 py-2 hover:border-primary/50 transition-colors text-left"
                    >
                      ✍️ {t("record.blockStarter")}: {blockNudge.starter}
                    </button>
                  )}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-sm bg-white/80 dark:bg-white/10 border border-border/50 rounded-xl px-3 py-2 hover:border-primary/50 transition-colors text-left"
                  >
                    📷 {t("record.blockPhoto")}
                  </button>
                  {blockNudge.word && (
                    <button
                      onClick={() => insertIntoEntry(blockNudge.word!)}
                      className="text-sm bg-white/80 dark:bg-white/10 border border-border/50 rounded-xl px-3 py-2 hover:border-primary/50 transition-colors text-left"
                    >
                      ✨ {t("record.blockWord")}: {blockNudge.word}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("main")}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1 gradient-primary"
                onClick={async () => {
                  if (!transcription.trim()) return;
                  // Auto-detect mood when moving from write to enhance
                  if (!selectedMood) {
                    try {
                      const detectedMood = await api.detectMood(transcription);
                      const m = detectedMood as Mood;
                      setSelectedMood(m);
                      setMoodScore(moodToScore(m));
                    } catch (err) {
                      console.error('Mood detection error:', err);
                    }
                  }
                  setStep("enhance");
                }}
                disabled={!transcription.trim()}
              >
                {t("record.continue")}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Mood Selection — granular slider */}
        {step === "mood" && (
          <motion.div
            className="glass-premium p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MoodSlider
              value={moodScore}
              onChange={(score, mood) => {
                setMoodScore(score);
                setSelectedMood(mood);
              }}
            />

            {/* Dream tag (Feature 8: 🌙 Rêve) */}
            <button
              onClick={() => setIsDream((v) => !v)}
              className={`mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-medium transition-colors ${
                isDream
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/50 bg-white/60 dark:bg-white/5 text-muted-foreground"
              }`}
            >
              🌙 {t("record.dreamTag")}
              {isDream && <Check className="w-4 h-4 text-primary" />}
            </button>
            <Button
              className="w-full mt-4 gradient-primary"
              onClick={() => setStep("main")}
            >
              {t("common.cancel") /* reuse 'Done' visually */ ? "Done" : "Done"}
            </Button>
          </motion.div>
        )}

        {/* Enhancement Step */}
        {step === "enhance" && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-premium p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t("record.originalTranscription")}
              </h3>
              <p
                dir={dirFor(detectedLanguage)}
                className="font-journal text-foreground leading-relaxed"
              >
                {transcription}
              </p>
              {/* Auto-detected mood suggestion */}
              {selectedMood && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <Smile className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Detected mood: <strong>{selectedMood === 'happy' ? '😊 Happy' : selectedMood === 'good' ? '🙂 Good' : selectedMood === 'fine' ? '😐 Fine' : selectedMood === 'sad' ? '😔 Sad' : '😢 Unhappy'}</strong>
                  </span>
                  <button
                    className="ml-auto text-xs text-primary underline"
                    onClick={() => setStep("mood")}
                  >
                    Change
                  </button>
                </motion.div>
              )}
            </div>

            {!enhancedText && (
              <Button
                className="w-full gap-2 h-14 rounded-2xl gradient-primary"
                onClick={handleEnhance}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("record.enhancing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t("record.enhanceWithAI")}
                  </>
                )}
              </Button>
            )}

            {enhancedText && (
              <motion.div
                className="glass-premium p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-primary">{t("record.aiEnhanced")}</h3>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    placeholder={t("record.addTitle")}
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl shrink-0"
                    onClick={async () => {
                      if (!enhancedText) return;
                      setIsGeneratingTitle(true);
                      try {
                        const title = await api.generateTitle(enhancedText);
                        setEntryTitle(title);
                      } catch (error) {
                        console.error('Error generating title:', error);
                      } finally {
                        setIsGeneratingTitle(false);
                      }
                    }}
                    disabled={isGeneratingTitle}
                  >
                    {isGeneratingTitle ? (
                      <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <RichTextEditor
                  value={enhancedText}
                  placeholder={t("record.aiEnhanced")}
                  onChange={(html, _plain) => setEnhancedText(html)}
                  minHeight={200}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 h-11 rounded-xl"
                    onClick={async () => {
                      if (!enhancedText) return;
                      setIsProcessing(true);
                      try {
                        const expanded = await api.expandText(enhancedText.replace(/<[^>]+>/g, ' '));
                        setEnhancedText(expanded);
                        toast({ title: "Expanded ✨", description: "Notes expanded into a paragraph." });
                      } catch (err) {
                        toast({
                          title: "Expand Failed",
                          description: err instanceof Error ? err.message : "Could not expand",
                          variant: "destructive",
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing || !enhancedText}
                  >
                    <Sparkles className="w-4 h-4" />
                    Expand bullets
                  </Button>
                </div>
                <Button
                  className="w-full mt-4 gap-2 h-12 rounded-xl gradient-primary"
                  onClick={() => setStep("language")}
                >
                  {t("record.continue")}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Language Selection & Photos */}
        {step === "language" && (
          <motion.div
            className="glass-premium p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <span className="text-4xl mb-4 block">🌍</span>
              <h2 className="text-xl font-semibold font-display mb-2">
                {t("record.voicePlaybackLanguage")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("record.chooseLanguage")}
              </p>
            </div>

            <LanguageSelector
              selected={selectedLanguage}
              onSelect={setSelectedLanguage}
            />

            {!generatedAudioUrl && (
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-xl"
                onClick={handleGenerateVoice}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                    {t("record.generatingVoice")}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    {t("record.previewVoice")}
                  </>
                )}
              </Button>
            )}

            {generatedAudioUrl && (
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-xl"
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlayingAudio) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                    setIsPlayingAudio(!isPlayingAudio);
                  }
                }}
              >
                <Play className="w-5 h-5" />
                {isPlayingAudio ? t("record.pause") : t("record.playPreview")}
              </Button>
            )}

            {/* Photo Attachment Section */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">📸 Attach Photos</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-11 rounded-xl"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-11 rounded-xl"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { handlePhotoSelect(e.target.files); e.target.value = ''; }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handlePhotoSelect(e.target.files); e.target.value = ''; }}
              />

              {photoPreviewUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full gap-2 h-14 rounded-2xl gradient-primary"
              onClick={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? t("record.saving") : t("record.saveEntry")}
            </Button>
          </motion.div>
        )}


        {/* Complete — Celebration 🎉 */}
        {step === "complete" && (
          <motion.div
            className="glass-premium p-8 text-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Floating emoji particles */}
            <div className="absolute inset-0 pointer-events-none">
              {['🎉', '✨', '⭐', '💫', '🌟', '🎊'].map((emoji, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: -60, opacity: [0, 1, 1, 0] }}
                  transition={{ delay: i * 0.15, duration: 2, repeat: Infinity }}
                  style={{ left: `${10 + i * 14}%`, top: '60%' }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/30">
                <PartyPopper className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-display font-semibold mb-1">{t("record.entrySaved")}</h2>
              <div className="flex items-center justify-center gap-1 mb-3">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground">{t("record.entrySavedDesc")}</p>
              <p className="text-xs text-emerald-600 font-medium mt-3">
                Keep going — every entry is a step in your journey ✨
              </p>
            </div>

            {/* Reactive Ai Insight tied to the entry just saved */}
            <div className="relative z-10 mt-6 text-left">
              {insightLoading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {t("record.generatingInsight")}
                </div>
              ) : postInsight ? (
                <AIInsightCard insight={postInsight} static />
              ) : null}
            </div>

            {/* Dream Reflection (Feature 8: 🌙 Rêve — poetic, tied to real life) */}
            {(dreamLoading || dreamReflection) && (
              <div className="relative z-10 mt-4 text-left">
                {dreamLoading ? (
                  <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {t("dream.generating")}
                  </div>
                ) : dreamReflection ? (
                  <AIInsightCard insight={dreamReflection} badgeLabel={t("dream.title")} static />
                ) : null}
              </div>
            )}
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default RecordPage;
