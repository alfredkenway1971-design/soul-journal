import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { useLanguage } from "@/contexts/LanguageContext";

import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import AppLanguageSwitcher from "@/components/AppLanguageSwitcher";
import QuickCapture from "@/components/premium/QuickCapture";
import RecentEntryCard from "@/components/premium/RecentEntryCard";
import AIInsightCard from "@/components/premium/AIInsightCard";
import WeatherBadge from "@/components/WeatherBadge";
import MoodFilterBar, { type MoodFilterValue } from "@/components/MoodFilterBar";
import OnThisDayCard from "@/components/OnThisDayCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Flame, TrendingUp, Clock } from "lucide-react";
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
  const api = useJournalAPI(language);
  
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<MoodFilterValue>("all");
  
  
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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
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

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 space-y-5">
        {/* Quick Capture */}
        <QuickCapture />

        {/* AI Insight */}
        <AIInsightCard userName={firstName} />

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
