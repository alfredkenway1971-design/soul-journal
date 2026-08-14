import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { useLanguage } from "@/contexts/LanguageContext";

import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import AppLanguageSwitcher from "@/components/AppLanguageSwitcher";
import QuickCapture from "@/components/premium/QuickCapture";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import RecentEntryCard from "@/components/premium/RecentEntryCard";
import AIInsightCard from "@/components/premium/AIInsightCard";
import WeatherBadge from "@/components/WeatherBadge";
import MoodFilterBar, { type MoodFilterValue } from "@/components/MoodFilterBar";
import OnThisDayCard from "@/components/OnThisDayCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Flame, TrendingUp, Clock, Target, X, Crown, ChevronRight } from "lucide-react";
import {
  loadAIPrefs, scanFreshToday, loadScan, saveScan, computeGoalStatuses,
  pickHomeCardItem, registerNudge, markCardSeen, markNotified, wasNotified,
  nudgesUsedThisWeek, NUDGE_MAX_PER_WEEK, type GoalScanResult, type GoalStatus,
} from "@/lib/goalAccountability";
import { analyzeMoodPatterns, alertFiredToday, markAlertFired, weekdayName } from "@/lib/moodAlerts";
import type { Mood } from "@/components/MoodSelector";

interface Entry {
  id: string;
  date: Date;
  title: string;
  preview: string;
  mood: Mood;
  hasAudio: boolean;
  duration?: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { isPremium } = useSubscription();
  const api = useJournalAPI(language);
  
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<MoodFilterValue>("all");
  const [homeInsight, setHomeInsight] = useState<string | null>(null);
  // Goal Accountability Partner card
  const [goalItem, setGoalItem] = useState<{ goal: string; status: GoalStatus; count: number } | null>(null);
  
  
  const currentDate = new Date();
  const dayOfWeek = format(currentDate, "EEEE");
  const formattedDate = format(currentDate, "MMM d") + ", " + dayOfWeek;
  
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return t("home.morning");
    if (currentHour < 17) return t("home.afternoon");
    return t("home.evening");
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Fetch entries
        const data = await api.getEntries(user.id);
        
        const fmtDur = (s?: number | null) => {
          if (!s || s <= 0) return undefined;
          const m = Math.floor(s / 60);
          const sec = s % 60;
          return `${m}:${sec.toString().padStart(2, "0")}`;
        };
        const formattedEntries: Entry[] = data.slice(0, 20).map((entry: any) => ({
          id: entry.id,
          date: new Date(entry.created_at),
          title: entry.title || t("entry.untitled"),
          preview: entry.enhanced_text || entry.original_transcription || "",
          mood: (entry.mood as Mood) || "fine",
          hasAudio: !!entry.audio_url,
          duration: fmtDur(entry.duration_seconds),
        }));
        
        setEntries(formattedEntries);

