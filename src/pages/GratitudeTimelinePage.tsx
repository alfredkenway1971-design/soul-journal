import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, RefreshCcw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { supabase } from "@/integrations/supabase/client";
import { loadAIPrefs } from "@/lib/goalAccountability";
import {
  loadGratitudeCache, saveGratitudeCache, gratitudeCacheFresh,
  CATEGORY_EMOJI, type GratitudeItem, type GratitudeEntry,
} from "@/lib/gratitude";

const GratitudeTimelinePage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const api = useJournalAPI(language);

  const [items, setItems] = useState<GratitudeItem[]>([]);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const loadTimeline = async (force = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('id, title, created_at, enhanced_text, original_transcription')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title || t("entry.untitled"),
        created_at: r.created_at,
        text: r.enhanced_text || r.original_transcription || "",
      }));
      setEntries(rows.map(({ text, ...rest }) => rest));

      const cache = loadGratitudeCache();
      let result: GratitudeItem[] | null = null;
      if (!force && cache && gratitudeCacheFresh(cache, rows.length)) {
        result = cache.items;
      }
      if (!result) {
        const scanInput = rows
          .filter((r: any) => r.text && r.text.trim().length > 5)
          .map((r: any) => ({ id: r.id, text: r.text }));
        result = await api.scanGratitude(scanInput);
        saveGratitudeCache(result, rows.length);
      }
      setItems(result || []);
    } catch (err) {
      console.warn('Gratitude scan failed:', err);
      const cache = loadGratitudeCache();
      if (cache) setItems(cache.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [user]);

  const refresh = () => {
    setRefreshing(true);
    loadTimeline(true);
  };

  const toggleExpanded = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const monthLabel = (ym: string): string => {
    try {
      return new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
        new Date(ym + "-01T12:00:00")
      );
    } catch {
      return ym;
    }
  };

  // Group items by the month of their most recent source entry
  const byMonth = new Map<string, { item: GratitudeItem; index: number }[]>();
  items.forEach((item, i) => {
    const lastIdx = Math.max(...item.entryIndexes);
    const src = entries[lastIdx - 1];
    const ym = src ? src.created_at.slice(0, 7) : "";
    if (!ym) return;
    const list = byMonth.get(ym) || [];
    list.push({ item, index: i });
    byMonth.set(ym, list);
  });
  const months = [...byMonth.keys()].sort((a, b) => (a < b ? 1 : -1));

  const totalMentions = items.reduce((acc, it) => acc + it.entryIndexes.length, 0);
  const catCounts = new Map<string, number>();
  items.forEach((it) => catCounts.set(it.category, (catCounts.get(it.category) || 0) + it.entryIndexes.length));

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t("gratitude.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("gratitude.subtitle")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full ml-auto"
              onClick={refresh}
              disabled={loading || refreshing}
              aria-label={t("gratitude.refresh")}
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!loadAIPrefs().gratitudeTimeline && (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3">
            {t("gratitude.disabled")}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14 px-6"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("gratitude.emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("gratitude.empty")}</p>
          </motion.div>
        ) : (
          <>
            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5"
            >
              <p className="text-2xl font-bold text-foreground">
                {t("gratitude.summary").replace("{count}", String(items.length))}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("gratitude.mentions").replace("{count}", String(totalMentions))}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {[...catCounts.entries()].map(([cat, n]) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-xs bg-white/70 dark:bg-white/10 border border-border/50 rounded-full px-2.5 py-1"
                  >
                    {CATEGORY_EMOJI[cat] || "💛"} {t(`gratitude.category.${cat}`)} · {n}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Timeline by month */}
            {months.map((ym) => (
              <motion.section
                key={ym}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-lg font-bold text-foreground mb-3">{monthLabel(ym)}</h2>
                <div className="space-y-2">
                  {byMonth.get(ym)!.map(({ item, index }) => {
                    const isOpen = expanded.has(index);
                    const sources = item.entryIndexes
                      .map((idx) => entries[idx - 1])
                      .filter(Boolean)
                      .slice(0, 3);
                    return (
                      <div
                        key={index}
                        className="glass-card rounded-2xl overflow-hidden"
                      >
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                          onClick={() => toggleExpanded(index)}
                        >
                          <span className="text-lg">{CATEGORY_EMOJI[item.category] || "💛"}</span>
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {item.gratitude}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ×{item.entryIndexes.length}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="border-t border-border/40 px-4 py-2.5 space-y-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
                              {t("gratitude.sources")}
                            </p>
                            {sources.map((e) => (
                              <button
                                key={e.id}
                                className="w-full text-left text-sm text-foreground/90 hover:text-primary py-1"
                                onClick={() => navigate(`/entry/${e.id}`)}
                              >
                                {e.title || t("entry.untitled")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </>
        )}
      </main>
    </div>
  );
};

export default GratitudeTimelinePage;
