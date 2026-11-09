# Feedback Sans

Local PDF font for Feedbackbogen-Generator. All font sources are licensed under SIL Open Font License 1.1. Distribute the three adjacent original LICENSE.txt files with the derived fonts. The derived family is renamed Feedback Sans; no original reserved family name is used for the derivative family.

Sources:
- @fontsource-variable/inter@5.2.8, files/inter-latin-wght-normal.woff2 and files/inter-latin-ext-wght-normal.woff2, from the app's installed package. Upstream: https://github.com/rsms/inter. Copyright 2016 The Inter Project Authors.
- @fontsource/noto-sans-sc@5.3.1, files/noto-sans-sc-chinese-simplified-400-normal.woff2. Registry archive: https://registry.npmjs.org/@fontsource/noto-sans-sc/-/noto-sans-sc-5.3.1.tgz . Google Inc.; package original LICENSE preserved. Upstream https://github.com/notofonts/noto-cjk.
- @fontsource/noto-emoji@5.3.2, files/noto-emoji-emoji-400-normal.woff2. Registry archive: https://registry.npmjs.org/@fontsource/noto-emoji/-/noto-emoji-5.3.2.tgz . Copyright 2013 Google LLC. Upstream https://github.com/googlefonts/noto-emoji.

Reproduce:
1. `python3 -m pip install --target /tmp/fbg-font-tools fonttools==4.68.0 brotli==1.2.1`
2. Acquire exact npm archives with `npm pack @fontsource/noto-sans-sc@5.3.1 @fontsource/noto-emoji@5.3.2 --pack-destination /tmp`; extract only each listed package/files/font.woff2 into a local source directory, for example `/tmp/fbg-font-sources`. Sources used here were inspected/extracted from npm's content-addressed cache after npm pack --dry-run.
3. From the repository root, run `PYTHONPATH=/tmp/fbg-font-tools python3 scripts/generate-pdf-fonts.py /tmp/fbg-font-sources`.
4. Run `npm test -- --run tests/export-pdf.test.ts`. The generator also asserts the mixed-language sample glyphs.

Generation instantiates Inter at 400 and 700, scales Noto Sans SC to UPEM 2048, merges Latin/Latin Extended/CJK/emoji in that precedence, preserves horizontal shaping tables, drops unused vertical/BASE/STAT tables, renames family/styles and preserves source copyright/license information. CJK/emoji use weight 400 in both outputs. Output modified timestamps are fixed to the input creation timestamp.

Use a full TTF embedding for editable form fields. Supply `features: { locl: false }` to pdf-lib embedFont to prevent FontTools duplicate-localization substitutions selecting alternate glyphs absent from pdf-lib's full-font width table. Bold static labels can use subset:true; form font should use subset:false to retain characters entered later. WOFF2 requires subset:true to produce valid PDF font streams and is therefore unsuitable for straightforward full editable-font embedding.

Verified: 10,127 Unicode codepoints, both fonts support all text in all 15 localized JSON files, and mixed `Łukasz 王 🙂 äéçñ Œ œ ĳ — €` in static text and an editable text field. Saved/reloaded PDFs retain the exact field value. macOS sips rendering was visually inspected; static text/monochrome smile and CJK are present.

Limits: this is a practical font repertoire, not all Unicode. Arabic, Hebrew, Devanagari and Hangul are not covered. Preflight against the embedded font's character set and report unsupported characters rather than output glyph 0. Complex mixed-script/ZWJ shaping still depends on fontkit behavior; no promise of universal shaping. Editable PDF remains ~2.46 MB with one full font; embedding both full styles doubles that. Regular is shipped as TTF for full form embedding; Bold is shipped as TTF for static subset embedding.
