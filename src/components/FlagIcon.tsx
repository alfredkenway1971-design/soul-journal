import type { ReactNode } from "react";

/**
 * FlagIcon — inline SVG country flags.
 * Emoji flags (🇺🇸) render as letter pairs ("US") or blank boxes on many
 * devices/browsers (notably the WhatsApp in-app browser), so these inline
 * SVGs guarantee the flag always shows. Simplified but recognizable shapes.
 */

const FLAGS: Record<string, ReactNode> = {
  // 🇺🇸 United States (simplified)
  en: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="2.3" fill="#B22234" />
      <rect y="4.6" width="24" height="2.3" fill="#B22234" />
      <rect y="9.2" width="24" height="2.3" fill="#B22234" />
      <rect y="13.8" width="24" height="2.2" fill="#B22234" />
      <rect width="9.5" height="8" fill="#3C3B6E" />
      <circle cx="2" cy="2" r="0.9" fill="#fff" />
      <circle cx="4.8" cy="2" r="0.9" fill="#fff" />
      <circle cx="7.5" cy="2" r="0.9" fill="#fff" />
      <circle cx="3.4" cy="4.6" r="0.9" fill="#fff" />
      <circle cx="6.1" cy="4.6" r="0.9" fill="#fff" />
      <circle cx="2" cy="6.6" r="0.9" fill="#fff" />
      <circle cx="4.8" cy="6.6" r="0.9" fill="#fff" />
    </>
  ),
  // 🇫🇷 France
  fr: (
    <>
      <rect width="8" height="16" fill="#0055A4" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#EF4135" />
    </>
  ),
  // 🇪🇸 Spain (simplified)
  es: (
    <>
      <rect width="24" height="4" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
      <rect y="12" width="24" height="4" fill="#AA151B" />
    </>
  ),
  // 🇸🇦 Saudi Arabia (simplified)
  ar: (
    <>
      <rect width="24" height="16" fill="#1B7F3B" />
      <rect y="5.5" width="24" height="5" fill="#fff" />
    </>
  ),
  // 🇨🇳 China
  zh: (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <circle cx="6.5" cy="5.5" r="2.4" fill="#FFDE00" />
      <circle cx="11.5" cy="3.2" r="1" fill="#FFDE00" />
      <circle cx="13" cy="5.4" r="1" fill="#FFDE00" />
      <circle cx="13" cy="8" r="1" fill="#FFDE00" />
      <circle cx="11.5" cy="10" r="1" fill="#FFDE00" />
    </>
  ),
  // 🇯🇵 Japan
  ja: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.6" fill="#BC002D" />
    </>
  ),
  // 🇰🇪 Kenya (simplified)
  sw: (
    <>
      <rect width="24" height="5.3" fill="#000" />
      <rect y="5.3" width="24" height="5.4" fill="#BB0000" />
      <rect y="6.2" width="24" height="1.4" fill="#fff" />
      <rect y="8.4" width="24" height="1.4" fill="#fff" />
      <rect y="10.7" width="24" height="5.3" fill="#006600" />
    </>
  ),
  // 🇩🇪 Germany
  de: (
    <>
      <rect width="24" height="5.3" fill="#000" />
      <rect y="5.3" width="24" height="5.4" fill="#DD0000" />
      <rect y="10.7" width="24" height="5.3" fill="#FFCE00" />
    </>
  ),
};

export const FlagIcon = ({
  code,
  className = "w-5 h-5",
}: {
  code?: string;
  className?: string;
}) => {
  const body = code ? FLAGS[code] : null;
  if (!body) return <span className={className}>🌐</span>;
  return (
    <span
      className={`inline-block overflow-hidden rounded-[3px] ring-1 ring-black/5 ${className}`}
    >
      <svg viewBox="0 0 24 16" className="w-full h-full block" aria-hidden="true">
        {body}
      </svg>
    </span>
  );
};
