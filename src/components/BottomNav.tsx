import { motion } from "framer-motion";
import { Home, Calendar, FileText, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: null, label: "Add", path: "/record", isCenter: true },
  { icon: FileText, label: "Library", path: "/coaching" },
  { icon: User, label: "Profile", path: "/settings/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50">
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
                  <div className="fab-button w-14 h-14 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
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
