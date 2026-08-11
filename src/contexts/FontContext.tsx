import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FontOption {
  id: string;
  name: string;
  family: string;
  importUrl: string;
  cursive?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "inter", name: "Inter (Modern)", family: "'Inter', sans-serif", importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
  { id: "playfair", name: "Playfair (Classic)", family: "'Playfair Display', Georgia, serif", importUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap" },
  { id: "dancing", name: "Dancing Script", family: "'Dancing Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap", cursive: true },
  { id: "caveat", name: "Caveat (Phitradesign)", family: "'Caveat', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap", cursive: true },
  { id: "shadows", name: "Shadows Into Light", family: "'Shadows Into Light', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap", cursive: true },
  { id: "sacramento", name: "Sacramento (Agata)", family: "'Sacramento', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Sacramento&display=swap", cursive: true },
  { id: "kalam", name: "Kalam (Alanis)", family: "'Kalam', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap", cursive: true },
  { id: "alex-brush", name: "Alex Brush (Honey Script)", family: "'Alex Brush', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap", cursive: true },
  { id: "euphoria", name: "Euphoria Script", family: "'Euphoria Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Euphoria+Script&display=swap", cursive: true },
  { id: "great-vibes", name: "Great Vibes (Scriptina)", family: "'Great Vibes', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap", cursive: true },
  { id: "tangerine", name: "Tangerine (Anke)", family: "'Tangerine', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap", cursive: true },
  { id: "patrick", name: "Patrick Hand (Gravity)", family: "'Patrick Hand', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap", cursive: true },
  { id: "petit-formal", name: "Petit Formal (Quilline)", family: "'Petit Formal Script', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Petit+Formal+Script&display=swap", cursive: true },
  { id: "satisfy", name: "Satisfy (Farewell)", family: "'Satisfy', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Satisfy&display=swap", cursive: true },
  { id: "arizonia", name: "Arizonia", family: "'Arizonia', cursive", importUrl: "https://fonts.googleapis.com/css2?family=Arizonia&display=swap", cursive: true },
  { id: "system", name: "System Default", family: "system-ui, sans-serif", importUrl: "" },
];

const DEFAULT_FONT = "inter";
const DEFAULT_SIZE = 16;

interface FontContextValue {
  font: string;
  fontSize: number;
  setFont: (id: string) => void;
  setFontSize: (n: number) => void;
  saving: boolean;
  isCursive: boolean;
}

const FontContext = createContext<FontContextValue | undefined>(undefined);

const injectFontLink = (importUrl: string) => {
  if (!importUrl) return;
  const id = `font-link-${btoa(importUrl).slice(0, 24)}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = importUrl;
  document.head.appendChild(link);
};

const applyFontGlobally = (fontId: string, size: number) => {
  const opt = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
  injectFontLink(opt.importUrl);
  const root = document.documentElement;
  root.style.setProperty("--app-font", opt.family);
  // Headings follow the chosen font too, unless the user keeps a neutral default
  const displayFamily =
    fontId === "inter" || fontId === "system"
      ? "'Playfair Display', 'Crimson Pro', Georgia, serif"
      : opt.family;
  root.style.setProperty("--app-display-font", displayFamily);
  root.style.fontSize = `${size}px`;
  root.setAttribute("data-font", fontId);
  // Flag cursive fonts so headings can be rendered in Title Case (see index.css)
  root.setAttribute("data-cursive", opt.cursive ? "true" : "false");
};

export const FontProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [font, setFontState] = useState<string>(() => localStorage.getItem("app-font") || DEFAULT_FONT);
  const [fontSize, setFontSizeState] = useState<number>(() => {
    const raw = localStorage.getItem("app-font-size");
    const n = raw ? parseInt(raw, 10) : DEFAULT_SIZE;
    return Number.isFinite(n) ? n : DEFAULT_SIZE;
  });
  const [saving, setSaving] = useState(false);

  // Apply on mount + whenever values change
  useEffect(() => {
    applyFontGlobally(font, fontSize);
  }, [font, fontSize]);

  // Load from DB once user is available
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("app_font, app_font_size")
        .eq("id", user.id)
        .single();
      if (data) {
        const dbFont = (data as any).app_font as string | null;
        const dbSize = (data as any).app_font_size as number | null;
        if (dbFont) {
          setFontState(dbFont);
          localStorage.setItem("app-font", dbFont);
        }
        if (dbSize) {
          setFontSizeState(dbSize);
          localStorage.setItem("app-font-size", String(dbSize));
        }
      }
    })();
  }, [user]);

  const persist = useCallback(
    async (nextFont: string, nextSize: number) => {
      localStorage.setItem("app-font", nextFont);
      localStorage.setItem("app-font-size", String(nextSize));
      if (!user) return;
      setSaving(true);
      try {
        await supabase
          .from("profiles")
          .update({ app_font: nextFont, app_font_size: nextSize } as any)
          .eq("id", user.id);
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const setFont = (id: string) => {
    setFontState(id);
    persist(id, fontSize);
  };
  const setFontSize = (n: number) => {
    setFontSizeState(n);
    persist(font, n);
  };

  return (
    <FontContext.Provider
      value={{
        font,
        fontSize,
        setFont,
        setFontSize,
        saving,
        isCursive: !!FONT_OPTIONS.find((f) => f.id === font)?.cursive,
      }}
    >
      {children}
    </FontContext.Provider>
  );
};

export const useFont = () => {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within FontProvider");
  return ctx;
};
