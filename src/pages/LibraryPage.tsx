import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, CalendarIcon, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import MoodFilterBar, { type MoodFilterValue } from "@/components/MoodFilterBar";
import type { Mood } from "@/components/MoodSelector";

interface JournalEntry {
  id: string;
  title: string | null;
  enhanced_text: string | null;
  original_transcription: string | null;
  mood: string | null;
  created_at: string;
  audio_url: string | null;
}

const moodEmojis: Record<string, string> = {
  happy: "😊",
  excited: "🤩",
  calm: "😌",
  fine: "🙂",
  anxious: "😰",
  sad: "😢",
  angry: "😠",
};

const LibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [moodFilter, setMoodFilter] = useState<MoodFilterValue>("all");

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, title, enhanced_text, original_transcription, mood, created_at, audio_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (moodFilter !== "all") {
      result = result.filter((e) => (e.mood || "").toLowerCase() === moodFilter);
    }

    if (selectedDate) {
      result = result.filter((e) =>
        isSameDay(new Date(e.created_at), selectedDate)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.title?.toLowerCase().includes(q)) ||
          (e.enhanced_text?.toLowerCase().includes(q)) ||
          (e.original_transcription?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [entries, selectedDate, searchQuery, moodFilter]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.created_at), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const clearFilters = () => {
    setSelectedDate(undefined);
    setSearchQuery("");
  };

  const hasFilters = !!selectedDate || !!searchQuery.trim();

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-3 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10" />
            <h1 className="text-xl font-bold text-foreground">Soul Journal Library</h1>
            <div
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/60 shadow-md cursor-pointer bg-gradient-to-br from-slate-700 to-slate-900"
              onClick={() => navigate("/settings/profile")}
            />
          </div>

          {/* Mood filter — above search */}
          <div className="mb-3">
            <MoodFilterBar value={moodFilter} onChange={setMoodFilter} />
          </div>

          {/* Glass search pill */}
          <div className="glass-premium px-4 py-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
            />
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary">
                  <CalendarIcon className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2 mt-2">
              {selectedDate && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {format(selectedDate, "MMM d, yyyy")}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSelectedDate(undefined)}
                  />
                </Badge>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <motion.div
            className="glass-card rounded-2xl p-8 text-center mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {hasFilters ? "No entries found" : "No entries yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasFilters
                ? "Try adjusting your filters or search terms."
                : "Record your first journal entry to see it here."}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => navigate("/record")} className="gradient-amber">
                Create Entry
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(groupedEntries).map(([dateKey, dayEntries], groupIndex) => (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  <h3 className="text-base font-semibold text-foreground mb-3 px-1">
                    {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                  </h3>
                  <div className="space-y-3">
                    {dayEntries.map((entry, i) => {
                      const preview =
                        entry.enhanced_text ||
                        entry.original_transcription ||
                        "";
                      const emoji = entry.mood
                        ? moodEmojis[entry.mood] || "🙂"
                        : "📝";

                      return (
                        <motion.button
                          key={entry.id}
                          className="w-full glass-premium p-4 text-left"
                          onClick={() => navigate(`/entry/${entry.id}`)}
                          whileTap={{ scale: 0.99 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIndex * 0.05 + i * 0.03 }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl">{emoji}</span>
                              <h4 className="font-bold text-foreground truncate text-base">
                                {entry.title || "Untitled Entry"}
                              </h4>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 font-medium">
                              {format(new Date(entry.created_at), "h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 line-clamp-2 mb-3">
                            {preview.substring(0, 120)}
                            {preview.length > 120 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-2">
                            {entry.mood && (
                              <span
                                className="text-xs font-medium capitalize px-3 py-1 rounded-full text-white"
                                style={{
                                  background:
                                    "linear-gradient(135deg, hsl(211 90% 55%), hsl(220 85% 45%))",
                                }}
                              >
                                {entry.mood}
                              </span>
                            )}
                            {entry.audio_url && (
                              <span
                                className="text-xs font-medium px-3 py-1 rounded-full text-white inline-flex items-center gap-1"
                                style={{
                                  background:
                                    "linear-gradient(135deg, hsl(211 90% 55%), hsl(220 85% 45%))",
                                }}
                              >
                                🎙 Audio
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LibraryPage;
