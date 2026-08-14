import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, RefreshCcw, Trash2, Users, ChevronRight, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLanguageName } from "@/contexts/LanguageContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
import { supabase } from "@/integrations/supabase/client";
import { loadAIPrefs, saveAIPrefs } from "@/lib/goalAccountability";
import {
  loadRelationsCache, saveRelationsCache, relationsCacheFresh,
  loadHiddenRelations, hideRelation, TREND_EMOJI,
  type Relation, type RelationEntry,
} from "@/lib/relations";

/**
 * Feature 7: Relationship Emotional Tracker — PRIVATE section.
 * Never surfaced via push notification. Users can delete tracked relations
 * or disable the feature entirely from here.
 */
const RelationsPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const api = useJournalAPI(language);

  const [relations, setRelations] = useState<Relation[]>([]);
  const [entries, setEntries] = useState<RelationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [enabled, setEnabled] = useState(() => loadAIPrefs().relationsTracker);

  const loadRelations = async (force = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('id, title, created_at, enhanced_text, original_transcription, mood')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title || t("entry.untitled"),
        created_at: r.created_at,
        text: r.enhanced_text || r.original_transcription || "",
        mood: r.mood || "fine",
      }));
      setEntries(rows.map(({ text, ...rest }) => rest));

      const cache = loadRelationsCache();
      let result: Relation[] | null = null;
      if (!force && cache && relationsCacheFresh(cache, rows.length)) {
        result = cache.relations;
      }
      if (!result) {
        const scanInput = rows
          .filter((r: any) => r.text && r.text.trim().length > 5)
          .map((r: any) => ({ id: r.id, text: r.text, mood: r.mood }));
        result = await api.scanRelations(scanInput, getLanguageName(language));
        saveRelationsCache(result, rows.length);
      }
      // Apply privacy: drop relations the user deleted (kept hidden)
      const hidden = loadHiddenRelations();
      setRelations((result || []).filter((r) => !hidden.includes(r.name)));
    } catch (err) {
      console.warn('Relations scan failed:', err);
      const cache = loadRelationsCache();
      if (cache) {
        const hidden = loadHiddenRelations();
        setRelations(cache.relations.filter((r) => !hidden.includes(r.name)));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRelations();
  }, [user]);

  const refresh = () => {
    setRefreshing(true);
    loadRelations(true);
  };

  const toggleExpanded = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleDelete = (r: Relation) => {
    hideRelation(r.name);
    setRelations((prev) => prev.filter((x) => x.name !== r.name));
  };

  const handleDisable = () => {
    const next = { ...loadAIPrefs(), relationsTracker: false };
    saveAIPrefs(next);
    setEnabled(false);
  };

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t("relations.title")}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> {t("relations.private")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full ml-auto"
              onClick={refresh}
              disabled={loading || refreshing}
              aria-label={t("relations.refresh")}
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!enabled && (
          <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
            {t("relations.disabled")}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : relations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14 px-6"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("relations.emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("relations.empty")}</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {relations.map((rel, i) => {
              const isOpen = expanded.has(i);
              const sources = rel.entryIndexes
                .map((idx) => entries[idx - 1])
                .filter(Boolean)
                .slice(0, 3);
              const trendColor =
                rel.trend === "declining"
                  ? "border-amber-200/70 bg-amber-50/70 dark:bg-amber-950/20"
                  : rel.trend === "improving"
                  ? "border-emerald-300/60 bg-emerald-50/70 dark:bg-emerald-950/20"
                  : "border-border/50 bg-white/60 dark:bg-white/5";
              return (
                <div key={rel.name} className={`glass-card rounded-2xl overflow-hidden border ${trendColor}`}>
                  <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => toggleExpanded(i)}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {rel.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{rel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("relations.mentions").replace("{count}", String(rel.count))}
                      </p>
                    </div>
                    <span className="text-base">{TREND_EMOJI[rel.trend] || "➡️"}</span>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/40 px-4 py-3 space-y-2">
                      <p className="text-sm text-foreground/90 leading-relaxed">{rel.insight || t("relations.noInsight")}</p>
                      {sources.length > 0 && (
                        <>
                          <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{t("relations.sources")}</p>
                          {sources.map((e) => (
                            <button
                              key={e.id}
                              className="w-full text-left text-sm text-foreground/90 hover:text-primary py-1"
                              onClick={() => navigate(`/entry/${e.id}`)}
                            >
                              {e.title || t("entry.untitled")}
                            </button>
                          ))}
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => handleDelete(rel)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("relations.delete")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Disable entirely */}
            <button
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-3 hover:text-destructive transition-colors"
              onClick={handleDisable}
            >
              <Power className="w-4 h-4" />
              {t("relations.disable")}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default RelationsPage;
