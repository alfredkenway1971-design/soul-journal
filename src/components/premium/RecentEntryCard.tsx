import { motion } from "framer-motion";
import { AudioLines } from "lucide-react";
import { format } from "date-fns";
import { useTitleCase } from "@/hooks/useTitleCase";

interface RecentEntryCardProps {
  id: string;
  title: string;
  preview: string;
  date: Date;
  duration?: string;
  mood?: string;
  onClick?: () => void;
}

const moodEmoji: Record<string, string> = {
  happy: "😄",
  good: "😊",
  fine: "🙂",
  calm: "😌",
  sad: "😔",
  anxious: "😰",
  unhappy: "😢",
};

const RecentEntryCard = ({
  title,
  preview,
  date,
  duration,
  mood = "fine",
  onClick,
}: RecentEntryCardProps) => {
  const titleCase = useTitleCase();
  const dateLabel =
    format(date, "MMM d").toUpperCase() + ", " + format(date, "EEEE").toUpperCase();

  return (
    <motion.button
      className="w-full glass-premium p-4 text-left"
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground">
          {dateLabel}
        </span>
        {duration && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <AudioLines className="w-4 h-4" />
            <span className="text-xs font-medium">{duration}</span>
          </span>
        )}
      </div>
      <h3 className="font-semibold text-foreground text-base mb-1">
        {titleCase(title)} <span className="ml-1">{moodEmoji[mood] || "🙂"}</span>
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
    </motion.button>
  );
};

export default RecentEntryCard;
