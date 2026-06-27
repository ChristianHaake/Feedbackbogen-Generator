# Redesign Validation — Feedbackbogen-Generator

**Date:** 2026-06-18
**Branch validated:** `stage` (local HEAD `fd61572`)
**Deployed preview supplied:** https://f0d7d3fa.feedbackbogen-generator.pages.dev
**Method:** 3-agent codebase review + live browser walkthrough. Current `stage` source was run
locally (`vite` dev server) because the supplied preview is a **stale build** (see Finding 1).
**Scope:** code review, security, performance, per-feature + language UX, missing-feature gap
analysis, tech-stack validity. **No code was changed** — this document is the deliverable.

---

## 1. Executive summary

**Verdict: SHIP WITH FIXES.** The redesign is solid — strong security posture, sensible
architecture, good test coverage, and a clean, accessible UI. No critical security or correctness
defects. The blocking items are **release-process and internationalization**, not engineering
quality.

**Headline finding:** the supplied preview URL does **not** reflect the current `stage` code. It is
an older build (config `schemaVersion 3` vs source `4`; no language switcher present in its DOM).
Any sign-off against that URL would validate the wrong artifact. **Redeploy `stage` HEAD before
review/merge.**

**Before merge to `master`:**
- Redeploy `stage` so the preview matches the code (Finding 1).
- Restore language switching on ≤ 900 px viewports (Finding 2).
- Localize footer links + legal pages, or at minimum **Impressum/Datenschutz** (Findings 3, 4).
- Escape spreadsheet formula-injection prefixes in XLSX export (Finding 6).

**Tech stack: VALID — no change recommended** (Section 6).

---

## 1a. Remediation status (applied 2026-06-18)

The code-level i18n + security + perf findings were fixed in this same session (verified: `typecheck`,
`lint`, 52 unit tests, `build` all green; live preview re-checked). Findings **1** (redeploy) and **4**
(legal-page translation — needs human-authored legal text, not machine translation) remain open and
are **your** actions.

| # | Status | What changed |
|---|---|---|
| 2 | ✅ Fixed | Mobile no longer hides the switcher; only the redundant `.local-badge` is dropped ≤ 900 px. `src/app.css` |
| 3 | ✅ Fixed | Footer link labels → `strings.contentLinks.*`. |
| 5 | ✅ Fixed | Traffic-light labels → `strings.scales.trafficLabels` (verified live: "Green/Yellow/Red"). |
| 6 | ✅ Fixed | `sanitizeCellValue()` escapes `= + - @`/control-char cell prefixes; regression test added. |
| 7 | ✅ Fixed | XLSX headers/sheet/filename → `strings.xlsx.*`. |
| 8 | ✅ Fixed | Tablist/editor/preview/footer `aria-label` → `strings.a11y.*`. |
| 9 | ✅ Verified | `jspdf.html()` is never called → `html2canvas` chunk is lazy and never fetched at runtime. Left in place (no runtime cost). |
| 10 | ✅ Fixed | "Buy me a coffee"/"GitHub" labels → `strings.footer.*`. |
| 1 | ⛔ Open (yours) | Redeploy `stage` so the preview reflects the code. |
| 4 | ⛔ Open (yours) | Translate Impressum/Datenschutz (+help/about) — requires human-authored legal text. |

All five locales (de/en/es/fr/nl) received the new dict keys. No behavior change for German.

---

## 2. What was verified live

Run locally against current `stage` source; UI auto-detected **English** (browser `en-US`):

- ✅ Page loads, **no console errors**, no network errors, onboarding banner renders.
- ✅ Criteria flow: category expand, search ("Struktur" → correct empty state), checkbox select,
  live A4 preview updates, "N ausgewählt"/"N selected" badge, Undo activates.
- ✅ Scale selector localized: Likert / Points / Emojis (3) / Emojis (5) / Traffic light /
  Percentage / Yes/No.
- ✅ Mobile layout (530 px): Edit / Preview / Export tabs work.
- ✅ Language switcher exists with 5 options (Deutsch/English/Français/Español/Nederlands)…
  **but was hidden below 900 px** (Finding 2 — fixed).
- ⚠️ Traffic-light scale renders **"Grün Gelb Rot"** under an otherwise-English form (Finding 5).
- ⚠️ Footer links render German under English UI (Finding 3).

**Not live-triggered** (validated by source + existing `tests/export.test.ts` only): actual
PDF/DOCX/XLSX/ODT file downloads, fillable-PDF form fields. Recommend a manual export smoke-test in
each format before release.

---

## 3. Tech-stack assessment — VALID

