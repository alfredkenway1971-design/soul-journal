import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check } from "lucide-react";

export type PageBackground = "blank" | "lined" | "dotted";
export type EntryLayout = "one-per-page" | "continuous" | "magazine" | "photo-forward";

interface PageStyleSelectorProps {
  background: PageBackground;
  onBackgroundChange: (bg: PageBackground) => void;
  layout: EntryLayout;
  onLayoutChange: (layout: EntryLayout) => void;
  watermark: boolean;
  onWatermarkChange: (show: boolean) => void;
}

const bgOptions: { id: PageBackground; name: string; icon: React.ReactNode }[] = [
  {
    id: "blank",
    name: "pageStyle.blank",
    icon: (
      <div className="w-full h-full bg-white rounded border border-border" />
    ),
  },
  {
    id: "lined",
    name: "pageStyle.lined",
    icon: (
      <div className="w-full h-full bg-white rounded border border-border flex flex-col justify-evenly px-1 py-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-px bg-blue-200/60" />
        ))}
      </div>
    ),
  },
  {
    id: "dotted",
    name: "pageStyle.dotted",
    icon: (
      <div className="w-full h-full bg-white rounded border border-border relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-0 p-1">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const PageStyleSelector = ({
  background,
  onBackgroundChange,
  layout,
  onLayoutChange,
  watermark,
  onWatermarkChange,
}: PageStyleSelectorProps) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      {/* Page Background */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">{t("pageStyle.background")}</p>
        <div className="grid grid-cols-3 gap-3">
          {bgOptions.map((opt) => (
            <motion.button
              key={opt.id}
              className={`relative p-2 rounded-xl border-2 transition-all ${
                background === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              onClick={() => onBackgroundChange(opt.id)}
              whileTap={{ scale: 0.95 }}
            >
              <div className="aspect-[3/4] mb-1.5">{opt.icon}</div>
              <p className="text-xs font-medium text-foreground">{t(opt.name)}</p>
              {background === opt.id && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Entry Layout */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">{t("pageStyle.entryLayout")}</p>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              layout === "one-per-page" ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => onLayoutChange("one-per-page")}
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-sm font-medium text-foreground">{t("pageStyle.onePerPage")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("pageStyle.onePerPageDesc")}</p>
          </motion.button>
          <motion.button
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              layout === "continuous" ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => onLayoutChange("continuous")}
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-sm font-medium text-foreground">{t("pageStyle.continuous")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("pageStyle.continuousDesc")}</p>
          </motion.button>
          <motion.button
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              layout === "magazine" ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => onLayoutChange("magazine")}
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-sm font-medium text-foreground">{t("pageStyle.magazine")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("pageStyle.magazineDesc")}</p>
          </motion.button>
          <motion.button
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              layout === "photo-forward" ? "border-primary bg-primary/5" : "border-border"
            }`}
            onClick={() => onLayoutChange("photo-forward")}
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-sm font-medium text-foreground">{t("pageStyle.photoForward")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("pageStyle.photoForwardDesc")}</p>
          </motion.button>
        </div>
      </div>

      {/* Watermark Toggle */}
      <motion.button
        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
          watermark ? "border-primary bg-primary/5" : "border-border"
        }`}
        onClick={() => onWatermarkChange(!watermark)}
        whileTap={{ scale: 0.98 }}
      >
        <div>
          <p className="text-sm font-medium text-foreground">{t("pageStyle.watermark")}</p>
          <p className="text-xs text-muted-foreground">{t("pageStyle.watermarkDesc")}</p>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors ${watermark ? "bg-primary" : "bg-muted"} relative`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${watermark ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </motion.button>
    </div>
  );
};

export default PageStyleSelector;
