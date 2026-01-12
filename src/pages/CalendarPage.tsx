import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import type { Mood } from "@/components/MoodSelector";

const moodColors: Record<Mood, string> = {
  happy: "bg-mood-happy",
  good: "bg-mood-good",
  fine: "bg-mood-fine",
  sad: "bg-mood-sad",
  unhappy: "bg-mood-unhappy",
};

// Sample calendar data
const calendarData: Record<string, { mood: Mood; hasEntry: boolean }> = {
  "2024-01-08": { mood: "happy", hasEntry: true },
  "2024-01-09": { mood: "good", hasEntry: true },
  "2024-01-10": { mood: "happy", hasEntry: true },
  "2024-01-11": { mood: "fine", hasEntry: true },
  "2024-01-12": { mood: "good", hasEntry: true },
  "2024-01-13": { mood: "happy", hasEntry: true },
  "2024-01-14": { mood: "sad", hasEntry: true },
  "2024-01-15": { mood: "good", hasEntry: true },
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
              <p className="text-sm text-muted-foreground">Your journaling history</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          className="glass-card rounded-3xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">{formatMonthYear(currentDate)}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs text-muted-foreground font-medium py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
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

              return (
                <motion.button
                  key={day}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    isToday
                      ? "ring-2 ring-primary"
                      : ""
                  } ${
                    entry?.hasEntry
                      ? "glass-card-strong hover:scale-105"
                      : "hover:bg-muted/50"
                  }`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (entry?.hasEntry) {
                      // Navigate to entry
                    }
                  }}
                >
                  <span className={`text-sm ${isToday ? "font-semibold text-primary" : "text-foreground"}`}>
                    {day}
                  </span>
                  {entry?.hasEntry && (
                    <div className={`w-2 h-2 rounded-full ${moodColors[entry.mood]}`} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Mood Legend */}
        <motion.div
          className="glass-card rounded-2xl p-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Mood Legend</h3>
          <div className="flex flex-wrap gap-4">
            {(["happy", "good", "fine", "sad", "unhappy"] as Mood[]).map((mood) => (
              <div key={mood} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${moodColors[mood]}`} />
                <span className="text-sm capitalize">{mood}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">8</p>
            <p className="text-xs text-muted-foreground">Entries this month</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">85%</p>
            <p className="text-xs text-muted-foreground">Positive moods</p>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CalendarPage;
