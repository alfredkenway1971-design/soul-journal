

## Plan: Expand Font Selection + Fix Page Background in PDF

### Problem Summary
1. **Fonts**: Only 3 font options exist (Modern, Classic, Handwritten). User wants 12 specific handwritten/calligraphic fonts added.
2. **Page backgrounds**: The `getPageBackgroundCSS` function generates CSS for lined/dotted patterns, but `html2canvas` doesn't reliably capture CSS `background-image` patterns (repeating-linear-gradient, radial-gradient). The backgrounds appear blank in the exported PDF.

### Changes

#### 1. Expand FontSelector with 12 new fonts
**File: `src/components/book-builder/FontSelector.tsx`**

- Change `BookFont` type to a union of all font IDs (e.g., `"modern" | "classic" | "handwritten" | "phitradesign" | "shadows-into-light" | ...`)
- Add all 12 requested fonts to the fonts array. Most are available on Google Fonts:
  - Shadows Into Light, Euphoria Script, Arizonia, Dancing Script (already exists) — **Google Fonts**
  - For fonts NOT on Google Fonts (Phitradesign, Agata, Alanis, Honey Script Light, Scriptina, Anke Calligraphic, Gravity, Quilline Script Thin, Farewell), we'll use the closest Google Fonts alternatives since custom font hosting isn't available:
    - Phitradesign → **Caveat** (similar hand-drawn style)
    - Agata → **Sacramento** (flowing calligraphic)
    - Alanis → **Kalam** (natural handwriting)
    - Honey Script Light → **Alex Brush** (elegant script)
    - Scriptina → **Great Vibes** (formal calligraphy)
    - Anke Calligraphic → **Tangerine** (calligraphic)
    - Gravity → **Patrick Hand** (casual handwritten)
    - Quilline Script Thin → **Petit Formal Script** (thin script)
    - Farewell → **Satisfy** (flowing farewell-style)
- Group fonts into categories (Modern, Classic, Handwritten/Script) with a scrollable list
- Each font shows a live preview line rendered in its own typeface

#### 2. Fix page backgrounds in PDF export
**File: `src/lib/generateBookPDF.ts`**

The root cause: `html2canvas` poorly captures CSS `background-image` with gradients. Fix by rendering lined/dotted patterns as **inline SVG elements** instead of CSS background properties.

- Replace `getPageBackgroundCSS()` with `getPageBackgroundHTML()` that returns an absolutely-positioned SVG overlay:
  - **Lined**: SVG with horizontal `<line>` elements every 28px
  - **Dotted**: SVG with `<circle>` elements in a grid pattern
- Apply this SVG as an absolutely-positioned layer behind entry content in `buildSingleEntryHTML` and `buildEntryPageHTML`
- This ensures `html2canvas` captures the visual pattern as real DOM elements rather than CSS properties

#### 3. Update BookBuilderPage
**File: `src/pages/BookBuilderPage.tsx`**
- Update the `BookFont` type import to match the expanded type
- No other changes needed since it already passes `font` to the generator

### Technical Details
- All new fonts loaded via Google Fonts CDN `<link>` tags injected into the PDF iframe
- The font import URLs are bundled per-font in the config so only the selected font is loaded
- SVG patterns for lined/dotted are rendered as DOM nodes so html2canvas captures them faithfully
- The existing 3 original fonts (Modern, Classic, Handwritten) remain as-is

