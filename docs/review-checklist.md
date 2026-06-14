# Review Checklist

Use this checklist before merging changes or publishing a release.

## Content

- [ ] `npm run check:content` passes (JSON structure + ID uniqueness).
- [ ] User-facing strings are in German unless explicitly requested otherwise.
- [ ] No placeholder syntax (`{{…}}`) remains in source or content files.

## Code quality

- [ ] `npm run lint` passes with no new warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.

## Accessibility

- [ ] Keyboard navigation reaches every interactive control.
- [ ] Focus ring is visible on all focusable elements.
- [ ] `aria-live` regions announce dynamic status changes.
- [ ] `prefers-reduced-motion` is respected.

## Data & privacy

- [ ] All processing remains client-side (`localStorage` only).
- [ ] No new outbound network calls or third-party scripts.
- [ ] Import, export, reset, and undo/redo all function correctly.

## Export

- [ ] PDF / print output matches the on-screen A4 preview.
- [ ] DOCX, XLSX, and ODT exports open without errors.
- [ ] Header fields, categories, items, and footer render correctly in every format.

## Deployment

- [ ] `public/_headers` CSP and security headers are appropriate.
- [ ] `public/_redirects` SPA fallback is in place.
- [ ] `LICENSE`, `package.json`, and README all declare `GPL-3.0-only`.

## Documentation

- [ ] `CHANGELOG.md` updated for user-visible changes.
- [ ] `README.md` reflects current functionality and commands.