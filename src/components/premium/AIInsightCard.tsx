import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { smartTitleCase } from "@/lib/smartTitleCase";

interface AIInsightCardProps {
  insight?: string;
  userName?: string;
}

const AIInsightCard = ({ insight, userName = "there" }: AIInsightCardProps) => {
  const navigate = useNavigate();
  
  const defaultInsight = `You seem energetic but slightly anxious. Why not channel that into a 5-minute free-write?`;

  return (
    <motion.div
      className="insight-card p-5 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate("/record")}
    >
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 bg-white/60 dark:bg-white/10 rounded-full px-3 py-1.5 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary tracking-wide">AI Insight</span>
      </div>
      
      {/* Insight text */}
      <p className="text-foreground font-medium leading-relaxed mb-4">
        "{smartTitleCase(insight || defaultInsight)}"
      </p>
      
      {/* CTA */}
      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <span className="text-sm">{smartTitleCase("Tap to start journaling")}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </motion.div>
  );
};

export default AIInsightCard;
