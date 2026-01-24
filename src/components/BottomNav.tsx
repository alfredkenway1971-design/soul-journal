import { motion } from "framer-motion";
import { Home, Calendar, Mic, Brain, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: Mic, label: "Record", path: "/record", isCenter: true },
  { icon: Brain, label: "Coach", path: "/coaching" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <motion.button
                  key={item.path}
                  className="relative -mt-8"
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-16 h-16 rounded-full gradient-amber shadow-glow flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary rounded-full"
                      layoutId="nav-indicator"
                      style={{ x: "-50%" }}
                    />
                  )}
                </motion.button>
              );
            }

            return (
              <motion.button
                key={item.path}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"
                    layoutId="nav-indicator"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
