import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Target, Plus, X, Sparkles, Heart, Briefcase, Brain, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase, Users, Heart, Zap, Brain, Sparkles, Target
};

const GoalsSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('goals, interests')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          const goalsData = Array.isArray(data.goals) ? data.goals as unknown as Goal[] : [];
          setGoals(goalsData);
          setInterests(data.interests || []);
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
          <div className="flex gap-2">
            <Input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Add a custom goal..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
            />
            <Button 
              onClick={() => addGoal()} 
              size="icon" 
              className="rounded-xl"
              disabled={!newGoal.trim()}
            >
              <Plus className="w-4 h-4" />
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
            Select topics you care about for more relevant insights.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {PRESET_INTERESTS.map((interest) => (
              <Badge
                key={interest}
                variant={interests.includes(interest) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  interests.includes(interest) 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10"
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
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
