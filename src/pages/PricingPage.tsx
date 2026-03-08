import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, SUBSCRIPTION_TIERS, FREE_LIMITS } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const PricingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
      toast({ title: t("common.error"), description: e.message || "Failed to start checkout", variant: "destructive" });
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
      toast({ title: t("common.error"), description: e.message || "Failed to open portal", variant: "destructive" });
    }
  };

  const freeFeatures = [
    `${FREE_LIMITS.textEntriesPerDay} ${t("record.textLimit")}/${t("record.today")}`,
    `${FREE_LIMITS.audioEntriesPerWeek} ${t("record.audioLimit")}/${t("record.thisWeek")}`,
    `${FREE_LIMITS.aiCoachingCallsPerMonth} ${t("coaching.usageCounter")}`,
    t("record.selectMood"),
    t("insights.bestStreak"),
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
              <h1 className="text-lg font-semibold text-foreground">{t("pricing.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("pricing.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border-2 border-primary/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{t("pricing.premiumActive")}</span>
              <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">
                {isManualGrant ? t("pricing.granted") : planType === "yearly" ? t("pricing.yearly") : t("pricing.monthly")}
              </Badge>
            </div>
            {subscriptionEnd && (
              <p className="text-sm text-muted-foreground">
                {t("pricing.renewsOn")} {new Date(subscriptionEnd).toLocaleDateString()}
              </p>
            )}
            {!isManualGrant && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleManageSubscription}>
                {t("pricing.manageSubscription")}
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
            <h3 className="font-semibold text-foreground text-lg">{t("pricing.free")}</h3>
            {!isPremium && <Badge variant="outline" className="ml-auto">{t("pricing.currentPlan")}</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">$0<span className="text-sm font-normal text-muted-foreground">{t("pricing.forever")}</span></p>
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
            <h3 className="font-semibold text-foreground text-lg">{t("pricing.premiumMonthly")}</h3>
            {isPremium && planType === "monthly" && <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">{t("pricing.yourPlan")}</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">
            ${SUBSCRIPTION_TIERS.monthly.price}<span className="text-sm font-normal text-muted-foreground">{t("pricing.perMonth")}</span>
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
              {loadingPlan === "monthly" ? t("pricing.loading") : t("pricing.subscribeMonthly")}
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
            {t("pricing.save30")}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">{t("pricing.premiumYearly")}</h3>
            {isPremium && planType === "yearly" && <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">{t("pricing.yourPlan")}</Badge>}
          </div>
          <p className="text-3xl font-bold text-foreground">
            ${SUBSCRIPTION_TIERS.yearly.price}<span className="text-sm font-normal text-muted-foreground">{t("pricing.perYear")}</span>
          </p>
          <p className="text-sm text-primary font-medium mb-4">
            {t("pricing.justPerMonth")} ${SUBSCRIPTION_TIERS.yearly.effectiveMonthly}/{t("pricing.perMonth")} — {t("pricing.savePerYear")} ${((SUBSCRIPTION_TIERS.monthly.price * 12) - SUBSCRIPTION_TIERS.yearly.price).toFixed(2)}/{t("pricing.perYear")}
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
              {loadingPlan === "yearly" ? t("pricing.loading") : t("pricing.subscribeYearly")}
            </Button>
          )}
        </motion.div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={checkSubscription} className="text-muted-foreground">
            {t("pricing.refreshStatus")}
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PricingPage;
