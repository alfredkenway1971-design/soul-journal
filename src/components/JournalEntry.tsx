import { motion } from "framer-motion";
import { Play, Pause, Image, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Mood } from "./MoodSelector";

interface JournalEntryProps {
  id: string;
  date: Date;
  title: string;
  preview: string;
  mood: Mood;
  hasAudio: boolean;
  hasImage?: boolean;
  imageUrl?: string;
  onClick?: () => void;
}

const moodEmojis: Record<Mood, string> = {
  happy: "😊",
  good: "🙂",
  fine: "😐",
  sad: "😔",
  unhappy: "😢",
};

const moodColors: Record<Mood, string> = {
  happy: "bg-mood-happy/20 text-mood-happy",
  good: "bg-mood-good/20 text-mood-good",
  fine: "bg-mood-fine/20 text-mood-fine",
  sad: "bg-mood-sad/20 text-mood-sad",
  unhappy: "bg-mood-unhappy/20 text-mood-unhappy",
};

const JournalEntry = ({
  date,
  title,
  preview,
  mood,
  hasAudio,
  hasImage,
  imageUrl,
  onClick,
}: JournalEntryProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <motion.div
      className="entry-card glass-card rounded-2xl p-4 cursor-pointer"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex gap-4">
        {/* Image Preview */}
        {hasImage && imageUrl && (
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(date)}
              </span>
              <div className={`px-2 py-0.5 rounded-full text-xs ${moodColors[mood]}`}>
                {moodEmojis[mood]}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Title */}
          <h3 className="font-medium text-foreground mb-1 truncate font-journal text-lg">
            {title}
          </h3>

          {/* Preview */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {preview}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3">
            {hasAudio && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span className="text-xs">Listen</span>
              </Button>
            )}
            {hasImage && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Image className="w-3 h-3" />
                <span>1 photo</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JournalEntry;
