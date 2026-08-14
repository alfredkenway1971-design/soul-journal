import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Palette,
  Moon,
  Type,
  Mic,
  Download,
  LogOut,
  Crown,
  Shield,
  CreditCard,
  AlarmClock,
  PenSquare,
  Sunrise,
  Edit3,
  FileText,
  RefreshCcw,
  Sparkles,
  Heart,
  Users,
} from "lucide-react";
import { loadAIPrefs, saveAIPrefs, type AIPrefs } from "@/lib/goalAccountability";
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
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import AppLanguageSwitcher from "@/components/AppLanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="glass-premium p-5">
    <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
    {children}
  </div>
);

const IconTile = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 flex-1 min-w-0"
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(220,235,250,0.55))",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px -2px hsla(215,50%,30%,0.08)",
      }}
    >
      <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
    </div>
    <span className="text-xs font-medium text-foreground text-center leading-tight">
      {label}
    </span>
  </button>
);

const Row = ({
  icon: Icon,
  label,
  right,
  onClick,
}: {
  icon: any;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 py-2"
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(220,235,250,0.55))",
        border: "1px solid rgba(255,255,255,0.6)",
      }}
    >
      <Icon className="w-[18px] h-[18px] text-primary" strokeWidth={2} />
    </div>
    <span className="flex-1 text-left text-base font-medium text-foreground">
      {label}
    </span>
    {right}
  </button>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [aiPrefs, setAiPrefs] = useState<AIPrefs>(() => loadAIPrefs());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      const isDark = saved === "true";
      setDarkMode(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    }
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url || null);
      }
    })();
  }, [user]);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem("darkMode", String(enabled));
    document.documentElement.classList.toggle("dark", enabled);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t("settings.signedOut") });
    navigate("/auth");
  };

  const handleRedoOnboarding = async () => {
    if (!user) return;
    setRedoing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: false,
          strengths: [],
          fears: [],
          worldview: null,
          soul_profile_summary: null,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: t("settings.redoOnboarding"), description: t("settings.redoConfirmDesc") });
      navigate("/onboarding");
    } catch (error) {
      console.error("Redo onboarding error:", error);
      toast({ title: t("common.error"), description: t("settings.redoConfirmDesc"), variant: "destructive" });
    } finally {
      setRedoing(false);
    }
  };

  const firstName =
    displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    t("home.friend");

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <header className="pt-12 pb-3 px-5">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-white/60 shadow-md">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="flex-1 text-3xl font-bold text-foreground">{t("settings.title")}</h1>
          <AppLanguageSwitcher />
          <button
            className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center"
            onClick={() => navigate("/settings/profile")}
            aria-label={t("settings.editProfile")}
          >
            <Edit3 className="w-4 h-4 text-primary" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SectionCard title={t("settings.account")}>
            <div className="flex items-start gap-2">
              <IconTile icon={User} label={t("settings.profile")} onClick={() => navigate("/settings/profile")} />
              <IconTile icon={PenSquare} label={t("settings.identityPath")} onClick={() => navigate("/settings/goals")} />
              <IconTile icon={CreditCard} label={t("settings.manageSubscription")} onClick={() => navigate("/pricing")} />
              <IconTile icon={Shield} label={t("settings.security")} onClick={() => navigate("/settings/security")} />
              <IconTile icon={Mic} label={t("settings.voice")} onClick={() => navigate("/settings/voice")} />
            </div>

            {/* Redo Onboarding */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-3 py-2 mt-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(220,235,250,0.55))",
                      border: "1px solid rgba(255,255,255,0.6)",
                    }}
                  >
                    <RefreshCcw className="w-[18px] h-[18px] text-primary" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-left text-base font-medium text-foreground">
                    {t("settings.redoOnboarding")}
                  </span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.redoConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("settings.redoConfirmDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={redoing}
                    onClick={handleRedoOnboarding}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {t("settings.redoConfirmAction")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SectionCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionCard title={t("settings.reminders.section")}>
            <Row
              icon={AlarmClock}
              label={t("settings.dailyReminder")}
              right={
                <Switch
                  checked={dailyReminder}
                  onCheckedChange={setDailyReminder}
                />
              }
            />
            
            <Row icon={Sunrise} label={t("settings.morningReflection")} onClick={() => navigate("/settings/reminders")} />
            <Row
              icon={Sparkles}
              label={t("settings.predictiveMood")}
              right={
                <Switch
                  checked={aiPrefs.predictiveMood}
                  onCheckedChange={(checked) => {
                    const next = { ...aiPrefs, predictiveMood: checked };
                    setAiPrefs(next);
                    saveAIPrefs(next);
                  }}
                />
              }
            />
            <p className="text-xs text-muted-foreground px-1 -mt-1">{t("settings.predictiveMoodDesc")}</p>
          </SectionCard>
        </motion.div>

        {/* AI Preferences */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <SectionCard title={t("settings.aiPrefs")}>
            <Row
              icon={Sparkles}
              label={t("settings.goalAccountability")}
              right={
                <Switch
                  checked={aiPrefs.goalAccountability}
                  onCheckedChange={(checked) => {
                    const next = { ...aiPrefs, goalAccountability: checked };
                    setAiPrefs(next);
                    saveAIPrefs(next);
                  }}
                />
              }
            />
            <p className="text-xs text-muted-foreground px-1 -mt-1">{t("settings.goalAccountabilityDesc")}</p>
            <Row
              icon={Heart}
              label={t("settings.gratitudeTimeline")}
              right={
                <Switch
                  checked={aiPrefs.gratitudeTimeline}
                  onCheckedChange={(checked) => {
                    const next = { ...aiPrefs, gratitudeTimeline: checked };
                    setAiPrefs(next);
                    saveAIPrefs(next);
                  }}
                />
              }
            />
            <p className="text-xs text-muted-foreground px-1 -mt-1">{t("settings.gratitudeTimelineDesc")}</p>
            <Row
              icon={Sparkles}
              label={t("settings.emotionalForecast")}
              right={
                <Switch
                  checked={aiPrefs.emotionalForecast}
                  onCheckedChange={(checked) => {
                    const next = { ...aiPrefs, emotionalForecast: checked };
                    setAiPrefs(next);
                    saveAIPrefs(next);
                  }}
                />
              }
            />
            <p className="text-xs text-muted-foreground px-1 -mt-1">{t("settings.emotionalForecastDesc")}</p>
            <Row
              icon={Users}
              label={t("settings.relationsTracker")}
              right={
                <Switch
                  checked={aiPrefs.relationsTracker}
                  onCheckedChange={(checked) => {
                    const next = { ...aiPrefs, relationsTracker: checked };
                    setAiPrefs(next);
                    saveAIPrefs(next);
                  }}
                />
              }
            />
            <p className="text-xs text-muted-foreground px-1 -mt-1">{t("settings.relationsTrackerDesc")}</p>
          </SectionCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionCard title={t("settings.appearance")}>
            <Row
              icon={Moon}
              label={t("settings.darkMode")}
              right={
                <Switch
                  checked={darkMode}
                  onCheckedChange={handleDarkModeToggle}
                />
              }
            />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => navigate("/settings/themes")}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                  <Palette className="w-[18px] h-[18px] text-primary" />
                </div>
                <span className="text-base font-medium text-foreground">{t("settings.themes")}</span>
              </button>
              <button
                onClick={() => navigate("/settings/fonts")}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                  <Type className="w-[18px] h-[18px] text-primary" />
                </div>
                <span className="text-base font-medium text-foreground">{t("settings.fonts")}</span>
              </button>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionCard title={t("settings.dataPrivacy")}>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/settings/export")}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                  <Download className="w-[18px] h-[18px] text-primary" />
                </div>
                <span className="text-base font-medium text-foreground">{t("settings.export")}</span>
              </button>
              <button className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center">
                  <FileText className="w-[18px] h-[18px] text-primary" />
                </div>
                <span className="text-base font-medium text-foreground">{t("settings.privacyPolicy")}</span>
              </button>
            </div>
          </SectionCard>
        </motion.div>

        {isAdmin && (
          <motion.button
            onClick={() => navigate("/admin")}
            className="w-full glass-premium p-4 flex items-center gap-3"
          >
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{t("settings.admin")}</span>
          </motion.button>
        )}

        <motion.button
          onClick={handleSignOut}
          className="w-full glass-premium p-4 flex items-center justify-center gap-2 text-destructive font-semibold"
        >
          <LogOut className="w-5 h-5" />
          {t("settings.signOut")}
        </motion.button>
      </main>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
