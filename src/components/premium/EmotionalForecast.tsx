import { useState, useEffect } from "react";
import { CloudRain, Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { loadAIPrefs } from "@/lib/goalAccountability";
import { getWeekKey } from "@/lib/goalAccountability";

interface ForecastResult {
  declining: boolean;
  forecast: string;
  suggestion: string;
}

const CACHE_KEY = "sj-forecast";

const loadForecastCache = (): { week: string; result: ForecastResult } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveForecastCache = (result: ForecastResult) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ week: getWeekKey(), result }));
  } catch {}
};

/**
 * Feature 6: Emotional Forecasting — a section inside the Weekly Soul Review.
 * Analyzes the last 14 days for declining trends (AI, once per ISO week),
 * shows ONE forecast (observation framing) + ONE preventive suggestion.
 * Hidden when there is no declining trend or not enough data.
 */
const EmotionalForecast = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const api = useJournalAPI(language);

  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadForecast = async () => {
      if (!user) return;
      if (!loadAIPrefs().emotionalForecast) {
        setLoading(false);
        return;
      }

      // Serve this week's cached forecast (generated on/after Monday)
      const cached = loadForecastCache();
      if (cached && cached.week === getWeekKey()) {
        setResult(cached.result);
        setLoading(false);
        return;
      }

      try {
        const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
        const { data } = await supabase
          .from('journal_entries')
          .select('mood, created_at, enhanced_text, original_transcription')
          .eq('user_id', user.id)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: true })
          .limit(30);
        const rows = (data || [])
          .map((r: any) => ({
            mood: r.mood || "fine",
            created_at: r.created_at,
            text: r.enhanced_text || r.original_transcription || "",
          }))
          .filter((r: any) => r.text && r.text.trim().length > 5);
        if (rows.length < 8) {
          setLoading(false);
          return; // not enough data for a meaningful trend
        }
        const forecast = await api.forecastEmotion(
          rows.map((r: any) => ({ mood: r.mood, text: r.text })),
          getLanguageName(language)
        );
        saveForecastCache(forecast);
        setResult(forecast);
      } catch (err) {
        console.warn('Emotional forecast failed:', err);
        const cached = loadForecastCache();
        if (cached && cached.week === getWeekKey()) setResult(cached.result);
      } finally {
        setLoading(false);
      }
    };
    loadForecast();
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-primary/5 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!result || !result.declining || !result.forecast) return null;

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2">
        <CloudRain className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{t("weekly.forecastTitle")}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{result.forecast}</p>
      <div className="flex items-start gap-2 pt-1">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">{t("weekly.forecastSuggestion")}: </span>
          {result.suggestion}
        </p>
      </div>
    </div>
  );
};

export default EmotionalForecast;
