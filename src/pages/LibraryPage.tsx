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
  }, [entries, selectedDate, searchQuery]);

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
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Library</h1>
              <p className="text-sm text-muted-foreground">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} total
              </p>
            </div>
          </div>

          {/* Search + Date Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50 border-border/50"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedDate ? "default" : "outline"}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  <CalendarIcon className="w-4 h-4" />
                </Button>
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

          {/* Active Filters */}
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
              {searchQuery.trim() && (
                <Badge variant="secondary" className="text-xs gap-1">
                  "{searchQuery}"
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
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
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                    {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                  </h3>
                  <div className="space-y-2">
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
                          className="w-full glass-card rounded-xl p-4 text-left hover:ring-2 hover:ring-primary/20 transition-all"
                          onClick={() => navigate(`/entry/${entry.id}`)}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIndex * 0.05 + i * 0.03 }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-medium text-foreground truncate">
                                  {entry.title || "Untitled Entry"}
                                </h4>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {format(new Date(entry.created_at), "h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {preview.substring(0, 120)}
                                {preview.length > 120 ? "..." : ""}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {entry.mood && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {entry.mood}
                                  </Badge>
                                )}
                                {entry.audio_url && (
                                  <Badge variant="outline" className="text-xs">
                                    🎙 Audio
                                  </Badge>
                                )}
                              </div>
                            </div>
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
