import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoachReflectionCardProps {
  title?: string;
  content?: string;
  highlightedText?: string;
  readTime?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

const CoachReflectionCard = ({
  title = "Insight From Yesterday",
  content = "You noticed a pattern of energy dips around 3PM. Consider scheduling your",
  highlightedText = "Mindful Break",
  readTime = "2 min read",
  onAccept,
  onDismiss,
}: CoachReflectionCardProps) => {
  return (
    <motion.div
      className="glass-premium p-5 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Left accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-full" />
      
      <div className="pl-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-bold tracking-wider text-primary">
              {title}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{readTime}</span>
        </div>

        {/* Content */}
        <p className="text-foreground leading-relaxed mb-4">
          "{content}{" "}
          <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
            {highlightedText}
          </span>
          {" "}earlier today to preempt the fatigue."
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 border-charcoal dark:border-border text-charcoal dark:text-foreground font-medium"
            onClick={onAccept}
          >
            Yes, schedule it
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CoachReflectionCard;
