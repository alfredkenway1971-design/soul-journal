import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyTracking {
  id?: string;
  sleep_hours: number | null;
  hydration_glasses: number;
  hydration_goal: number;
  date: string;
}

export const useDailyTracking = () => {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<DailyTracking | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      fetchTodayTracking();
    }
  }, [user]);

  const fetchTodayTracking = async () => {
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
        date: today,
      });
    } catch (error) {
      console.error('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  };

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
    addGlass,
    removeGlass,
    refetch: fetchTodayTracking,
  };
};
