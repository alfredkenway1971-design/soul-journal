import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Target, Plus, X, Sparkles, Heart, Briefcase, Brain, Users, Zap, Shield, AlertTriangle, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VoiceInputField from "@/components/premium/VoiceInputField";

interface Goal {
  id: string;
  title: string;
  category: string;
  icon: string;
}

const PRESET_GOALS = [
  { title: "Get a promotion", category: "career", icon: "Briefcase" },
  { title: "Become a better leader", category: "career", icon: "Users" },
  { title: "Improve work-life balance", category: "wellness", icon: "Heart" },
  { title: "Build better habits", category: "personal", icon: "Zap" },
  { title: "Reduce stress & anxiety", category: "wellness", icon: "Brain" },
  { title: "Strengthen relationships", category: "personal", icon: "Users" },
  { title: "Boost creativity", category: "personal", icon: "Sparkles" },
  { title: "Improve communication", category: "career", icon: "Users" },
];

const PRESET_INTERESTS = [
  "Mindfulness", "Productivity", "Leadership", "Health & Fitness",
  "Career Growth", "Relationships", "Creativity", "Mental Health",
  "Time Management", "Personal Finance", "Learning", "Self-Reflection"
];

const PRESET_STRENGTHS = [
  "Resilience", "Empathy", "Discipline", "Creativity", "Leadership",
  "Patience", "Courage", "Honesty", "Adaptability", "Gratitude"
];

const PRESET_FEARS = [
  "Failure", "Rejection", "Loneliness", "Losing control", "Not being enough",
  "Change", "Vulnerability", "Missing out", "Disappointing others"
];

const WORLDVIEW_OPTIONS = [
  { label: "Islam", emoji: "☪️" },
  { label: "Christianity", emoji: "✝️" },
  { label: "Judaism", emoji: "✡️" },
  { label: "Buddhism", emoji: "☸️" },
  { label: "Hinduism", emoji: "🕉️" },
  { label: "Sikhism", emoji: "🙏" },
  { label: "Spiritual (non-religious)", emoji: "✨" },
  { label: "Secular / No preference", emoji: "🌍" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase, Users, Heart, Zap, Brain, Sparkles, Target
};

const GoalsSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [worldview, setWorldview] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newFear, setNewFear] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('goals, interests, fears, strengths, worldview')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          const goalsData = Array.isArray(data.goals) ? data.goals as unknown as Goal[] : [];
          setGoals(goalsData);
          setInterests(data.interests || []);
          setStrengths((data as any).fears || []);
          setFears((data as any).strengths || []);
          // Fix: fears/strengths were swapped above, correct:
          setFears((data as any).fears || []);
          setStrengths((data as any).strengths || []);
          setWorldview((data as any).worldview || null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          goals: JSON.parse(JSON.stringify(goals)),
          interests: interests
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Goals Updated",
        description: "Your goals and interests have been saved.",
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addGoal = (preset?: typeof PRESET_GOALS[0]) => {
    const goal: Goal = preset 
      ? { id: crypto.randomUUID(), ...preset }
      : { id: crypto.randomUUID(), title: newGoal, category: "personal", icon: "Target" };
    
    if (!goal.title.trim()) return;
    if (goals.some(g => g.title.toLowerCase() === goal.title.toLowerCase())) {
      toast({ title: "Goal already exists", variant: "destructive" });
      return;
    }
    
    setGoals([...goals, goal]);
    setNewGoal("");
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (!newInterest.trim()) return;
    if (interests.includes(newInterest.trim())) {
      toast({ title: "Interest already exists", variant: "destructive" });
      return;
    }
    setInterests([...interests, newInterest.trim()]);
    setNewInterest("");
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Target;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Goals & Interests</h1>
              <p className="text-sm text-muted-foreground">Personalize your AI coach</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Goals Section */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Your Goals</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Define what you're working towards. Your AI coach will analyze entries with these goals in mind.
          </p>
          
          {/* Current Goals */}
          <AnimatePresence>
            {goals.length > 0 && (
              <div className="space-y-2">
                {goals.map((goal) => {
                  const IconComponent = getIconComponent(goal.icon);
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <span className="flex-1 text-foreground">{goal.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeGoal(goal.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Add Custom Goal */}
          <div className="space-y-3">
            <VoiceInputField
              value={newGoal}
              onChange={setNewGoal}
              placeholder="Type your goal or tap mic to speak..."
              summarize={true}
              summaryPrompt="Extract and summarize the main goal from this text in one clear, actionable sentence:"
              label="Speak or type your goal"
            />
            <Button 
              onClick={() => addGoal()} 
              className="w-full rounded-xl"
              disabled={!newGoal.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>

          {/* Preset Goals */}
          <div className="pt-2">
            <Label className="text-sm text-muted-foreground mb-2 block">Quick add:</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_GOALS.filter(p => !goals.some(g => g.title === p.title)).slice(0, 4).map((preset) => (
                <Badge
                  key={preset.title}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => addGoal(preset)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {preset.title}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Interests Section */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Your Interests</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Select topics you care about or add your own for more relevant insights.
          </p>
          
          {/* Voice input for custom interests */}
          <VoiceInputField
            value={newInterest}
            onChange={setNewInterest}
            placeholder="Describe your interests..."
            summarize={true}
            summaryPrompt="Extract a short list of interest topics (comma-separated) from this text:"
            label="Speak your interests"
          />
          
          {newInterest && (
            <Button 
              onClick={addCustomInterest} 
              variant="outline"
              className="w-full rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Interest
            </Button>
          )}
          
          {/* Current interests (custom + selected presets) */}
          {interests.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Your interests:</Label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="default"
                    className="cursor-pointer bg-primary text-primary-foreground gap-1"
                  >
                    {interest}
                    <X 
                      className="w-3 h-3 ml-1" 
                      onClick={() => toggleInterest(interest)} 
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Preset interests */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick add:</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_INTERESTS.filter(i => !interests.includes(i)).map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-all"
                  onClick={() => toggleInterest(interest)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            className="w-full h-12 rounded-xl gradient-amber"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        {/* Info Card */}
        <motion.div
          className="glass-card rounded-2xl p-4 border border-primary/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">How it works</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your AI coach analyzes journal entries through the lens of your goals, 
                providing personalized insights, actionable challenges, and wellness alerts 
                to help you stay on track.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default GoalsSettingsPage;
