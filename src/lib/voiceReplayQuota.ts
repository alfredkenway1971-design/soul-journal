// Voice replay (cloned-voice playback) monthly quota — client-side counter,
// web parity with exportQuota.ts. Free: 0 replays. Premium: 20/month included.
// Paid add-ons live in the voice_credits table (see stripe-webhook) and add to
// the monthly allowance.

const KEY_PREFIX = "sj-voice-replays";

export const currentMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const getReplaysUsed = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(window.localStorage.getItem(`${KEY_PREFIX}-${currentMonthKey()}`) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

export const incrementReplaysUsed = (): number => {
  const used = getReplaysUsed() + 1;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}-${currentMonthKey()}`, String(used));
  } catch {
    /* storage unavailable — best effort */
  }
  return used;
};

/** Remaining replays this month, clamped to >= 0. Pass Infinity for unlimited. */
export const replaysRemaining = (allowance: number, used: number): number => {
  if (!Number.isFinite(allowance)) return allowance;
  return Math.max(0, allowance - used);
};
