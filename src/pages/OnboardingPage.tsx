import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Mic, Square, Globe, Check, 
  Loader2, Sparkles, User, TrendingUp, Award, ShieldAlert, 
  AlertTriangle, Zap, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ONBOARDING_QUESTIONS = [
  {
    id: "identity",
    icon: User,
    titleKey: "onboarding.q1.title",
    subtitleKey: "onboarding.q1.subtitle",
    color: "from-primary/20 to-accent/30",
  },
  {
    id: "growth",
    icon: TrendingUp,
    titleKey: "onboarding.q2.title",
    subtitleKey: "onboarding.q2.subtitle",
    color: "from-emerald-500/20 to-teal-500/30",
  },
  {
    id: "pride",
    icon: Award,
    titleKey: "onboarding.q3.title",
    subtitleKey: "onboarding.q3.subtitle",
    color: "from-amber-500/20 to-orange-500/30",
  },
  {
    id: "blockers",
    icon: ShieldAlert,
    titleKey: "onboarding.q4.title",
    subtitleKey: "onboarding.q4.subtitle",
    color: "from-rose-500/20 to-pink-500/30",
  },
  {
    id: "fears",
    icon: AlertTriangle,
    titleKey: "onboarding.q5.title",
    subtitleKey: "onboarding.q5.subtitle",
    color: "from-violet-500/20 to-purple-500/30",
  },
  {
    id: "motivation",
    icon: Zap,
    titleKey: "onboarding.q6.title",
    subtitleKey: "onboarding.q6.subtitle",
    color: "from-sky-500/20 to-blue-500/30",
  },
];

const WORLDVIEW_OPTIONS = [
  { labelKey: "onboarding.worldviewIslam", value: "Islam", emoji: "☪️" },
  { labelKey: "onboarding.worldviewChristianity", value: "Christianity", emoji: "✝️" },
  { labelKey: "onboarding.worldviewJudaism", value: "Judaism", emoji: "✡️" },
  { labelKey: "onboarding.worldviewBuddhism", value: "Buddhism", emoji: "☸️" },
  { labelKey: "onboarding.worldviewHinduism", value: "Hinduism", emoji: "🕉️" },
  { labelKey: "onboarding.worldviewSpiritual", value: "Spiritual", emoji: "✨" },
  { labelKey: "onboarding.worldviewNoPref", value: "No preference", emoji: "🌍" },
];

