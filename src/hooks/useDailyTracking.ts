import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyTracking {
  id?: string;
  sleep_hours: number | null;
  hydration_glasses: number;
  hydration_goal: number;
  reading_pages: number;
  reading_goal: number;
  running_km: number;
  running_goal: number;
  date: string;
}

export const useDailyTracking = () => {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<DailyTracking | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchTodayTracking = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tracking:', error);
      }
      
      setTracking(data || {
        sleep_hours: null,
        hydration_glasses: 0,
        hydration_goal: 8,
        reading_pages: 0,
        reading_goal: 15,
        running_km: 0,
        running_goal: 5,
        date: today,
      });
    } catch (error) {
      console.error('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (user) {
      fetchTodayTracking();
    }
  }, [user, fetchTodayTracking]);

  const updateSleep = async (hours: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          user_id: user.id,
          date: today,
          sleep_hours: hours,
          hydration_glasses: tracking?.hydration_glasses || 0,
          hydration_goal: tracking?.hydration_goal || 8,
          reading_pages: tracking?.reading_pages || 0,
          reading_goal: tracking?.reading_goal || 15,
          running_km: tracking?.running_km || 0,
          running_goal: tracking?.running_goal || 5,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setTracking(data);
      return data;
    } catch (error) {
      console.error('Error updating sleep:', error);
      throw error;
    }
  };

  const updateHydration = async (glasses: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          user_id: user.id,
          date: today,
          sleep_hours: tracking?.sleep_hours,
          hydration_glasses: glasses,
          hydration_goal: tracking?.hydration_goal || 8,
          reading_pages: tracking?.reading_pages || 0,
          reading_goal: tracking?.reading_goal || 15,
          running_km: tracking?.running_km || 0,
          running_goal: tracking?.running_goal || 5,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setTracking(data);
      return data;
    } catch (error) {
      console.error('Error updating hydration:', error);
      throw error;
    }
  };

  const updateReading = async (pages: number, goal?: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          user_id: user.id,
          date: today,
          sleep_hours: tracking?.sleep_hours,
          hydration_glasses: tracking?.hydration_glasses || 0,
          hydration_goal: tracking?.hydration_goal || 8,
          reading_pages: pages,
          reading_goal: goal ?? tracking?.reading_goal ?? 15,
          running_km: tracking?.running_km || 0,
          running_goal: tracking?.running_goal || 5,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setTracking(data);
      return data;
    } catch (error) {
      console.error('Error updating reading:', error);
      throw error;
    }
  };

  const updateRunning = async (km: number, goal?: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          user_id: user.id,
          date: today,
          sleep_hours: tracking?.sleep_hours,
          hydration_glasses: tracking?.hydration_glasses || 0,
          hydration_goal: tracking?.hydration_goal || 8,
          reading_pages: tracking?.reading_pages || 0,
          reading_goal: tracking?.reading_goal || 15,
          running_km: km,
          running_goal: goal ?? tracking?.running_goal ?? 5,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      setTracking(data);
      return data;
    } catch (error) {
      console.error('Error updating running:', error);
      throw error;
    }
  };

  const addGlass = async () => {
    const newCount = (tracking?.hydration_glasses || 0) + 1;
    return updateHydration(newCount);
  };

  const removeGlass = async () => {
    const newCount = Math.max(0, (tracking?.hydration_glasses || 0) - 1);
    return updateHydration(newCount);
  };

  return {
    tracking,
    loading,
    updateSleep,
    updateHydration,
    updateReading,
    updateRunning,
    addGlass,
    removeGlass,
    refetch: fetchTodayTracking,
  };
};
