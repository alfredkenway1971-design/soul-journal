import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Settings, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AvatarUpload from "@/components/premium/AvatarUpload";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Mood } from "@/components/MoodSelector";

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState("Alex Morgan");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("Mindful Explorer · San Francisco");
  const [manifesto, setManifesto] = useState('"To live with intention, embrace the chaos, and find stillness in the motion."');
  const [isEditingManifesto, setIsEditingManifesto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ streak: 0, entries: 0, topMood: "happy" as Mood });
  const [interests, setInterests] = useState<string[]>(["Mindfulness", "Marathon Prep", "Digital Art"]);

  const interestEmojis: Record<string, string> = {
    "Mindfulness": "🌿",
    "Marathon Prep": "🏃",
    "Digital Art": "🎨",
    "Reading": "📚",
    "Meditation": "🧘",
    "Writing": "✍️",
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, interests, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
        if (profile?.interests) {
          setInterests(profile.interests);
        }
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Fetch entries for stats
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('id, mood, created_at')
          .eq('user_id', user.id);

        if (entries) {
          // Calculate streak
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let streak = 0;
          
          for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const hasEntry = entries.some((e) => {
              const entryDate = new Date(e.created_at);
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
          entries.forEach((e) => {
            if (e.mood) {
              moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
            }
          });
          const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood || "happy";

          setStats({
            streak,
            entries: entries.length,
            topMood,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSaveManifesto = async () => {
    setIsEditingManifesto(false);
    toast({
      title: "Manifesto Updated",
      description: "Your personal manifesto has been saved.",
    });
  };

  const firstName = displayName.split(' ')[0];

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm pb-28">
      {/* Header */}
      <header className="pt-12 pb-4 px-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="section-label">PROFILE</p>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-10 h-10 bg-white/50 dark:bg-white/10"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 space-y-6">
        {/* Avatar Section */}
        <motion.div
          className="flex flex-col items-center pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4">
            {user && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                displayName={displayName}
                onAvatarChange={setAvatarUrl}
              />
            )}
          </div>
          <h1 className="text-2xl font-display font-semibold text-foreground">{displayName}</h1>
          <p className="text-muted-foreground">{bio}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{stats.streak}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Streak</p>
          </div>
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{stats.entries}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Entries</p>
          </div>
          <div className="vitality-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground capitalize">Top</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mood</p>
          </div>
        </motion.div>

        {/* My Manifesto */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="section-label mb-3">MY MANIFESTO</p>
          <div className="glass-premium p-5">
            <div className="text-4xl text-primary/30 font-display mb-2">"</div>
            {isEditingManifesto ? (
              <div className="space-y-4">
                <Textarea
                  value={manifesto}
                  onChange={(e) => setManifesto(e.target.value)}
                  className="min-h-[100px] font-journal text-lg border-0 bg-transparent resize-none focus-visible:ring-0 -mt-4"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditingManifesto(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={handleSaveManifesto}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-journal text-lg text-foreground leading-relaxed -mt-4">
                  {manifesto.replace(/"/g, '')}
                  {" "}
                  <span className="text-primary">intention</span>
                  {", embrace the chaos, and find stillness in the motion.\""}
                </p>
                <button 
                  className="mt-4 text-sm font-semibold text-charcoal dark:text-primary uppercase tracking-wider border-b-2 border-dashed border-charcoal/30 dark:border-primary/30 pb-0.5"
                  onClick={() => setIsEditingManifesto(true)}
                >
                  Edit Manifesto
                </button>
              </>
            )}
          </div>
        </motion.section>

        {/* Current Focus */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="section-label mb-3">CURRENT FOCUS</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span 
                key={interest}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 border border-border/50 text-sm font-medium"
              >
                <span>{interestEmojis[interest] || "✨"}</span>
                {interest}
              </span>
            ))}
            <button 
              className="w-10 h-10 rounded-full bg-white/60 dark:bg-white/10 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/settings/goals")}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfileSettingsPage;