        // Fetch the latest AI coaching insight for the home card
        const { data: latestInsight } = await supabase
          .from('coaching_insights')
          .select('content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestInsight?.content) {
          setHomeInsight(latestInsight.content);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Goal Accountability Partner — 1 AI scan/day, cached; pick one card item
  useEffect(() => {
    const loadGoalCard = async () => {
      if (!user) return;
      if (!loadAIPrefs().goalAccountability) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', user.id)
          .maybeSingle();
        const goals = ((profile as any)?.goals || []).map((g: any) => g?.title || g).filter(Boolean) as string[];
        if (goals.length === 0) return;

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
        if (!results) return;

        const statuses = computeGoalStatuses(goals, results);
        const item = pickHomeCardItem(statuses, results, 'sj-goal-');
        if (!item) return;

        setGoalItem(item);
        if (item.status === 'needsAttention' && nudgesUsedThisWeek() < NUDGE_MAX_PER_WEEK) {
          registerNudge();
          const nKey = 'nudge:' + item.goal;
          if (!wasNotified(nKey) && 'Notification' in window && Notification.permission === 'granted') {
            markNotified(nKey);
            try {
              new Notification('Soul Journal', {
                body: t("home.goalNudge").replace("{goal}", item.goal),
                tag: 'goal-nudge',
                icon: '/favicon.ico',
              });
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Goal card failed:', err);
      }
    };
    loadGoalCard();
  }, [user]);

  const goalMessage = (item: { goal: string; status: GoalStatus; count: number }) => {
    if (item.status === 'celebrating') {
      return t("home.goalCelebrate").replace("{goal}", item.goal).replace("{count}", String(Math.max(item.count, 3)));
    }
    return t("home.goalNudge").replace("{goal}", item.goal);
  };

  const dismissGoalCard = () => {
    if (!goalItem) return;
    const typeKey = goalItem.status === 'celebrating' ? 'celebrate:' : 'nudge:';
    markCardSeen('sj-goal-' + typeKey + goalItem.goal);
    setGoalItem(null);
  };

  // Predictive Mood Alerts — 90-day pattern analysis, max 1 alert/day.
  // Notification only (no in-app card, per spec). Pure client-side math.
  useEffect(() => {
    const runPredictiveAlert = async () => {
      if (!user) return;
      if (!loadAIPrefs().predictiveMood) return;
      if (alertFiredToday()) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
        const { data } = await supabase
          .from('journal_entries')
          .select('mood, created_at')
          .eq('user_id', user.id)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(200);
        const points = (data || []).filter((r: any) => r.mood);
        const pattern = analyzeMoodPatterns(points);
        if (!pattern) return;
        const day = weekdayName(pattern.weekday, language);
        markAlertFired(pattern.weekday);
        try {
          new Notification('Soul Journal', {
            body: t("alert.predictiveBody").replace("{weekday}", day),
            tag: 'predictive-mood',
            icon: '/favicon.ico',
          });
        } catch {}
      } catch (err) {
        console.warn('Predictive mood alert failed:', err);
      }
    };
    runPredictiveAlert();
  }, [user]);

  const firstName = displayName?.split(' ')[0] || user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || t("home.friend");

  const currentStreak = (() => {
    if (entries.length === 0) return 0;
    const dates = entries.map(e => new Date(e.date).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (uniqueDates[0] === today) {
      streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]).getTime();
        const curr = new Date(uniqueDates[i]).getTime();
        if (prev - curr === 86400000) streak++;
        else break;
      }
    }
    return streak;
  })();

