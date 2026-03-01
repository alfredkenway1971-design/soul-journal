import { type CoverTemplate, getCoverStyle } from "@/components/book-builder/CoverTemplates";
import { type BookFont, getFontConfig } from "@/components/book-builder/FontSelector";
import { type PageBackground, type EntryLayout } from "@/components/book-builder/PageStyleSelector";
import { format } from "date-fns";

interface BookConfig {
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

interface JournalEntry {
  title: string | null;
  enhanced_text: string | null;
  original_transcription: string | null;
  mood: string | null;
  created_at: string;
}

const coverGradients: Record<CoverTemplate, string> = {
  nebula: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #6366f1 100%)",
  minimalist: "linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)",
  botanical: "linear-gradient(135deg, #ecfccb 0%, #d9f99d 30%, #fce7f3 100%)",
  midnight: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
  sunrise: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ef4444 100%)",
};

const coverTextColors: Record<CoverTemplate, string> = {
  nebula: "#ffffff",
  minimalist: "#292524",
  botanical: "#44403c",
  midnight: "#ffffff",
  sunrise: "#ffffff",
};

const getPageBackgroundCSS = (bg: PageBackground): string => {
  if (bg === "lined") {
    return `background-image: repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(147,197,253,0.2) 27px, rgba(147,197,253,0.2) 28px); background-color: white;`;
  }
  if (bg === "dotted") {
    return `background-image: radial-gradient(circle, rgba(120,120,120,0.15) 1px, transparent 1px); background-size: 16px 16px; background-color: white;`;
  }
  return "background-color: white;";
};

export const generateBookHTML = (config: BookConfig, entries: JournalEntry[]): string => {
  const fontConfig = getFontConfig(config.font);
  const coverColor = coverTextColors[config.cover];
  const coverGradient = coverGradients[config.cover];
  const pageBgCSS = getPageBackgroundCSS(config.background);
  const isOnePerPage = config.layout === "one-per-page";
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:20px;right:24px;font-size:18px;opacity:0.06;font-family:Georgia,serif;">✦</div>`
    : "";

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Soul Journal — ${config.userName}</title>
<link href="${fontConfig.importUrl}" rel="stylesheet">
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontConfig.css}; color: #1a1a1a; }
  
  .cover-page {
    width: 100%; height: 100vh;
    background: ${coverGradient};
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    page-break-after: always; position: relative; overflow: hidden;
  }
  .cover-page .cover-text { color: ${coverColor}; text-align: center; position: relative; z-index: 2; }
  .cover-page .cover-subtitle { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; }
  .cover-page .cover-name { font-size: 28px; font-weight: 600; margin-bottom: 4px; ${config.cover === "minimalist" ? "font-style: italic;" : ""} }
  .cover-page .cover-year { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.5; margin-top: 12px; }
  .cover-avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid ${config.cover === "minimalist" || config.cover === "botanical" ? "#d6d3d1" : "rgba(255,255,255,0.3)"}; margin-bottom: 16px; }
  
  .entry-page {
    width: 100%; min-height: ${isOnePerPage ? "100vh" : "auto"};
    padding: 48px 36px; position: relative;
    ${pageBgCSS}
    ${isOnePerPage ? "page-break-after: always;" : ""}
  }
  .entry-title { font-size: 18px; font-weight: 600; color: #0a0a0a; margin-bottom: 6px; }
  .entry-meta { font-size: 11px; color: #9ca3af; margin-bottom: 16px; font-style: italic; }
  .mood-badge { display: inline-block; background: #f5f5f5; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px; font-style: normal; }
  .entry-content { font-size: 14px; line-height: 1.9; color: #374151; }
  .entry-divider { height: 1px; background: #e5e7eb; margin: 32px 0; }
  
  .back-cover {
    width: 100%; height: 100vh;
    background: #f5f5f4; display: flex; flex-direction: column; align-items: center; justify-content: center;
    page-break-before: always;
  }
  .back-quote { font-size: 14px; font-style: italic; color: #78716c; text-align: center; max-width: 240px; margin-bottom: 16px; }
  .back-line { width: 40px; height: 1px; background: #d6d3d1; margin-bottom: 12px; }
  .back-brand { font-size: 8px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.3em; }

  @media print {
    .cover-page { height: 100vh; }
    .entry-page { ${isOnePerPage ? "height: 100vh;" : ""} }
    .back-cover { height: 100vh; }
  }
</style></head><body>`;

  // Cover Page
  html += `<div class="cover-page">`;
  if (config.cover === "nebula") {
    html += `<div style="position:absolute;top:0;right:0;width:200px;height:200px;background:rgba(255,255,255,0.08);border-radius:50%;filter:blur(60px);"></div>`;
    html += `<div style="position:absolute;bottom:0;left:0;width:250px;height:250px;background:rgba(236,72,153,0.15);border-radius:50%;filter:blur(60px);"></div>`;
  }
  if (config.cover === "midnight") {
    for (let i = 0; i < 20; i++) {
      const top = 5 + Math.random() * 90;
      const left = 5 + Math.random() * 90;
      const size = 1 + Math.random() * 2;
      html += `<div style="position:absolute;top:${top}%;left:${left}%;width:${size}px;height:${size}px;background:rgba(255,255,255,0.3);border-radius:50%;"></div>`;
    }
  }
  html += `<div class="cover-text">`;
  if (config.showAvatar && config.avatarUrl) {
    html += `<img class="cover-avatar" src="${config.avatarUrl}" alt="Avatar" />`;
  }
  html += `<div class="cover-subtitle">The Soul Journal of</div>`;
  html += `<div class="cover-name">${config.userName}</div>`;
  html += `<div class="cover-year">${config.yearRange}</div>`;
  html += `</div></div>`;

  // Entry Pages
  entries.forEach((entry, idx) => {
    const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
    const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
    const content = (entry.enhanced_text || entry.original_transcription || "No content").replace(/\n/g, "<br>");

    html += `<div class="entry-page">`;
    html += watermarkHTML;
    html += `<div class="entry-title">${entry.title || "Untitled Entry"}</div>`;
    html += `<div class="entry-meta">${date}${mood ? `<span class="mood-badge">${mood}</span>` : ""}</div>`;
    html += `<div class="entry-content">${content}</div>`;
    if (!isOnePerPage && idx < entries.length - 1) {
      html += `<div class="entry-divider"></div>`;
    }
    html += `</div>`;
  });

  // Back Cover
  html += `<div class="back-cover">`;
  html += `<div class="back-quote">"Every page is a piece of your soul."</div>`;
  html += `<div class="back-line"></div>`;
  html += `<div class="back-brand">Soul Journal · ${new Date().getFullYear()}</div>`;
  html += `</div>`;

  html += `</body></html>`;
  return html;
};

export const openBookPDF = (html: string) => {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
