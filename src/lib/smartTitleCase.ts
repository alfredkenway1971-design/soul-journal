// Title Case helper. Capitalizes every word except a small set of articles/
// conjunctions/prepositions (a/an/and/of/the/in/on/at). Always capitalizes the
// first and last word. Per spec we DO capitalize "From" and "Your".
const MINOR_WORDS = new Set([
  "a", "an", "and", "or", "but", "nor",
  "the", "of", "in", "on", "at", "to", "by", "for",
]);

export function smartTitleCase(input?: string | null): string {
  if (!input) return "";
  const words = input.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      const isFirstOrLast = i === 0 || i === words.length - 1;
      if (!isFirstOrLast && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
