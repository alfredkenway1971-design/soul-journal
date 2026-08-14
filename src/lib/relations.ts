// Relationship Emotional Tracker — client cache + privacy controls.
// Scan results cached in localStorage (1 AI scan/day, ~$0.005); relations
// the user deletes are hidden permanently (until they clear the hidden
// list). NEVER surfaced via push notification — app-internal only.

export interface Relation {
  name: string;
  count: number;
  trend: "improving" | "declining" | "stable";
  insight: string;
  entryIndexes: number[];
}

export interface RelationEntry {
  id: string;
  title: string;
  created_at: string;
}

const CACHE_KEY = "sj-relations";
const HIDDEN_KEY = "sj-relations-hidden";

export const loadRelationsCache = (): { relations: Relation[]; entryCount: number; date: string } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveRelationsCache = (relations: Relation[], entryCount: number) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ relations, entryCount, date: new Date().toISOString().slice(0, 10) })
    );
  } catch {}
};

export const relationsCacheFresh = (cache: { entryCount: number; date: string } | null, entryCount: number): boolean => {
  if (!cache) return false;
  return cache.entryCount === entryCount && cache.date === new Date().toISOString().slice(0, 10);
};

export const loadHiddenRelations = (): string[] => {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const hideRelation = (name: string) => {
  try {
    const hidden = loadHiddenRelations();
    if (!hidden.includes(name)) {
      hidden.push(name);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    }
  } catch {}
};

export const clearHiddenRelations = () => {
  try {
    localStorage.setItem(HIDDEN_KEY, "[]");
  } catch {}
};

export const TREND_EMOJI: Record<string, string> = {
  improving: "📈",
  declining: "📉",
  stable: "➡️",
};
