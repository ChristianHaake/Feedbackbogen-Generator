import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';

import { categoryHeadingText, downloadBlob, groupRows, scaleOptions } from '@/export/export-utils';
import { strings } from '@/strings';
import type { ExportRow, FooterFields, FooterFieldId, HeaderData, PrintMode, Scale } from '@/types';

const pageWidth = 595.28;
const pageHeight = 841.89;
const marginX = 62;
const marginTop = 56;
const marginBottom = 56;
const contentWidth = pageWidth - marginX * 2;
const bottomY = pageHeight - marginBottom;

const colors = {
  black: rgb(17 / 255, 17 / 255, 17 / 255),
  headingText: rgb(34 / 255, 34 / 255, 34 / 255),
  labelText: rgb(51 / 255, 51 / 255, 51 / 255),
  mutedText: rgb(136 / 255, 136 / 255, 136 / 255),
  watermark: rgb(170 / 255, 170 / 255, 170 / 255),
  border: rgb(68 / 255, 68 / 255, 68 / 255),
  lightBorder: rgb(215 / 255, 219 / 255, 224 / 255),
  rowBorder: rgb(225 / 255, 228 / 255, 232 / 255),
  categoryFill: rgb(238 / 255, 241 / 255, 244 / 255),
  scaleFill: rgb(247 / 255, 248 / 255, 250 / 255),
  rowFill: rgb(251 / 255, 251 / 255, 252 / 255),
  white: rgb(1, 1, 1)
};

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
};
type FillableContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  form: ReturnType<PDFDocument['getForm']>;
  nextFieldId: number;
};

export async function createFillablePDFBlob(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setCreator('Feedbackbogen-Generator');
  pdfDoc.setProducer('Feedbackbogen-Generator');

  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  };
  const ctx: FillableContext = {
    pdfDoc,
    page: pdfDoc.addPage([pageWidth, pageHeight]),
    fonts,
    form: pdfDoc.getForm(),
    nextFieldId: 1
  };
  let y = marginTop;

  const addPage = () => {
    ctx.page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = marginTop;
  };
  const ensureSpace = (height: number) => {
    if (y + height > bottomY) addPage();
  };

  y = drawTitle(ctx, title, y);
  y = drawHeaderFields(ctx, header, y);

  if (rows.length === 0) {
    ensureSpace(42);
    drawCenteredText(ctx, strings.labels.previewEmpty, y + 24, 10, ctx.fonts.italic, colors.mutedText);
    y += 52;
  } else {
    groupRows(rows).forEach((group) => {
      const headingHeight = categoryHeadingHeight();
      const scaleHeight = mode === 'full' && group.scale ? scaleHeaderHeight(ctx, group.scale) : 0;

      ensureSpace(headingHeight + scaleHeight + 34);
      y = drawCategoryHeading(ctx, categoryHeadingText(group.title, group.weight), y);
      if (mode === 'full' && group.scale) y = drawScaleHeader(ctx, group.scale, y);

      group.items.forEach((row, index) => {
        const rowHeight = itemRowHeight(ctx, row, group.scale, mode);
        if (y + rowHeight > bottomY) {
          addPage();
          y = drawCategoryHeading(ctx, categoryHeadingText(group.title, group.weight), y);
          if (mode === 'full' && group.scale) y = drawScaleHeader(ctx, group.scale, y);
        }
        y = drawItemRow(ctx, row, group.scale, mode, row.number, y, index % 2 === 1, rowHeight);
      });
      y += 18;
    });
  }

  const feedbackTopGap = rows.length > 0 ? 18 : 0;
  ensureSpace(feedbackTopGap + 128);
  y += feedbackTopGap;
  y = drawFeedback(ctx, y);

  if (footerFieldOptions().some(({ id }) => footerFields[id])) {
    const footerTopGap = 14;
    const footerHeight = 24;
    const footerY = bottomY - footerHeight;
    if (y + footerTopGap > footerY) addPage();
    drawFooterFields(ctx, footerFields, footerY);
  }

  drawWatermarks(ctx);
  ctx.form.updateFieldAppearances(ctx.fonts.regular);

  const bytes = await pdfDoc.save({ useObjectStreams: false, updateFieldAppearances: true });
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: 'application/pdf' });
}

export async function exportFillablePDF(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
) {
  downloadBlob(await createFillablePDFBlob(rows, title, header, footerFields, mode), 'bewertungsbogen-ausfuellbar.pdf');
}

