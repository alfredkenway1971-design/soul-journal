import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, SUBSCRIPTION_TIERS, FREE_LIMITS } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const PricingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium, planType, subscriptionEnd, isManualGrant, checkSubscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, plan: string) => {
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to start checkout", variant: "destructive" });
    }
    setLoadingPlan(null);
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to open portal", variant: "destructive" });
    }
  };

  const freeFeatures = [
    `${FREE_LIMITS.textEntriesPerDay} text entries per day`,
    `${FREE_LIMITS.audioEntriesPerWeek} audio entry per week`,
    `${FREE_LIMITS.aiCoachingCallsPerMonth} AI coaching calls/month`,
    "Basic mood tracking",
    "Simple streak counter",
  ];

  const premiumFeatures = [
    "Unlimited text & audio entries",
    "Full AI transcription & refinement",
    "Unlimited AI coaching & analysis",
    "Voice cloning & playback",
    "Full insights dashboard & trends",
    "Book/PDF export",
    "All premium themes",
    "Priority support",
  ];

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Choose Your Plan</h1>
              <p className="text-sm text-muted-foreground">Unlock the full Echo Diary experience</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Current status */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border-2 border-primary/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Premium Active</span>
              <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">
                {isManualGrant ? "Granted" : planType === "yearly" ? "Yearly" : "Monthly"}
              </Badge>
            </div>
            {subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                Renews {new Date(subscriptionEnd).toLocaleDateString()}
              </p>
            )}
            {!isManualGrant && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
            )}
          </motion.div>
        )}

        {/* Free Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`glass-card rounded-2xl p-6 ${!isPremium ? "border-2 border-foreground/20" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-lg">Free</h3>
            {!isPremium && <Badge variant="outline" className="ml-auto">Current Plan</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">$0<span className="text-sm font-normal text-muted-foreground">/forever</span></p>
          <ul className="space-y-2">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground/60 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Monthly Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`glass-card rounded-2xl p-6 ${isPremium && planType === "monthly" ? "border-2 border-primary/50" : ""}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Premium Monthly</h3>
            {isPremium && planType === "monthly" && <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">Your Plan</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">
            ${SUBSCRIPTION_TIERS.monthly.price}<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="space-y-2 mb-5">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <Button
              className="w-full"
              onClick={() => handleCheckout(SUBSCRIPTION_TIERS.monthly.price_id, "monthly")}
              disabled={loadingPlan === "monthly"}
            >
              {loadingPlan === "monthly" ? "Loading..." : "Subscribe Monthly"}
            </Button>
          )}
        </motion.div>

        {/* Yearly Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`glass-card rounded-2xl p-6 relative overflow-hidden ${isPremium && planType === "yearly" ? "border-2 border-primary/50" : "border-2 border-primary/30"}`}
        >
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl">
            SAVE 30%
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">Premium Yearly</h3>
            {isPremium && planType === "yearly" && <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">Your Plan</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground">
            ${SUBSCRIPTION_TIERS.yearly.price}<span className="text-sm font-normal text-muted-foreground">/year</span>
          </p>
          <p className="text-sm text-primary font-medium mb-4">
            Just ${SUBSCRIPTION_TIERS.yearly.effectiveMonthly}/month — save ${((SUBSCRIPTION_TIERS.monthly.price * 12) - SUBSCRIPTION_TIERS.yearly.price).toFixed(2)}/year
          </p>
          <ul className="space-y-2 mb-5">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0" /> {f}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <Button
              className="w-full"
              onClick={() => handleCheckout(SUBSCRIPTION_TIERS.yearly.price_id, "yearly")}
              disabled={loadingPlan === "yearly"}
            >
              {loadingPlan === "yearly" ? "Loading..." : "Subscribe Yearly — Best Value"}
            </Button>
          )}
        </motion.div>

        {/* Refresh button */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={checkSubscription} className="text-muted-foreground">
            Refresh subscription status
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PricingPage;