| Aspect | Finding |
|---|---|
| Framework | Vanilla TS + Vite. Appropriate — app is form-config + DOM render + file export; a SPA framework would add weight without benefit. |
| Build/tooling | Vite 7, TS 5.6 strict, ESLint 9 flat config, Prettier, Vitest + Playwright, PWA plugin. Modern, coherent. |
| Hosting | Static Cloudflare Pages, no backend. Correct for a privacy-first, client-only tool. |
| Exports | Per-format libs (`jspdf`, `pdf-lib`, `docx`, `write-excel-file`, `jszip`), all **lazy-imported** ([src/main.ts:912](../../src/main.ts)). |
| Persistence | `localStorage` + JSON import/export, versioned schema w/ migrations ([src/storage.ts](../../src/storage.ts)). |

No stack migration warranted. The choices match the problem.

---

## 4. Security

**Posture is strong.** No critical/high issues.

- ✅ Safe DOM construction via `el()` helper — `textContent`/`setAttribute`, never `innerHTML`
  injection ([src/ui/components.ts](../../src/ui/components.ts)). Markdown renderer builds nodes,
  not raw HTML ([src/content-pages.ts](../../src/content-pages.ts)).
- ✅ Restrictive CSP + headers ([public/_headers](../../public/_headers)): `default-src 'self'`,
  `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, HSTS, COOP/CORP, `X-Frame DENY`,
  Permissions-Policy fully locked down. No inline scripts/styles.
- ✅ Zero third-party CDN/runtime resources; fonts bundled locally. No secrets in source. No
  analytics/tracking. All `fetch` calls same-origin content JSON.
- ✅ `localStorage` holds only user form state (no credentials); import capped at 5 MB.

**Finding 6 — 🟡 CSV/XLSX formula injection.** User text written raw to cells
([src/export/export-xlsx.ts:31-34](../../src/export/export-xlsx.ts)). A criterion/category/header
beginning `=`, `+`, `-`, `@`, tab, or CR can execute as a formula when the file is opened in Excel /
Google Sheets / LibreOffice. Offline, user-authored content → impact is limited, but a shared
exported sheet is a plausible vector. **Fix:** prefix risky cell values with `'` (or a leading
space) in `bodyCell()`. Check DOCX/ODT exports too — they are XML-structured (TextRun/`el`), so risk
is lower, but confirm during the fix.

---

## 5. Performance — acceptable

- ✅ Initial critical path ~234 KB (app JS + CSS + font). Export libs (~1.3 MB combined) load on
  demand only.
- ✅ Cache strategy optimal: hashed `/assets/*` immutable 1 yr, index `must-revalidate`.
- 🔵 **Finding 9 — `html2canvas` (~196 KB)** is bundled into the PDF export chunk via `jspdf`,
  although the app draws PDFs programmatically (no `jspdf.html()` usage found in `src/`). Verify it
  is truly unreachable and tree-shake / exclude it to shrink the PDF chunk. Lazy-loaded, so
  initial-load impact is nil; this is export-time weight only.

---

## 6. Language / i18n — the weakest dimension

Five locales exist (`de/en/es/fr/nl`) with fully localized content JSON (categories, scales, product
formats). The **infrastructure is good; the gaps are at the edges and on mobile.**

**Finding 2 — 🟡 Language switcher hidden below 900 px.** *(Fixed — see §1a.)*
`@media (max-width: 900px) { .header-meta { display: none } }` ([src/app.css](../../src/app.css))
hid the switcher container. The cutoff is **900 px** — affects phones and portrait tablets. On those
devices a user was locked to the auto-detected language with no manual override. **Fix applied:**
keep `.header-meta` visible and drop only the redundant `.local-badge` on mobile.

**Finding 3 — 🟡 Footer nav links hardcoded German.** "Hilfe / Über das Projekt / Impressum /
Datenschutz" render in every UI language (verified live under English UI;
[src/ui/templates.ts](../../src/ui/templates.ts) footer block). Pull these labels from the locale
dict.

**Finding 4 — 🟡 Content pages German-only.** `content/{help,about,imprint,privacy}.md` is a single
German set (only the JSON is per-language). Untranslated **Impressum/Datenschutz** is a legal/GDPR
concern when the app is presented in another language. Provide per-language markdown (at least the
two legal pages) or label the links so non-German users know they lead to German text.

**Finding 5 — 🟡 Traffic-light labels hardcoded German.** `'Grün / Gelb / Rot'` and
`['Grün','Gelb','Rot']` ([src/scale-utils.ts:16,44](../../src/scale-utils.ts)) leak into EN/ES/FR/NL
preview **and exports** (verified live: "Grün Gelb Rot" on an English form). Move to the locale dict
or derive from `TrafficScale.colors`.

