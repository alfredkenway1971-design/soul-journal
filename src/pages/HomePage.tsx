import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JournalEntry from "@/components/JournalEntry";
import BottomNav from "@/components/BottomNav";
import type { Mood } from "@/components/MoodSelector";

interface Entry {
  id: string;
  date: Date;
  title: string;
  preview: string;
  mood: Mood;
  hasAudio: boolean;
  hasImage?: boolean;
  imageUrl?: string;
}

// Sample entries for demo
const sampleEntries: Entry[] = [
  {
    id: "1",
    date: new Date(),
    title: "A Productive Morning",
    preview: "Started the day with meditation and journaling. The sunrise was absolutely beautiful today, casting golden light through my window...",
    mood: "happy",
    hasAudio: true,
    hasImage: true,
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000),
    title: "Reflections on the Week",
    preview: "It's been quite a journey this week. I've learned so much about myself and my goals. The challenges made me stronger...",
    mood: "good",
    hasAudio: true,
  },
  {
    id: "3",
    date: new Date(Date.now() - 172800000),
    title: "Finding Balance",
    preview: "Today was about finding equilibrium between work and rest. Sometimes the middle path is the wisest choice...",
    mood: "fine",
    hasAudio: true,
  },
  {
    id: "4",
    date: new Date(Date.now() - 259200000),
    title: "Rainy Day Thoughts",
    preview: "The rain outside mirrors my contemplative mood. There's something peaceful about listening to raindrops...",
    mood: "sad",
    hasAudio: true,
    hasImage: true,
    imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200&h=200&fit=crop",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const currentHour = new Date().getHours();
  
  const getGreeting = () => {
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const filteredEntries = sampleEntries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-sm text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-xl font-semibold text-foreground">Your Journal</h1>
            </motion.div>
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div
            className="mt-4 relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">12</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">5</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">😊</p>
            <p className="text-xs text-muted-foreground">Top Mood</p>
          </div>
        </motion.div>

        {/* Entries List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Entries</h2>
          <Button variant="ghost" size="sm" className="text-primary">
            See All
          </Button>
        </div>

        <div className="space-y-4">
          {filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <JournalEntry
                {...entry}
                onClick={() => navigate(`/entry/${entry.id}`)}
              />
            </motion.div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground">No entries found</p>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;
