import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type Language = "en" | "fr" | "es" | "ja" | "zh" | "sw" | "de";

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (language: Language) => void;
}

const languages: { code: Language; name: string; flag: string; native: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸", native: "English" },
  { code: "fr", name: "French", flag: "🇫🇷", native: "Français" },
  { code: "es", name: "Spanish", flag: "🇪🇸", native: "Español" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", native: "日本語" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", native: "中文" },
  { code: "sw", name: "Swahili", flag: "🇰🇪", native: "Kiswahili" },
  { code: "de", name: "German", flag: "🇩🇪", native: "Deutsch" },
];

const LanguageSelector = ({ selected, onSelect }: LanguageSelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Playback Language
      </p>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.code}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
              selected === lang.code
                ? "glass-card-strong ring-2 ring-primary"
                : "glass-card hover:bg-muted/50"
            }`}
            onClick={() => onSelect(lang.code)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg">{lang.flag}</span>
            <div className="text-left">
              <span className="text-sm font-medium">{lang.native}</span>
            </div>
            {selected === lang.code && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1"
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
