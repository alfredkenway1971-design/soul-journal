import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { type CoverTemplate } from "@/components/book-builder/CoverTemplates";
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

// A5 dimensions in mm
const PAGE_W_MM = 148;
const PAGE_H_MM = 210;
// Render at 2x for quality
const SCALE = 2;
const PAGE_W_PX = Math.round(PAGE_W_MM * 3.78 * SCALE); // ~1119px
const PAGE_H_PX = Math.round(PAGE_H_MM * 3.78 * SCALE); // ~1588px

const buildPageHTML = (innerContent: string, fontCSS: string, fontImportUrl: string): string => {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="${fontImportUrl}" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${PAGE_W_PX}px; height: ${PAGE_H_PX}px; overflow: hidden; font-family: ${fontCSS}; }
</style></head><body>${innerContent}</body></html>`;
};

const renderHTMLToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${PAGE_W_PX}px;height:${PAGE_H_PX}px;border:none;opacity:0;`;
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) throw new Error("Cannot access iframe document");

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for fonts/images to load
  await new Promise((r) => setTimeout(r, 800));

  const canvas = await html2canvas(iframeDoc.body, {
    width: PAGE_W_PX,
    height: PAGE_H_PX,
    scale: 1, // already scaled via pixel dimensions
    useCORS: true,
    logging: false,
    backgroundColor: null,
  });

  document.body.removeChild(iframe);
  return canvas;
};

const addCanvasToPDF = (pdf: jsPDF, canvas: HTMLCanvasElement, addNewPage: boolean) => {
  if (addNewPage) pdf.addPage([PAGE_W_MM, PAGE_H_MM]);
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM, undefined, "FAST");
};

