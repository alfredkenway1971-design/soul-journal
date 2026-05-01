import { useMemo } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import type { Mood } from "@/components/MoodSelector";

interface MoodSliderProps {
  value: number | null;
  onChange: (score: number, mood: Mood) => void;
  label?: string;
}

// Map a 1–10 score to a categorical mood + emoji + color
const getMoodMeta = (score: number): { mood: Mood; emoji: string; label: string; color: string } => {
  if (score <= 2) return { mood: "unhappy", emoji: "😢", label: "Unhappy", color: "bg-rose-500" };
  if (score <= 4) return { mood: "sad", emoji: "😔", label: "Sad", color: "bg-rose-300" };
  if (score <= 6) return { mood: "fine", emoji: "😐", label: "Fine", color: "bg-sky-400" };
  if (score <= 8) return { mood: "good", emoji: "🙂", label: "Good", color: "bg-amber-300" };
  return { mood: "happy", emoji: "😊", label: "Happy", color: "bg-amber-400" };
};

export const moodScoreToMood = (score: number): Mood => getMoodMeta(score).mood;
export const moodToScore = (mood: Mood): number => {
  switch (mood) {
    case "unhappy": return 2;
    case "sad": return 4;
    case "fine": return 6;
    case "good": return 8;
    case "happy": return 10;
  }
};

const MoodSlider = ({ value, onChange, label = "How are you feeling?" }: MoodSliderProps) => {
  const score = value ?? 6;
  const meta = useMemo(() => getMoodMeta(score), [score]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <motion.div
        key={meta.emoji}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-6xl leading-none">{meta.emoji}</span>
        <span className="text-sm font-medium text-foreground">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{score} / 10</span>
      </motion.div>

      <div className="w-full px-4">
        <Slider
          min={1}
          max={10}
          step={1}
          value={[score]}
          onValueChange={(v) => {
            const s = v[0];
            onChange(s, getMoodMeta(s).mood);
          }}
          aria-label="Mood intensity"
        />
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>😢 1</span>
          <span>😐 5</span>
          <span>😊 10</span>
        </div>
      </div>
    </div>
  );
};

export default MoodSlider;
