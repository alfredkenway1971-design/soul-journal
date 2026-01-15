import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JournalEntry from "@/components/JournalEntry";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";
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

const moodEmojis: Record<Mood, string> = {
  happy: "😊",
  good: "🙂",
  fine: "😐",
  sad: "😔",
  unhappy: "😢",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const api = useJournalAPI();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    thisWeek: 0,
    streak: 0,
    topMood: "happy" as Mood,
  });
  
  const currentHour = new Date().getHours();
  
  const getGreeting = () => {
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) return;
      
      try {
        const data = await api.getEntries(user.id);
        
        const formattedEntries: Entry[] = data.map((entry) => ({
          id: entry.id,
          date: new Date(entry.created_at),
          title: entry.title || "Untitled Entry",
          preview: entry.enhanced_text || entry.original_transcription || "",
          mood: (entry.mood as Mood) || "fine",
          hasAudio: !!entry.audio_url,
        }));
        
        setEntries(formattedEntries);
        
        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekEntries = formattedEntries.filter((e) => e.date >= weekAgo);
        
        // Calculate streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const hasEntry = formattedEntries.some((e) => {
            const entryDate = new Date(e.date);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === checkDate.getTime();
          });
          
          if (hasEntry) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }
        
        // Calculate top mood
        const moodCounts: Record<string, number> = {};
        formattedEntries.forEach((e) => {
          moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        });
        
        const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood || "happy";
        
        setStats({
          thisWeek: thisWeekEntries.length,
          streak,
          topMood,
        });
      } catch (error) {
        console.error("Error fetching entries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEntries();
  }, [user]);

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
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
            <p className="text-2xl font-semibold text-foreground">{stats.thisWeek}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{moodEmojis[stats.topMood]}</p>
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
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
        )}

        {!isLoading && filteredEntries.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-muted-foreground mb-4">No entries yet</p>
            <Button 
              className="gradient-amber"
              onClick={() => navigate("/record")}
            >
              Create Your First Entry
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;
