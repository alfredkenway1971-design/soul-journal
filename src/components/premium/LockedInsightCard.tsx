import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Blurred "locked preview" of a Premium AI insight.
 * Shows a glimpse of deeper analysis behind a blur; tapping opens the subscription screen.
 * Used during onboarding / first use.
 */
const LockedInsightCard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      onClick={() => navigate("/pricing")}
      className="relative w-full text-left rounded-2xl overflow-hidden border border-primary/25 bg-white/60 backdrop-blur-xl shadow-sm"
    >
      {/* Header: Premium chip + lock */}
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">{t("common.premium")}</span>
        </span>
        <Lock className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="px-4 pt-2 pb-4">
        <h3 className="text-base font-semibold text-foreground mb-2">{t("upgrade.lockedTitle")}</h3>

        {/* Blurred glimpse of the premium insight */}
        <div className="space-y-2 blur-[5px] select-none pointer-events-none" aria-hidden>
          <p className="text-sm text-foreground/80 leading-relaxed">{t("upgrade.lockedLine1")}</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{t("upgrade.lockedLine2")}</p>
        </div>

        {/* CTA bar */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("upgrade.lockedDesc")}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
            {t("record.upgradePremium")} <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.button>
  );
};

export default LockedInsightCard;