// Steps: 0=language, 1-6=questions, 7=worldview, 8=analyzing, 9=results
type Step = number;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Voice recording state
  const [answers, setAnswers] = useState<string[]>(Array(6).fill(""));
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Worldview & analysis
  const [worldview, setWorldview] = useState<string | null>(null);
  const [soulProfile, setSoulProfile] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const totalSteps = 10; // 0=lang, 1-6=questions, 7=worldview, 8=analyzing, 9=results
  const progressPercent = (step / (totalSteps - 1)) * 100;

  const currentQuestionIndex = step >= 1 && step <= 6 ? step - 1 : -1;

  const next = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const updateAnswer = (index: number, text: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  // ── Voice Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' : 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        await transcribeAudio(audioBlob, currentQuestionIndex);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (audioBlob: Blob, qIndex: number) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64Audio, language },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      if (data.text) {
        updateAnswer(qIndex, data.text);
        toast({ title: "✓ Recorded", description: "Your answer has been captured." });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe. Please try again or type your answer.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── AI Analysis ──
  const runAnalysis = async () => {
    setAnalyzing(true);
    setStep(8); // show analyzing screen
    setDirection(1);

    try {
      const allAnswers = [...answers];
      if (worldview) allAnswers.push(worldview);

      const { data, error } = await supabase.functions.invoke("analyze-soul-profile", {
        body: { answers: allAnswers, worldview, language },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setSoulProfile(data.profile);
      setDirection(1);
      setStep(9); // show results
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze your profile. Please try again.",
        variant: "destructive",
      });
      setStep(7); // go back to worldview
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save & Complete ──
  const handleComplete = async () => {
    if (!user || !soulProfile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          strengths: soulProfile.strengths || [],
          fears: soulProfile.fears || [],
          worldview,
          soul_profile_summary: soulProfile,
          onboarding_completed: true,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Welcome aboard! 🎉", description: "Your Soul Profile is ready." });
      navigate("/", { replace: true });
    } catch (err) {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("id", user.id);
      navigate("/", { replace: true });
    } catch {
      navigate("/", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  // ── Question Step Renderer ──
  const renderQuestionStep = (qIndex: number) => {
    const q = ONBOARDING_QUESTIONS[qIndex];
    const Icon = q.icon;
    const answer = answers[qIndex];

    return (
      <div key={q.id} className="flex flex-col items-center px-6 pt-10">
        <motion.div
          className={`w-20 h-20 rounded-full bg-gradient-to-br ${q.color} flex items-center justify-center mb-6`}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <Icon className="w-8 h-8 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold font-serif text-foreground mb-2 text-center">
          {t(q.titleKey)}
        </h2>
        <p className="text-muted-foreground text-sm mb-8 text-center max-w-xs">
          {t(q.subtitleKey)}
        </p>

        {/* Voice Recorder */}
        <div className="w-full max-w-sm space-y-4">
          <div className="flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              {isTranscribing ? (
                <motion.div
                  key="transcribing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("onboarding.transcribing")}</p>
                </motion.div>
              ) : isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.button
                    className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-lg"
                    onClick={stopRecording}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Square className="w-8 h-8 text-destructive-foreground" />
                  </motion.button>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 bg-destructive rounded-full"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-sm font-medium text-destructive">
                      Recording {formatTime(recordingTime)}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-3"
                >
                  <motion.button
                    className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg"
                    onClick={startRecording}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Mic className="w-8 h-8 text-primary-foreground" />
                  </motion.button>
                  <p className="text-sm text-muted-foreground">
                    {answer ? t("onboarding.tapReRecord") : t("onboarding.tapRecord")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text fallback */}
          <textarea
            value={answer}
            onChange={(e) => updateAnswer(qIndex, e.target.value)}
            placeholder={t("onboarding.orType")}
            className="w-full min-h-[100px] p-4 rounded-xl bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
            >
              <Check className="w-4 h-4" />
              <span>{t("onboarding.answerCaptured")}</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  // ── Step Renderers ──
  const renderStep = () => {
    // Step 0: Language selection
    if (step === 0) {
      return (
        <div key="language" className="flex flex-col items-center text-center px-6 pt-16">
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-8"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Globe className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold font-serif text-foreground mb-3">{t("onboarding.chooseLanguage")}</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-8">
            {t("onboarding.chooseLanguageDesc")}
          </p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                  language === lang.code
                    ? "glass-card-strong ring-2 ring-primary"
                    : "glass-card hover:bg-muted/50"
                }`}
                onClick={() => setLanguage(lang.code)}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.native}</span>
                {language === lang.code && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      );
    }

    // Steps 1-6: Questions
    if (step >= 1 && step <= 6) {
      return renderQuestionStep(step - 1);
    }

    // Step 7: Worldview (religious question)
    if (step === 7) {
      return (
        <div key="worldview" className="flex flex-col items-center px-6 pt-10">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-6"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Heart className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-2 text-center">
            {t("onboarding.beliefSystem")}
          </h2>
          <p className="text-muted-foreground text-sm mb-8 text-center max-w-xs">
            {t("onboarding.beliefDesc")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center max-w-sm">
            {WORLDVIEW_OPTIONS.map((w) => (
              <motion.button
                key={w.value}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all ${
                  worldview === w.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 border border-border text-foreground hover:bg-muted"
                }`}
                onClick={() => setWorldview(worldview === w.value ? null : w.value)}
                whileTap={{ scale: 0.95 }}
              >
                <span>{w.emoji}</span>
                <span>{t(w.labelKey)}</span>
                {worldview === w.value && <Check className="w-4 h-4" />}
              </motion.button>
            ))}
          </div>
        </div>
      );
    }

    // Step 8: Analyzing
    if (step === 8) {
      return (
        <div key="analyzing" className="flex flex-col items-center text-center px-6 pt-24">
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-8"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          >
            <Sparkles className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold font-serif text-foreground mb-3">
            {t("onboarding.analyzingTitle")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-8">
            {t("onboarding.analyzingDesc")}
          </p>
          <div className="w-full max-w-xs">
            <motion.div
              className="h-2 bg-muted rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 8, ease: "easeOut" }}
              />
            </motion.div>
          </div>
        </div>
      );
    }

    // Step 9: Results
    if (step === 9 && soulProfile) {
      return (
        <div key="results" className="px-6 pt-8 pb-8">
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold font-serif text-foreground mb-2">
              Your Soul Profile
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Here's what we discovered about you
            </p>
          </div>

          {/* Summary */}
          <motion.div
            className="glass-card p-5 rounded-2xl mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-foreground leading-relaxed">{soulProfile.summary}</p>
          </motion.div>

          {/* Strengths */}
          <motion.div
            className="glass-card p-5 rounded-2xl mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" /> Your Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {soulProfile.strengths?.map((s: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {s}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Growth Areas / Weaknesses */}
          <motion.div
            className="glass-card p-5 rounded-2xl mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Growth Opportunities
            </h3>
            <div className="flex flex-wrap gap-2">
              {(soulProfile.weaknesses || soulProfile.growth_areas)?.map((w: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {w}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Fears */}
          <motion.div
            className="glass-card p-5 rounded-2xl mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Deep Fears
            </h3>
            <div className="flex flex-wrap gap-2">
              {soulProfile.fears?.map((f: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                  {f}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Personality Type */}
          {soulProfile.personality_type && (
            <motion.div
              className="glass-card p-5 rounded-2xl mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> Personality
              </h3>
              <p className="text-sm text-muted-foreground">{soulProfile.personality_type}</p>
            </motion.div>
          )}
        </div>
      );
    }

    return null;
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step >= 1 && step <= 6) return !!answers[step - 1]?.trim();
    if (step === 7) return true; // worldview is optional
    return false;
  };

  const handleNext = () => {
    if (step === 7) {
      // After worldview, run analysis
      runAnalysis();
    } else {
      next();
    }
  };

  return (
    <div className="min-h-screen gradient-warm flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">
            {step === 0 ? "Language" : step >= 1 && step <= 6 ? `Question ${step}/6` : step === 7 ? "Belief" : step === 8 ? "Analyzing" : "Profile"}
          </span>
          {step < 8 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleSkip}
              disabled={saving}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      {step !== 8 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex gap-3 max-w-md mx-auto">
            {step > 0 && step < 8 && step !== 9 && (
              <Button variant="outline" className="rounded-full flex-1" onClick={back} disabled={isRecording || isTranscribing}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {step < 8 && (
              <Button
                className="rounded-full flex-1 gradient-primary text-white"
                onClick={handleNext}
                disabled={!canProceed() || isRecording || isTranscribing}
              >
                {step === 0 ? "Get Started" : step === 7 ? "Analyze My Profile" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === 9 && (
              <Button
                className="rounded-full flex-1 gradient-primary text-white py-6 text-base"
                onClick={handleComplete}
                disabled={saving}
              >
                {saving ? "Saving..." : "Enter the App"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
