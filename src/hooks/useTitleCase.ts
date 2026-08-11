import { useCallback } from "react";
import { useFont } from "@/contexts/FontContext";
import { smartTitleCase } from "@/lib/smartTitleCase";

/**
 * Returns a formatter that applies Title Case only when the active app font is
 * a script/cursive typeface. Other fonts keep the original text untouched.
 */
export const useTitleCase = () => {
  const { isCursive } = useFont();
  return useCallback(
    (text?: string | null) => {
      if (!text) return "";
      return isCursive ? smartTitleCase(text) : text;
    },
    [isCursive]
  );
};
