import { motion } from "framer-motion";
import { CloudSun, Moon, Droplet } from "lucide-react";

interface VitalityCardsProps {
  mood?: string;
  sleepHours?: number;
  hydrationPercent?: number;
  onSleepClick?: () => void;
  onHydrationClick?: () => void;
}

const VitalityCards = ({ 
  mood = "Mostly Sunny", 
  sleepHours,
  hydrationPercent = 0,
  onSleepClick,
  onHydrationClick,
}: VitalityCardsProps) => {
  const displaySleep = sleepHours ? `${sleepHours}h` : "Log";
  const sleepQuality = sleepHours 
    ? sleepHours >= 7 ? "Good" : sleepHours >= 5 ? "Fair" : "Low"
    : "Tap to log";

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Mood Card */}
      <motion.div
        className="vitality-card p-5 flex flex-col items-center justify-center min-h-[120px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
          <CloudSun className="w-6 h-6 text-amber-500" />
        </div>
        <p className="font-semibold text-foreground">Mood</p>
        <p className="text-sm text-muted-foreground">{mood}</p>
      </motion.div>

      {/* Sleep Card */}
      <motion.button
        className="vitality-card p-5 flex flex-col items-center justify-center min-h-[120px] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSleepClick}
      >
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
          <Moon className="w-6 h-6 text-indigo-500" />
        </div>
        <p className="font-semibold text-foreground">Sleep</p>
        <p className="text-sm text-muted-foreground">{displaySleep} · {sleepQuality}</p>
      </motion.button>
    </div>
  );
};

export default VitalityCards;
