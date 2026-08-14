// Gratitude Auto-Detection — client cache.
// Scan results cached in localStorage; rescan when the entry count changes
// or the cache is older than 1 day (1 AI call/day max, ~$0.004).

export interface GratitudeItem {
  gratitude: string;
  category: string;
  entryIndexes: number[];
}

export interface GratitudeEntry {
  id: string;
  title: string;
  created_at: string;
}

const CACHE_KEY = "sj-gratitude";

export const loadGratitudeCache = (): { items: GratitudeItem[]; entryCount: number; date: string } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveGratitudeCache = (items: GratitudeItem[], entryCount: number) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ items, entryCount, date: new Date().toISOString().slice(0, 10) })
    );
  } catch {}
};

/** Cache is usable when scanned today AND the entry count hasn't changed. */
export const gratitudeCacheFresh = (cache: { entryCount: number; date: string } | null, entryCount: number): boolean => {
  if (!cache) return false;
  return cache.entryCount === entryCount && cache.date === new Date().toISOString().slice(0, 10);
};

export const CATEGORY_EMOJI: Record<string, string> = {
  people: "👥",
  experiences: "🌍",
  "small-moments": "✨",
  achievements: "🏆",
  other: "💛",
};
