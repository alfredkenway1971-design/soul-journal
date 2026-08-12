import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Persistent, subtle Upgrade pill shown above the bottom nav.
 * Visible to free users only. Tapping it opens the subscription screen.
 */
const UpgradeBadge = () => {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const { t } = useLanguage();

  if (isPremium) return null;

  return (
    <button
      onClick={() => navigate("/pricing")}
      aria-label={t("upgrade.badge")}
      className="mx-auto mb-2 flex items-center gap-1.5 rounded-full bg-white/70 border border-primary/20 px-3.5 py-1.5 shadow-sm backdrop-blur transition-colors hover:bg-white/90 active:scale-95"
    >
      <Crown className="w-3 h-3 text-primary" strokeWidth={2.2} />
      <span className="text-[11px] font-semibold text-primary">{t("upgrade.badge")}</span>
    </button>
  );
};

export default UpgradeBadge;
