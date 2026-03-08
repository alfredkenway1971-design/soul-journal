import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  User, 
  Palette, 
  Bell, 
  Lock, 
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  Type,
  Mic,
  Target,
  Brain,
  Download,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been logged out." });
    navigate("/auth");
  };

  useEffect(() => {
    // Load dark mode preference and apply it
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      const isDark = saved === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('darkMode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", action: "navigate", route: "/settings/profile" },
        { icon: Lock, label: "Security & PIN", action: "navigate", route: "/settings/security" },
        { icon: Mic, label: "Voice Clone", action: "navigate", route: "/settings/voice" },
        { icon: Target, label: "Goals & Interests", action: "navigate", route: "/settings/goals" },
      ],
    },
    {
      title: "AI Coach",
      items: [
        { icon: Brain, label: "Coaching Dashboard", action: "navigate", route: "/coaching" },
      ],
    },
    {
      title: "Appearance",
      items: [
        { 
          icon: darkMode ? Moon : Sun, 
          label: "Dark Mode", 
          action: "toggle",
          value: darkMode,
          onChange: handleDarkModeToggle
        },
        { icon: Palette, label: "Themes & Backgrounds", action: "navigate", route: "/settings/themes" },
        { icon: Type, label: "Fonts", action: "navigate", route: "/settings/fonts" },
      ],
    },
    {
      title: "Notifications",
      items: [
        { icon: Bell, label: "Daily Reminders", action: "navigate", route: "/settings/reminders" },
      ],
    },
    {
      title: "Data",
      items: [
        { icon: Download, label: "Export Journal", action: "navigate", route: "/settings/export" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & FAQ", action: "navigate", route: "" },
        { icon: LogOut, label: "Sign Out", action: "signout", route: "" },
      ],
    },
  ];

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Customize your journal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-2">
              {section.title}
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    className={`w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                      index !== section.items.length - 1 ? "border-b border-border" : ""
                    }`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (item.action === "signout") {
                        handleSignOut();
                      } else if (item.action === "navigate" && item.route) {
                        navigate(item.route);
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-left font-medium text-foreground">
                      {item.label}
                    </span>
                    {item.action === "toggle" ? (
                      <Switch
                        checked={item.value}
                        onCheckedChange={item.onChange}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* App Info */}
        <motion.div
          className="text-center pt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-16 h-16 rounded-2xl gradient-amber flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-2xl">📔</span>
          </div>
          <h3 className="font-semibold text-foreground">Voice Journal</h3>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
