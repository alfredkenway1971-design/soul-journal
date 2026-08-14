// Soul Mirror (monthly portrait) — client cache.
// One portrait per month, cached in localStorage `sj-soul-mirror-<month>`.
// Lazy generation on first view of the month (no cron needed — flagged in
// the implementation notes as the alternative to a scheduled job).

export interface SoulMirrorPortrait {
  emotionalSummary: {
    dominantMoods: { mood: string; days: number }[];
    trajectory: "improving" | "declining" | "stable";
    text: string;
  };
  hiddenPatterns: string;
  goalProgress: { goal: string; status: "advanced" | "stalled"; note: string }[];
  sourcesOfJoy: string[];
  growthArea: string;
  lifeChapter: string;
}

export const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (ym: string, langCode: string): string => {
  try {
    return new Intl.DateTimeFormat(langCode, { month: "long", year: "numeric" }).format(
      new Date(ym + "-01T12:00:00")
    );
  } catch {
    return ym;
  }
};

export const loadMonthPortrait = (ym: string): SoulMirrorPortrait | null => {
  try {
    const raw = localStorage.getItem(`sj-soul-mirror-${ym}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveMonthPortrait = (ym: string, portrait: SoulMirrorPortrait) => {
  try {
    localStorage.setItem(`sj-soul-mirror-${ym}`, JSON.stringify(portrait));
  } catch {}
};

/** All months that have a cached portrait, newest first. */
export const cachedMonths = (): string[] => {
  const months: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sj-soul-mirror-")) {
        months.push(key.replace("sj-soul-mirror-", ""));
      }
    }
  } catch {}
  return months.sort((a, b) => (a < b ? 1 : -1));
};
