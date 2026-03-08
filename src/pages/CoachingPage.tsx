import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Target, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { FREE_LIMITS } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  content: string;
  related_goal: string | null;
  is_read: boolean;
  is_completed: boolean;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  icon: string;
}

const insightIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  daily_tip: Sparkles,
  challenge: Zap,
  wellness_alert: AlertTriangle,
  goal_progress: TrendingUp,
};

const insightColors: Record<string, string> = {
  daily_tip: "bg-primary/20 text-primary",
  challenge: "bg-amber-500/20 text-amber-600",
  wellness_alert: "bg-destructive/20 text-destructive",
  goal_progress: "bg-green-500/20 text-green-600",
};

const CoachingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [insights, setInsights] = useState<Insight[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const [insightsRes, profileRes] = await Promise.all([
        supabase
          .from('coaching_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('goals')
          .eq('id', user.id)
          .maybeSingle()
      ]);
      
      if (insightsRes.error) throw insightsRes.error;
      setInsights(insightsRes.data || []);
      
      if (profileRes.data?.goals && Array.isArray(profileRes.data.goals)) {
        setGoals(profileRes.data.goals as unknown as Goal[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!user) return;
    
    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-coaching-insights', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Insights Generated",
        description: `${data.insightsCount || 0} new insights based on your journal entries.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      await supabase
        .from('coaching_insights')
        .update({ is_read: true })
        .eq('id', insightId);
      
      setInsights(prev => 
        prev.map(i => i.id === insightId ? { ...i, is_read: true } : i)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const completeChallenge = async (insightId: string) => {
    try {
      await supabase
        .from('coaching_insights')
        .update({ is_completed: true })
        .eq('id', insightId);
      
      setInsights(prev => 
        prev.map(i => i.id === insightId ? { ...i, is_completed: true } : i)
      );
      
      toast({
        title: "Challenge Completed! 🎉",
        description: "Great job! Keep up the momentum.",
      });
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  const unreadCount = insights.filter(i => !i.is_read).length;
  const activeChallenges = insights.filter(i => i.insight_type === 'challenge' && !i.is_completed);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-amber flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">AI Coach</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} new insights` : "Personalized guidance"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={generating}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? "Analyzing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Goals Summary */}
        {goals.length > 0 ? (
          <motion.div
            className="glass-card rounded-2xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Your Goals</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/settings/goals")}
                className="text-xs"
              >
                Edit
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {goals.slice(0, 3).map((goal) => (
                <Badge key={goal.id} variant="secondary" className="text-xs">
                  {goal.title}
                </Badge>
              ))}
              {goals.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{goals.length - 3} more
                </Badge>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="glass-card rounded-2xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Set Your Goals</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Define your goals to get personalized AI coaching insights.
            </p>
            <Button onClick={() => navigate("/settings/goals")} className="gradient-amber">
              <Target className="w-4 h-4 mr-2" />
              Set Goals
            </Button>
          </motion.div>
        )}

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-2">
              Active Challenges
            </h2>
            <div className="space-y-3">
              {activeChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  className="glass-card rounded-2xl p-4"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${insightColors.challenge}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{challenge.content}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={() => completeChallenge(challenge.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-2">
            Recent Insights
          </h2>
          
          {insights.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No insights yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Record some journal entries and tap "Refresh" to get personalized insights.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {insights.filter(i => i.insight_type !== 'challenge' || i.is_completed).map((insight, index) => {
                  const IconComponent = insightIcons[insight.insight_type] || Sparkles;
                  const colorClass = insightColors[insight.insight_type] || insightColors.daily_tip;
                  
                  return (
                    <motion.div
                      key={insight.id}
                      className={`glass-card rounded-2xl p-4 ${!insight.is_read ? 'ring-2 ring-primary/30' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => !insight.is_read && markAsRead(insight.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">{insight.title}</h3>
                            {!insight.is_read && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                            {insight.is_completed && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.content}</p>
                          {insight.related_goal && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              {insight.related_goal}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CoachingPage;
