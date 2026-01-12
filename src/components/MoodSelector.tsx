import { motion } from "framer-motion";

export type Mood = "happy" | "good" | "fine" | "sad" | "unhappy";

interface MoodSelectorProps {
  selected: Mood | null;
  onSelect: (mood: Mood) => void;
}

const moods: { type: Mood; emoji: string; label: string; color: string }[] = [
  { type: "happy", emoji: "😊", label: "Happy", color: "bg-mood-happy" },
  { type: "good", emoji: "🙂", label: "Good", color: "bg-mood-good" },
  { type: "fine", emoji: "😐", label: "Fine", color: "bg-mood-fine" },
  { type: "sad", emoji: "😔", label: "Sad", color: "bg-mood-sad" },
  { type: "unhappy", emoji: "😢", label: "Unhappy", color: "bg-mood-unhappy" },
];

const MoodSelector = ({ selected, onSelect }: MoodSelectorProps) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-muted-foreground">How are you feeling?</p>
      <div className="flex gap-3">
        {moods.map((mood, index) => (
          <motion.button
            key={mood.type}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
              selected === mood.type
                ? "glass-card-strong scale-105"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelect(mood.type)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className={`text-xs font-medium ${
              selected === mood.type ? "text-foreground" : "text-muted-foreground"
            }`}>
              {mood.label}
            </span>
            {selected === mood.type && (
              <motion.div
                className={`w-2 h-2 rounded-full ${mood.color}`}
                layoutId="mood-indicator"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
