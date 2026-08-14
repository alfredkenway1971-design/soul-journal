import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, CalendarIcon, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
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
import RecentEntryCard from "@/components/premium/RecentEntryCard";
import AIInsightCard from "@/components/premium/AIInsightCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTitleCase } from "@/hooks/useTitleCase";
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

const fmtDur = (s?: number | null) => {
  if (!s || s <= 0) return undefined;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const LibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const titleCase = useTitleCase();

  const [entries, setEntries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [moodFilter, setMoodFilter] = useState<MoodFilterValue>("all");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [insightCallout, setInsightCallout] = useState<string | null>(null);

  // Occasional "Pattern noticed" callout: once per day, when the library has
  // enough entries to place it in, surface one real insight tied to recent
  // entries — never on every entry, to avoid visual noise.
  useEffect(() => {
    if (!user) return;
    if (entries.length < 5) return;
    const key = `sj-library-insight-${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("coaching_insights")
          .select("id, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!data?.length) return;
        localStorage.setItem(key, "1");
        // Prefer the 2nd-newest so it differs from the Home card's newest
        const pick = data[Math.min(1, data.length - 1)] || data[0];
        setInsightCallout(pick.content);
      } catch (error) {
        console.error("Failed to fetch insight callout:", error);
      }
    })();
  }, [user, entries.length]);

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.display_name) setDisplayName(data.display_name);
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  };

  const fetchEntries = async () => {
    if (!user) return;
    try {
      // Lightweight count so the header can show the real total
      const { count } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTotalCount(count ?? null);

      // First page only — loading ALL entries' full text on every visit is
      // what made the Library slow. Older pages load on demand (Load More).
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, title, enhanced_text, original_transcription, mood, created_at, audio_url, duration_seconds")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      setEntries(data || []);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, title, enhanced_text, original_transcription, mood, created_at, audio_url, duration_seconds")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(entries.length, entries.length + PAGE_SIZE - 1);
      if (error) throw error;
      setEntries((prev) => [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more entries:", error);
    } finally {
      setLoadingMore(false);
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
            <h1 className="text-xl font-bold text-foreground">{titleCase(t("library.title"))}</h1>
            <Avatar
              className="w-10 h-10 cursor-pointer ring-2 ring-white/60 shadow-md"
              onClick={() => navigate("/settings/profile")}
            >
              <AvatarImage src={avatarUrl || undefined} alt={displayName || "Profile"} />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-display font-bold">
                {(displayName || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Mood filter — above search */}
          <div className="mb-3">
            <MoodFilterBar value={moodFilter} onChange={setMoodFilter} />
          </div>

          {/* Glass search pill */}
          <div className="glass-premium px-4 py-3 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              placeholder={t("common.search")}
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
                {t("common.clearAll")}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {totalCount !== null && !loading && (
          <p className="text-xs text-muted-foreground mb-3">
            {t("library.entriesCount").replace("{n}", String(totalCount))}
          </p>
        )}
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
              {hasFilters ? t("library.noneFound") : t("library.noneYet")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasFilters
                ? t("library.adjustFilters")
                : t("library.recordFirst")}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("common.clearFilters")}
              </Button>
            ) : (
              <Button onClick={() => navigate("/record")} className="gradient-amber">
                {t("library.createEntry")}
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3 pt-1">
            <AnimatePresence>
              {filteredEntries.map((entry, i) => {
                const preview =
                  entry.enhanced_text ||
                  entry.original_transcription ||
                  "";

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <RecentEntryCard
                      id={entry.id}
                      title={entry.title || t("entry.untitled")}
                      preview={preview}
                      date={new Date(entry.created_at)}
                      duration={fmtDur(entry.duration_seconds)}
                      mood={entry.mood || "fine"}
                      onClick={() => navigate(`/entry/${entry.id}`)}
                    />

                    {/* Occasional pattern callout — one per day, after the 4th entry */}
                    {i === 3 && insightCallout && filteredEntries.length >= 5 && (
                      <div className="mt-3">
                        <AIInsightCard
                          insight={insightCallout}
                          badgeLabel={t("insight.patternNoticed")}
                          ctaLabel={t("insight.viewInsights")}
                          onAction={() => navigate("/coaching")}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {hasMore && (
              <Button
                variant="outline"
                className="w-full gap-2 rounded-2xl"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {t("library.loadingMore")}
                  </>
                ) : (
                  t("library.loadMore")
                )}
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LibraryPage;