// ── Build cover page HTML ──
const buildCoverHTML = (config: BookConfig, fontCSS: string, fontImportUrl: string): string => {
  const color = coverTextColors[config.cover];
  const gradient = coverGradients[config.cover];
  const isLight = config.cover === "minimalist" || config.cover === "botanical";

  let decorations = "";
  if (config.cover === "nebula") {
    decorations = `
      <div style="position:absolute;top:0;right:0;width:300px;height:300px;background:rgba(255,255,255,0.08);border-radius:50%;filter:blur(80px);"></div>
      <div style="position:absolute;bottom:0;left:0;width:400px;height:400px;background:rgba(236,72,153,0.15);border-radius:50%;filter:blur(80px);"></div>`;
  } else if (config.cover === "midnight") {
    let stars = "";
    for (let i = 0; i < 30; i++) {
      const t = 5 + Math.random() * 90, l = 5 + Math.random() * 90, s = 1 + Math.random() * 3;
      stars += `<div style="position:absolute;top:${t}%;left:${l}%;width:${s}px;height:${s}px;background:rgba(255,255,255,0.4);border-radius:50%;"></div>`;
    }
    decorations = stars;
  } else if (config.cover === "botanical") {
    decorations = `
      <div style="position:absolute;top:40px;left:40px;font-size:80px;color:rgba(22,163,74,0.15);">❀</div>
      <div style="position:absolute;bottom:40px;right:40px;font-size:60px;color:rgba(22,163,74,0.15);transform:rotate(45deg);">✿</div>
      <div style="position:absolute;top:25%;right:50px;font-size:50px;color:rgba(22,163,74,0.08);">🌿</div>`;
  }

  const avatarHTML = config.showAvatar && config.avatarUrl
    ? `<img src="${config.avatarUrl}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${isLight ? '#d6d3d1' : 'rgba(255,255,255,0.3)'};margin-bottom:24px;" crossorigin="anonymous" />`
    : "";

  const inner = `
    <div style="width:100%;height:100%;background:${gradient};display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;">
      ${decorations}
      <div style="position:relative;z-index:2;text-align:center;color:${color};">
        ${avatarHTML}
        <div style="font-size:14px;letter-spacing:0.3em;text-transform:uppercase;opacity:0.7;margin-bottom:12px;">The Soul Journal of</div>
        <div style="font-size:38px;font-weight:600;${config.cover === 'minimalist' ? 'font-style:italic;' : ''}margin-bottom:8px;">${config.userName}</div>
        <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.5;margin-top:16px;">${config.yearRange}</div>
      </div>
    </div>`;

  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Build entry page HTML ──
const buildEntryPageHTML = (
  entries: JournalEntry[],
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  const pageBgCSS = getPageBackgroundCSS(config.background);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;">✦</div>`
    : "";

  let entriesHTML = "";
  entries.forEach((entry, idx) => {
    const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
    const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
    const content = (entry.enhanced_text || entry.original_transcription || "No content").replace(/\n/g, "<br>");
    const moodBadge = mood ? `<span style="display:inline-block;background:#f5f5f5;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:10px;font-style:normal;">${mood}</span>` : "";

    entriesHTML += `
      <div style="margin-bottom:${idx < entries.length - 1 ? '0' : '0'}px;">
        <div style="font-size:22px;font-weight:600;color:#0a0a0a;margin-bottom:8px;">${entry.title || "Untitled Entry"}</div>
        <div style="font-size:13px;color:#9ca3af;margin-bottom:20px;font-style:italic;">${date}${moodBadge}</div>
        <div style="font-size:16px;line-height:2;color:#374151;">${content}</div>
      </div>`;
    if (idx < entries.length - 1) {
      entriesHTML += `<div style="height:1px;background:#e5e7eb;margin:40px 0;"></div>`;
    }
  });

  const inner = `
    <div style="width:100%;height:100%;${pageBgCSS}padding:60px 48px;position:relative;overflow:hidden;">
      ${watermarkHTML}
      ${entriesHTML}
    </div>`;

  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Build single-entry page HTML ──
const buildSingleEntryHTML = (
  entry: JournalEntry,
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  const pageBgCSS = getPageBackgroundCSS(config.background);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;">✦</div>`
    : "";

  const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
  const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
  const content = (entry.enhanced_text || entry.original_transcription || "No content").replace(/\n/g, "<br>");
  const moodBadge = mood ? `<span style="display:inline-block;background:#f5f5f5;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:10px;font-style:normal;">${mood}</span>` : "";

  const inner = `
    <div style="width:100%;height:100%;${pageBgCSS}padding:60px 48px;position:relative;overflow:hidden;">
      ${watermarkHTML}
      <div style="font-size:22px;font-weight:600;color:#0a0a0a;margin-bottom:8px;">${entry.title || "Untitled Entry"}</div>
      <div style="font-size:13px;color:#9ca3af;margin-bottom:20px;font-style:italic;">${date}${moodBadge}</div>
      <div style="font-size:16px;line-height:2;color:#374151;">${content}</div>
    </div>`;

  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Build back cover HTML ──
const buildBackCoverHTML = (fontCSS: string, fontImportUrl: string): string => {
  const inner = `
    <div style="width:100%;height:100%;background:#f5f5f4;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="font-size:18px;font-style:italic;color:#78716c;text-align:center;max-width:320px;margin-bottom:24px;line-height:1.6;">
        "Every page is a piece of your soul."
      </div>
      <div style="width:50px;height:1px;background:#d6d3d1;margin-bottom:16px;"></div>
      <div style="font-size:10px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.3em;">Soul Journal · ${new Date().getFullYear()}</div>
    </div>`;

  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Chunk entries for continuous mode ──
const ENTRIES_PER_PAGE = 3;

// ── Main export: generate and download PDF ──
export const generateAndDownloadPDF = async (
  config: BookConfig,
  entries: JournalEntry[],
  onProgress?: (msg: string) => void
): Promise<void> => {
  const fontConfig = getFontConfig(config.font);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_W_MM, PAGE_H_MM] });

  onProgress?.("Rendering cover...");
  const coverHTML = buildCoverHTML(config, fontConfig.css, fontConfig.importUrl);
  const coverCanvas = await renderHTMLToCanvas(coverHTML);
  addCanvasToPDF(pdf, coverCanvas, false);

  if (config.layout === "one-per-page") {
    for (let i = 0; i < entries.length; i++) {
      onProgress?.(`Rendering entry ${i + 1} of ${entries.length}...`);
      const html = buildSingleEntryHTML(entries[i], config, fontConfig.css, fontConfig.importUrl);
      const canvas = await renderHTMLToCanvas(html);
      addCanvasToPDF(pdf, canvas, true);
    }
  } else {
    // Continuous: group entries into chunks
    const chunks: JournalEntry[][] = [];
    for (let i = 0; i < entries.length; i += ENTRIES_PER_PAGE) {
      chunks.push(entries.slice(i, i + ENTRIES_PER_PAGE));
    }
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(`Rendering page ${i + 1} of ${chunks.length}...`);
      const html = buildEntryPageHTML(chunks[i], config, fontConfig.css, fontConfig.importUrl);
      const canvas = await renderHTMLToCanvas(html);
      addCanvasToPDF(pdf, canvas, true);
    }
  }

  onProgress?.("Rendering back cover...");
  const backHTML = buildBackCoverHTML(fontConfig.css, fontConfig.importUrl);
  const backCanvas = await renderHTMLToCanvas(backHTML);
  addCanvasToPDF(pdf, backCanvas, true);

  onProgress?.("Saving PDF...");
  pdf.save(`Soul-Journal-${config.userName.replace(/\s+/g, "-")}.pdf`);
};

