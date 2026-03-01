import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalAPI } from "@/hooks/useJournalAPI";

import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import AIInsightCard from "@/components/premium/AIInsightCard";
import QuickCapture from "@/components/premium/QuickCapture";
import RecentEntryCard from "@/components/premium/RecentEntryCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Mood } from "@/components/MoodSelector";

interface Entry {
  id: string;
  date: Date;
  title: string;
  preview: string;
  mood: Mood;
  hasAudio: boolean;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useJournalAPI();
  
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [latestInsight, setLatestInsight] = useState<string | null>(null);
  
  const currentDate = new Date();
  const dayOfWeek = format(currentDate, "EEEE");
  const formattedDate = format(currentDate, "MMM d").toUpperCase() + ", " + dayOfWeek.toUpperCase();
  
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return "Morning";
    if (currentHour < 17) return "Afternoon";
    return "Evening";
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Fetch latest AI insight
        const { data: insights } = await supabase
          .from('coaching_insights')
          .select('content')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (insights && insights.length > 0) {
          setLatestInsight(insights[0].content);
        }

        // Fetch entries
        const data = await api.getEntries(user.id);
        
        const formattedEntries: Entry[] = data.slice(0, 5).map((entry) => ({
          id: entry.id,
          date: new Date(entry.created_at),
          title: entry.title || "Untitled Entry",
          preview: entry.enhanced_text || entry.original_transcription || "",
          mood: (entry.mood as Mood) || "fine",
          hasAudio: !!entry.audio_url,
        }));
        
        setEntries(formattedEntries);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const firstName = displayName?.split(' ')[0] || 'Alex';

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="section-label mb-1">{formattedDate}</p>
              <h1 className="text-2xl text-foreground">
                <span className="font-normal">{getGreeting()}, </span>
                <span className="font-display italic">{firstName}</span>
              </h1>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <Avatar 
                className="w-12 h-12 border-2 border-primary/30 cursor-pointer"
                onClick={() => navigate("/settings/profile")}
              >
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-medium">
                  {firstName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-background" />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 space-y-6">
        {/* AI Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AIInsightCard insight={latestInsight || undefined} userName={firstName} />
        </motion.div>

        {/* Quick Capture - moved up */}

        {/* Quick Capture */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Quick Capture</h2>
          <QuickCapture />
        </section>

        {/* Recent Entries */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-label">Recent Entries</h2>
            <button 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => navigate("/calendar")}
            >
              View All
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-3">
              {entries.slice(0, 3).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <RecentEntryCard
                    id={entry.id}
                    title={entry.title}
                    preview={entry.preview.substring(0, 50) + "..."}
                    date={entry.date}
                    mood={entry.mood}
                    onClick={() => navigate(`/entry/${entry.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              className="glass-premium p-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-muted-foreground mb-4">No entries yet</p>
              <button 
                className="gradient-primary text-white px-6 py-2.5 rounded-full font-medium"
                onClick={() => navigate("/record")}
              >
                Create Your First Entry
              </button>
            </motion.div>
          )}
        </section>
      </main>


      <BottomNav />
    </div>
  );
};

export default HomePage;