function drawTitle(ctx: FillableContext, title: string, y: number): number {
  const lines = splitText(ctx, title, contentWidth, 21, ctx.fonts.bold);
  lines.forEach((line, index) => drawText(ctx, line, marginX, y + index * 24, 21, ctx.fonts.bold, colors.black));
  const lineY = y + lines.length * 24 + 7;
  drawLine(ctx, marginX, lineY, pageWidth - marginX, lineY, 1.2, colors.headingText);
  return lineY + 24;
}

function drawHeaderFields(ctx: FillableContext, header: HeaderData, y: number): number {
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  const rowHeight = 24;

  header.fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = marginX + column * (columnWidth + columnGap);
    const rowY = y + row * rowHeight;
    const label = `${field.label.trim() || strings.kopfdaten.fallbackField}:`;
    const labelText = fitText(ctx, label, Math.min(columnWidth * 0.45, 92), 10, ctx.fonts.bold);

    drawText(ctx, labelText, x, rowY + 12, 10, ctx.fonts.bold, colors.labelText);
    const labelWidth = Math.min(textWidth(labelText, 10, ctx.fonts.bold) + 7, columnWidth * 0.56);
    const lineX = x + labelWidth;
    drawLine(ctx, lineX, rowY + 14, x + columnWidth, rowY + 14, 0.7, colors.border);
    addTextField(ctx, `header_${field.id || index}`, lineX, rowY + 1, x + columnWidth - lineX, 17, field.value);
  });

  return y + Math.ceil(header.fields.length / 2) * rowHeight + 22;
}

function categoryHeadingHeight(): number {
  return 25;
}

function drawCategoryHeading(ctx: FillableContext, title: string, y: number): number {
  const height = categoryHeadingHeight();
  drawRect(ctx, marginX, y, contentWidth, height, colors.categoryFill, colors.lightBorder, 0.6);
  drawText(ctx, title.toUpperCase(), marginX + 7, y + 16, 10, ctx.fonts.bold, colors.headingText);
  return y + height;
}

function scaleHeaderHeight(ctx: FillableContext, scale: Scale): number {
  const labelWidth = scaleOptionWidth(scale);
  const fontSize = scale.kind === 'numeric' ? 7.5 : 8;
  const maxLines = Math.max(
    ...scaleOptions(scale).map((label) => splitText(ctx, label, labelWidth, fontSize, ctx.fonts.bold).length)
  );
  return Math.max(25, maxLines * 10 + 12);
}

function drawScaleHeader(ctx: FillableContext, scale: Scale, y: number): number {
  const height = scaleHeaderHeight(ctx, scale);
  const { scaleX, scaleWidth, gap } = scaleLayout(scale);
  const options = scaleOptions(scale);
  const optionWidth = scaleWidth / options.length;
  const fontSize = scale.kind === 'numeric' ? 7.5 : 8;

  drawRect(ctx, marginX, y, contentWidth, height, colors.scaleFill, colors.lightBorder, 0.6);
  options.forEach((label, index) => {
    const centerX = scaleX + index * optionWidth + optionWidth / 2;
    const lines = splitText(ctx, label, Math.max(12, optionWidth - gap), fontSize, ctx.fonts.bold);
    const firstY = y + height / 2 - ((lines.length - 1) * 9) / 2 + 3;
    lines.forEach((line, lineIndex) => drawCenteredText(ctx, line, firstY + lineIndex * 9, fontSize, ctx.fonts.bold, colors.headingText, centerX));
  });

  return y + height;
}

function itemRowHeight(ctx: FillableContext, row: ExportRow, scale: Scale | null, mode: PrintMode): number {
  const labelWidth = mode === 'checklist' ? contentWidth - 32 : scaleLayout(scale).labelWidth - 28;
  const lines = splitText(ctx, row.item, labelWidth, 10, ctx.fonts.regular);
  return Math.max(34, lines.length * 13 + 16);
}

