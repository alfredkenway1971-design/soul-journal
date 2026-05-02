import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { type CoverTemplate } from "@/components/book-builder/CoverTemplates";
import { type BookFont, getFontConfig } from "@/components/book-builder/FontSelector";
import { type PageBackground, type EntryLayout } from "@/components/book-builder/PageStyleSelector";
import { format } from "date-fns";

export type PhotoSize = "small" | "medium" | "large";
export type FontSize = "small" | "medium" | "large";

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
  photoSize?: PhotoSize;
  fontSize?: FontSize;
}

interface JournalEntry {
  title: string | null;
  enhanced_text: string | null;
  original_transcription: string | null;
  mood: string | null;
  created_at: string;
  photoUrls?: string[];
  soul_reflection?: string | null;
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

const getPageBackgroundHTML = (bg: PageBackground, w: number, h: number): string => {
  if (bg === "lined") {
    const spacing = 28;
    let lines = "";
    for (let y = spacing; y < h; y += spacing) {
      lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(147,197,253,0.25)" stroke-width="1"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="position:absolute;top:0;left:0;z-index:0;">${lines}</svg>`;
  }
  if (bg === "dotted") {
    const spacing = 16;
    let dots = "";
    for (let y = spacing; y < h; y += spacing) {
      for (let x = spacing; x < w; x += spacing) {
        dots += `<circle cx="${x}" cy="${y}" r="1.2" fill="rgba(120,120,120,0.18)"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="position:absolute;top:0;left:0;z-index:0;">${dots}</svg>`;
  }
  return "";
};

// A5 dimensions in mm
const PAGE_W_MM = 148;
const PAGE_H_MM = 210;
// Render at 300 DPI for print quality (300 / 72 ≈ 4.17 ×).
// 1mm = 3.7795 CSS px; multiplying by SCALE pushes the underlying canvas
// to true print resolution while jsPDF still places it on an A5 page.
const SCALE = 4;
const PAGE_W_PX = Math.round(PAGE_W_MM * 3.7795 * SCALE);
const PAGE_H_PX = Math.round(PAGE_H_MM * 3.7795 * SCALE);

const getFontSizePx = (size: FontSize): { body: number; title: number; meta: number } => {
  switch (size) {
    case "small": return { body: 13, title: 18, meta: 11 };
    case "large": return { body: 19, title: 26, meta: 15 };
    case "medium":
    default: return { body: 16, title: 22, meta: 13 };
  }
};

const buildPageHTML = (innerContent: string, fontCSS: string, fontImportUrl: string): string => {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="${fontImportUrl}" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${PAGE_W_PX}px; height: ${PAGE_H_PX}px; overflow: hidden; font-family: ${fontCSS}; word-spacing: 0.15em; letter-spacing: 0.01em; }
</style></head><body>${innerContent}</body></html>`;
};

const waitForFonts = async (doc: Document, timeoutMs = 8000): Promise<void> => {
  try {
    await Promise.race([
      doc.fonts.ready,
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);
    await new Promise((r) => setTimeout(r, 300));
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
};

// Convert an image URL to a base64 data URL to avoid cross-origin issues in html2canvas
const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to convert image to base64:", url, e);
    return url; // fallback to original URL
  }
};

// Pre-process all entries to convert photo URLs to base64
const preloadEntryImages = async (entries: JournalEntry[]): Promise<JournalEntry[]> => {
  return Promise.all(
    entries.map(async (entry) => {
      if (!entry.photoUrls || entry.photoUrls.length === 0) return entry;
      const base64Urls = await Promise.all(
        entry.photoUrls.map((url) => imageToBase64(url))
      );
      return { ...entry, photoUrls: base64Urls };
    })
  );
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

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    setTimeout(resolve, 3000);
  });
  await waitForFonts(iframeDoc);

  // Wait for all images inside the iframe to fully load
  const iframeImages = Array.from(iframeDoc.querySelectorAll("img"));
  if (iframeImages.length > 0) {
    await Promise.all(
      iframeImages.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
    // Extra settling time for images
    await new Promise((r) => setTimeout(r, 300));
  }

  const canvas = await html2canvas(iframeDoc.body, {
    width: PAGE_W_PX,
    height: PAGE_H_PX,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: null,
  });

  document.body.removeChild(iframe);
  return canvas;
};

const addCanvasToPDF = (pdf: jsPDF, canvas: HTMLCanvasElement, addNewPage: boolean) => {
  if (addNewPage) pdf.addPage([PAGE_W_MM, PAGE_H_MM]);
  // Use JPEG at high quality for smaller file size while keeping 300 DPI fidelity,
  // and skip jsPDF's downscaling ('SLOW' = no resample) to preserve photo quality.
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W_MM, PAGE_H_MM, undefined, "SLOW");
};

// ── Image Gallery Engine ──
const buildImageGalleryHTML = (photoUrls: string[], photoSize: PhotoSize, isRTL: boolean): string => {
  if (!photoUrls || photoUrls.length === 0) return "";

  const count = Math.min(photoUrls.length, 5);
  const urls = photoUrls.slice(0, 5);
  const dims = getPhotoDimensions(photoSize);
  const dir = isRTL ? 'rtl' : 'ltr';

  // Determine layout based on count
  let gridStyle = "";
  let imgStyle = `border-radius:15px;border:1pt solid #d1d5db;object-fit:cover;`;

  if (count <= 2) {
    // Single row, larger images
    const imgW = count === 1 ? Math.min(dims.w * 2.2, PAGE_W_PX - 160) : dims.w * 1.4;
    const imgH = count === 1 ? dims.h * 2 : dims.h * 1.4;
    gridStyle = `display:flex;justify-content:center;gap:12px;direction:${dir};`;
    imgStyle += `width:${imgW}px;height:${imgH}px;`;
  } else {
    // 2-column masonry grid for 3-5 images
    gridStyle = `display:grid;grid-template-columns:1fr 1fr;gap:10px;justify-items:center;direction:${dir};`;
    imgStyle += `width:100%;height:${dims.h * 1.2}px;`;
  }

  const imagesHTML = urls.map(url =>
    `<img src="${url}" style="${imgStyle}" crossorigin="anonymous" />`
  ).join("");

  return `
    <div style="margin:40px auto;max-width:${PAGE_W_PX - 120}px;text-align:center;">
      <div style="${gridStyle}">
        ${imagesHTML}
      </div>
    </div>`;
};

// ── Soul Reflection HTML ──
const buildSoulReflectionHTML = (reflection: string, fontSize: number): string => {
  if (!reflection) return "";
  return `
    <div style="margin-top:28px;padding:16px 20px;border-radius:14px;background:linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.06));border:1px solid rgba(139,92,246,0.15);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:14px;">✨</span>
        <span style="font-size:${fontSize - 4}px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;">Message from your Soul</span>
      </div>
      <p style="font-size:${fontSize - 1}px;line-height:1.7;color:#4b5563;font-style:italic;">"${reflection}"</p>
    </div>`;
};

// Detect if text is RTL (Arabic, Hebrew, etc.)
const isRTLText = (text: string): boolean => {
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlChars.test(text);
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

// ── Build entry page HTML (continuous mode) ──
const buildEntryPageHTML = (
  entries: JournalEntry[],
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  const bgSVG = getPageBackgroundHTML(config.background, PAGE_W_PX, PAGE_H_PX);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;z-index:2;">✦</div>`
    : "";
  const fs = getFontSizePx(config.fontSize || "medium");

  let entriesHTML = "";
  entries.forEach((entry, idx) => {
    const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
    const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
    const content = (entry.enhanced_text || entry.original_transcription || "No content");
    const rtl = isRTLText(content);
    const dirAttr = rtl ? 'direction:rtl;text-align:right;' : '';
    const displayContent = content.replace(/\n/g, "<br>");
    const moodBadge = mood ? `<span style="display:inline-block;background:#f5f5f5;padding:2px 10px;border-radius:10px;font-size:${fs.meta - 1}px;margin-left:10px;font-style:normal;">${mood}</span>` : "";

    const photoHTML = buildImageGalleryHTML(entry.photoUrls || [], config.photoSize || "medium", rtl);
    const reflectionHTML = buildSoulReflectionHTML(entry.soul_reflection || "", fs.body);

    entriesHTML += `
      <div style="margin-bottom:0;${dirAttr}">
        <div style="font-size:${fs.title}px;font-weight:600;color:#0a0a0a;margin-bottom:8px;">${entry.title || "Untitled Entry"}</div>
        <div style="font-size:${fs.meta}px;color:#9ca3af;margin-bottom:20px;font-style:italic;">${date}${moodBadge}</div>
        <div style="font-size:${fs.body}px;line-height:2;color:#374151;">${displayContent}</div>
        ${photoHTML}
        ${reflectionHTML}
      </div>`;
    if (idx < entries.length - 1) {
      entriesHTML += `<div style="height:1px;background:#e5e7eb;margin:40px 0;"></div>`;
    }
  });

  const inner = `
    <div style="width:100%;height:100%;background-color:white;padding:60px 48px;position:relative;overflow:hidden;">
      ${bgSVG}
      ${watermarkHTML}
      <div style="position:relative;z-index:1;">
        ${entriesHTML}
      </div>
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
  const bgSVG = getPageBackgroundHTML(config.background, PAGE_W_PX, PAGE_H_PX);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;z-index:2;">✦</div>`
    : "";
  const fs = getFontSizePx(config.fontSize || "medium");

  const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
  const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
  const content = (entry.enhanced_text || entry.original_transcription || "No content");
  const rtl = isRTLText(content);
  const dirAttr = rtl ? 'direction:rtl;text-align:right;' : '';
  const displayContent = content.replace(/\n/g, "<br>");
  const moodBadge = mood ? `<span style="display:inline-block;background:#f5f5f5;padding:2px 10px;border-radius:10px;font-size:${fs.meta - 1}px;margin-left:10px;font-style:normal;">${mood}</span>` : "";

  const photoHTML = buildImageGalleryHTML(entry.photoUrls || [], config.photoSize || "medium", rtl);
  const reflectionHTML = buildSoulReflectionHTML(entry.soul_reflection || "", fs.body);

  const inner = `
    <div style="width:100%;height:100%;background-color:white;padding:60px 48px;position:relative;overflow:hidden;${dirAttr}">
      ${bgSVG}
      ${watermarkHTML}
      <div style="position:relative;z-index:1;">
        <div style="font-size:${fs.title}px;font-weight:600;color:#0a0a0a;margin-bottom:8px;">${entry.title || "Untitled Entry"}</div>
        <div style="font-size:${fs.meta}px;color:#9ca3af;margin-bottom:20px;font-style:italic;">${date}${moodBadge}</div>
        <div style="font-size:${fs.body}px;line-height:2;color:#374151;">${displayContent}</div>
        ${photoHTML}
        ${reflectionHTML}
      </div>
    </div>`;

  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Magazine layout: drop cap, two-column body ──
const buildMagazineEntryHTML = (
  entry: JournalEntry,
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  const bgSVG = getPageBackgroundHTML(config.background, PAGE_W_PX, PAGE_H_PX);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;z-index:2;">✦</div>`
    : "";
  const fs = getFontSizePx(config.fontSize || "medium");
  const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy").toUpperCase();
  const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
  const content = (entry.enhanced_text || entry.original_transcription || "No content");
  const rtl = isRTLText(content);
  const dirAttr = rtl ? 'direction:rtl;text-align:right;' : '';
  const first = content.charAt(0);
  const rest = content.slice(1).replace(/\n/g, "<br>");

  const photoHTML = buildImageGalleryHTML(entry.photoUrls || [], config.photoSize || "medium", rtl);
  const reflectionHTML = buildSoulReflectionHTML(entry.soul_reflection || "", fs.body);

  const inner = `
    <div style="width:100%;height:100%;background-color:white;padding:60px 56px;position:relative;overflow:hidden;${dirAttr}">
      ${bgSVG}
      ${watermarkHTML}
      <div style="position:relative;z-index:1;">
        <div style="font-size:${fs.meta}px;color:#9ca3af;letter-spacing:0.25em;margin-bottom:6px;">${date}${mood ? ` · ${mood.toUpperCase()}` : ""}</div>
        <div style="font-size:${fs.title + 6}px;font-weight:700;color:#0a0a0a;line-height:1.1;margin-bottom:8px;font-style:italic;">${entry.title || "Untitled Entry"}</div>
        <div style="width:48px;height:2px;background:#0a0a0a;margin:14px 0 22px;"></div>
        <div style="font-size:${fs.body}px;line-height:1.85;color:#374151;column-count:2;column-gap:24px;">
          <span style="float:left;font-size:${fs.body * 3.4}px;line-height:0.85;font-weight:700;padding:6px 8px 0 0;color:#0a0a0a;">${first}</span>${rest}
        </div>
        ${photoHTML}
        ${reflectionHTML}
      </div>
    </div>`;
  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

// ── Photo-Forward layout: hero photo top, text below ──
const buildPhotoForwardEntryHTML = (
  entry: JournalEntry,
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  const bgSVG = getPageBackgroundHTML(config.background, PAGE_W_PX, PAGE_H_PX);
  const watermarkHTML = config.watermark
    ? `<div style="position:absolute;bottom:30px;right:36px;font-size:24px;opacity:0.06;font-family:Georgia,serif;z-index:2;">✦</div>`
    : "";
  const fs = getFontSizePx(config.fontSize || "medium");
  const date = format(new Date(entry.created_at), "EEEE, MMMM d, yyyy");
  const mood = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : "";
  const content = (entry.enhanced_text || entry.original_transcription || "No content");
  const rtl = isRTLText(content);
  const dirAttr = rtl ? 'direction:rtl;text-align:right;' : '';
  const displayContent = content.replace(/\n/g, "<br>");

  const heroPhoto = entry.photoUrls && entry.photoUrls.length > 0
    ? `<div style="width:100%;height:${Math.round(PAGE_H_PX * 0.42)}px;margin-bottom:28px;border-radius:0;overflow:hidden;">
        <img src="${entry.photoUrls[0]}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous" />
      </div>`
    : `<div style="width:100%;height:${Math.round(PAGE_H_PX * 0.18)}px;margin-bottom:28px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:0;"></div>`;

  const extraPhotos = (entry.photoUrls && entry.photoUrls.length > 1)
    ? buildImageGalleryHTML(entry.photoUrls.slice(1), config.photoSize || "small", rtl)
    : "";
  const reflectionHTML = buildSoulReflectionHTML(entry.soul_reflection || "", fs.body);

  const inner = `
    <div style="width:100%;height:100%;background-color:white;position:relative;overflow:hidden;${dirAttr}">
      ${bgSVG}
      ${watermarkHTML}
      <div style="position:relative;z-index:1;">
        ${heroPhoto}
        <div style="padding:0 56px 60px;">
          <div style="font-size:${fs.meta}px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">${date}${mood ? ` · ${mood}` : ""}</div>
          <div style="font-size:${fs.title + 4}px;font-weight:600;color:#0a0a0a;margin-bottom:18px;">${entry.title || "Untitled Entry"}</div>
          <div style="font-size:${fs.body}px;line-height:1.95;color:#374151;">${displayContent}</div>
          ${extraPhotos}
          ${reflectionHTML}
        </div>
      </div>
    </div>`;
  return buildPageHTML(inner, fontCSS, fontImportUrl);
};

const buildEntryByLayout = (
  entry: JournalEntry,
  config: BookConfig,
  fontCSS: string,
  fontImportUrl: string
): string => {
  if (config.layout === "magazine") return buildMagazineEntryHTML(entry, config, fontCSS, fontImportUrl);
  if (config.layout === "photo-forward") return buildPhotoForwardEntryHTML(entry, config, fontCSS, fontImportUrl);
  return buildSingleEntryHTML(entry, config, fontCSS, fontImportUrl);
};
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

const getPhotoDimensions = (size: PhotoSize): { w: number; h: number } => {
  switch (size) {
    case "small": return { w: 100, h: 75 };
    case "large": return { w: 240, h: 180 };
    case "medium":
    default: return { w: 160, h: 120 };
  }
};

const ENTRIES_PER_PAGE = 3;

// ── Preview: render a single entry page to a data URL ──
export const generatePreviewDataURL = async (
  config: BookConfig,
  sampleEntry: JournalEntry
): Promise<string> => {
  const fontConfig = getFontConfig(config.font);

  // Preload font
  const preloadLink = document.createElement("link");
  preloadLink.href = fontConfig.importUrl;
  preloadLink.rel = "stylesheet";
  document.head.appendChild(preloadLink);
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 300));

  // Pre-load images to base64
  const [processedEntry] = await preloadEntryImages([sampleEntry]);

  const html = buildEntryByLayout(processedEntry, config, fontConfig.css, fontConfig.importUrl);
  const canvas = await renderHTMLToCanvas(html);
  return canvas.toDataURL("image/png");
};

export const generateAndDownloadPDF = async (
  config: BookConfig,
  entries: JournalEntry[],
  onProgress?: (msg: string) => void
): Promise<void> => {
  const fontConfig = getFontConfig(config.font);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_W_MM, PAGE_H_MM] });

  onProgress?.("Loading font...");
  const preloadLink = document.createElement("link");
  preloadLink.href = fontConfig.importUrl;
  preloadLink.rel = "stylesheet";
  document.head.appendChild(preloadLink);
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 500));

  onProgress?.("Pre-loading images...");
  const processedEntries = await preloadEntryImages(entries);

  // Also convert avatar to base64 if present
  let processedConfig = { ...config };
  if (config.showAvatar && config.avatarUrl) {
    processedConfig.avatarUrl = await imageToBase64(config.avatarUrl);
  }

  onProgress?.("Rendering cover...");
  const coverHTML = buildCoverHTML(processedConfig, fontConfig.css, fontConfig.importUrl);
  const coverCanvas = await renderHTMLToCanvas(coverHTML);
  addCanvasToPDF(pdf, coverCanvas, false);

  if (processedConfig.layout === "one-per-page" || processedConfig.layout === "magazine" || processedConfig.layout === "photo-forward") {
    for (let i = 0; i < processedEntries.length; i++) {
      onProgress?.(`Rendering entry ${i + 1} of ${processedEntries.length}...`);
      const html = buildEntryByLayout(processedEntries[i], processedConfig, fontConfig.css, fontConfig.importUrl);
      const canvas = await renderHTMLToCanvas(html);
      addCanvasToPDF(pdf, canvas, true);
    }
  } else {
    const chunks: JournalEntry[][] = [];
    for (let i = 0; i < processedEntries.length; i += ENTRIES_PER_PAGE) {
      chunks.push(processedEntries.slice(i, i + ENTRIES_PER_PAGE));
    }
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(`Rendering page ${i + 1} of ${chunks.length}...`);
      const html = buildEntryPageHTML(chunks[i], processedConfig, fontConfig.css, fontConfig.importUrl);
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

// Legacy HTML export
export const generateBookHTML = (config: BookConfig, entries: JournalEntry[]): string => {
  const fontConfig = getFontConfig(config.font);
  const coverColor = coverTextColors[config.cover];
  const coverGradient = coverGradients[config.cover];
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
  .entry-page { width:100%;min-height:${isOnePerPage ? "100vh" : "auto"};padding:48px 36px;position:relative;background-color:white;${isOnePerPage ? "page-break-after:always;" : ""} }
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
