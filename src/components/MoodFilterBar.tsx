import { motion } from "framer-motion";
import type { Mood } from "@/components/MoodSelector";

export type MoodFilterValue = "all" | Mood;

interface MoodFilterBarProps {
  value: MoodFilterValue;
  onChange: (v: MoodFilterValue) => void;
}

export const MOOD_FILTERS: { value: MoodFilterValue; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "good", label: "Grateful", emoji: "😇" },
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "fine", label: "Peaceful", emoji: "😌" },
  { value: "sad", label: "Sad", emoji: "😔" },
  { value: "unhappy", label: "Anxious", emoji: "😢" },
];

const MoodFilterBar = ({ value, onChange }: MoodFilterBarProps) => {
  return (
    <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
      <div className="flex gap-2.5 pb-1">
        {MOOD_FILTERS.map((m) => {
          const active = m.value === value;
          return (
            <motion.button
              key={m.value}
              onClick={() => onChange(m.value)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, hsl(211 90% 55%) 0%, hsl(220 85% 45%) 100%)",
                      color: "white",
                      boxShadow:
                        "0 6px 18px -6px hsla(211,90%,40%,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }
                  : {
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45))",
                      backdropFilter: "blur(12px) saturate(140%)",
                      WebkitBackdropFilter: "blur(12px) saturate(140%)",
                      border: "1px solid rgba(255,255,255,0.6)",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 2px 8px -2px hsla(215,50%,20%,0.08)",
                    }
              }
            >
              <span className="text-base leading-none">{m.emoji}</span>
              <span>{m.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodFilterBar;