function drawItemRow(
  ctx: FillableContext,
  row: ExportRow,
  scale: Scale | null,
  mode: PrintMode,
  number: number,
  y: number,
  shaded: boolean,
  height: number
): number {
  if (shaded) drawRect(ctx, marginX, y, contentWidth, height, colors.rowFill);
  drawLine(ctx, marginX, y + height, marginX + contentWidth, y + height, 0.4, colors.rowBorder);

  if (mode === 'checklist') {
    addCheckBox(ctx, `checklist_${row.categoryId}_${number}`, marginX + 8, y + 12, 9);
    const lines = splitText(ctx, row.item, contentWidth - 34, 10, ctx.fonts.regular);
    lines.forEach((line, index) => drawText(ctx, line, marginX + 25, y + 20 + index * 13, 10, ctx.fonts.regular, colors.black));
    return y + height;
  }

  const layout = scaleLayout(scale);
  drawText(ctx, `${number}.`, marginX + 8, y + 16, 10, ctx.fonts.regular, colors.mutedText);
  const lines = splitText(ctx, row.item, layout.labelWidth - 28, 10, ctx.fonts.bold);
  lines.forEach((line, index) => drawText(ctx, line, marginX + 28, y + 16 + index * 13, 10, ctx.fonts.bold, colors.black));

  if (scale) {
    drawScaleControls(ctx, scale, layout.scaleX, layout.scaleWidth, y, height, `scale_${row.categoryId}_${number}`);
  } else {
    const fieldY = y + Math.max(8, height - 25);
    drawLine(ctx, layout.scaleX, y + height - 12, marginX + contentWidth - 8, y + height - 12, 0.7, colors.border);
    addTextField(ctx, `rating_${row.categoryId}_${number}`, layout.scaleX, fieldY, marginX + contentWidth - 8 - layout.scaleX, 17);
  }

  return y + height;
}

function drawScaleControls(
  ctx: FillableContext,
  scale: Scale,
  x: number,
  width: number,
  y: number,
  rowHeight: number,
  fieldName: string
) {
  const options = scaleOptions(scale);
  const optionWidth = width / options.length;
  const size = scale.kind === 'numeric' ? 8 : 9;
  const boxY = y + rowHeight / 2 - size / 2;
  const radio = ctx.form.createRadioGroup(uniqueFieldName(ctx, fieldName));
  radio.enableOffToggling();
  radio.enableMutualExclusion();

  options.forEach((label, index) => {
    const boxX = x + index * optionWidth + optionWidth / 2 - size / 2;
    radio.addOptionToPage(`${index}_${safeFieldName(label)}`, ctx.page, {
      x: boxX - 1,
      y: toPdfY(boxY - 1, size + 2),
      width: size + 2,
      height: size + 2,
      borderWidth: 0.8,
      borderColor: colors.labelText,
      backgroundColor: colors.white
    });
  });
  radio.clear();
}

function addCheckBox(ctx: FillableContext, name: string, x: number, y: number, size: number) {
  const field = ctx.form.createCheckBox(uniqueFieldName(ctx, name));
  field.uncheck();
  field.addToPage(ctx.page, {
    x: x - 1,
    y: toPdfY(y - 1, size + 2),
    width: size + 2,
    height: size + 2,
    borderWidth: 0.8,
    borderColor: colors.labelText,
    backgroundColor: colors.white
  });
}

function drawFeedback(ctx: FillableContext, y: number): number {
  drawText(ctx, strings.kopfdaten.feedback, marginX, y, 11, ctx.fonts.bold, colors.black);
  drawLine(ctx, marginX, y + 6, marginX + contentWidth, y + 6, 0.8, colors.border);
  y += 18;
  const fieldY = y - 3;

  for (let index = 0; index < 5; index++) {
    drawLine(ctx, marginX, y + 18, marginX + contentWidth, y + 18, 0.7, colors.border);
    y += 18;
  }
  addTextField(ctx, 'feedback', marginX, fieldY, contentWidth, 92, '', true, 10);
  return y + 18;
}

function drawFooterFields(ctx: FillableContext, footerFields: FooterFields, y: number) {
  const enabled = footerFieldOptions().filter(({ id }) => footerFields[id]);
  if (enabled.length === 0) return;

  const gap = 18;
  const fieldWidth = (contentWidth - gap * (enabled.length - 1)) / enabled.length;
  enabled.forEach(({ id, label }, index) => {
    const x = marginX + index * (fieldWidth + gap);
    const labelText = `${label}:`;
    drawText(ctx, labelText, x, y + 12, 10, ctx.fonts.bold, colors.labelText);
    const lineX = x + Math.min(textWidth(labelText, 10, ctx.fonts.bold) + 7, fieldWidth * 0.55);
    drawLine(ctx, lineX, y + 14, x + fieldWidth, y + 14, 0.7, colors.border);
    addTextField(ctx, `footer_${id}`, lineX, y + 1, x + fieldWidth - lineX, 17);
  });
}

