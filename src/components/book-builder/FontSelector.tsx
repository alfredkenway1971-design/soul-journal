import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type BookFont =
  | "modern"
  | "classic"
  | "handwritten"
  | "phitradesign"
  | "shadows-into-light"
  | "agata"
  | "alanis"
  | "honey-script"
  | "euphoria-script"
  | "scriptina"
  | "anke-calligraphic"
  | "gravity"
  | "quilline-script"
  | "farewell"
  | "arizonia";

interface FontConfig {
  id: BookFont;
  name: string;
  category: "modern" | "classic" | "handwritten";
  preview: string;
  importUrl: string;
  css: string;
}

const fonts: FontConfig[] = [
  // ── Modern ──
  {
    id: "modern",
    name: "Modern",
    category: "modern",
    preview: "Clean & tech-forward",
    importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Quicksand:wght@400;500;600&display=swap",
    css: "'Inter', 'Quicksand', sans-serif",
  },
  // ── Classic ──
  {
    id: "classic",
    name: "Classic",
    category: "classic",
    preview: "Timeless & reflective",
    importUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap",
    css: "'Playfair Display', 'EB Garamond', Georgia, serif",
  },
  // ── Handwritten / Script ──
  {
    id: "handwritten",
    name: "Dancing Script",
    category: "handwritten",
    preview: "Intimate & personal",
    importUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap",
    css: "'Dancing Script', cursive",
  },
  {
    id: "phitradesign",
    name: "Phitradesign",
    category: "handwritten",
    preview: "Hand-drawn & playful",
    importUrl: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap",
    css: "'Caveat', cursive",
  },
  {
    id: "shadows-into-light",
    name: "Shadows Into Light",
    category: "handwritten",
    preview: "Casual & sketchy",
    importUrl: "https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap",
    css: "'Shadows Into Light', cursive",
  },
  {
    id: "agata",
    name: "Agata",
    category: "handwritten",
    preview: "Flowing calligraphic",
    importUrl: "https://fonts.googleapis.com/css2?family=Sacramento&display=swap",
    css: "'Sacramento', cursive",
  },
  {
    id: "alanis",
    name: "Alanis",
    category: "handwritten",
    preview: "Natural handwriting",
    importUrl: "https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap",
    css: "'Kalam', cursive",
  },
  {
    id: "honey-script",
    name: "Honey Script Light",
    category: "handwritten",
    preview: "Elegant & delicate",
    importUrl: "https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap",
    css: "'Alex Brush', cursive",
  },
  {
    id: "euphoria-script",
    name: "Euphoria Script",
    category: "handwritten",
    preview: "Joyful & expressive",
    importUrl: "https://fonts.googleapis.com/css2?family=Euphoria+Script&display=swap",
    css: "'Euphoria Script', cursive",
  },
  {
    id: "scriptina",
    name: "Scriptina",
    category: "handwritten",
    preview: "Formal calligraphy",
    importUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
    css: "'Great Vibes', cursive",
  },
  {
    id: "anke-calligraphic",
    name: "Anke Calligraphic",
    category: "handwritten",
    preview: "Classic calligraphic",
    importUrl: "https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap",
    css: "'Tangerine', cursive",
  },
  {
    id: "gravity",
    name: "Gravity",
    category: "handwritten",
    preview: "Casual & friendly",
    importUrl: "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap",
    css: "'Patrick Hand', cursive",
  },
  {
    id: "quilline-script",
    name: "Quilline Script Thin",
    category: "handwritten",
    preview: "Thin & refined",
    importUrl: "https://fonts.googleapis.com/css2?family=Petit+Formal+Script&display=swap",
    css: "'Petit Formal Script', cursive",
  },
  {
    id: "farewell",
    name: "Farewell",
    category: "handwritten",
    preview: "Flowing & graceful",
    importUrl: "https://fonts.googleapis.com/css2?family=Satisfy&display=swap",
    css: "'Satisfy', cursive",
  },
  {
    id: "arizonia",
    name: "Arizonia",
    category: "handwritten",
    preview: "Sweeping & bold",
    importUrl: "https://fonts.googleapis.com/css2?family=Arizonia&display=swap",
    css: "'Arizonia', cursive",
  },
];

export const getFontConfig = (font: BookFont) => fonts.find((f) => f.id === font)!;

interface FontSelectorProps {
  selected: BookFont;
  onSelect: (font: BookFont) => void;
}

const categoryLabels: Record<string, string> = {
  modern: "Modern",
  classic: "Classic",
  handwritten: "Handwritten & Script",
};

const FontSelector = ({ selected, onSelect }: FontSelectorProps) => {
  const categories = ["modern", "classic", "handwritten"] as const;

  // Load all Google Fonts link tags for preview
  const allImportUrls = [...new Set(fonts.map((f) => f.importUrl))];

  return (
    <div className="space-y-4">
      {/* Inject font links for live preview */}
      {allImportUrls.map((url) => (
        <link key={url} href={url} rel="stylesheet" />
      ))}

      <div className="max-h-[420px] overflow-y-auto space-y-5 pr-1 scrollbar-thin">
        {categories.map((cat) => {
          const catFonts = fonts.filter((f) => f.category === cat);
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {categoryLabels[cat]}
              </p>
              <div className="space-y-2">
                {catFonts.map((font) => (
                  <motion.button
                    key={font.id}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      selected === font.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => onSelect(font.id)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{font.name}</p>
                        <p className="text-xs text-muted-foreground">{font.preview}</p>
                      </div>
                      {selected === font.id && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                    </div>
                    <p
                      className="mt-1.5 text-lg text-foreground/80 truncate"
                      style={{ fontFamily: font.css }}
                    >
                      The Soul Journal of You
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FontSelector;
