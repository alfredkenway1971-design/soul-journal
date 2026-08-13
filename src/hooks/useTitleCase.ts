import { useCallback } from "react";
import { smartTitleCase } from "@/lib/smartTitleCase";

/**
 * Returns a formatter that applies Title Case to any displayed title,
 * regardless of the active app font.
 */
export const useTitleCase = () => {
  return useCallback((text?: string | null) => {
    if (!text) return "";
    return smartTitleCase(text);
  }, []);
};