function addTextField(
  ctx: FillableContext,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  value = '',
  multiline = false,
  fontSize = 9
) {
  if (width <= 0 || height <= 0) return;
  const field = ctx.form.createTextField(uniqueFieldName(ctx, name));
  field.disableReadOnly();
  field.setText(value);
  if (multiline) field.enableMultiline();
  else field.disableMultiline();
  field.addToPage(ctx.page, {
    x,
    y: toPdfY(y, height),
    width,
    height,
    borderWidth: 0,
    textColor: colors.black,
    font: ctx.fonts.regular
  });
  field.setFontSize(fontSize);
}

function drawWatermarks(ctx: FillableContext) {
  ctx.pdfDoc.getPages().forEach((page) => {
    const text = strings.watermark;
    page.drawText(text, {
      x: pageWidth - 18 - textWidth(text, 7, ctx.fonts.regular),
      y: pageHeight - (pageHeight - 14),
      size: 7,
      font: ctx.fonts.regular,
      color: colors.watermark
    });
  });
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade }
  ];
}

function scaleLayout(scale: Scale | null): { labelWidth: number; scaleX: number; scaleWidth: number; gap: number } {
  const gap = scale?.kind === 'numeric' ? 9 : 14;
  const labelWidth = scale?.kind === 'numeric' ? contentWidth * 0.46 : contentWidth * 0.42;
  const scaleX = marginX + labelWidth + gap;
  const scaleWidth = contentWidth - labelWidth - gap - 8;
  return { labelWidth, scaleX, scaleWidth, gap };
}

function scaleOptionWidth(scale: Scale): number {
  const { scaleWidth } = scaleLayout(scale);
  return scaleWidth / scaleOptions(scale).length;
}

function drawText(ctx: FillableContext, text: string, x: number, baselineY: number, size: number, font: PDFFont, color = colors.black) {
  ctx.page.drawText(text, { x, y: pageHeight - baselineY, size, font, color });
}

function drawCenteredText(
  ctx: FillableContext,
  text: string,
  baselineY: number,
  size: number,
  font: PDFFont,
  color = colors.black,
  centerX = pageWidth / 2
) {
  drawText(ctx, text, centerX - textWidth(text, size, font) / 2, baselineY, size, font, color);
}

function drawLine(ctx: FillableContext, x1: number, y1: number, x2: number, y2: number, thickness: number, color = colors.black) {
  ctx.page.drawLine({
    start: { x: x1, y: pageHeight - y1 },
    end: { x: x2, y: pageHeight - y2 },
    thickness,
    color
  });
}

function drawRect(
  ctx: FillableContext,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: ReturnType<typeof rgb>,
  border?: ReturnType<typeof rgb>,
  borderWidth = 0
) {
  ctx.page.drawRectangle({
    x,
    y: toPdfY(y, height),
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth
  });
}

function splitText(ctx: FillableContext, text: string, width: number, fontSize: number, font: PDFFont): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, fontSize, font) <= width) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = fitLongWord(word, width, fontSize, font, lines);
  });

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

function fitLongWord(word: string, width: number, fontSize: number, font: PDFFont, lines: string[]): string {
  if (textWidth(word, fontSize, font) <= width) return word;

  let current = '';
  for (const char of word) {
    const candidate = `${current}${char}`;
    if (textWidth(candidate, fontSize, font) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = char;
    }
  }
  return current;
}

function fitText(ctx: FillableContext, text: string, width: number, fontSize: number, font: PDFFont): string {
  if (textWidth(text, fontSize, font) <= width) return text;
  let out = text;
  while (out.length > 1 && textWidth(`${out}...`, fontSize, font) > width) out = out.slice(0, -1);
  return `${out}...`;
}

function textWidth(text: string, size: number, font: PDFFont): number {
  return font.widthOfTextAtSize(text, size);
}

function toPdfY(topY: number, height: number): number {
  return pageHeight - topY - height;
}

function uniqueFieldName(ctx: FillableContext, name: string): string {
  return `${ctx.nextFieldId++}_${safeFieldName(name)}`;
}

function safeFieldName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
}
