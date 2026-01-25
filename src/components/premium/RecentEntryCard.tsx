import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface RecentEntryCardProps {
  id: string;
  title: string;
  preview: string;
  date: Date;
  duration?: string;
  mood?: string;
  onClick?: () => void;
}

const moodColors: Record<string, string> = {
  happy: "bg-mood-happy",
  good: "bg-mood-good",
  fine: "bg-mood-fine",
  calm: "bg-mood-calm",
  sad: "bg-mood-sad",
  anxious: "bg-mood-anxious",
  unhappy: "bg-mood-unhappy",
};

const RecentEntryCard = ({
  title,
  preview,
  date,
  duration = "0:45",
  mood = "fine",
  onClick,
}: RecentEntryCardProps) => {
  return (
    <motion.button
      className="w-full vitality-card p-4 flex items-center gap-4 text-left"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-muted flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase text-muted-foreground font-medium">
          {format(date, "MMM")}
        </span>
        <span className="text-lg font-semibold text-foreground">
          {format(date, "d")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{title}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${moodColors[mood] || "bg-muted"}`} />
          <p className="text-sm text-muted-foreground truncate">{preview}</p>
        </div>
      </div>

      {/* Audio indicator */}
      <div className="flex-shrink-0 flex items-center gap-2 text-muted-foreground">
        <BarChart3 className="w-5 h-5" />
        <span className="text-sm">{duration}</span>
      </div>
    </motion.button>
  );
};

export default RecentEntryCard;
