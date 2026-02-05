import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, PersonStanding, X, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPages: number;
  goal: number;
  onSave: (pages: number, goal?: number) => void;
}

export const ReadingModal = ({ isOpen, onClose, currentPages, goal, onSave }: ReadingModalProps) => {
  const [pages, setPages] = useState(currentPages);
  const [dailyGoal, setDailyGoal] = useState(goal);

  useEffect(() => {
    setPages(currentPages);
    setDailyGoal(goal);
  }, [currentPages, goal, isOpen]);

  const handleSave = () => {
    onSave(pages, dailyGoal);
    onClose();
  };

  const progress = dailyGoal > 0 ? Math.min((pages / dailyGoal) * 100, 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            Track Reading
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pages Counter */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Pages read today</p>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setPages(Math.max(0, pages - 5))}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <span className="text-5xl font-display font-semibold w-24">{pages}</span>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setPages(pages + 5)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Goal Slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Daily goal</span>
              <span className="text-sm font-medium">{dailyGoal} pages</span>
            </div>
            <Slider
              value={[dailyGoal]}
              onValueChange={([val]) => setDailyGoal(val)}
              min={5}
              max={100}
              step={5}
              className="py-2"
            />
          </div>

          <Button onClick={handleSave} className="w-full rounded-full gradient-primary">
            Save Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface RunningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKm: number;
  goal: number;
  onSave: (km: number, goal?: number) => void;
}

export const RunningModal = ({ isOpen, onClose, currentKm, goal, onSave }: RunningModalProps) => {
  const [km, setKm] = useState(currentKm);
  const [dailyGoal, setDailyGoal] = useState(goal);

  useEffect(() => {
    setKm(currentKm);
    setDailyGoal(goal);
  }, [currentKm, goal, isOpen]);

  const handleSave = () => {
    onSave(km, dailyGoal);
    onClose();
  };

  const progress = dailyGoal > 0 ? Math.min((km / dailyGoal) * 100, 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <PersonStanding className="w-5 h-5 text-green-600" />
            </div>
            Track Running
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Distance Counter */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Distance today</p>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setKm(Math.max(0, km - 0.5))}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="w-28 text-center">
                <span className="text-5xl font-display font-semibold">{km}</span>
                <span className="text-xl text-muted-foreground ml-1">km</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={() => setKm(km + 0.5)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Goal Slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Daily goal</span>
              <span className="text-sm font-medium">{dailyGoal} km</span>
            </div>
            <Slider
              value={[dailyGoal]}
              onValueChange={([val]) => setDailyGoal(val)}
              min={1}
              max={20}
              step={0.5}
              className="py-2"
            />
          </div>

          <Button onClick={handleSave} className="w-full rounded-full gradient-primary">
            Save Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
