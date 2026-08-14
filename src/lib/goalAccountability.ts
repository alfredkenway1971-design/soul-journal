// Goal Accountability Partner — client engine.
// Scan results cached in localStorage (1 AI scan/day, shared between Home +
// Profile). Nudge quota: max 2 per week. Individual toggle via AI prefs.

export interface GoalScanResult {
  goal: string;
  count: number;
  sample: string;
}

export type GoalStatus = "onTrack" | "needsAttention" | "celebrating";

export interface AIPrefs {
  goalAccountability: boolean;
  predictiveMood: boolean;
  gratitudeTimeline: boolean;
}

const PREFS_KEY = "sj-ai-prefs";
const SCAN_KEY = "sj-goal-scan";
const NUDGE_KEY = "sj-goal-nudges";
const NUDGE_MAX_PER_WEEK = 2;
const SCAN_WINDOW_DAYS = 7;
// Card dismissed-per-message tracking
const SEEN_PREFIX = "sj-goal-seen-";

export const defaultAIPrefs: AIPrefs = { goalAccountability: true, predictiveMood: true, gratitudeTimeline: true };

export const loadAIPrefs = (): AIPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultAIPrefs, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultAIPrefs };
};

export const saveAIPrefs = (prefs: AIPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
};

export const getWeekKey = (): string => {
  const now = new Date();
  // ISO week (Monday-start): yyyy-Www
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

/** Has a scan been run today? */
export const scanFreshToday = (): boolean => {
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return false;
    const { date } = JSON.parse(raw);
    return typeof date === "string" && date === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
};

export const loadScan = (): GoalScanResult[] | null => {
  try {
    const raw = localStorage.getItem(SCAN_KEY);
    if (!raw) return null;
    const { results } = JSON.parse(raw);
    return Array.isArray(results) ? results : null;
  } catch {
    return null;
  }
};

export const saveScan = (results: GoalScanResult[]) => {
  try {
    localStorage.setItem(SCAN_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), results }));
  } catch {}
};

/** Nudges used this week (max 2). */
export const nudgesUsedThisWeek = (): number => {
  try {
    const raw = localStorage.getItem(NUDGE_KEY);
    if (!raw) return 0;
    const { week, count } = JSON.parse(raw);
    if (week !== getWeekKey()) return 0;
    return Number(count) || 0;
  } catch {
    return 0;
  }
};

export const registerNudge = () => {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ week: getWeekKey(), count: nudgesUsedThisWeek() + 1 }));
  } catch {}
};

export const markCardSeen = (key: string) => {
  try {
    localStorage.setItem(SEEN_PREFIX + key, "1");
  } catch {}
};

export const isCardSeen = (key: string): boolean => {
  try {
    return localStorage.getItem(SEEN_PREFIX + key) === "1";
  } catch {
    return false;
  }
};

/** Map scan results -> per-goal status. */
export const computeGoalStatuses = (
  goals: string[],
  results: GoalScanResult[] | null
): Record<string, GoalStatus> => {
  const statuses: Record<string, GoalStatus> = {};
  for (const goal of goals) {
    const r = results?.find((x) => x.goal === goal);
    const count = r?.count ?? 0;
    if (count >= 3) statuses[goal] = "celebrating";
    else if (count === 0) statuses[goal] = "needsAttention";
    else statuses[goal] = "onTrack";
  }
  return statuses;
};

/** Pick the single item the Home card should show (celebration first, then an
 *  affordable nudge — never more than NUDGE_MAX_PER_WEEK nudges). Returns
 *  { goal, status, count } or null. */
export const pickHomeCardItem = (
  statuses: Record<string, GoalStatus>,
  results: GoalScanResult[] | null,
  seenKeyPrefix: string
): { goal: string; status: GoalStatus; count: number } | null => {
  const celebrating = Object.entries(statuses).filter(([, s]) => s === "celebrating");
  if (celebrating.length > 0) {
    const [goal] = celebrating[0];
    if (!isCardSeen(seenKeyPrefix + "celebrate:" + goal)) {
      const count = results?.find((r) => r.goal === goal)?.count ?? 0;
      return { goal, status: "celebrating", count };
    }
  }

  if (nudgesUsedThisWeek() >= NUDGE_MAX_PER_WEEK) return null;

  const attention = Object.entries(statuses).filter(([, s]) => s === "needsAttention");
  for (const [goal] of attention) {
    if (!isCardSeen(seenKeyPrefix + "nudge:" + goal)) {
      return { goal, status: "needsAttention", count: 0 };
    }
  }
  return null;
};

/* Notification-once tracking per message key */
export const markNotified = (key: string) => {
  try {
    localStorage.setItem(SEEN_PREFIX + "notified-" + key, "1");
  } catch {}
};

export const wasNotified = (key: string): boolean => {
  try {
    return localStorage.getItem(SEEN_PREFIX + "notified-" + key) === "1";
  } catch {
    return false;
  }
};

export { NUDGE_MAX_PER_WEEK, SCAN_WINDOW_DAYS };
