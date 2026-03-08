import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, FREE_LIMITS } from "@/contexts/SubscriptionContext";

interface UsageLimits {
  textEntriesToday: number;
  audioEntriesThisWeek: number;
  coachingCallsThisMonth: number;
  canCreateTextEntry: boolean;
  canCreateAudioEntry: boolean;
  canUseCoaching: boolean;
  textLimitReached: boolean;
  audioLimitReached: boolean;
  coachingLimitReached: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUsageLimits = (): UsageLimits => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [textEntriesToday, setTextEntriesToday] = useState(0);
  const [audioEntriesThisWeek, setAudioEntriesThisWeek] = useState(0);
  const [coachingCallsThisMonth, setCoachingCallsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user || isPremium) {
      setLoading(false);
      return;
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [textRes, audioRes, coachingRes] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("audio_url", null)
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("journal_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("audio_url", "is", null)
          .gte("created_at", weekStart.toISOString()),
        supabase
          .from("coaching_insights")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart.toISOString()),
      ]);

      setTextEntriesToday(textRes.count ?? 0);
      setAudioEntriesThisWeek(audioRes.count ?? 0);
      setCoachingCallsThisMonth(coachingRes.count ?? 0);
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
  const coachingLimitReached = !isPremium && coachingCallsThisMonth >= FREE_LIMITS.aiCoachingCallsPerMonth;

  return {
    textEntriesToday,
    audioEntriesThisWeek,
    coachingCallsThisMonth,
    canCreateTextEntry: isPremium || !textLimitReached,
    canCreateAudioEntry: isPremium || !audioLimitReached,
    canUseCoaching: isPremium || !coachingLimitReached,
    textLimitReached,
    audioLimitReached,
    coachingLimitReached,
    loading,
    refetch: fetchUsage,
  };
};
