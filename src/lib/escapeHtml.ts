/**
 * Escape a value for safe inclusion in HTML markup.
 * Use this for any user-controlled content rendered through
 * innerHTML, document.write(), or iframeDoc.write().
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
