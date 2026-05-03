import { motion } from "framer-motion";
import type { Mood } from "@/components/MoodSelector";

export type MoodFilterValue = "all" | Mood;

interface MoodFilterBarProps {
  value: MoodFilterValue;
  onChange: (v: MoodFilterValue) => void;
}

export const MOOD_FILTERS: { value: MoodFilterValue; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "good", label: "Grateful", emoji: "🙂" },
  { value: "fine", label: "Peaceful", emoji: "😐" },
  { value: "sad", label: "Sad", emoji: "😔" },
  { value: "unhappy", label: "Anxious", emoji: "😢" },
];

const MoodFilterBar = ({ value, onChange }: MoodFilterBarProps) => {
  return (
    <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 pb-1">
        {MOOD_FILTERS.map((m) => {
          const active = m.value === value;
          return (
            <motion.button
              key={m.value}
              onClick={() => onChange(m.value)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background/60 text-foreground border-border/60 hover:bg-background"
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodFilterBar;
