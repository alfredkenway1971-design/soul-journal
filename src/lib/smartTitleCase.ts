// Title Case helper — per Amer's spec: EVERY word gets its first letter
// capitalized and the rest lowercase ("first letter capital, rest small,
// after space capital, small letters"). No minor-word exceptions.
// Fully-uppercase words (acronyms like AI, USA, 3PM) are preserved as-is.
export function smartTitleCase(input?: string | null): string {
  if (!input) return "";
  return input
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
