const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

export const isRtlLanguage = (lang?: string | null) =>
  !!lang && RTL_LANGUAGES.has(lang.toLowerCase().split("-")[0]);

export const dirFor = (lang?: string | null): "rtl" | "ltr" =>
  isRtlLanguage(lang) ? "rtl" : "ltr";

export const SPOKEN_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto-detect language" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "ar", label: "العربية" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "sw", label: "Kiswahili" },
];
