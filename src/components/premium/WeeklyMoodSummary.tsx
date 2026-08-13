import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invokeEnhance } from "@/lib/aiText";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import type { Mood } from "@/components/MoodSelector";

interface MoodEntry {
  mood: string;
  created_at: string;
  enhanced_text: string | null;
}

interface WeeklySummary {
  dominantMood: Mood | null;
  moodTrend: 'improving' | 'declining' | 'stable';
  totalEntries: number;
  moodDistribution: Record<Mood, number>;
  insight: string;
}

const moodScores: Record<Mood, number> = {
  happy: 5,
  good: 4,
  fine: 3,
  sad: 2,
  unhappy: 1,
};

const moodEmojis: Record<Mood, string> = {
  happy: "😄",
  good: "😊",
  fine: "😐",
  sad: "😢",
  unhappy: "😔",
};

const moodLabels: Record<Mood, string> = {
  happy: "Happy",
  good: "Good",
  fine: "Neutral",
  sad: "Sad",
  unhappy: "Unhappy",
};

const WeeklyMoodSummary = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchWeeklySummary();
  }, [user]);

  const fetchWeeklySummary = async () => {
    if (!user) return;

    try {
      // Get entries from the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('mood, created_at, enhanced_text')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        setSummary(null);
        setLoading(false);
        return;
      }

      // Calculate mood distribution
      const moodDistribution: Record<Mood, number> = {
        happy: 0,
        good: 0,
        fine: 0,
        sad: 0,
        unhappy: 0,
      };

      entries.forEach((entry) => {
        const mood = entry.mood as Mood;
        if (mood && moodDistribution[mood] !== undefined) {
          moodDistribution[mood]++;
        }
      });

      // Find dominant mood
      let dominantMood: Mood | null = null;
      let maxCount = 0;
      (Object.keys(moodDistribution) as Mood[]).forEach((mood) => {
        if (moodDistribution[mood] > maxCount) {
          maxCount = moodDistribution[mood];
          dominantMood = mood;
        }
      });

      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(entries.length / 2);
      const firstHalf = entries.slice(0, midpoint);
      const secondHalf = entries.slice(midpoint);

      const avgFirstHalf = firstHalf.reduce((sum, e) => sum + (moodScores[e.mood as Mood] || 3), 0) / (firstHalf.length || 1);
      const avgSecondHalf = secondHalf.reduce((sum, e) => sum + (moodScores[e.mood as Mood] || 3), 0) / (secondHalf.length || 1);

      let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (avgSecondHalf > avgFirstHalf + 0.5) {
        moodTrend = 'improving';
      } else if (avgSecondHalf < avgFirstHalf - 0.5) {
        moodTrend = 'declining';
      }

      // Generate insight
      let insight = "";
      if (moodTrend === 'improving') {
        insight = `Your emotional wellbeing has been improving this week. ${dominantMood === 'happy' || dominantMood === 'good' ? "Keep up the great work!" : "You're making progress!"}`;
      } else if (moodTrend === 'declining') {
        insight = `It seems like you've been facing some challenges lately. Remember to practice self-care and reach out if you need support.`;
      } else {
        insight = `Your mood has been relatively stable this week. ${dominantMood === 'happy' || dominantMood === 'good' ? "You're in a good place!" : "Consider activities that bring you joy."}`;
      }

      setSummary({
        dominantMood,
        moodTrend,
        totalEntries: entries.length,
        moodDistribution,
        insight,
      });
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsight = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: entries } = await supabase
        .from('journal_entries')
        .select('enhanced_text, mood, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (entries && entries.length > 0) {
        const entrySummary = entries
          .map(e => `Mood: ${e.mood}, Content: ${e.enhanced_text?.slice(0, 200) || 'N/A'}`)
          .join('\n');

        try {
          const data = await invokeEnhance({
            text: entrySummary,
            tone: 'analysis',
            customPrompt: 'Analyze these journal entries from the past week and provide a brief, empathetic 2-sentence insight about the person\'s emotional patterns and one actionable suggestion:',
            language: getLanguageName(language),
          });

          if (data?.enhancedText) {
            setSummary(prev => prev ? { ...prev, insight: data.enhancedText } : prev);
          }
        } catch (insightError) {
          console.warn('AI insight failed:', insightError);
        }
      }
    } catch (error) {
      console.error('Error generating AI insight:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getTrendIcon = () => {
    if (!summary) return null;
    switch (summary.moodTrend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-muted-foreground text-sm">{t("weekly.startJournaling")}</p>
      </div>
    );
  }

  const maxMoodCount = Math.max(...Object.values(summary.moodDistribution), 1);

  return (
    <motion.div
      className="glass-card rounded-2xl p-6 space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{t("weekly.report")}</h3>
          <p className="text-sm text-muted-foreground">{t("weekly.last7Days")}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
          {getTrendIcon()}
          <span className="text-sm capitalize">{summary.moodTrend}</span>
        </div>
      </div>

      {/* Dominant Mood */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10">
        <span className="text-4xl">{summary.dominantMood ? moodEmojis[summary.dominantMood] : "😐"}</span>
        <div>
          <p className="text-sm text-muted-foreground">{t("weekly.mostFelt")}</p>
          <p className="font-semibold text-lg">{summary.dominantMood ? t("weekly.mood." + summary.dominantMood) : "N/A"}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-primary">{summary.totalEntries}</p>
          <p className="text-xs text-muted-foreground">{t("calendar.entries")}</p>
        </div>
      </div>

      {/* Mood Distribution */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{t("weekly.distribution")}</p>
        <div className="space-y-2">
          {(Object.keys(summary.moodDistribution) as Mood[]).map((mood) => {
            const count = summary.moodDistribution[mood];
            const percentage = (count / maxMoodCount) * 100;
            return (
              <div key={mood} className="flex items-center gap-2">
                <span className="w-6 text-center">{moodEmojis[mood]}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: count > 0 ? `${Math.max(percentage, 5)}%` : '0%' }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  />
                </div>
                <span className="w-6 text-sm text-muted-foreground text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insight */}
      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{t("weekly.insight")}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary.insight}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl gap-2"
          onClick={generateAIInsight}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate AI Insight
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default WeeklyMoodSummary;
