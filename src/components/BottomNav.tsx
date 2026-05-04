import { motion } from "framer-motion";
import { Home, Calendar, FileText, User, Mic } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Calendar, label: t("nav.calendar"), path: "/calendar" },
    { icon: null, label: t("nav.add"), path: "/record", isCenter: true },
    { icon: FileText, label: t("nav.library"), path: "/library" },
    { icon: User, label: t("nav.profile"), path: "/settings/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/40 dark:bg-background/60 border-t border-white/40 dark:border-white/10 shadow-[0_-8px_32px_-12px_hsl(215_60%_30%_/_0.15)]">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around py-2 relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <motion.button
                  key={item.path}
                  className="relative -mt-6"
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="fab-button w-16 h-16 flex items-center justify-center shadow-lg">
                    <Mic className="w-7 h-7" strokeWidth={2.25} />
                  </div>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={item.path}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors relative ${
                  isActive
                    ? "text-charcoal dark:text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.95 }}
              >
                {Icon && <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />}
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 w-1 h-1 bg-charcoal dark:bg-primary rounded-full"
                    layoutId="nav-indicator"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        {/* Home indicator line for iOS */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 bg-charcoal/20 dark:bg-white/20 rounded-full" />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
