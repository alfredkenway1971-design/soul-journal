# Global Fonts, Full Translation, Cursive Title Case, Library Avatar

## 1. Font applied everywhere
The chosen font already flows through CSS variables and Tailwind's `sans`/`display`/`journal` families, but a few screens bypass it.

- Replace hardcoded `font-serif` headings on the Onboarding screens with the app's `font-display` family so they follow the selected font.
- Confirm nav, dashboard, entry views, and settings inherit the variable (no per-component font overrides remain outside the Book Builder, which keeps its own PDF-specific fonts by design).
- Keep the Book Builder / PDF preview font pickers untouched — those are export fonts, not app UI fonts.

## 2. Language covers the whole app
Several screens still contain hardcoded English. Each gets translation keys added to all 8 languages and wired to `t()`:

- Library: page title "Soul Journal Library", "Search" placeholder, empty/loading states, date group labels, filter chips.
- Entry detail: all labels, buttons, dialogs, toasts.
- Profile settings: section headings, field labels, buttons, toasts.
- AI Coach: remaining hardcoded card headings and status text.
- Home: any remaining hardcoded strings alongside the existing greeting keys.
- Bottom nav labels already translate; verify the new keys render for RTL Arabic.

## 3. Title case for cursive fonts
When the active app font is a script/cursive typeface (Dancing Script, Caveat, Shadows Into Light, Sacramento, Kalam, Alex Brush, Euphoria, Great Vibes, Tangerine, Patrick Hand, Petit Formal, Satisfy, Arizonia), display titles in Title Case:

- Add an `isCursive` flag to the font options and expose it from the font context.
- Add a small helper/hook that returns the title string as-is for non-cursive fonts and `smartTitleCase(...)` output for cursive fonts (minor words like "of", "the", "in" stay lowercase; "From" and "Your" stay capitalized).
- Apply it to entry titles (Library, Home recent entries, Entry detail, Calendar), section headings, and AI Coach / Insight card titles.

## 4. Profile picture in Library
The Library header currently renders an empty gradient circle — no avatar is fetched.

- Fetch `display_name` and `avatar_url` from the profile when the Library loads (same pattern as the Home page, including the cache-buster URL).
- Render the image inside the existing circular frame with initials as fallback when no avatar exists; keep the tap-to-profile behaviour.

## Technical notes
- Files touched: `src/contexts/FontContext.tsx`, `src/contexts/LanguageContext.tsx`, `src/contexts/extraTranslations.ts`, `src/lib/smartTitleCase.ts` (new cursive-aware wrapper), `src/pages/LibraryPage.tsx`, `src/pages/EntryDetailPage.tsx`, `src/pages/ProfileSettingsPage.tsx`, `src/pages/CoachingPage.tsx`, `src/pages/HomePage.tsx`, `src/pages/OnboardingPage.tsx`, `src/components/premium/RecentEntryCard.tsx`.
- No database or backend changes required.