  // Win-moment upsell: contextual premium prompt after a streak/entry "win", capped at 1x/day
  const [showWinUpsell, setShowWinUpsell] = useState(false);
  useEffect(() => {
    if (isPremium) return;
    const hasWin = currentStreak >= 2 || entries.length >= 3;
    if (!hasWin) return;
    const key = `sj-win-upsell-${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setShowWinUpsell(true);
  }, [isPremium, currentStreak, entries.length]);

  return (
    <div className="min-h-screen gradient-warm pb-32">
      {/* Header */}
      <header className="pt-12 pb-3 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-w-0"
            >
              <h1 className="text-[34px] leading-tight font-bold text-foreground tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
              <div className="mt-1">
                <WeatherBadge />
              </div>
            </motion.div>
            <div className="flex items-center gap-1 pt-1">
              <AppLanguageSwitcher />
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Avatar
                  className="w-12 h-12 cursor-pointer ring-2 ring-white/60 shadow-md"
                  onClick={() => navigate("/settings/profile")}
                >
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-display font-bold text-lg">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>
          </div>
        </div>
      </header>

      {/* Streak Counter & Journey Recap */}
      <section className="max-w-lg mx-auto px-5 mt-5">
        <motion.div
          className="glass-premium p-5 rounded-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-lg font-bold text-foreground">{t("home.journey")}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("home.dayStreak")}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-2xl font-bold text-foreground">{entries.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("home.totalEntries")}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-lg font-bold text-foreground">
                  {entries.length >= 10 ? "📖" : entries.length >= 5 ? "🎯" : entries.length >= 3 ? "✨" : "🌱"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {entries.length >= 10 ? t("home.bookBuilder") : entries.length >= 5 ? t("home.coaching") : entries.length >= 3 ? t("home.aiInsights") : t("home.gettingStarted")}
              </p>
            </div>
          </div>
          {/* Progressive unlock hint */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {entries.length < 3 ? `✨ ${3 - entries.length} ${t("home.unlockAIInsights")}` :
               entries.length < 5 ? `✨ ${5 - entries.length} ${t("home.unlockCoaching")}` :
               entries.length < 10 ? `✨ ${10 - entries.length} ${t("home.unlockBookBuilder")}` :
               `🎉 ${t("home.allUnlocked")}`}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Win-moment upsell */}
      {showWinUpsell && (
        <section className="max-w-lg mx-auto px-5 mt-3">
          <UpgradePrompt
            compact
            feature={currentStreak >= 2 ? t("home.dayStreak") : t("home.totalEntries")}
            description={currentStreak >= 2 ? t("upgrade.winStreak") : t("upgrade.winEntries")}
          />
        </section>
      )}

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 space-y-5">
        {/* AI Insight — primary hook, above Quick Capture */}
        <AIInsightCard insight={homeInsight || undefined} userName={firstName} />

        {/* Soul Mirror — flagship monthly portrait (premium destination) */}
        <button
          className="relative w-full overflow-hidden rounded-2xl p-4 text-left border border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20"
          onClick={() => navigate("/soul-mirror")}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-white/10 border border-emerald-200/60 flex items-center justify-center text-xl">
              ✨
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                {t("soulMirror.title")}
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </p>
              <p className="text-xs text-muted-foreground truncate">{t("soulMirror.homeTagline")}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary shrink-0" />
          </div>
        </button>

        {/* Goal Accountability Partner — nudge or celebration */}
        {goalItem && (
          <div
            className={`relative rounded-2xl p-4 border ${
              goalItem.status === "celebrating"
                ? "border-emerald-300/60 bg-emerald-50/80 dark:bg-emerald-950/20"
                : "border-amber-200/70 bg-amber-50/80 dark:bg-amber-950/20"
            }`}
          >
            <button
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              onClick={dismissGoalCard}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  goalItem.status === "celebrating" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
                }`}
              >
                <Target className={`w-4.5 h-4.5 ${goalItem.status === "celebrating" ? "text-emerald-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{t("home.goalCheckIn")}</p>
                <p className="text-sm text-foreground/90 mt-0.5">{goalMessage(goalItem)}</p>
                <button
                  className="text-xs font-medium text-primary mt-1.5"
                  onClick={() => navigate("/settings")}
                >
                  {t("home.goalView")} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Capture */}
        <QuickCapture />

        {/* Mood Filter Bar */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-2.5">{t("home.moodFilter")}</h2>
          <MoodFilterBar value={moodFilter} onChange={setMoodFilter} />
        </section>

        {/* On This Day memories */}
        <OnThisDayCard />

        {/* Recent Entries */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground">{t("home.recentEntries")}</h2>
            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => navigate("/calendar")}
            >
              {t("home.viewAll")}
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (() => {
            const filtered = moodFilter === "all"
              ? entries
              : entries.filter((e) => e.mood === moodFilter);
            if (filtered.length === 0 && entries.length > 0) {
              return (
                <div className="glass-premium p-8 text-center">
                  <span className="text-3xl mb-3 block">🌱</span>
                  <p className="text-muted-foreground">{t("home.noMoodMemories")}</p>
                </div>
              );
            }
            if (filtered.length === 0 && entries.length === 0) {
              return (
                <motion.div
                  className="glass-premium p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-4xl mb-4 block">📝</span>
                  <p className="text-muted-foreground mb-4">{t("home.noEntries")}</p>
                  <button
                    className="gradient-primary text-white px-6 py-2.5 rounded-full font-medium"
                    onClick={() => navigate("/record")}
                  >
                    {t("home.createFirst")}
                  </button>
                </motion.div>
              );
            }
            if (filtered.length === 0) return null;
            return (
              <div className="space-y-3">
                {filtered.slice(0, 5).map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <RecentEntryCard
                      id={entry.id}
                      title={entry.title}
                      preview={entry.preview.substring(0, 50) + "..."}
                      date={entry.date}
                      mood={entry.mood}
                      duration={entry.duration}
                      onClick={() => navigate(`/entry/${entry.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            );
          })()}
        </section>
      </main>


      <BottomNav />
    </div>
  );
};

export default HomePage;
