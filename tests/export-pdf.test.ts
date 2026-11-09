import fs from 'node:fs';
import path from 'node:path';

import { PDFDocument, PDFPage, type PDFFont } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFillablePDFBlob, createPDFBlob } from '@/export/export-pdf-fillable';
import { strings } from '@/strings';
import type { ExportRow, FooterFields, HeaderData } from '@/types';

const header: HeaderData = { fields: [] };
const footer: FooterFields = { date: false, signature: false, grade: false };
const row: ExportRow = { categoryId: 'general', category: 'ALLGEMEIN', item: 'Kriterium', scale: null, itemId: 'item', number: 1 };
type DrawnText = { text: string; page: string; x: number; y: number; width: number; size: number; pageWidth: number; pageHeight: number };
let drawn: DrawnText[];

beforeEach(() => {
  drawn = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const name = path.basename(url);
    if (!['FeedbackSans-Regular.ttf', 'FeedbackSans-Bold.ttf'].includes(name)) throw new Error(`Unexpected font URL: ${url}`);
    return new Response(new Uint8Array(fs.readFileSync(path.resolve('assets/fonts', name))));
  }));
  const drawText = PDFPage.prototype.drawText;
  vi.spyOn(PDFPage.prototype, 'drawText').mockImplementation(function (this: PDFPage, text, options) {
    const { x = 0, y = 0, size = 24, font } = options ?? {};
    drawn.push({ text, page: this.ref.toString(), x, y, width: (font as PDFFont).widthOfTextAtSize(text, size), size, pageWidth: this.getWidth(), pageHeight: this.getHeight() });
    return drawText.call(this, text, options);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function expectTextInsideMargins() {
  const content = drawn.filter(({ text }) => text && text !== strings.watermark);
  expect(content.length).toBeGreaterThan(0);
  for (const line of content) {
    expect(line.x, line.text).toBeGreaterThanOrEqual(62 - 0.01);
    expect(line.x + line.width, line.text).toBeLessThanOrEqual(line.pageWidth - 62 + 0.01);
    expect(line.y, line.text).toBeGreaterThanOrEqual(56 - 0.01);
    expect(line.y, line.text).toBeLessThanOrEqual(line.pageHeight - 56 + 0.01);
  }
}

describe('PDF pagination and embedded fonts', () => {
  it('splits a 1997-character unbroken criterion across pages without losing text', async () => {
    const item = 'W'.repeat(1997);
    const blob = await createPDFBlob([{ ...row, item }], 'Feedbackbogen', header, footer);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());

    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(drawn.filter(({ text }) => /^W+$/.test(text)).map(({ text }) => text).join('')).toBe(item);
    expectTextInsideMargins();
  }, 15_000);

  it('paginates a long document title followed by all 50 header fields', async () => {
    const title = 'W'.repeat(2000);
    const fields = Array.from({ length: 50 }, (_, index) => ({ id: `field_${index}`, label: `Feld ${index}`, value: `Wert ${index}` }));
    const blob = await createPDFBlob([row], title, { fields }, footer);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());

    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(drawn.filter(({ text }) => /^W+$/.test(text)).map(({ text }) => text).join('')).toBe(title);
    for (const field of fields) {
      expect(drawn.some(({ text }) => text === `${field.label}:`)).toBe(true);
      expect(drawn.some(({ text }) => text === field.value)).toBe(true);
    }
    expectTextInsideMargins();
  }, 15_000);

  it('paginates 50 weighted categories and every long scoring-summary title', async () => {
    const weighted = Array.from({ length: 50 }, (_, index) => ({ ...row, categoryId: `category_${index}`, category: `Kategorie ${index} ${'Langer Titel '.repeat(18).trim()}`, itemId: `item_${index}`, weight: 2 }));
    const blob = await createPDFBlob(weighted, 'Bewertungsbogen', header, footer);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    const summary = drawn.filter(({ text }) => text === strings.labels.scoreSummaryTitle.toUpperCase());

    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(summary.length).toBeGreaterThan(1);
    for (let index = 0; index < 50; index++) {
      expect(drawn.some(({ text }) => text.startsWith(`Kategorie ${index} `))).toBe(true);
    }
    expect(drawn.some(({ text }) => text === strings.labels.scoreTotalResult(100))).toBe(true);
    expectTextInsideMargins();
  }, 15_000);

  it('keeps a following criterion below every bold line on the same page', async () => {
    const item = 'WWWW iiiii '.repeat(200).slice(0, 1799);
    const blob = await createPDFBlob([{ ...row, item }, { ...row, itemId: 'next', item: 'NEXT_SENTINEL', number: 2 }], 'Feedbackbogen', header, footer);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    const next = drawn.find(({ text }) => text === 'NEXT_SENTINEL')!;
    expect(next).toBeDefined();
    const pages = pdf.getPages().map((page) => page.ref.toString());
    const itemLines = drawn.filter(({ text }) => /^[Wi ]+$/.test(text) && text.trim());
    expect(itemLines.map(({ text }) => text).join(' ').replace(/\s+/g, ' ').trim()).toBe(item.trim());
    for (const line of itemLines) {
      expect(pages.indexOf(line.page)).toBeLessThanOrEqual(pages.indexOf(next.page));
      if (line.page === next.page) expect(line.y).toBeGreaterThanOrEqual(next.y + 12);
    }
    expectTextInsideMargins();
  }, 15_000);

  it('separates ordinary PDF output from editable header and rating fields', async () => {
    const fields = { fields: [{ id: 'name', label: 'Name', value: 'Łukasz 王 \u{1F642}' }] };
    const ordinary = await PDFDocument.load(await (await createPDFBlob([row], 'Feedbackbogen', fields, footer)).arrayBuffer());
    expect(ordinary.getForm().getFields()).toHaveLength(0);
    expect(drawn.some(({ text }) => text === fields.fields[0].value)).toBe(true);

    const editable = await PDFDocument.load(await (await createFillablePDFBlob([row], 'Feedbackbogen', fields, footer)).arrayBuffer());
    const names = editable.getForm().getFields().map((field) => field.getName());
    const nameField = names.find((name) => name.includes('header_name'))!;
    expect(nameField).toBeDefined();
    expect(names.some((name) => name.includes('rating_general_1'))).toBe(true);
    expect(editable.getForm().getTextField(nameField).getText()).toBe(fields.fields[0].value);
    expectTextInsideMargins();
  }, 15_000);

  it('rejects unsupported Arabic characters with an explicit error', async () => {
    await expect(createPDFBlob([{ ...row, item: 'Nicht unterstützt: \u0639' }], 'Feedbackbogen', header, footer)).rejects.toMatchObject({
      name: 'UnsupportedCharactersError',
      message: expect.stringContaining('\u0639'),
    });
  }, 15_000);
});