**Finding 7 — 🟡 XLSX strings hardcoded German.** Column headers (`Kategorie/Gewichtung/Kriterium/
Skala/Bewertung`), sheet name `Feedbackbogen`, filename `bewertungsbogen.xlsx`
([src/export/export-xlsx.ts:27,42,48](../../src/export/export-xlsx.ts)) ignore UI language. (Spot-
check DOCX/ODT/PDF exports for the same pattern when fixing.)

**Finding 8 — 🔵 a11y labels hardcoded German.** Tablist `aria-label="Arbeitsbereich"` and footer
nav `aria-label="Rechtliches und Projektinformationen"` (verified live) — screen-reader landmarks
stay German in other languages.

**Finding 10 — 🔵 "Buy me a coffee" / "GitHub" labels** are hardcoded English, outside the locale
dict. Cosmetic; acceptable, but inconsistent.

---

## 7. Missing-feature analysis (UX gaps, not bugs)

| Gap | Note | Suggested priority |
|---|---|---|
| **Shareable config link** | Today config travels only as a downloaded JSON file. A URL/permalink (config encoded in the link) would fit the "no backend" model and ease sharing with colleagues. | Medium |
| **Computed score/total** | Category weights are display-only — no summed score. Users assigning weights may expect a calculated total. Clarify intent or add. | Medium |
| **Localized legal/help** | See Finding 4. | Medium (legal) |
| **CSV export** | XLSX exists; a plain CSV option is cheap and useful for import elsewhere. | Low |
| **Dark mode** | `prefers-reduced-motion` is respected; no dark theme. | Low |

The core generator workflow (criteria → scales → header/footer → preview → multi-format export) is
**complete and coherent**. No essential feature is absent.

---

## 8. Code review — general

- ✅ Clear module separation (data / storage / ordering / scale-utils / export/* / ui/*). Strict TS.
- ✅ Undo/redo with labeled history; schema migrations; defensive `localStorage` try/catch.
- ✅ Test coverage: unit (`storage`, `content-data`, `config-order`, `scale-utils`, `export`, …) +
  Playwright e2e.
- 🔵 `src/ui/templates.ts` is very large (~63 KB). Not a defect; consider splitting per-section for
  maintainability.
- 🔵 `tsconfig` sets `jsx: react-jsx` though the app is framework-free — harmless, slightly
  misleading.

---

## 9. Prioritized findings

| # | Sev | Dimension | Finding | Anchor |
|---|---|---|---|---|
| 1 | 🔴 | Release | Supplied preview is a stale build (schema v3, no switcher) ≠ current `stage`. Redeploy before sign-off. | preview vs `src/storage.ts:12` |
| 2 | 🟡 | i18n/UX | Language switcher hidden ≤ 900 px — no language change on phones/portrait tablets. *(fixed)* | `src/app.css` |
| 3 | 🟡 | i18n | Footer nav links hardcoded German in all languages. | `src/ui/templates.ts` footer |
| 4 | 🟡 | i18n/Legal | Help/About/Impressum/Datenschutz German-only. | `content/*.md` |
| 5 | 🟡 | i18n | Traffic-light labels `Grün/Gelb/Rot` leak into all languages + exports. | `src/scale-utils.ts:16,44` |
| 6 | 🟡 | Security | CSV/XLSX formula injection — unescaped `= + - @` cell prefixes. | `src/export/export-xlsx.ts:31-34` |
| 7 | 🟡 | i18n | XLSX headers/sheet/filename hardcoded German. | `src/export/export-xlsx.ts:27,42,48` |
| 8 | 🔵 | a11y/i18n | Tablist + footer `aria-label` hardcoded German. | `src/ui/templates.ts` |
| 9 | 🔵 | Perf | `html2canvas` (~196 KB) bundled in PDF chunk, likely unused. | via `jspdf` |
| 10 | 🔵 | i18n | "Buy me a coffee"/"GitHub" labels outside locale dict. | `src/ui/templates.ts` |

---

## 10. Recommended remediation order (for a follow-up session)

1. **Redeploy `stage`** so the preview matches the code (unblocks honest review).
2. **i18n cleanup batch** (Findings 3, 5, 7, 8, 10) — move all hardcoded strings into locale dicts;
   derive traffic-light labels from locale/`colors`.
3. **Mobile language switcher** (Finding 2) — surface the control below 900 px.
4. **Legal-page localization** (Finding 4) — at minimum Impressum + Datenschutz.
5. **Formula-injection escape** (Finding 6) in `bodyCell()`; verify DOCX/ODT.
6. **Bundle trim** (Finding 9) — confirm + drop `html2canvas`.
7. Consider shareable-config-link and computed-score features (Section 7).

---

*Validation performed read-only against `stage`. No source/config files were modified; the only new
file is this report.*
