import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Palette, Check, Image, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const THEME_OPTIONS = [
  { id: "warm", name: "Warm Amber", description: "Cozy and inviting", colors: ["hsl(35, 90%, 55%)", "hsl(42, 95%, 60%)"] },
  { id: "sage", name: "Sage Garden", description: "Calm and natural", colors: ["hsl(145, 25%, 75%)", "hsl(145, 30%, 60%)"] },
  { id: "coral", name: "Coral Sunset", description: "Vibrant and energetic", colors: ["hsl(15, 85%, 65%)", "hsl(25, 80%, 60%)"] },
  { id: "lavender", name: "Lavender Dreams", description: "Peaceful and serene", colors: ["hsl(270, 40%, 80%)", "hsl(280, 50%, 70%)"] },
  { id: "sky", name: "Ocean Sky", description: "Fresh and open", colors: ["hsl(200, 70%, 80%)", "hsl(210, 60%, 70%)"] },
];

const BACKGROUND_OPTIONS = [
  { id: "gradient", name: "Gradient", preview: "gradient-warm" },
  { id: "solid", name: "Solid Color", preview: "bg-background" },
  { id: "subtle", name: "Subtle Pattern", preview: "bg-muted/30" },
];

const ThemesSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedTheme, setSelectedTheme] = useState("warm");
  const [selectedBackground, setSelectedBackground] = useState("gradient");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    const savedBg = localStorage.getItem("app-background");
    if (savedTheme) setSelectedTheme(savedTheme);
    if (savedBg) setSelectedBackground(savedBg);
  }, []);

  const handleSave = () => {
    localStorage.setItem("app-theme", selectedTheme);
    localStorage.setItem("app-background", selectedBackground);
    
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', selectedTheme);
    
    // Update CSS variables based on theme
    const theme = THEME_OPTIONS.find(t => t.id === selectedTheme);
    if (theme) {
      const root = document.documentElement;
      // Apply theme colors to primary CSS variable
      if (selectedTheme === 'warm') {
        root.style.setProperty('--primary', '35 90% 55%');
      } else if (selectedTheme === 'sage') {
        root.style.setProperty('--primary', '145 30% 60%');
      } else if (selectedTheme === 'coral') {
        root.style.setProperty('--primary', '15 85% 65%');
      } else if (selectedTheme === 'lavender') {
        root.style.setProperty('--primary', '270 50% 70%');
      } else if (selectedTheme === 'sky') {
        root.style.setProperty('--primary', '200 70% 70%');
      }
    }
    
    toast({
      title: "Theme Updated",
      description: "Your theme preferences have been saved.",
    });
  };

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
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Themes & Backgrounds</h1>
              <p className="text-sm text-muted-foreground">Personalize your journal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Color Themes */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Color Theme</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {THEME_OPTIONS.map((theme) => (
              <motion.button
                key={theme.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedTheme === theme.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedTheme(theme.id)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex gap-1">
                  {theme.colors.map((color, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </div>
                {selectedTheme === theme.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Background Style */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Background Style</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {BACKGROUND_OPTIONS.map((bg) => (
              <motion.button
                key={bg.id}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedBackground === bg.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedBackground(bg.id)}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-12 h-12 rounded-lg ${bg.preview} border border-border`} />
                <p className="text-xs font-medium text-foreground">{bg.name}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            className="w-full h-12 rounded-xl gradient-amber"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </motion.div>

        {/* Info */}
        <motion.div
          className="glass-card rounded-2xl p-4 border border-primary/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">Coming Soon</h3>
              <p className="text-xs text-muted-foreground mt-1">
                More themes and custom backgrounds will be available in future updates.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ThemesSettingsPage;
