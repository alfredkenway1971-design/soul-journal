import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Settings, Plus, Pencil, Check, X, Mail, Sparkles, Target, Heart, ChevronRight, Users, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarUpload from "@/components/premium/AvatarUpload";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { supabase } from "@/integrations/supabase/client";
import {
  loadAIPrefs, scanFreshToday, loadScan, saveScan, computeGoalStatuses,
  type GoalScanResult, type GoalStatus,
} from "@/lib/goalAccountability";
import type { Mood } from "@/components/MoodSelector";

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const api = useJournalAPI(language);
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [captureContext, setCaptureContext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ streak: 0, entries: 0, topMood: "happy" as Mood });
  const [interests, setInterests] = useState<string[]>([]);
  const [soulProfile, setSoulProfile] = useState<any>(null);
  // Goal Accountability Partner — goals + statuses for the Goals section
  const [goals, setGoals] = useState<string[]>([]);
  const [goalStatuses, setGoalStatuses] = useState<Record<string, GoalStatus> | null>(null);

  const interestEmojis: Record<string, string> = {
    "Mindfulness": "🌿",
    "Marathon Prep": "🏃",
    "Digital Art": "🎨",
    "Reading": "📚",
    "Meditation": "🧘",
    "Writing": "✍️",
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, interests, goals, avatar_url, gender, capture_context, soul_profile_summary')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.interests) setInterests(profile.interests);
        if ((profile as any)?.goals) setGoals(((profile as any).goals as any[]).map((g: any) => g?.title || g).filter(Boolean));
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        if ((profile as any)?.gender) setGender((profile as any).gender);
        if ((profile as any)?.capture_context) setCaptureContext(true);
        if ((profile as any)?.soul_profile_summary) setSoulProfile((profile as any).soul_profile_summary);

        // Fetch entries for stats
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('id, mood, created_at')
          .eq('user_id', user.id);

        if (entries) {
          // Calculate streak
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let streak = 0;
          
          for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const hasEntry = entries.some((e) => {
              const entryDate = new Date(e.created_at);
              entryDate.setHours(0, 0, 0, 0);
              return entryDate.getTime() === checkDate.getTime();
            });
            
            if (hasEntry) {
              streak++;
            } else if (i > 0) {
              break;
            }
          }

          // Calculate top mood
          const moodCounts: Record<string, number> = {};
          entries.forEach((e) => {
            if (e.mood) {
              moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
            }
          });
          const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood || "happy";

          setStats({
            streak,
            entries: entries.length,
            topMood,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Goal Accountability Partner — goals status (shares the 1x/day scan cache)
  useEffect(() => {
    const loadGoalStatuses = async () => {
      if (!user || goals.length === 0) return;
      if (!loadAIPrefs().goalAccountability) return;
      let results: GoalScanResult[] | null = scanFreshToday() ? loadScan() : null;
      if (!results) {
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('enhanced_text, original_transcription')
          .eq('user_id', user.id)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(15);
        const texts = (entries || [])
          .map((r: any) => r.enhanced_text || r.original_transcription || '')
          .filter((t: string) => t && t.trim().length > 5);
        try {
          results = await api.scanGoalMentions(goals, texts);
          saveScan(results);
        } catch (err) {
          console.warn('Goal scan failed:', err);
          results = loadScan();
        }
      }
      if (results) setGoalStatuses(computeGoalStatuses(goals, results));
    };
    loadGoalStatuses();
  }, [user, goals]);

  const handleGenderChange = async (newGender: string) => {
    if (!user) return;
    setGender(newGender);
    try {
      await supabase
        .from('profiles')
        .update({ gender: newGender } as any)
        .eq('id', user.id);
      toast({ title: t("profile.voiceUpdated"), description: `${t("profile.voicePreference")}: ${newGender}` });
    } catch {
      toast({ title: t("common.error"), description: t("profile.saveFailed"), variant: "destructive" });
    }
  };

  const handleCaptureContextToggle = async (next: boolean) => {
    if (!user) return;
    setCaptureContext(next);
    try {
      await supabase
        .from('profiles')
        .update({ capture_context: next } as any)
        .eq('id', user.id);
      toast({
        title: next ? "Context capture enabled" : "Context capture disabled",
        description: next
          ? "New entries will include weather, city and time of day."
          : "We'll only store the time of day for new entries.",
      });
    } catch {
      toast({ title: t("common.error"), description: t("profile.saveFailed"), variant: "destructive" });
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !editedName.trim()) return;
    try {
      await supabase
        .from('profiles')
        .update({ display_name: editedName.trim() })
        .eq('id', user.id);
      setDisplayName(editedName.trim());
      setIsEditingName(false);
      toast({ title: t("profile.nameUpdated"), description: t("profile.nameUpdatedDesc") });
    } catch {
      toast({ title: t("common.error"), description: t("profile.nameFailed"), variant: "destructive" });
    }
  };

  const startEditingName = () => {
    setEditedName(resolvedDisplayName);
    setIsEditingName(true);
  };

  const resolvedDisplayName = displayName.trim() || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "Journal User";

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="section-label">{t("profile.section")}</p>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 space-y-6">
        {/* Avatar Section */}
        <motion.div
          className="flex flex-col items-center pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4">
            {user && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                  displayName={resolvedDisplayName}
                onAvatarChange={setAvatarUrl}
              />
            )}
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-10 text-center text-lg font-semibold rounded-xl max-w-[200px]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveDisplayName()}
              />
              <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleSaveDisplayName}>
                <Check className="w-4 h-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={() => setIsEditingName(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <button className="flex items-center gap-2 group" onClick={startEditingName}>
              <h1 className="text-2xl font-display font-semibold text-foreground">{resolvedDisplayName}</h1>
              <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          {/* Email */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <Mail className="w-3.5 h-3.5" />
            <span>{user?.email}</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{stats.streak}</p>
            <p className="text-xs text-muted-foreground tracking-wider">{t("profile.streak")}</p>
          </div>
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{stats.entries}</p>
            <p className="text-xs text-muted-foreground tracking-wider">{t("profile.entries")}</p>
          </div>
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground capitalize">{t("profile.top")}</p>
            <p className="text-xs text-muted-foreground tracking-wider">{t("profile.mood")}</p>
          </div>
        </motion.div>

        {/* Gratitude Timeline link */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full flex items-center gap-3 glass-card rounded-2xl px-4 py-3.5 text-left"
          onClick={() => navigate("/settings/gratitude")}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 text-sm font-medium text-foreground">{t("gratitude.title")}</div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        {/* Relations link (private) */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="w-full flex items-center gap-3 glass-card rounded-2xl px-4 py-3.5 text-left"
          onClick={() => navigate("/settings/relations")}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="flex-1 text-sm font-medium text-foreground">{t("relations.title")}</span>
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        {/* Voice Gender Preference */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="section-label mb-3">{t("profile.voicePreference")}</p>
          <div className="glass-premium p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Select your preferred playback voice gender:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`p-4 rounded-xl border-2 text-center transition-all ${gender === 'male' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/50 bg-white/40 dark:bg-white/5 text-foreground'}`}
                onClick={() => handleGenderChange('male')}
              >
                <span className="text-2xl block mb-1">🧔</span>
                <span className="text-sm">{t("profile.male")}</span>
              </button>
              <button
                className={`p-4 rounded-xl border-2 text-center transition-all ${gender === 'female' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/50 bg-white/40 dark:bg-white/5 text-foreground'}`}
                onClick={() => handleGenderChange('female')}
              >
                <span className="text-2xl block mb-1">👩</span>
                <span className="text-sm">{t("profile.female")}</span>
              </button>
            </div>
          </div>
        </motion.section>

        {/* Context Capture */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="section-label mb-3">{t("profile.contextCapture")}</p>
          <div className="glass-premium p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground mb-1">Auto-capture weather & location</p>
                <p className="text-xs text-muted-foreground">
                  Add city, weather and time of day to new entries. Asks for browser location permission. Off by default.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={captureContext}
                onClick={() => handleCaptureContextToggle(!captureContext)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${captureContext ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${captureContext ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Current Focus */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="section-label mb-3">{t("profile.currentFocus")}</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span 
                key={interest}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 border border-border/50 text-sm font-medium"
              >
                <span>{interestEmojis[interest] || "✨"}</span>
                {interest}
              </span>
            ))}
            <button
              className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/settings/goals")}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.section>

        {/* Goals (Goal Accountability Partner) */}
        {goals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <p className="section-label">{t("profile.goalsTitle")}</p>
            </div>
            <div className="space-y-2">
              {goals.map((goal) => {
                const status = goalStatuses?.[goal] || "onTrack";
                const styles =
                  status === "celebrating"
                    ? "border-emerald-300/60 bg-emerald-50/70 dark:bg-emerald-950/20"
                    : status === "needsAttention"
                    ? "border-amber-200/70 bg-amber-50/70 dark:bg-amber-950/20"
                    : "border-border/50 bg-white/60 dark:bg-white/5";
                const dot =
                  status === "celebrating"
                    ? "bg-emerald-500"
                    : status === "needsAttention"
                    ? "bg-amber-500"
                    : "bg-primary";
                const label =
                  status === "celebrating"
                    ? t("profile.goalCelebrating")
                    : status === "needsAttention"
                    ? t("profile.goalAttention")
                    : t("profile.goalOnTrack");
                return (
                  <div
                    key={goal}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${styles}`}
                  >
                    <span className="text-sm font-medium text-foreground truncate">{goal}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label}
                      {status === "celebrating" && " 🎉"}
                    </span>
                  </div>
                );
              })}
              <button
                className="w-full text-xs font-medium text-primary py-1"
                onClick={() => navigate("/settings/goals")}
              >
                + {t("settings.goals")}
              </button>
            </div>
          </motion.section>
        )}

        {/* Ai Personality Summary */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <p className="section-label mb-3">{t("profile.personalitySummary")}</p>
          {soulProfile?.summary ? (
            <div className="glass-premium p-5 space-y-3">
              {soulProfile.personality_type && (
                <p className="text-sm font-medium text-primary italic">{soulProfile.personality_type}</p>
              )}
              <p className="text-foreground leading-relaxed">{soulProfile.summary}</p>
            </div>
          ) : (
            <div className="glass-premium p-5">
              <p className="text-sm text-muted-foreground">{t("profile.summaryMissing")}</p>
            </div>
          )}
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfileSettingsPage;
