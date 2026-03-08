import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, FREE_LIMITS } from "@/contexts/SubscriptionContext";

interface UsageLimits {
  textEntriesToday: number;
  audioEntriesThisWeek: number;
  canCreateTextEntry: boolean;
  canCreateAudioEntry: boolean;
  textLimitReached: boolean;
  audioLimitReached: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUsageLimits = (): UsageLimits => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [textEntriesToday, setTextEntriesToday] = useState(0);
  const [audioEntriesThisWeek, setAudioEntriesThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user || isPremium) {
      setLoading(false);
      return;
    }

    try {
      // Count today's text entries (entries without audio_url)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: textCount } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("audio_url", null)
        .gte("created_at", todayStart.toISOString());

      // Count this week's audio entries (entries with audio_url)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);

      const { count: audioCount } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("audio_url", "is", null)
        .gte("created_at", weekStart.toISOString());

      setTextEntriesToday(textCount ?? 0);
      setAudioEntriesThisWeek(audioCount ?? 0);
    } catch (error) {
      console.error("Error fetching usage limits:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isPremium]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const textLimitReached = !isPremium && textEntriesToday >= FREE_LIMITS.textEntriesPerDay;
  const audioLimitReached = !isPremium && audioEntriesThisWeek >= FREE_LIMITS.audioEntriesPerWeek;

  return {
    textEntriesToday,
    audioEntriesThisWeek,
    canCreateTextEntry: isPremium || !textLimitReached,
    canCreateAudioEntry: isPremium || !audioLimitReached,
    textLimitReached,
    audioLimitReached,
    loading,
    refetch: fetchUsage,
  };
};
