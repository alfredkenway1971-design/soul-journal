// Soul Book PDF export quota — monthly counter stored client-side (web parity
// with other fair-usage caps). Paid $2.99 add-ons live in the export_credits
// table (see stripe-webhook) and add to the monthly allowance.

const KEY_PREFIX = "sj-book-exports";

export const currentMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const getExportsUsed = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(window.localStorage.getItem(`${KEY_PREFIX}-${currentMonthKey()}`) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

export const incrementExportsUsed = (): number => {
  const used = getExportsUsed() + 1;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}-${currentMonthKey()}`, String(used));
  } catch {
    /* storage unavailable — best effort */
  }
  return used;
};

/** Remaining exports this month, clamped to >= 0. Pass Infinity for unlimited. */
export const exportsRemaining = (allowance: number, used: number): number => {
  if (!Number.isFinite(allowance)) return allowance;
  return Math.max(0, allowance - used);
};
