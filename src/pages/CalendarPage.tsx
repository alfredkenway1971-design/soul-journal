import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, ArrowRight, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Mood } from "@/components/MoodSelector";

// Sentiment color mapping
const sentimentColors: Record<string, string> = {
  happy: "bg-amber-400",
  good: "bg-amber-400",
  fine: "bg-sky-400",
  calm: "bg-sky-400",
  sad: "bg-rose-300",
  anxious: "bg-rose-300",
  unhappy: "bg-rose-300",
};

const sentimentLabels = [
  { key: "good", label: "GOOD", color: "bg-amber-400" },
  { key: "calm", label: "CALM", color: "bg-sky-400" },
  { key: "anxious", label: "ANXIOUS", color: "bg-rose-300" },
];

interface CalendarEntry {
  mood: Mood;
  entryId: string;
  title?: string;
  preview?: string;
  tags?: string[];
  entryCount?: number;
  photoCount?: number;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, CalendarEntry>>({});
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntriesForMonth = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startOfMonth = new Date(year, month, 1).toISOString();
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        
        const { data: entries, error } = await supabase
          .from('journal_entries')
          .select('id, mood, created_at, title, enhanced_text, original_transcription')
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        if (error) throw error;
        
        const dataMap: Record<string, CalendarEntry> = {};
        entries?.forEach(entry => {
          const dateKey = new Date(entry.created_at).toISOString().split('T')[0];
          if (!dataMap[dateKey] && entry.mood) {
            dataMap[dateKey] = {
              mood: entry.mood as Mood,
              entryId: entry.id,
              title: entry.title || "Content & Steady",
              preview: entry.enhanced_text || entry.original_transcription || "",
              tags: ["WORK", "HEALTH"],
              entryCount: 2,
              photoCount: 1,
            };
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Start week on Monday
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
    setSelectedDate(null);
  };

  const getDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const monthName = format(currentDate, "MMMM");
  
  const selectedEntry = selectedDate ? calendarData[getDateKey(selectedDate)] : null;

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">VISUAL HISTORY</p>
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
        {/* Calendar Grid */}
        <motion.div
          className="glass-premium p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Week Days Header */}
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

          {/* Calendar Grid */}
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
                const isToday = 
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                const isSelected = selectedDate === day;
                const isPast = day < new Date().getDate() && 
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                const isFuture = day > new Date().getDate() || 
                  currentDate.getMonth() > new Date().getMonth() ||
                  currentDate.getFullYear() > new Date().getFullYear();

                return (
                  <motion.button
                    key={day}
                    className={`aspect-square rounded-full flex items-center justify-center text-sm transition-all ${
                      isSelected
                        ? "bg-charcoal dark:bg-primary text-white"
                        : entry
                        ? `${sentimentColors[entry.mood] || "bg-gray-300"} text-charcoal`
                        : isFuture
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-border/50">
            {sentimentLabels.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Selected Date Detail */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="section-label mb-3">
              SELECTED: {format(currentDate, "MMM").toUpperCase()} {selectedDate}
            </p>
            
            <div className="glass-premium p-5">
              {selectedEntry ? (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <span className="text-2xl">🌤️</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedEntry.title}</h3>
                        <p className="text-sm text-muted-foreground">Most felt emotion today</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Quote */}
                  <div className="bg-muted/50 rounded-xl p-4 mb-4">
                    <p className="font-journal italic text-foreground leading-relaxed">
                      "{selectedEntry.preview?.substring(0, 120)}..."
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mb-4">
                    {selectedEntry.tags?.map((tag) => (
                      <span 
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">
                      {selectedEntry.entryCount} Entries · {selectedEntry.photoCount} Photo
                    </span>
                    <button 
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => navigate(`/entry/${selectedEntry.entryId}`)}
                    >
                      View Full Day
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <span className="text-4xl mb-3 block">📝</span>
                  <p className="text-muted-foreground mb-4">No entries for this day</p>
                  <Button
                    className="gradient-primary rounded-full px-6"
                    onClick={() => navigate("/record")}
                  >
                    Create Entry
                  </Button>
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
