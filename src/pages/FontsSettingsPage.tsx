import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Type, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

// Mirror Soul Book Builder fonts so users can preview the same options
const FONT_OPTIONS = [
  { id: "inter", name: "Inter (Modern)", family: "'Inter', sans-serif", importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "playfair", name: "Playfair (Classic)", family: "'Playfair Display', Georgia, serif", importUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "dancing", name: "Dancing Script", family: "'Dancing Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "caveat", name: "Caveat (Phitradesign)", family: "'Caveat', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "shadows", name: "Shadows Into Light", family: "'Shadows Into Light', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "sacramento", name: "Sacramento (Agata)", family: "'Sacramento', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Sacramento&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "kalam", name: "Kalam (Alanis)", family: "'Kalam', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "alex-brush", name: "Alex Brush (Honey Script)", family: "'Alex Brush', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "euphoria", name: "Euphoria Script", family: "'Euphoria Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Euphoria+Script&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "great-vibes", name: "Great Vibes (Scriptina)", family: "'Great Vibes', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "tangerine", name: "Tangerine (Anke)", family: "'Tangerine', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "patrick", name: "Patrick Hand (Gravity)", family: "'Patrick Hand', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "petit-formal", name: "Petit Formal (Quilline)", family: "'Petit Formal Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Petit+Formal+Script&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "satisfy", name: "Satisfy (Farewell)", family: "'Satisfy', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Satisfy&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "arizonia", name: "Arizonia", family: "'Arizonia', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Arizonia&display=swap", sample: "The quick brown fox jumps over the lazy dog." },
  { id: "system", name: "System Default", family: "system-ui, sans-serif", importUrl: "", sample: "The quick brown fox jumps over the lazy dog." },
];

const FontsSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedFont, setSelectedFont] = useState("inter");
  const [fontSize, setFontSize] = useState([16]);

  useEffect(() => {
    const savedFont = localStorage.getItem("app-font");
    const savedSize = localStorage.getItem("app-font-size");
    if (savedFont) setSelectedFont(savedFont);
    if (savedSize) setFontSize([parseInt(savedSize)]);
  }, []);

  const handleSave = () => {
    localStorage.setItem("app-font", selectedFont);
    localStorage.setItem("app-font-size", fontSize[0].toString());
    
    // Apply font settings immediately
    const font = FONT_OPTIONS.find(f => f.id === selectedFont);
    if (font) {
      document.body.style.fontFamily = font.family;
      document.documentElement.setAttribute('data-font', selectedFont);
    }
    
    // Apply font size to root
    document.documentElement.style.fontSize = `${fontSize[0]}px`;
    
    toast({
      title: "Font Settings Updated",
      description: "Your font preferences have been saved.",
    });
  };

  const selectedFontData = FONT_OPTIONS.find(f => f.id === selectedFont);

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
              <h1 className="text-lg font-semibold text-foreground">Fonts</h1>
              <p className="text-sm text-muted-foreground">Customize text appearance</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Font Family */}
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
            {FONT_OPTIONS.map((font) => (
              <motion.button
                key={font.id}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedFont === font.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedFont(font.id)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{font.name}</p>
                  <p 
                    className="text-sm text-muted-foreground mt-1"
                    style={{ fontFamily: font.family }}
                  >
                    {font.sample}
                  </p>
                </div>
                {selectedFont === font.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Font Size */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground">Font Size</h2>
            <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
          </div>
          
          <Slider
            value={fontSize}
            onValueChange={setFontSize}
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

        {/* Preview */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold text-foreground">Preview</h2>
          <div 
            className="p-4 bg-muted/30 rounded-xl"
            style={{ 
              fontFamily: selectedFontData?.family,
              fontSize: `${fontSize[0]}px`
            }}
          >
            <p className="text-foreground leading-relaxed">
              Today was a beautiful day. I spent time in the garden and reflected on my goals. 
              The weather was perfect for journaling outside.
            </p>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            className="w-full h-12 rounded-xl gradient-amber"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default FontsSettingsPage;
