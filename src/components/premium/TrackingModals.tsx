import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Moon, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface SleepModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHours: number | null;
  onSave: (hours: number) => Promise<unknown>;
}

export const SleepModal = ({ isOpen, onClose, currentHours, onSave }: SleepModalProps) => {
  const [hours, setHours] = useState(currentHours || 7);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(hours);
      onClose();
    } catch (error) {
      console.error('Error saving sleep:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-background rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md mx-4 mb-0 sm:mb-4"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Moon className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className="text-xl font-display font-semibold">Log Sleep</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center mb-8">
            <p className="text-5xl font-semibold text-foreground mb-2">{hours}h</p>
            <p className="text-muted-foreground">hours of sleep</p>
          </div>

          <Slider
            value={[hours]}
            onValueChange={([value]) => setHours(value)}
            min={0}
            max={12}
            step={0.5}
            className="mb-8"
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="flex-1 gradient-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface HydrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGlasses: number;
  goal: number;
  onSave: (glasses: number) => Promise<unknown>;
}

export const HydrationModal = ({ isOpen, onClose, currentGlasses, goal, onSave }: HydrationModalProps) => {
  const [glasses, setGlasses] = useState(currentGlasses);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(glasses);
      onClose();
    } catch (error) {
      console.error('Error saving hydration:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const percentage = Math.min(100, Math.round((glasses / goal) * 100));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-background rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md mx-4 mb-0 sm:mb-4"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Droplet className="w-6 h-6 text-cyan-500" />
              </div>
              <h2 className="text-xl font-display font-semibold">Log Hydration</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center mb-6">
            <p className="text-5xl font-semibold text-foreground mb-2">{percentage}%</p>
            <p className="text-muted-foreground">{glasses} of {goal} glasses</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setGlasses(Math.max(0, glasses - 1))}
            >
              <Minus className="w-6 h-6" />
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: goal }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-4 h-8 rounded-full ${
                    i < glasses ? "bg-cyan-500" : "bg-muted"
                  }`}
                  animate={{ scale: i < glasses ? 1 : 0.8 }}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setGlasses(glasses + 1)}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              className="flex-1 gradient-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
