// Predictive Mood Alerts — client-side 90-day pattern analysis.
// Pure math on structured mood data (no AI calls, deterministic, free):
// detects a weekday where the user's mood is consistently below their own
// baseline (recurring negative pattern, 3+ occurrences). Alert fires at
// most 1x/day via browser notification. Observation framing only — never
// a diagnosis.

export type Mood = "happy" | "good" | "fine" | "sad" | "unhappy";

const MOOD_SCORE: Record<string, number> = { happy: 5, good: 4, fine: 3, sad: 2, unhappy: 1 };

export const isLowMood = (mood: string): boolean => mood === "sad" || mood === "unhappy";

export interface MoodPoint {
  mood: string;
  created_at: string;
}

export interface MoodPattern {
  weekday: number; // 0=Sunday ... 6=Saturday (Date.getDay())
  avgScore: number;
  overallAvg: number;
  lowRatio: number; // fraction of that weekday's entries that are low moods
  sampleSize: number; // entries on that weekday (pattern must repeat 3+ times)
}

const MIN_WEEKDAY_SAMPLES = 3;
const MIN_TOTAL_SAMPLES = 10;
// A weekday qualifies when its average sits clearly below the user's own
// baseline AND a meaningful share of that weekday's entries are low moods.
const AVG_GAP = 0.6;
const LOW_RATIO_THRESHOLD = 0.4;

export const analyzeMoodPatterns = (points: MoodPoint[], windowDays = 90): MoodPattern | null => {
  const cutoff = Date.now() - windowDays * 86400000;
  const inWindow = points.filter((p) => new Date(p.created_at).getTime() >= cutoff);
  if (inWindow.length < MIN_TOTAL_SAMPLES) return null;

  const scored = inWindow.map((p) => ({
    wd: new Date(p.created_at).getDay(),
    score: MOOD_SCORE[p.mood] ?? 3,
    low: isLowMood(p.mood),
  }));

  const overallAvg = scored.reduce((a, b) => a + b.score, 0) / scored.length;

  const byWd = new Map<number, { scores: number[]; lows: number }>();
  for (const s of scored) {
    const e = byWd.get(s.wd) || { scores: [], lows: 0 };
    e.scores.push(s.score);
    if (s.low) e.lows++;
    byWd.set(s.wd, e);
  }

  let best: MoodPattern | null = null;
  for (const [wd, e] of byWd) {
    if (e.scores.length < MIN_WEEKDAY_SAMPLES) continue; // pattern must repeat 3+ times
    const avg = e.scores.reduce((a, b) => a + b, 0) / e.scores.length;
    const lowRatio = e.lows / e.scores.length;
    if (avg <= overallAvg - AVG_GAP && lowRatio >= LOW_RATIO_THRESHOLD) {
      if (!best || avg < best.avgScore) {
        best = { weekday: wd, avgScore: avg, overallAvg, lowRatio, sampleSize: e.scores.length };
      }
    }
  }
  return best;
};

// --- 1-alert/day gating (localStorage) ---
const ALERT_KEY = "sj-predictive-alert";

export const alertFiredToday = (): boolean => {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (!raw) return false;
    const { date } = JSON.parse(raw);
    return typeof date === "string" && date === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
};

export const markAlertFired = (weekday: number) => {
  try {
    localStorage.setItem(
      ALERT_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), weekday })
    );
  } catch {}
};

/** Localized weekday name for a Date.getDay() value (0=Sunday), via Intl —
 *  no extra i18n keys needed, works for all 8 app languages. */
export const weekdayName = (weekday: number, langCode: string): string => {
  try {
    // Jan 7 2024 was a Sunday: + weekday shifts to the right day
    return new Intl.DateTimeFormat(langCode, { weekday: "long" }).format(
      new Date(2024, 0, 7 + weekday)
    );
  } catch {
    return new Intl.DateTimeFormat("en", { weekday: "long" }).format(
      new Date(2024, 0, 7 + weekday)
    );
  }
};
