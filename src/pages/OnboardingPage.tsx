import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Sparkles, Target, Mic, BookOpen, Heart, Shield, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = 0 | 1 | 2 | 3 | 4;

const PRESET_GOALS = [
  "Get a promotion", "Improve work-life balance", "Build better habits",
  "Reduce stress & anxiety", "Strengthen relationships", "Boost creativity",
];

const PRESET_STRENGTHS = [
  "Resilience", "Empathy", "Discipline", "Creativity",
  "Leadership", "Patience", "Courage", "Gratitude",
];

const PRESET_FEARS = [
  "Failure", "Rejection", "Loneliness", "Not being enough",
  "Change", "Vulnerability", "Disappointing others",
];

const WORLDVIEW_OPTIONS = [
  { label: "Islam", emoji: "☪️" },
  { label: "Christianity", emoji: "✝️" },
  { label: "Judaism", emoji: "✡️" },
  { label: "Buddhism", emoji: "☸️" },
  { label: "Hinduism", emoji: "🕉️" },
  { label: "Spiritual", emoji: "✨" },
  { label: "No preference", emoji: "🌍" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedFears, setSelectedFears] = useState<string[]>([]);
  const [worldview, setWorldview] = useState<string | null>(null);

  const next = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4) as Step);
  };

  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0) as Step);
  };

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const goals = selectedGoals.map((title, i) => ({
        id: `onb-${i}`,
        title,
        category: "personal",
        icon: "Target",
      }));

      const { error } = await supabase
        .from("profiles")
        .update({
          goals,
          strengths: selectedStrengths,
          fears: selectedFears,
          worldview,
          onboarding_completed: true,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: t("onboarding.welcomeToast"), description: t("onboarding.profileReady") });
      navigate("/", { replace: true });
    } catch (err) {
      toast({ title: t("common.error"), description: t("common.error"), variant: "destructive" });
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

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" className="flex flex-col items-center text-center px-6 pt-16">
      <motion.div
        className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-8"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <BookOpen className="w-10 h-10 text-primary" />
      </motion.div>
      <h1 className="text-3xl font-bold font-serif text-foreground mb-3">
        {t("onboarding.welcome")} <span className="italic">{t("onboarding.appName")}</span>
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-8">
        {t("onboarding.welcomeDesc")}
      </p>
      <div className="space-y-4 w-full max-w-xs">
        {[
          { icon: Mic, label: t("onboarding.feature1") },
          { icon: Sparkles, label: t("onboarding.feature2") },
          { icon: BookOpen, label: t("onboarding.feature3") },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>,

    // Step 1 — Goals & Worldview
    <div key="goals" className="px-6 pt-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">{t("onboarding.yourGoals")}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-5">{t("onboarding.goalsDesc")}</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {PRESET_GOALS.map((g) => (
          <Badge
            key={g}
            variant={selectedGoals.includes(g) ? "default" : "outline"}
            className={`cursor-pointer text-sm py-2 px-3 transition-all ${
              selectedGoals.includes(g) ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
            onClick={() => toggleItem(g, selectedGoals, setSelectedGoals)}
          >
            {selectedGoals.includes(g) && <Check className="w-3 h-3 mr-1" />}
            {g}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">{t("onboarding.worldview")}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{t("onboarding.worldviewDesc")}</p>
      <div className="flex flex-wrap gap-2">
        {WORLDVIEW_OPTIONS.map((w) => (
          <Badge
            key={w.label}
            variant={worldview === w.label ? "default" : "outline"}
            className={`cursor-pointer text-sm py-2 px-3 transition-all ${
              worldview === w.label ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
            onClick={() => setWorldview(worldview === w.label ? null : w.label)}
          >
            <span className="mr-1">{w.emoji}</span>
            {w.label}
          </Badge>
        ))}
      </div>
    </div>,

    // Step 2 — Strengths & Fears
    <div key="strengths" className="px-6 pt-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">{t("onboarding.yourStrengths")}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{t("onboarding.strengthsDesc")}</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {PRESET_STRENGTHS.map((s) => (
          <Badge
            key={s}
            variant={selectedStrengths.includes(s) ? "default" : "outline"}
            className={`cursor-pointer text-sm py-2 px-3 transition-all ${
              selectedStrengths.includes(s) ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
            onClick={() => toggleItem(s, selectedStrengths, setSelectedStrengths)}
          >
            {selectedStrengths.includes(s) && <Check className="w-3 h-3 mr-1" />}
            {s}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <Heart className="w-5 h-5 text-destructive" />
        </div>
        <h2 className="text-xl font-bold font-serif text-foreground">{t("onboarding.yourFears")}</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{t("onboarding.fearsDesc")}</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_FEARS.map((f) => (
          <Badge
            key={f}
            variant={selectedFears.includes(f) ? "default" : "outline"}
            className={`cursor-pointer text-sm py-2 px-3 transition-all ${
              selectedFears.includes(f) ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary"
            }`}
            onClick={() => toggleItem(f, selectedFears, setSelectedFears)}
          >
            {selectedFears.includes(f) && <Check className="w-3 h-3 mr-1" />}
            {f}
          </Badge>
        ))}
      </div>
    </div>,

    // Step 3 — Voice Clone teaser
    <div key="voice" className="flex flex-col items-center text-center px-6 pt-16">
      <motion.div
        className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-8"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
      >
        <Mic className="w-10 h-10 text-primary" />
      </motion.div>
      <h2 className="text-2xl font-bold font-serif text-foreground mb-3">{t("onboarding.cloneVoice")}</h2>
      <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-6">
        {t("onboarding.cloneVoiceDesc")}
      </p>
      <Button
        variant="outline"
        className="rounded-full px-6"
        onClick={() => navigate("/settings/voice")}
      >
        <Mic className="w-4 h-4 mr-2" />
        {t("onboarding.setupVoiceClone")}
      </Button>
      <p className="text-xs text-muted-foreground mt-3">{t("onboarding.doLater")}</p>
    </div>,

    // Step 4 — Ready
    <div key="ready" className="flex flex-col items-center text-center px-6 pt-16">
      <motion.div
        className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-8"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold font-serif text-foreground mb-3">{t("onboarding.allSet")}</h2>
      <p className="text-muted-foreground text-base leading-relaxed max-w-xs mb-8">
        {t("onboarding.allSetDesc")}
      </p>
      <Button
        className="rounded-full px-8 py-6 text-base gradient-primary text-white"
        onClick={handleComplete}
        disabled={saving}
      >
        {saving ? t("onboarding.saving") : t("onboarding.startJournaling")}
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>,
  ];

  return (
    <div className="min-h-screen gradient-warm flex flex-col">
      <div className="flex gap-1.5 px-6 pt-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 transition-all duration-300 ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-end px-6 pt-3">
        {step < 4 && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleSkip}
            disabled={saving}
          >
            {t("onboarding.skipForNow")}
          </button>
        )}
      </div>

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
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-3 max-w-md mx-auto">
          {step > 0 && step < 4 && (
            <Button variant="outline" className="rounded-full flex-1" onClick={back}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("onboarding.back")}
            </Button>
          )}
          {step < 4 && (
            <Button className="rounded-full flex-1 gradient-primary text-white" onClick={next}>
              {step === 0 ? t("onboarding.getStarted") : t("onboarding.continue")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
