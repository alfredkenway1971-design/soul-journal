import { motion } from "framer-motion";
import { CloudSun, Moon } from "lucide-react";

interface VitalityCardsProps {
  mood?: string;
  sleepHours?: number;
  sleepMinutes?: number;
  sleepQuality?: string;
}

const VitalityCards = ({ 
  mood = "Mostly Sunny", 
  sleepHours = 7, 
  sleepMinutes = 20,
  sleepQuality = "Good" 
}: VitalityCardsProps) => {
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
      <motion.div
        className="vitality-card p-5 flex flex-col items-center justify-center min-h-[120px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
          <Moon className="w-6 h-6 text-indigo-500" />
        </div>
        <p className="font-semibold text-foreground">Sleep</p>
        <p className="text-sm text-muted-foreground">{sleepHours}h {sleepMinutes}m · {sleepQuality}</p>
      </motion.div>
    </div>
  );
};

export default VitalityCards;
