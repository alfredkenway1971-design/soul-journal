import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CoverPreview, type CoverTemplate } from "./CoverTemplates";
import { type BookFont, getFontConfig } from "./FontSelector";
import { type PageBackground, type EntryLayout } from "./PageStyleSelector";

interface BookPreviewProps {
  cover: CoverTemplate;
  font: BookFont;
  background: PageBackground;
  layout: EntryLayout;
  watermark: boolean;
  userName: string;
  yearRange: string;
  avatarUrl: string | null;
  showAvatar: boolean;
}

const BookPreview = ({
  cover,
  font,
  background,
  layout,
  watermark,
  userName,
  yearRange,
  avatarUrl,
  showAvatar,
}: BookPreviewProps) => {
  const { t } = useLanguage();
  const fontConfig = getFontConfig(font);

  const getPageBgStyle = (): React.CSSProperties => {
    if (background === "lined") {
      return {
        backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 19px, rgba(147,197,253,0.25) 19px, rgba(147,197,253,0.25) 20px)",
        backgroundColor: "white",
      };
    }
    if (background === "dotted") {
      return {
        backgroundImage: "radial-gradient(circle, rgba(120,120,120,0.2) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
        backgroundColor: "white",
      };
    }
    return { backgroundColor: "white" };
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{t("preview.title")}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {/* Cover Card */}
        <motion.div
          className="flex-shrink-0 w-[140px] shadow-lg rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CoverPreview
            template={cover}
            userName={userName}
            yearRange={yearRange}
            avatarUrl={avatarUrl}
            showAvatar={showAvatar}
            small
          />
          <p className="text-[8px] text-center text-muted-foreground py-1 bg-card">{t("preview.cover")}</p>
        </motion.div>

        {/* Sample Entry Card */}
        <motion.div
          className="flex-shrink-0 w-[140px] shadow-lg rounded-xl overflow-hidden border border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="aspect-[3/4] p-3 relative"
            style={getPageBgStyle()}
          >
            {watermark && (
              <div className="absolute bottom-2 right-2 text-[8px] opacity-10 font-display">✦</div>
            )}
            <div style={{ fontFamily: fontConfig.css }}>
              <p className="text-[7px] font-semibold text-stone-800 mb-0.5">{t("preview.morningReflection")}</p>
              <p className="text-[5px] text-stone-400 mb-1">Mar 1, 2026 · Happy</p>
              <p className="text-[5px] text-stone-600 leading-relaxed">
                Today I woke up feeling grateful for the small things. The morning light through my window...
              </p>
            </div>
          </div>
          <p className="text-[8px] text-center text-muted-foreground py-1 bg-card">{t("preview.entryPage")}</p>
        </motion.div>

        {/* Back Cover */}
        <motion.div
          className="flex-shrink-0 w-[140px] shadow-lg rounded-xl overflow-hidden border border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="aspect-[3/4] bg-stone-100 flex flex-col items-center justify-center p-4">
            <p className="text-[7px] text-stone-400 italic text-center mb-2" style={{ fontFamily: fontConfig.css }}>
              "Every page is a piece of your soul."
            </p>
            <div className="w-6 h-px bg-stone-300 mb-2" />
            <p className="text-[5px] text-stone-400 tracking-widest">{t("preview.soulJournal")}</p>
          </div>
          <p className="text-[8px] text-center text-muted-foreground py-1 bg-card">{t("preview.backCover")}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default BookPreview;
