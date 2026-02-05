import { motion } from "framer-motion";
import { Droplet, BookOpen, PersonStanding } from "lucide-react";

interface FocusItem {
  id: string;
  icon: "hydration" | "reading" | "running";
  value: string;
  label: string;
  progress?: number;
  isDark?: boolean;
  onClick?: () => void;
}

interface FocusCardsProps {
  items?: FocusItem[];
}

const iconMap = {
  hydration: Droplet,
  reading: BookOpen,
  running: PersonStanding,
};

const defaultItems: FocusItem[] = [
  { id: "1", icon: "hydration", value: "60%", label: "Hydration", isDark: true },
  { id: "2", icon: "reading", value: "0/15", label: "Reading", progress: 0 },
  { id: "3", icon: "running", value: "3km", label: "Running", progress: 100 },
];

const FocusCards = ({ items = defaultItems }: FocusCardsProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {items.map((item, index) => {
        const Icon = iconMap[item.icon];
        
        return (
          <motion.button
            key={item.id}
            className={`flex-shrink-0 w-[140px] p-4 text-left ${
              item.isDark 
                ? "focus-card-dark" 
                : "vitality-card"
            }`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={item.onClick}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
              item.isDark 
                ? "bg-white/10" 
                : "bg-muted"
            }`}>
              <Icon className={`w-5 h-5 ${item.isDark ? "text-white" : "text-muted-foreground"}`} />
            </div>
            
            <p className={`text-2xl font-semibold mb-1 ${
              item.isDark ? "text-white" : "text-foreground"
            }`}>
              {item.value}
            </p>
            <p className={`text-sm ${
              item.isDark ? "text-white/70" : "text-muted-foreground"
            }`}>
              {item.label}
            </p>

            {/* Progress bar for non-dark cards */}
            {item.progress !== undefined && !item.isDark && (
              <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full ${
                    item.progress >= 100 ? "bg-green-500" : "bg-charcoal"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.progress, 100)}%` }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default FocusCards;
