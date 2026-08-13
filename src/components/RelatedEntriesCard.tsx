import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface RelatedEntry {
  id: string;
  title: string | null;
  preview: string;
  created_at: string;
  score: number;
}

interface Props {
  userId: string;
  entryId: string;
  text: string;
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","i","you","he","she","we","they","it","my","me","to","of","in","on","at","for","with","that","this","as","from","by","so","if","then","than","just","really","very","like","about","have","has","had","do","does","did","not","no","yes","up","down","out","over","under","into","because","also","more","some","any","all","what","which","who","when","where","why","how","there","here","feel","feeling","felt","today","day","time"
]);

const tokenize = (text: string): string[] =>
  text.toLowerCase()
    .replace(/[^a-zà-ÿ\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

const RelatedEntriesCard = ({ userId, entryId, text }: Props) => {
  const navigate = useNavigate();
  const [related, setRelated] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!text || !userId) {
        setLoading(false);
        return;
      }
      const myTokens = new Set(tokenize(text));
      if (myTokens.size === 0) {
        setLoading(false);
        return;
      }

      // Pull recent entries (excluding the current one) and rank by token overlap.
      const { data } = await supabase
        .from("journal_entries")
        .select("id, title, enhanced_text, original_transcription, created_at")
        .eq("user_id", userId)
        .neq("id", entryId)
        .order("created_at", { ascending: false })
        .limit(50);

      const scored: RelatedEntry[] = (data || [])
        .map((e: any) => {
          const body = e.enhanced_text || e.original_transcription || "";
          const tokens = new Set(tokenize(body));
          let overlap = 0;
          tokens.forEach(t => { if (myTokens.has(t)) overlap++; });
          return {
            id: e.id,
            title: e.title,
            preview: body.substring(0, 100),
            created_at: e.created_at,
            score: overlap,
          };
        })
        .filter(e => e.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setRelated(scored);
      setLoading(false);
    };
    fetchRelated();
  }, [userId, entryId, text]);

  if (loading || related.length === 0) return null;

  return (
    <motion.div
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary tracking-wide">
          Related Reflections
        </h3>
      </div>
      <div className="space-y-2">
        {related.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/entry/${r.id}`)}
            className="w-full text-left p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {r.title || "Journal Entry"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {r.preview}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                {format(new Date(r.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default RelatedEntriesCard;
