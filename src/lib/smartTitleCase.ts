// Smart title case: capitalize each word EXCEPT minor words like "from", "your", "of", "the", "and", etc.
// Always capitalize the first and last word.
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "if", "in", "into",
  "nor", "of", "on", "or", "per", "so", "than", "the", "to", "up", "via", "vs",
  "with", "your", "you", "my", "our",
]);

export function smartTitleCase(input?: string | null): string {
  if (!input) return "";
  const words = input.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      const isFirstOrLast = i === 0 || i === words.length - 1;
      if (!isFirstOrLast && MINOR_WORDS.has(lower)) return lower;
      // Preserve apostrophe / hyphen sub-cases
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
