import { motion } from "framer-motion";
import { Home, Calendar, BookOpen, User, Mic } from "lucide-react";
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
    { icon: BookOpen, label: t("nav.library"), path: "/library" },
    { icon: User, label: t("nav.profile"), path: "/settings/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="mx-auto max-w-lg px-3 pb-3 pt-2"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.75) 100%)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
          borderTop: "1px solid rgba(255,255,255,0.55)",
        }}
      >
        <div className="flex items-end justify-between relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              const centerActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  className="flex flex-col items-center justify-end flex-1"
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.92 }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, hsla(205,95%,80%,0.85) 0%, hsla(211,90%,55%,0.75) 70%, hsla(220,85%,45%,0.7) 100%)",
                      backdropFilter: "blur(14px) saturate(160%)",
                      WebkitBackdropFilter: "blur(14px) saturate(160%)",
                      border: "1.5px solid rgba(255,255,255,0.6)",
                      boxShadow:
                        "0 10px 28px -8px hsla(211,90%,40%,0.55), inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    <Mic className="w-6 h-6 text-white" strokeWidth={2.4} />
                  </div>
                  {centerActive && (
                    <span className="text-[10px] font-medium text-primary mt-1">
                      {item.label}
                    </span>
                  )}
                </motion.button>
              );
            }

            return (
              <motion.button
                key={item.path}
                className="flex flex-col items-center gap-1 py-2 flex-1 relative"
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.92 }}
              >
                {Icon && (
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    fill={isActive && (Icon === Home || Icon === BookOpen) ? "currentColor" : "none"}
                  />
                )}
                {isActive && (
                  <span className="text-[10px] font-medium text-primary">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        <div className="flex justify-center pt-1.5">
          <div className="w-32 h-1 bg-foreground/20 rounded-full" />
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
