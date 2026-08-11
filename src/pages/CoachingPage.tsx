import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Target,
  RefreshCw,
  Flower2,
  Check,
  Play,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { FREE_LIMITS } from "@/contexts/SubscriptionContext";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { smartTitleCase } from "@/lib/smartTitleCase";

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  content: string;
  related_goal: string | null;
  is_read: boolean;
  is_completed: boolean;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  completed?: boolean;
}

// Reusable glass card style block
const GLASS = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(220,240,255,0.28) 100%)",
  boxShadow:
    "0 20px 50px -20px hsl(215 60% 25% / 0.35), inset 0 1px 0 rgba(255,255,255,0.65)",
};

const CoachingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { coachingCallsThisMonth, coachingLimitReached, canUseCoaching, refetch } = useUsageLimits();
  const { language } = useLanguage();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [insightsRes, profileRes, entriesRes] = await Promise.all([
        supabase
          .from("coaching_insights")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("profiles").select("goals").eq("id", user.id).maybeSingle(),
        supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", weekStart.toISOString()),
      ]);

      setInsights(insightsRes.data || []);
      if (profileRes.data?.goals && Array.isArray(profileRes.data.goals)) {
        setGoals(profileRes.data.goals as unknown as Goal[]);
      }
      setWeeklyCount(entriesRes.count ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!user) return;
    if (!canUseCoaching) {
      toast({
        title: "Coaching Limit Reached",
        description: `Free plan allows ${FREE_LIMITS.aiCoachingCallsPerMonth} AI coaching calls per month. Upgrade for unlimited.`,
        variant: "destructive",
      });
      navigate("/pricing");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-coaching-insights", {
        body: { language: getLanguageName(language) },
      });
      if (error) throw error;
      toast({
        title: "Insights Generated",
        description: `${data.insightsCount || 0} new insights based on your journal entries.`,
      });
      await refetch();
      fetchData();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: t("coach.generateFailed"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const completeChallenge = async (id: string) => {
    try {
      await supabase.from("coaching_insights").update({ is_completed: true }).eq("id", id);
      setInsights((p) => p.map((i) => (i.id === id ? { ...i, is_completed: true } : i)));
      toast({ title: "Challenge Completed! 🎉" });
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = insights.filter((i) => !i.is_read).length;
  const activeChallenge = insights.find((i) => i.insight_type === "challenge" && !i.is_completed);
  const weeklyTarget = 7;
  const progress = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-28 relative overflow-hidden">
      {/* Sky water caustics for depth */}
      <div className="absolute top-0 inset-x-0 h-72 pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.45) 0%, transparent 45%), radial-gradient(ellipse at 80% 30%, rgba(160,210,255,0.45) 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <header className="relative pt-12 pb-3 px-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/50 backdrop-blur-md border border-white/60"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/50 backdrop-blur-md border border-white/60"
            onClick={generateInsights}
            disabled={generating || coachingLimitReached}
            title={t("coach.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-5 space-y-5">
        {/* AI Coach Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] p-5 backdrop-blur-2xl border border-white/55 flex items-center gap-4"
          style={GLASS}
        >
          <div
            className="w-20 h-20 rounded-3xl shrink-0 flex items-center justify-center border border-white/70"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(180,215,250,0.6))",
              boxShadow:
                "0 8px 24px -8px hsl(215 60% 35% / 0.4), inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            {/* swirl */}
            <svg viewBox="0 0 32 32" className="w-9 h-9 text-[hsl(215_70%_45%)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4a12 12 0 1 0 12 12" />
              <path d="M16 10a6 6 0 1 0 6 6" />
              <circle cx="16" cy="16" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-display font-semibold text-foreground leading-tight">
              {smartTitleCase("AI Coach")}
            </h1>
            <p className="text-sm text-foreground/75 mt-1 leading-snug">
              Your personal wellness guide.
              <br />
              {unreadCount > 0 ? `${unreadCount} ${t("coach.newInsights")}` : t("coach.tapRefresh")}
            </p>
          </div>
        </motion.div>

        {/* Your Goals Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[28px] p-5 backdrop-blur-2xl border border-white/55"
          style={GLASS}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/70"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(180,215,250,0.55))",
              }}
            >
              <Target className="w-5 h-5 text-[hsl(215_70%_40%)]" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {smartTitleCase("Your Goals")}
            </h2>
            <button
              onClick={() => navigate("/settings/goals")}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              Edit
            </button>
          </div>

          {goals.length === 0 ? (
            <p className="text-sm text-foreground/70">
              Set your first goal to see personalized progress here.
            </p>
          ) : (
            <div className="space-y-1">
              {goals.slice(0, 3).map((g, i) => (
                <div
                  key={g.id || i}
                  className={`flex items-center justify-between py-3 ${
                    i < Math.min(goals.length, 3) - 1 ? "border-b border-white/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full border-2 border-white/70 flex items-center justify-center shrink-0">
                      {g.completed && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-[15px] text-foreground/90 truncate">{g.title}</span>
                  </div>
                  <button
                    className="w-7 h-7 rounded-full bg-white/65 border border-white/70 flex items-center justify-center"
                    aria-label={g.completed ? "Done" : "Track"}
                  >
                    {g.completed ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Weekly entries progress */}
          <div className="mt-5">
            <p className="text-sm text-foreground/85 mb-2">
              Journal entries this week: <span className="font-medium">{weeklyCount}/{weeklyTarget}</span>
            </p>
            <div className="h-2 rounded-full bg-white/45 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(205 90% 65%), hsl(215 85% 55%))",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Active Challenges Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] p-5 backdrop-blur-2xl border border-white/55"
          style={GLASS}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,210,160,0.85) 0%, rgba(255,180,140,0.6) 100%)",
                boxShadow: "0 6px 16px -6px hsl(25 80% 50% / 0.35)",
              }}
            >
              <Flower2 className="w-5 h-5 text-orange-700" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {smartTitleCase("Active Challenges")}
            </h2>
          </div>

          {activeChallenge ? (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {smartTitleCase(activeChallenge.title)}
              </h3>
              <p className="text-[15px] text-foreground/80 leading-relaxed mb-5">
                {activeChallenge.content}
              </p>
              <button
                onClick={() => completeChallenge(activeChallenge.id)}
                className="w-full h-12 rounded-full bg-white/55 border border-white/70 backdrop-blur-md text-foreground font-medium hover:bg-white/70 transition"
              >
                Start Challenge
              </button>
            </>
          ) : (
            <p className="text-sm text-foreground/75">
              No active challenges right now. Tap refresh to receive a new one.
            </p>
          )}
        </motion.div>

        {/* Recent insights (compact) */}
        {insights.filter((i) => i.insight_type !== "challenge" || i.is_completed).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="px-1 mb-2 text-sm font-medium text-foreground/70">{t("coach.recentInsights")}</h2>
            <div className="space-y-2">
              {insights
                .filter((i) => i.insight_type !== "challenge" || i.is_completed)
                .slice(0, 4)
                .map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-2xl p-4 border border-white/55 backdrop-blur-xl"
                    style={GLASS}
                  >
                    <p className="font-medium text-foreground">{smartTitleCase(insight.title)}</p>
                    <p className="text-sm text-foreground/80 mt-1">{insight.content}</p>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {coachingLimitReached && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive flex items-center justify-between">
            <span>{coachingCallsThisMonth}/{FREE_LIMITS.aiCoachingCallsPerMonth} coaching calls used this month</span>
            <button onClick={() => navigate("/pricing")} className="underline ml-2 shrink-0">
              Upgrade
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CoachingPage;