// Keep legacy HTML export as fallback
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
  @page { size: A5; margin: 15mm 12mm 15mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontConfig.css}; color: #1a1a1a; }
  .cover-page { width:100%;height:100vh;background:${coverGradient};display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;position:relative;overflow:hidden; }
  .cover-page .cover-text { color:${coverColor};text-align:center;position:relative;z-index:2; }
  .cover-page .cover-subtitle { font-size:11px;letter-spacing:0.3em;text-transform:uppercase;opacity:0.7;margin-bottom:8px; }
  .cover-page .cover-name { font-size:28px;font-weight:600;margin-bottom:4px;${config.cover === "minimalist" ? "font-style:italic;" : ""} }
  .cover-page .cover-year { font-size:9px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.5;margin-top:12px; }
  .cover-avatar { width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid ${config.cover === "minimalist" || config.cover === "botanical" ? "#d6d3d1" : "rgba(255,255,255,0.3)"};margin-bottom:16px; }
  .entry-page { width:100%;min-height:${isOnePerPage ? "100vh" : "auto"};padding:48px 36px;position:relative;${pageBgCSS}${isOnePerPage ? "page-break-after:always;" : ""} }
  .entry-title { font-size:18px;font-weight:600;color:#0a0a0a;margin-bottom:6px; }
  .entry-meta { font-size:11px;color:#9ca3af;margin-bottom:16px;font-style:italic; }
  .mood-badge { display:inline-block;background:#f5f5f5;padding:2px 8px;border-radius:10px;font-size:10px;margin-left:8px;font-style:normal; }
  .entry-content { font-size:14px;line-height:1.9;color:#374151; }
  .entry-divider { height:1px;background:#e5e7eb;margin:32px 0; }
  .back-cover { width:100%;height:100vh;background:#f5f5f4;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-before:always; }
  .back-quote { font-size:14px;font-style:italic;color:#78716c;text-align:center;max-width:240px;margin-bottom:16px; }
  .back-line { width:40px;height:1px;background:#d6d3d1;margin-bottom:12px; }
  .back-brand { font-size:8px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.3em; }
  @media print { .cover-page{height:100vh;} .entry-page{${isOnePerPage ? "height:100vh;" : ""}} .back-cover{height:100vh;} }
</style></head><body>`;

  html += `<div class="cover-page">`;
  if (config.cover === "nebula") {
    html += `<div style="position:absolute;top:0;right:0;width:200px;height:200px;background:rgba(255,255,255,0.08);border-radius:50%;filter:blur(60px);"></div>`;
    html += `<div style="position:absolute;bottom:0;left:0;width:250px;height:250px;background:rgba(236,72,153,0.15);border-radius:50%;filter:blur(60px);"></div>`;
  }
  if (config.cover === "midnight") {
    for (let i = 0; i < 20; i++) {
      const top = 5 + Math.random() * 90, left = 5 + Math.random() * 90, size = 1 + Math.random() * 2;
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

  entries.forEach((entry, idx) => {
    const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
    const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
    const content = (entry.enhanced_text || entry.original_transcription || "No content").replace(/\n/g, "<br>");
    html += `<div class="entry-page">`;
    html += watermarkHTML;
    html += `<div class="entry-title">${entry.title || "Untitled Entry"}</div>`;
    html += `<div class="entry-meta">${date}${mood ? `<span class="mood-badge">${mood}</span>` : ""}</div>`;
    html += `<div class="entry-content">${content}</div>`;
    if (!isOnePerPage && idx < entries.length - 1) html += `<div class="entry-divider"></div>`;
    html += `</div>`;
  });

  html += `<div class="back-cover">`;
  html += `<div class="back-quote">"Every page is a piece of your soul."</div>`;
  html += `<div class="back-line"></div>`;
  html += `<div class="back-brand">Soul Journal · ${new Date().getFullYear()}</div>`;
  html += `</div></body></html>`;
  return html;
};

export const openBookPDF = (html: string) => {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  }
};
