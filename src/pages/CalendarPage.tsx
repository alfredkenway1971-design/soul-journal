import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, ArrowRight, MoreHorizontal, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture } from "date-fns";
import type { Mood } from "@/components/MoodSelector";
import { moodToScore } from "@/components/MoodSlider";

// Granular mood_score (1–10) → gradient color.
// Lower = cool/sad (rose), middle = neutral (sky), higher = warm/happy (amber).
const getScoreColor = (score: number): string => {
  if (score <= 1) return "bg-rose-500";
  if (score <= 2) return "bg-rose-400";
  if (score <= 3) return "bg-rose-300";
  if (score <= 4) return "bg-rose-200";
  if (score <= 5) return "bg-sky-300";
  if (score <= 6) return "bg-sky-400";
  if (score <= 7) return "bg-amber-200";
  if (score <= 8) return "bg-amber-300";
  if (score <= 9) return "bg-amber-400";
  return "bg-amber-500";
};

const getMoodColor = (mood: Mood, score?: number | null) => {
  const s = score ?? moodToScore(mood);
  return getScoreColor(s);
};

interface CalendarEntry {
  mood: Mood;
  moodScore: number;
  entryId: string;
  title?: string;
  preview?: string;
  tags?: string[];
  entryCount: number;
  photoCount: number;
  entries: Array<{ id: string; title: string; mood: Mood; moodScore: number }>;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, CalendarEntry>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntriesForMonth = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        const { data: entries, error } = await supabase
          .from('journal_entries')
          .select('id, mood, created_at, title, enhanced_text, original_transcription')
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        const entryIds = entries?.map(e => e.id) || [];
        let mediaCounts: Record<string, number> = {};
        
        if (entryIds.length > 0) {
          const { data: media } = await supabase
            .from('entry_media')
            .select('entry_id')
            .in('entry_id', entryIds);
          
          media?.forEach(m => {
            mediaCounts[m.entry_id] = (mediaCounts[m.entry_id] || 0) + 1;
          });
        }
        
        const dataMap: Record<string, CalendarEntry> = {};
        entries?.forEach(entry => {
          const dateKey = format(new Date(entry.created_at), 'yyyy-MM-dd');
          
          if (!dataMap[dateKey]) {
            dataMap[dateKey] = {
              mood: (entry.mood as Mood) || "fine",
              entryId: entry.id,
              title: entry.title || t("record.title"),
              preview: entry.enhanced_text || entry.original_transcription || "",
              entryCount: 0,
              photoCount: 0,
              entries: [],
            };
          }
          
          dataMap[dateKey].entryCount++;
          dataMap[dateKey].photoCount += mediaCounts[entry.id] || 0;
          dataMap[dateKey].entries.push({
            id: entry.id,
            title: entry.title || t("record.title"),
            mood: (entry.mood as Mood) || "fine",
          });
          
          if (dataMap[dateKey].entries.length === 1) {
            dataMap[dateKey].mood = (entry.mood as Mood) || "fine";
            dataMap[dateKey].title = entry.title || t("record.title");
            dataMap[dateKey].preview = entry.enhanced_text || entry.original_transcription || "";
          }
        });
        
