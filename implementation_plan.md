# Implementation Plan

[Overview]
Migrate the Feedbackbogen-Generator visual design to the shared haak3 web app standard, aligning CSS design tokens, typography, focus styles, layout structure, logo assets, and the A4 print/preview surface with the SocialMediaCreator reference.

The current app uses a bespoke token set (`--brand: #1e88e5`, `--pane-bg`, `--accent: #2e7d32`, etc.) that diverges from the standard's semantic system (`--primary: #245dcc`, `--surface-subtle`, `--success: #176b3a`, etc.). The header uses a 24px icon; the new logo assets are 2000×2000 PNGs that need SVG conversion. The A4 preview currently uses hardcoded grays that should adopt the standard's text/border tokens. This plan brings the entire UI — toolbar, editor, preview controls, content pages, modals, footer, and A4 print surface — into compliance while preserving all existing functionality, accessibility, and German-language content.

[Types]

No new TypeScript types are required. The existing type system (`src/types.ts`) remains unchanged. All design changes are CSS- and asset-level. The `renderLayout()` function signature in `src/ui/templates.ts` stays the same; only internal markup details (logo path, alt text) change.

[Files]

Detailed breakdown of all file changes:

**New files to create:**
- `public/logo.svg` — Vector version of the new FBG logo converted from `FBG - Logo auf Blau.png`, optimized for UI use (header bar, ~28px rendered). Replaces `public/icon_Feedbackgenerator.svg` as the primary brand mark.
- `public/logo-white.svg` — Vector version on transparent/white background (for light-on-dark contexts if needed later).

**Existing files to modify:**
- `src/app.css` — Full design token migration. This is the largest change:
  - Replace `:root` token block with standard-aligned names and values
  - Update all references from old token names (`--brand`, `--pane-bg`, `--muted`, `--accent`, `--danger`, `--focus`, `--border`, `--border-strong`) to new names (`--primary`, `--primary-hover`, `--primary-soft`, `--surface`, `--surface-subtle`, `--text-muted`, `--success`, `--success-soft`, `--danger`, `--danger-soft`, `--focus`, `--border`, `--border-strong`)
  - Update font-family stack to include `Inter` as progressive enhancement
  - Update focus-visible outline to `3px solid var(--focus)` (was `2px`)
  - Update background colors to `--app-bg: #f3f5f8`
  - Update radius values (`--radius-md: 12px`, `--radius-lg: 20px`, `--radius-sm: 8px`)
  - Consolidate shadow tokens to `--shadow-soft: 0 18px 45px rgb(15 23 42 / 8%)`
  - A4 preview section: replace hardcoded hex grays with design tokens where appropriate (`--text`, `--text-muted`, `--border`, `--surface-subtle`, etc.)
  - Print media query: update to use token-derived values

- `src/ui/templates.ts` — Header logo update in `renderLayout()`:
  - Change `img` src from `./icon_Feedbackgenerator.svg` to `./logo.svg`
  - Update alt text to `Feedbackbogen-Generator Logo` (was empty `''`)
  - Update width/height to `28` (was `24`) to match standard

- `src/ui/index.html` — Update favicon, meta tags, and font preconnect:
  - Update favicon link to use new logo
  - Add `font-family` preconnect hints if applicable
  - Ensure `lang="de"` is set on `<html>`

- `src/export/export-utils.ts` — No changes needed (export data layer is token-agnostic)

- `src/export/export-pdf.ts` — May need minor color reference updates if it reads CSS variables for print styling; verify during implementation

- `src/export/export-docx.ts` — Review hardcoded hex values in DOCX generation (layout constants like `light-gray borders`) and align with standard border color `#dfe3e8`

- `src/export/export-odt.ts` — Same review as DOCX for ODT styling constants

**Files to delete/move after migration:**
- `public/icon_Feedbackgenerator.svg` — Replaced by `public/logo.svg`
- `public/icon_Feedbackgenerator.png` — Replaced by optimized vector
- `FBG - Logo auf Blau.png` — Source PNG, can be removed from root after SVG conversion
- `FBG - Logo auf Weiß.png` — Source PNG, can be removed from root after SVG conversion

**Configuration updates:**
- `public/favicon.svg` — Update to match new logo design
- `public/_headers` — No changes needed (already created in previous task)

[Functions]

No new functions are created. No functions are removed.

**Modified functions:**
- `renderLayout()` in `src/ui/templates.ts` (line 55–171) — Logo `<img>` tag attributes updated: `src`, `alt`, `width`, `height`. No structural changes to the DOM hierarchy.

All other render functions (`renderEditor`, `renderA4`, `renderCategories`, `renderSelectedList`, etc.) remain functionally unchanged — they use CSS class names that will be restyled via the token migration, not via markup changes.

[Classes]

No classes are modified. The codebase uses procedural TypeScript with imperative DOM manipulation (no class-based components).

[Dependencies]

No new npm packages are required.

The font approach (matching SocialMediaCreator) is progressive enhancement: `Inter` is listed first in the `font-family` stack. If the user has it installed, it renders; otherwise `ui-sans-serif, system-ui` is the fallback. No `@font-face`, no webfont download, keeping the bundle CDN-free and lightweight.

For SVG conversion of the logo, the implementation can use manual vector recreation or a CLI tool. If using `potrace` or `svgcleaner`, these are build-time only and not runtime dependencies.

[Testing]

**Test files — no modifications needed:**
The existing test suite (`tests/`) validates logic, content structure, export data, ordering, and DOM rendering correctness — none of which depend on CSS token names or hex values. The tests query by class names and data attributes, which remain unchanged.

**Validation strategy:**
1. `npm run verify` must pass (lint, typecheck, test, build)
2. Visual verification:
   - Dev server (`npm run dev`) — verify toolbar, editor, preview, modals, content pages, footer all render with updated colors/typography
   - Print preview — verify A4 output is clean with new token-based grays
   - Export test — generate PDF, DOCX, XLSX, ODT and verify visual output
3. Accessibility check — verify focus rings render at 3px with new focus color
4. Responsive check — verify mobile tabs, mobile export pane, responsive scaling at 900px and 1100px breakpoints

[Implementation Order]

1. Convert new logo PNGs to optimized SVG (`public/logo.svg`)
2. Update `src/app.css` `:root` token block with standard-aligned names/values
3. Update all CSS references throughout `src/app.css` to use new token names (find-and-replace with verification)
4. Update A4 preview/print CSS section to use design tokens instead of hardcoded hex
5. Update `src/ui/templates.ts` — logo `img` src/alt/dimensions in `renderLayout()`
6. Update `src/ui/index.html` — favicon, lang attribute, meta tags
7. Update `public/favicon.svg` to match new logo
8. Review and update export modules (`export-docx.ts`, `export-odt.ts`) for color constant alignment
9. Clean up old icon files (`icon_Feedbackgenerator.svg/png`, root-level logo PNGs)
10. Run `npm run verify` — ensure all green
11. Visual and functional verification via dev server