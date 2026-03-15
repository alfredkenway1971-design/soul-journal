import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type Language = "en" | "fr" | "es" | "ar" | "ja" | "zh" | "sw" | "de";

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (language: Language) => void;
}

const languages: { code: Language; name: string; flag: string; native: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸", native: "English" },
  { code: "fr", name: "French", flag: "🇫🇷", native: "Français" },
  { code: "es", name: "Spanish", flag: "🇪🇸", native: "Español" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", native: "العربية" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", native: "中文" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", native: "日本語" },
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
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
               <div className="flex items-center justify-center w-9 h-9 rounded-full bg-background/20">
                 <span className="text-xl">{lang.flag}</span>
               </div>
               <div className="text-left">
                 <span className="text-sm font-medium">{lang.native}</span>
                 <span className="text-xs text-muted-foreground block">{lang.name}</span>
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