        setCalendarData(dataMap);
      } catch (error) {
        console.error('Error fetching calendar entries:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntriesForMonth();
  }, [user, currentDate]);

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const paddedDays: (Date | null)[] = Array(paddingDays).fill(null);
    
    return [...paddedDays, ...days];
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
    setSelectedDate(null);
  };

  const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const days = getDaysInMonth();
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const monthName = format(currentDate, "MMMM");
  
  const selectedEntry = selectedDate ? calendarData[getDateKey(selectedDate)] : null;

  const moodSummary = Object.values(calendarData).reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEntries = Object.values(calendarData).reduce((sum, e) => sum + e.entryCount, 0);

  const sentimentLabels = [
    { key: "happy", label: t("calendar.happy"), color: "bg-amber-400" },
    { key: "fine", label: t("calendar.fine"), color: "bg-sky-400" },
    { key: "sad", label: t("calendar.sad"), color: "bg-rose-300" },
  ];

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">{t("calendar.visualHistory")}</p>
              <button className="flex items-center gap-2 text-2xl font-display">
                {monthName}
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 space-y-6">
        {/* Month Summary */}
        <motion.div
          className="glass-premium p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("calendar.thisMonth")}</p>
              <p className="text-2xl font-semibold text-foreground">{totalEntries} {t("calendar.entries")}</p>
            </div>
            <div className="flex gap-1">
              {Object.entries(moodSummary).slice(0, 4).map(([mood, count]) => (
                <div
                  key={mood}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getMoodColor(mood as Mood)} text-charcoal`}
                >
                  {count}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div
          className="glass-premium p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-7 gap-1 mb-3">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="text-center text-xs text-muted-foreground font-medium py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dateKey = getDateKey(day);
                const entry = calendarData[dateKey];
                const isSelected = selectedDate && getDateKey(selectedDate) === dateKey;
                const isTodayDate = isToday(day);
                const isFutureDate = isFuture(day);

                return (
                  <motion.button
                    key={dateKey}
                    className={`aspect-square rounded-full flex items-center justify-center text-sm transition-all relative ${
                      isSelected
                        ? "bg-charcoal dark:bg-primary text-white ring-2 ring-offset-2 ring-primary"
                        : entry
                        ? `${getMoodColor(entry.mood, entry.entryCount)} text-charcoal font-medium`
                        : isFutureDate
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day.getDate()}
                    {entry && entry.entryCount > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-charcoal text-white text-[10px] rounded-full flex items-center justify-center">
                        {entry.entryCount}
                      </span>
                    )}
                    {isTodayDate && !isSelected && !entry && (
                      <span className="absolute bottom-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-border/50">
            {sentimentLabels.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Selected Date Detail */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={getDateKey(selectedDate)}
          >
            <p className="section-label mb-3">
              {format(selectedDate, "EEEE, MMMM d").toUpperCase()}
            </p>
            
            <div className="glass-premium p-5">
              {selectedEntry ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getMoodColor(selectedEntry.mood)}`}>
                        <span className="text-2xl">
                          {selectedEntry.mood === "happy" ? "😊" :
                           selectedEntry.mood === "good" ? "🙂" :
                           selectedEntry.mood === "fine" ? "😐" :
                           selectedEntry.mood === "sad" ? "😔" : "😢"}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedEntry.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{selectedEntry.mood}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 mb-4">
                    <p className="font-journal italic text-foreground leading-relaxed">
                      "{selectedEntry.preview?.substring(0, 150)}..."
                    </p>
                  </div>

                  {selectedEntry.entries.length > 1 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("calendar.allEntries")}</p>
                      {selectedEntry.entries.map((e) => (
                        <button
                          key={e.id}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-left"
                          onClick={() => navigate(`/entry/${e.id}`)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMoodColor(e.mood)}`}>
                            <span className="text-sm">
                              {e.mood === "happy" ? "😊" :
                               e.mood === "good" ? "🙂" :
                               e.mood === "fine" ? "😐" :
                               e.mood === "sad" ? "😔" : "😢"}
                            </span>
                          </div>
                          <span className="flex-1 text-sm font-medium text-foreground truncate">{e.title}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{selectedEntry.entryCount} {selectedEntry.entryCount === 1 ? t("calendar.entry") : t("calendar.entries")}</span>
                      {selectedEntry.photoCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Image className="w-4 h-4" />
                          {selectedEntry.photoCount}
                        </span>
                      )}
                    </div>
                    <button 
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => navigate(`/entry/${selectedEntry.entryId}`)}
                    >
                      {t("calendar.viewEntry")}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <span className="text-4xl mb-3 block">📝</span>
                  <p className="text-muted-foreground mb-4">{t("calendar.noEntriesDay")}</p>
                  {!isFuture(selectedDate) && (
                    <Button
                      className="gradient-primary rounded-full px-6"
                      onClick={() => navigate("/record")}
                    >
                      {t("calendar.createEntry")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CalendarPage;
