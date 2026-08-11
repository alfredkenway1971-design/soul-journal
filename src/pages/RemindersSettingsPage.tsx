import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Clock, Calendar, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ReminderSettings {
  enabled: boolean;
  time: string;
  days: string[];
  contextual: boolean;
}

const DAYS_OF_WEEK = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];

const RemindersSettingsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    time: '20:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    contextual: true,
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('reminder-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive daily journal reminders.",
        });
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSave = () => {
    localStorage.setItem('reminder-settings', JSON.stringify(settings));
    
    // Schedule notification if enabled
    if (settings.enabled && notificationPermission === 'granted') {
      scheduleReminder();
    }
    
    toast({
      title: "Settings Saved",
      description: settings.enabled 
        ? `Reminders set for ${formatTime(settings.time)}` 
        : "Reminders disabled",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const buildContextualMessage = async (): Promise<{ title: string; body: string }> => {
    const fallback = { title: 'Time to Journal 📝', body: 'Take a moment to reflect on your day.' };
    if (!settings.contextual || !user) return fallback;

    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('mood, mood_score, created_at, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const last = data?.[0] as any;
      if (!last) return { title: 'Welcome to your journal ✨', body: 'Start your first reflection today.' };

      const daysSince = Math.floor((Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const mood = last.mood as string | null;

      if (daysSince >= 3) {
        return { title: `It's been a while 💭`, body: `Last time you felt ${mood || 'reflective'}. How are things now?` };
      }
      if (mood === 'sad' || mood === 'unhappy') {
        return { title: 'Checking in with you 💙', body: 'Yesterday felt heavy — how is today landing?' };
      }
      if (mood === 'happy' || mood === 'good') {
        return { title: 'Keep the momentum going ✨', body: `You felt ${mood} recently. What's flowing today?` };
      }
      return { title: 'Time to reflect 📝', body: `Pick up where you left off — "${last.title || 'your last entry'}".` };
    } catch (err) {
      console.error('contextual reminder error:', err);
      return fallback;
    }
  };

  const scheduleReminder = async () => {
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeout = scheduledTime.getTime() - now.getTime();
    localStorage.setItem('next-reminder', scheduledTime.toISOString());

    if (Notification.permission === 'granted') {
      const { title, body } = await buildContextualMessage();
      setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'journal-reminder'
        });
      }, Math.min(timeout, 5000));
    }
  };

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t("reminders.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("reminders.dailyPrompts")}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Enable Reminders */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-medium">{t("reminders.daily")}</Label>
                <p className="text-sm text-muted-foreground">{t("reminders.getNotified")}</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => {
                setSettings(prev => ({ ...prev, enabled: checked }));
                if (checked && notificationPermission !== 'granted') {
                  requestNotificationPermission();
                }
              }}
            />
          </div>
          
          {notificationPermission === 'denied' && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </motion.div>

        {/* Time Selection */}
        {settings.enabled && (
          <motion.div
            className="glass-card rounded-2xl p-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">{t("reminders.time")}</Label>
            </div>
            
            <Select
              value={settings.time}
              onValueChange={(value) => setSettings(prev => ({ ...prev, time: value }))}
            >
              <SelectTrigger className="w-full h-12 rounded-xl">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {formatTime(time)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* Days Selection */}
        {settings.enabled && (
          <motion.div
            className="glass-card rounded-2xl p-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">{t("reminders.activeDays")}</Label>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.id}
                  variant={settings.days.includes(day.id) ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl min-w-[52px]"
                  onClick={() => toggleDay(day.id)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Contextual Toggle */}
        {settings.enabled && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-medium">{t("reminders.contextual")}</Label>
                  <p className="text-sm text-muted-foreground">{t("reminders.personalize")}</p>
                </div>
              </div>
              <Switch
                checked={settings.contextual}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, contextual: checked }))}
              />
            </div>
          </motion.div>
        )}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            className="w-full h-12 rounded-xl gradient-amber"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </motion.div>

        {/* Info Card */}
        <motion.div
          className="glass-card rounded-2xl p-4 border border-primary/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">How it works</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You'll receive a gentle notification at your chosen time reminding you to 
                take a moment for self-reflection. Consistency is key to building a 
                journaling habit!
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default RemindersSettingsPage;
