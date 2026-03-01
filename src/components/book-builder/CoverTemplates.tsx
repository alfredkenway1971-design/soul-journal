import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export type CoverTemplate = "nebula" | "minimalist" | "botanical" | "midnight" | "sunrise";

interface CoverTemplatesProps {
  selected: CoverTemplate;
  onSelect: (template: CoverTemplate) => void;
  userName: string;
  yearRange: string;
  avatarUrl: string | null;
  showAvatar: boolean;
  onToggleAvatar: (show: boolean) => void;
}

const templates: { id: CoverTemplate; name: string; description: string }[] = [
  { id: "nebula", name: "The Nebula", description: "High-contrast lavender & pink gradients" },
  { id: "minimalist", name: "The Minimalist", description: "Clean white with gold foil text" },
  { id: "botanical", name: "The Botanical", description: "Soft floral line art" },
  { id: "midnight", name: "The Midnight", description: "Deep indigo with starfield accents" },
  { id: "sunrise", name: "The Sunrise", description: "Warm amber to coral gradient" },
];

const coverStyles: Record<CoverTemplate, React.CSSProperties> = {
  nebula: { background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #6366f1 100%)" },
  minimalist: { background: "linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)", border: "1px solid #e7e5e4" },
  botanical: { background: "linear-gradient(135deg, #ecfccb 0%, #d9f99d 30%, #fce7f3 100%)" },
  midnight: { background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" },
  sunrise: { background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ef4444 100%)" },
};

const textColor: Record<CoverTemplate, string> = {
  nebula: "text-white",
  minimalist: "text-stone-800",
  botanical: "text-stone-700",
  midnight: "text-white",
  sunrise: "text-white",
};

export const getCoverStyle = (template: CoverTemplate) => coverStyles[template];
export const getCoverTextColor = (template: CoverTemplate) => textColor[template];

export const CoverPreview = ({
  template,
  userName,
  yearRange,
  avatarUrl,
  showAvatar,
  small = false,
}: {
  template: CoverTemplate;
  userName: string;
  yearRange: string;
  avatarUrl: string | null;
  showAvatar: boolean;
  small?: boolean;
}) => {
  const colors = textColor[template];
  const isLight = template === "minimalist" || template === "botanical";

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center ${small ? "w-full aspect-[3/4] rounded-xl" : "w-full aspect-[3/4] rounded-2xl"}`}
      style={coverStyles[template]}
    >
      {/* Decorative elements */}
      {template === "nebula" && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-400/20 rounded-full blur-3xl" />
        </>
      )}
      {template === "botanical" && (
        <>
          <div className="absolute top-3 left-3 text-green-600/20 text-6xl">❀</div>
          <div className="absolute bottom-3 right-3 text-green-600/20 text-4xl rotate-45">✿</div>
          <div className="absolute top-1/4 right-4 text-green-600/10 text-3xl">🌿</div>
        </>
      )}
      {template === "midnight" && (
        <>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
              }}
            />
          ))}
        </>
      )}

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center ${small ? "gap-1 px-2" : "gap-3 px-6"} text-center`}>
        {showAvatar && avatarUrl && (
          <Avatar className={`${small ? "w-8 h-8" : "w-16 h-16"} border-2 ${isLight ? "border-stone-300" : "border-white/30"}`}>
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className={`${isLight ? "bg-stone-200 text-stone-600" : "bg-white/20 text-white"} ${small ? "text-xs" : "text-lg"}`}>
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <p className={`${colors} ${small ? "text-[6px]" : "text-xs"} uppercase tracking-[0.3em] opacity-70 font-medium`}>
            The Soul Journal of
          </p>
          <h2 className={`${colors} ${small ? "text-[8px]" : "text-lg"} font-display font-semibold ${template === "minimalist" ? "italic" : ""}`}>
            {userName}
          </h2>
        </div>
        <p className={`${colors} ${small ? "text-[5px]" : "text-[10px]"} uppercase tracking-[0.2em] opacity-50`}>
          {yearRange}
        </p>
      </div>
    </div>
  );
};

const CoverTemplates = ({ selected, onSelect, userName, yearRange, avatarUrl, showAvatar, onToggleAvatar }: CoverTemplatesProps) => {
  return (
    <div className="space-y-5">
      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-3">
        {templates.map((t) => (
          <motion.button
            key={t.id}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              selected === t.id ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
            onClick={() => onSelect(t.id)}
            whileTap={{ scale: 0.95 }}
          >
            <CoverPreview
              template={t.id}
              userName={userName}
              yearRange={yearRange}
              avatarUrl={avatarUrl}
              showAvatar={showAvatar}
              small
            />
            {selected === t.id && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <p className="text-[9px] font-medium text-center py-1 bg-card">{t.name}</p>
          </motion.button>
        ))}
      </div>

      {/* Avatar Toggle */}
      <motion.button
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
          showAvatar ? "border-primary bg-primary/5" : "border-border"
        }`}
        onClick={() => onToggleAvatar(!showAvatar)}
        whileTap={{ scale: 0.98 }}
      >
        <Avatar className="w-10 h-10 border border-border">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm">{userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-foreground">Soul Avatar on Cover</p>
          <p className="text-xs text-muted-foreground">Display profile picture</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors ${showAvatar ? "bg-primary" : "bg-muted"} relative`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showAvatar ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </motion.button>
    </div>
  );
};

export default CoverTemplates;
