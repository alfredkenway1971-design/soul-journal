import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Settings, Plus, Pencil, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [captureContext, setCaptureContext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ streak: 0, entries: 0, topMood: "happy" as Mood });
  const [interests, setInterests] = useState<string[]>([]);

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
          .select('display_name, interests, avatar_url, gender, capture_context')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.interests) setInterests(profile.interests);
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        if ((profile as any)?.gender) setGender((profile as any).gender);
        if ((profile as any)?.capture_context) setCaptureContext(true);

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

  const handleGenderChange = async (newGender: string) => {
    if (!user) return;
    setGender(newGender);
    try {
      await supabase
        .from('profiles')
        .update({ gender: newGender } as any)
        .eq('id', user.id);
      toast({ title: "Voice Preference Updated", description: `Playback voice set to ${newGender}.` });
    } catch {
      toast({ title: "Error", description: "Failed to save preference.", variant: "destructive" });
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !editedName.trim()) return;
    try {
      await supabase
        .from('profiles')
        .update({ display_name: editedName.trim() })
        .eq('id', user.id);
      setDisplayName(editedName.trim());
      setIsEditingName(false);
      toast({ title: "Name Updated", description: "Your display name has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
    }
  };

  const startEditingName = () => {
    setEditedName(resolvedDisplayName);
    setIsEditingName(true);
  };

  const resolvedDisplayName = displayName.trim() || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "Journal User";

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
                  displayName={resolvedDisplayName}
                onAvatarChange={setAvatarUrl}
              />
            )}
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-10 text-center text-lg font-semibold rounded-xl max-w-[200px]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveDisplayName()}
              />
              <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleSaveDisplayName}>
                <Check className="w-4 h-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={() => setIsEditingName(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <button className="flex items-center gap-2 group" onClick={startEditingName}>
              <h1 className="text-2xl font-display font-semibold text-foreground">{resolvedDisplayName}</h1>
              <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
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

        {/* Voice Gender Preference */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="section-label mb-3">VOICE PREFERENCE</p>
          <div className="glass-premium p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Select your preferred playback voice gender:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`p-4 rounded-xl border-2 text-center transition-all ${gender === 'male' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/50 bg-white/40 dark:bg-white/5 text-foreground'}`}
                onClick={() => handleGenderChange('male')}
              >
                <span className="text-2xl block mb-1">🧔</span>
                <span className="text-sm">Male</span>
              </button>
              <button
                className={`p-4 rounded-xl border-2 text-center transition-all ${gender === 'female' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/50 bg-white/40 dark:bg-white/5 text-foreground'}`}
                onClick={() => handleGenderChange('female')}
              >
                <span className="text-2xl block mb-1">👩</span>
                <span className="text-sm">Female</span>
              </button>
            </div>
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
