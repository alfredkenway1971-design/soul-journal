import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type BookFont = "modern" | "classic" | "handwritten";

interface FontSelectorProps {
  selected: BookFont;
  onSelect: (font: BookFont) => void;
}

const fonts: { id: BookFont; name: string; family: string; preview: string; importUrl: string; css: string }[] = [
  {
    id: "modern",
    name: "Modern",
    family: "Inter",
    preview: "Clean & tech-forward",
    importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Quicksand:wght@400;500;600&display=swap",
    css: "'Inter', 'Quicksand', sans-serif",
  },
  {
    id: "classic",
    name: "Classic",
    family: "Playfair Display",
    preview: "Timeless & reflective",
    importUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap",
    css: "'Playfair Display', 'EB Garamond', Georgia, serif",
  },
  {
    id: "handwritten",
    name: "Handwritten",
    family: "Dancing Script",
    preview: "Intimate & personal",
    importUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap",
    css: "'Dancing Script', cursive",
  },
];

export const getFontConfig = (font: BookFont) => fonts.find((f) => f.id === font)!;

const FontSelector = ({ selected, onSelect }: FontSelectorProps) => {
  return (
    <div className="space-y-3">
      {fonts.map((font) => (
        <motion.button
          key={font.id}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
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
            {selected === font.id && <Check className="w-5 h-5 text-primary" />}
          </div>
          <p
            className="mt-2 text-lg text-foreground/80"
            style={{ fontFamily: font.css }}
          >
            The Soul Journal of You
          </p>
        </motion.button>
      ))}
    </div>
  );
};

export default FontSelector;
