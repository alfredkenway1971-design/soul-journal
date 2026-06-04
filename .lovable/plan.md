# Plan: Insights, Font Persistence, PDF Sizing & Title Case

## 1. Restore the AI Insight card on Home
- `AIInsightCard.tsx` exists but is no longer rendered on `HomePage.tsx`.
- Re-mount it in `src/pages/HomePage.tsx` between `QuickCapture` and `MoodFilterBar`, wired to the existing weekly-insight pipeline (reuse the same fetch used by `WeeklyMoodSummary`, or pass the most recent `coaching_insights` row).
- Show a graceful default copy when no insight is available yet.

## 2. Global Font Persistence (style + size)
**Problem:** `FontsSettingsPage` only writes to `localStorage` and only applies styles inside its own save handler. The choice does not survive a fresh load on other devices, and `document.body.style.fontFamily` / root `fontSize` are never re-applied on app boot.

**Fix:**
- Add a new `FontContext` (`src/contexts/FontContext.tsx`) that
  - loads the user's preference from the `profiles` table (new columns) on auth,
  - falls back to `localStorage`, then to defaults,
  - injects the correct Google Fonts `<link>` tag,
  - sets `document.documentElement.style.fontFamily` and `fontSize` so every page (Home, Entry, Library, Preview, etc.) inherits it via Tailwind `font-sans` / rem-based sizes,
  - exposes `{ font, fontSize, setFont, setFontSize }`.
- Wrap `App.tsx` with `<FontProvider>` (inside `AuthProvider`).
- Update `FontsSettingsPage.tsx` to use the context (no more direct `document.body` writes) and persist to DB on save.
- Database migration: add `app_font text` and `app_font_size int` to `public.profiles` (nullable, no default). RLS already covers own-row updates.
- Make sure rem-based Tailwind classes pick up the root size change (already true for most surfaces). Audit a couple of fixed-`text-[34px]` headers in `HomePage` and convert the body copy areas of journal entries to inherit.

## 3. PDF Export — actually honor Font Size
**Problem report:** PDF text stays small even when "Large" is selected.

**Fix in `src/lib/generateBookPDF.ts`:**
- The fontSize is passed through, but only entry body/title/meta scale. Bump the "large" preset further (body 30 / title 44 / meta 22) so the change is unmistakable on A5.
- Make the **cover** typography scale with `config.fontSize` (currently hardcoded 96/36/30). New table:
  - small → subtitle 26 / title 76 / year 22
  - medium → 32 / 92 / 28
  - large → 40 / 120 / 36
- Make the Soul Reflection block scale from `fs.body` (already done) but also bump its label.
- Ensure `BookBuilderPage` keeps reading the persisted `book-font-size` from localStorage AND seeds it from the new FontContext if the user has set a global size, so "Large" globally → "Large" in builder by default.

## 4. Title Case Everywhere (no ALL CAPS)
- Update `src/lib/smartTitleCase.ts` so it also capitalizes `from`, `your`, `you`, `my`, `our` when they appear after the first word (spec now says every word capitalized). Keep articles/conjunctions lowercase only if you want—but per the brief, the safest is "Title Case all words except a/an/and/of/the/in/on/at".
- Apply across the UI / PDF:
  - `generateBookPDF.ts`
    - Cover: remove `text-transform:uppercase` from "The Soul Journal of" subtitle and from year row.
    - Soul Reflection label: change `Message from your Soul` → `Message from Your Soul` (use `smartTitleCase`).
    - Entry titles: wrap in `smartTitleCase`.
  - `HomePage.tsx`: drop `.toUpperCase()` from `formattedDate`.
  - `AIInsightCard.tsx`: change the "AI INSIGHT" chip to "AI Insight" (remove `uppercase` class).
  - `WeeklyMoodSummary.tsx`: remove `capitalize` on trend pill and ensure mood labels use Title Case (already do).
  - Sweep remaining `uppercase` / `tracking-wide` chips on Home, Library, Settings, Profile headers and convert to Title Case.

## Technical Notes

- New DB columns:
  ```sql
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS app_font text,
    ADD COLUMN IF NOT EXISTS app_font_size integer;
  ```
  No new grants/policies needed — existing self-row policies cover it.
- `FontContext` shape:
  ```ts
  type FontPrefs = { font: string; fontSize: number };
  ```
  Applies via:
  ```ts
  document.documentElement.style.setProperty('--app-font', cfg.family);
  document.documentElement.style.fontSize = `${cfg.fontSize}px`;
  ```
  and in `index.css`:
  ```css
  html { font-family: var(--app-font, system-ui, sans-serif); }
  ```
- Save flow: setting → context → DB upsert (+ localStorage mirror for instant load before auth resolves).
- PDF cover scaling driven by a new helper `getCoverFontSizes(size: FontSize)`.

## Files Touched
- `src/contexts/FontContext.tsx` (new)
- `src/App.tsx`
- `src/index.css`
- `src/pages/HomePage.tsx`
- `src/pages/FontsSettingsPage.tsx`
- `src/components/premium/AIInsightCard.tsx`
- `src/components/premium/WeeklyMoodSummary.tsx`
- `src/lib/smartTitleCase.ts`
- `src/lib/generateBookPDF.ts`
- `src/pages/BookBuilderPage.tsx`
- supabase migration adding `app_font`, `app_font_size` to `profiles`

## Out of Scope
- Redesign of any other screen
- Backend coaching-insight generation logic (we only surface what already exists)
