import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, differenceInCalendarYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PastEntry {
  id: string;
  title: string | null;
  preview: string;
  created_at: string;
  yearsAgo: number;
}

const OnThisDayCard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memories, setMemories] = useState<PastEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Pull all entries that match this calendar day in any prior year.
        // We rely on small datasets per user; fetch and filter client-side.
        const { data } = await supabase
          .from("journal_entries")
          .select("id, title, enhanced_text, original_transcription, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const matches: PastEntry[] = [];
        (data || []).forEach((e: any) => {
          const d = new Date(e.created_at);
          if (d.getMonth() + 1 === month && d.getDate() === day) {
            const years = differenceInCalendarYears(today, d);
            if (years >= 1) {
              matches.push({
                id: e.id,
                title: e.title,
                preview: e.enhanced_text || e.original_transcription || "",
                created_at: e.created_at,
                yearsAgo: years,
              });
            }
          }
        });

        setMemories(matches.slice(0, 3));
      } catch (err) {
        console.error("OnThisDay error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading || memories.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="section-label !mb-0">{t("onThisDay.title")}</h2>
      </div>
      <div className="space-y-3">
        {memories.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/entry/${m.id}`)}
            className="w-full glass-premium p-4 text-left hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium tracking-wider text-primary">
                {m.yearsAgo} year{m.yearsAgo > 1 ? "s" : ""} ago
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(m.created_at), "yyyy")}
              </span>
            </div>
            <p className="font-medium text-foreground text-sm line-clamp-1">
              {m.title || "Untitled Entry"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {m.preview.replace(/<[^>]+>/g, "").slice(0, 120)}
            </p>
          </button>
        ))}
      </div>
    </motion.section>
  );
};

export default OnThisDayCard;
