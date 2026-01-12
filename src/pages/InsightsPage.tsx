import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InsightsChart from "@/components/InsightsChart";
import BottomNav from "@/components/BottomNav";
import type { Mood } from "@/components/MoodSelector";

const moodData = [
  { mood: "happy" as Mood, count: 12 },
  { mood: "good" as Mood, count: 18 },
  { mood: "fine" as Mood, count: 8 },
  { mood: "sad" as Mood, count: 4 },
  { mood: "unhappy" as Mood, count: 2 },
];

const InsightsPage = () => {
  const navigate = useNavigate();
  const totalEntries = moodData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Insights</h1>
              <p className="text-sm text-muted-foreground">Your journaling patterns</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Entries</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">{totalEntries}</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-journal-coral/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-journal-coral" />
              </div>
              <span className="text-sm text-muted-foreground">Best Streak</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">12 days</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-mood-happy/20 flex items-center justify-center">
                <span className="text-lg">😊</span>
              </div>
              <span className="text-sm text-muted-foreground">Most Felt</span>
            </div>
            <p className="text-xl font-semibold text-foreground">Good</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-journal-sage/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Avg. Length</span>
            </div>
            <p className="text-xl font-semibold text-foreground">3:24 min</p>
          </div>
        </motion.div>

        {/* Mood Distribution Chart */}
        <InsightsChart data={moodData} totalEntries={totalEntries} />

        {/* Weekly Trend */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-4">This Week</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
              const heights = [60, 80, 45, 90, 75, 100, 30];
              const colors = [
                "bg-mood-good",
                "bg-mood-happy",
                "bg-mood-fine",
                "bg-mood-happy",
                "bg-mood-good",
                "bg-mood-happy",
                "bg-muted",
              ];
              
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    className={`w-full rounded-t-lg ${colors[index]}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${heights[index]}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Voice Languages Used */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4">Languages Used</h3>
          <div className="space-y-3">
            {[
              { flag: "🇺🇸", name: "English", count: 28 },
              { flag: "🇫🇷", name: "French", count: 8 },
              { flag: "🇯🇵", name: "Japanese", count: 5 },
              { flag: "🇪🇸", name: "Spanish", count: 3 },
            ].map((lang, index) => (
              <motion.div
                key={lang.name}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 text-sm font-medium">{lang.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full gradient-amber rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(lang.count / 28) * 100}%` }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">
                  {lang.count}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default InsightsPage;
