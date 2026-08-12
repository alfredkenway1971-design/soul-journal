import { motion } from "framer-motion";
import { Crown, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

const UpgradePrompt = ({ feature, description, compact = false }: UpgradePromptProps) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5"
      >
        <Lock className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{description || `${feature} is a Premium feature`}</p>
        </div>
        <Button size="sm" onClick={() => navigate("/pricing")} className="shrink-0">
          Upgrade
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center p-8 space-y-5"
    >
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Crown className="w-10 h-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{feature}</h3>
        <p className="text-muted-foreground max-w-sm">
          {description || `Unlock ${feature} and all premium features with an Echo Diary subscription.`}
        </p>
      </div>
      <Button onClick={() => navigate("/pricing")} className="gap-2">
        Upgrade to Premium <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};

export default UpgradePrompt;
