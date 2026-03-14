import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InsightsChart from "@/components/InsightsChart";
import WeeklyMoodSummary from "@/components/premium/WeeklyMoodSummary";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/premium/UpgradePrompt";
import type { Mood } from "@/components/MoodSelector";

interface MoodCount {
  mood: Mood;
  count: number;
}

interface LanguageCount {
  language: string;
  count: number;
  flag: string;
  name: string;
}

const languageInfo: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇺🇸", name: "English" },
  fr: { flag: "🇫🇷", name: "French" },
  es: { flag: "🇪🇸", name: "Spanish" },
  ar: { flag: "🇸🇦", name: "Arabic" },
  zh: { flag: "🇨🇳", name: "Chinese" },
  ja: { flag: "🇯🇵", name: "Japanese" },
  sw: { flag: "🇰🇪", name: "Swahili" },
  de: { flag: "🇩🇪", name: "German" },
};

const InsightsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPremium } = useSubscription();
  
  const [moodData, setMoodData] = useState<MoodCount[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mostFeltMood, setMostFeltMood] = useState<string>("--");
  const [avgLength, setAvgLength] = useState("0:00");
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number; mood: Mood | null }[]>([]);
  const [languageData, setLanguageData] = useState<LanguageCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      
      try {
        const { data: entries, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!entries || entries.length === 0) {
          setLoading(false);
          return;
        }
        
        setTotalEntries(entries.length);
        
        const moodCounts: Record<string, number> = {};
        entries.forEach(entry => {
          if (entry.mood) {
            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
          }
        });
        
        const moodDataArray: MoodCount[] = Object.entries(moodCounts).map(([mood, count]) => ({
          mood: mood as Mood,
          count,
        }));
        setMoodData(moodDataArray);
        
        const topMood = moodDataArray.sort((a, b) => b.count - a.count)[0];
        if (topMood) {
          setMostFeltMood(topMood.mood.charAt(0).toUpperCase() + topMood.mood.slice(1));
        }
        
        const dates = entries.map(e => new Date(e.created_at).toDateString());
        const uniqueDates = [...new Set(dates)].sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        let streak = 1;
        let maxStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const curr = new Date(uniqueDates[i - 1]);
          const prev = new Date(uniqueDates[i]);
          const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
            maxStreak = Math.max(maxStreak, streak);
          } else {
            streak = 1;
          }
        }
        setBestStreak(maxStreak);
        
        const totalWords = entries.reduce((sum, e) => {
          const words = (e.enhanced_text || "").split(/\s+/).length;
          return sum + words;
        }, 0);
        const avgWords = totalWords / entries.length;
        const avgMinutes = Math.floor(avgWords / 150);
        const avgSeconds = Math.floor((avgWords % 150) / 2.5);
        setAvgLength(`${avgMinutes}:${avgSeconds.toString().padStart(2, '0')}`);
        
        const today = new Date();
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekData: { day: string; count: number; mood: Mood | null }[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dayName = weekDays[date.getDay()];
          const dateStr = date.toDateString();
          
          const dayEntries = entries.filter(e => 
            new Date(e.created_at).toDateString() === dateStr
          );
          
          weekData.push({
            day: dayName,
            count: dayEntries.length,
            mood: dayEntries[0]?.mood as Mood | null,
          });
        }
        setWeeklyData(weekData);
        
        const langCounts: Record<string, number> = {};
        entries.forEach(entry => {
          const lang = entry.playback_language || 'en';
          langCounts[lang] = (langCounts[lang] || 0) + 1;
        });
        
        const langDataArray: LanguageCount[] = Object.entries(langCounts)
          .map(([language, count]) => ({
            language,
            count,
            ...languageInfo[language] || { flag: "🌍", name: language },
          }))
          .sort((a, b) => b.count - a.count);
        setLanguageData(langDataArray);
        
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [user]);

  const maxLangCount = languageData[0]?.count || 1;

  const moodColors: Record<string, string> = {
    happy: "bg-mood-happy",
    good: "bg-mood-good",
    fine: "bg-mood-fine",
    sad: "bg-mood-sad",
    unhappy: "bg-mood-unhappy",
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t("insights.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("insights.yourPatterns")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {totalEntries === 0 ? (
          <motion.div
            className="glass-card rounded-2xl p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-muted-foreground mb-4">{t("insights.noEntries")}</p>
            <Button onClick={() => navigate("/record")}>
              {t("insights.createFirst")}
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("insights.totalEntries")}</span>
                </div>
                <p className="text-3xl font-semibold text-foreground">{totalEntries}</p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-journal-coral/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-journal-coral" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("insights.bestStreak")}</span>
                </div>
                <p className="text-3xl font-semibold text-foreground">{bestStreak} {t("insights.days")}</p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-mood-happy/20 flex items-center justify-center">
                    <span className="text-lg">😊</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{t("insights.mostFelt")}</span>
                </div>
                <p className="text-xl font-semibold text-foreground">{mostFeltMood}</p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-journal-sage/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("insights.avgLength")}</span>
                </div>
                <p className="text-xl font-semibold text-foreground">{avgLength} {t("insights.min")}</p>
              </div>
            </motion.div>

            <WeeklyMoodSummary />

            {!isPremium && (
              <UpgradePrompt compact feature={t("insights.detailedInsights")} />
            )}

            {isPremium && moodData.length > 0 && (
              <InsightsChart data={moodData} totalEntries={totalEntries} />
            )}

            <motion.div
              className="glass-card rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4">{t("insights.thisWeek")}</h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((day, index) => {
                  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
                  const heightPercent = (day.count / maxCount) * 100;
                  const colorClass = day.mood ? moodColors[day.mood] : "bg-muted";
                  
                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div
                        className={`w-full rounded-t-lg ${colorClass}`}
                        initial={{ height: 0 }}
                        animate={{ height: day.count > 0 ? `${Math.max(heightPercent, 10)}%` : "4px" }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      />
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {languageData.length > 0 && (
              <motion.div
                className="glass-card rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-4">{t("insights.languagesUsed")}</h3>
                <div className="space-y-3">
                  {languageData.map((lang, index) => (
                    <motion.div
                      key={lang.language}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="flex-1 text-sm font-medium">{lang.name}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full gradient-amber rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(lang.count / maxLangCount) * 100}%` }}
                          transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {lang.count}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default InsightsPage;
