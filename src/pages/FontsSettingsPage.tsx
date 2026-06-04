import { motion } from "framer-motion";
import { ArrowLeft, Type, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useFont, FONT_OPTIONS } from "@/contexts/FontContext";

const FontsSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { font, fontSize, setFont, setFontSize } = useFont();

  const allImportUrls = Array.from(new Set(FONT_OPTIONS.map((f) => f.importUrl).filter(Boolean)));
  const selectedFontData = FONT_OPTIONS.find((f) => f.id === font);

  const handleSave = () => {
    // Values already applied + persisted via context; this just confirms to the user.
    toast({
      title: "Font Settings Saved",
      description: "Applied across the app and synced to your profile.",
    });
  };

  return (
    <div className="min-h-screen gradient-warm pb-24">
      {allImportUrls.map((url) => (
        <link key={url} href={url} rel="stylesheet" />
      ))}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Fonts</h1>
              <p className="text-sm text-muted-foreground">Customize text appearance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Font Style</h2>
          </div>

          <div className="space-y-3">
            {FONT_OPTIONS.map((opt) => (
              <motion.button
                key={opt.id}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  font === opt.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setFont(opt.id)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{opt.name}</p>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: opt.family }}>
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
                {font === opt.id && <Check className="w-5 h-5 text-primary" />}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground">Font Size</h2>
            <span className="text-sm text-muted-foreground">{fontSize}px</span>
          </div>

          <Slider
            value={[fontSize]}
            onValueChange={(v) => setFontSize(v[0])}
            min={12}
            max={24}
            step={1}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Small</span>
            <span>Large</span>
          </div>
        </motion.div>

        <motion.div
          className="glass-card rounded-2xl p-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold text-foreground">Preview</h2>
          <div
            className="p-4 bg-muted/30 rounded-xl"
            style={{ fontFamily: selectedFontData?.family, fontSize: `${fontSize}px` }}
          >
            <p className="text-foreground leading-relaxed">
              Today was a beautiful day. I spent time in the garden and reflected on my goals.
              The weather was perfect for journaling outside.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button className="w-full h-12 rounded-xl gradient-amber" onClick={handleSave}>
            Save Changes
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default FontsSettingsPage;
