import { jsPDF } from 'jspdf';

import {
  categoryHeadingText,
  groupRows,
  weightedScoreSummary,
} from '@/export/export-utils';
import { scaleOptionLabels } from '@/scale-utils';
import { strings } from '@/strings';
import type {
  ExportRow,
  FooterFields,
  FooterFieldId,
  HeaderData,
  PrintMode,
  Scale,
} from '@/types';

const pageWidth = 595.28;
const pageHeight = 841.89;
const marginX = 62;
const marginTop = 56;
const marginBottom = 56;
const contentWidth = pageWidth - marginX * 2;
const bottomY = pageHeight - marginBottom;

type PdfDoc = jsPDF;

export function exportPDF(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  let y = marginTop;

  const addPage = () => {
    pdf.addPage();
    y = marginTop;
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottomY) addPage();
  };

  y = drawTitle(pdf, title, y);
  y = drawHeaderFields(pdf, header, y);

  if (rows.length === 0) {
    ensureSpace(42);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(10);
    pdf.text(strings.labels.previewEmpty, pageWidth / 2, y + 24, {
      align: 'center',
    });
    pdf.setTextColor(17, 17, 17);
    y += 52;
  } else {
    const groups = groupRows(rows);
    groups.forEach((group) => {
      const headingHeight = categoryHeadingHeight();
      const scaleHeight =
        mode === 'full' && group.scale
          ? scaleHeaderHeight(pdf, group.scale)
          : 0;

      ensureSpace(headingHeight + scaleHeight + 34);
      y = drawCategoryHeading(
        pdf,
        categoryHeadingText(group.title, group.weight),
        y
      );
      if (mode === 'full' && group.scale)
        y = drawScaleHeader(pdf, group.scale, y);

      group.items.forEach((row, index) => {
        const rowHeight = itemRowHeight(pdf, row, group.scale, mode);
        if (y + rowHeight > bottomY) {
          addPage();
          y = drawCategoryHeading(
            pdf,
            categoryHeadingText(group.title, group.weight),
            y
          );
          if (mode === 'full' && group.scale)
            y = drawScaleHeader(pdf, group.scale, y);
        }
        y = drawItemRow(
          pdf,
          row,
          group.scale,
          mode,
          row.number,
          y,
          index % 2 === 1,
          rowHeight
        );
      });
      y += 18;
    });
  }

  const feedbackTopGap = rows.length > 0 ? 18 : 0;
  const scoreSummary = weightedScoreSummary(rows);
  if (scoreSummary) {
    ensureSpace(scoreSummaryHeight(scoreSummary.groups.length));
    y = drawScoreSummary(pdf, scoreSummary, y);
  }
  ensureSpace(feedbackTopGap + 128);
  y += feedbackTopGap;
  y = drawFeedback(pdf, y);
  if (footerFieldOptions().some(({ id }) => footerFields[id])) {
    const footerTopGap = 14;
    const footerHeight = 24;
    const footerY = bottomY - footerHeight;
    if (y + footerTopGap > footerY) {
      addPage();
    }
    drawFooterFields(pdf, footerFields, footerY);
  }

  drawWatermarks(pdf);
  pdf.save(strings.documentExport.fileNames.pdfPrint);
}

function drawTitle(pdf: PdfDoc, title: string, y: number): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(21);
  pdf.setTextColor(17, 17, 17);
  const lines = split(pdf, title, contentWidth, 21);
  lines.forEach((line, index) => pdf.text(line, marginX, y + index * 24));
  const lineY = y + lines.length * 24 + 7;
  pdf.setDrawColor(34, 34, 34);
  pdf.setLineWidth(1.2);
  pdf.line(marginX, lineY, pageWidth - marginX, lineY);
  return lineY + 24;
}

function drawHeaderFields(pdf: PdfDoc, header: HeaderData, y: number): number {
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  const rowHeight = 24;

  pdf.setFontSize(10);
  header.fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = marginX + column * (columnWidth + columnGap);
    const rowY = y + row * rowHeight;
    const label = `${field.label.trim() || strings.kopfdaten.fallbackField}:`;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(51, 51, 51);
    const labelText = fitText(pdf, label, Math.min(columnWidth * 0.45, 92));
    pdf.text(labelText, x, rowY + 12);

    const labelWidth = Math.min(
      pdf.getTextWidth(labelText) + 7,
      columnWidth * 0.56
    );
    const lineX = x + labelWidth;
    const lineY = rowY + 14;
    pdf.setDrawColor(68, 68, 68);
    pdf.setLineWidth(0.7);
    pdf.line(lineX, lineY, x + columnWidth, lineY);

    if (field.value) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 17, 17);
      pdf.text(
        fitText(pdf, field.value, x + columnWidth - lineX - 4),
        lineX + 2,
        rowY + 11
      );
    }
  });

  return y + Math.ceil(header.fields.length / 2) * rowHeight + 22;
}

function categoryHeadingHeight(): number {
  return 25;
}

function drawCategoryHeading(pdf: PdfDoc, title: string, y: number): number {
  const height = categoryHeadingHeight();
  pdf.setFillColor(238, 241, 244);
  pdf.setDrawColor(209, 214, 220);
  pdf.setLineWidth(0.6);
  pdf.rect(marginX, y, contentWidth, height, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(34, 34, 34);
  pdf.text(title.toUpperCase(), marginX + 7, y + 16);
  return y + height;
}

function scaleHeaderHeight(pdf: PdfDoc, scale: Scale): number {
  const labelWidth = scaleOptionWidth(scale);
  const fontSize = scale.kind === 'numeric' ? 7.5 : 8;
  const maxLines = Math.max(
    ...scaleOptionLabels(scale).map(
      (label) => split(pdf, label, labelWidth, fontSize).length
    )
  );
  return Math.max(25, maxLines * 10 + 12);
}

function drawScaleHeader(pdf: PdfDoc, scale: Scale, y: number): number {
  const height = scaleHeaderHeight(pdf, scale);
  const { scaleX, scaleWidth, gap } = scaleLayout(scale);
  const options = scaleOptionLabels(scale);
  const optionWidth = scaleWidth / options.length;

  pdf.setFillColor(247, 248, 250);
  pdf.setDrawColor(215, 219, 224);
  pdf.setLineWidth(0.6);
  pdf.rect(marginX, y, contentWidth, height, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(scale.kind === 'numeric' ? 7.5 : 8);
  pdf.setTextColor(34, 34, 34);

  options.forEach((label, index) => {
    const centerX = scaleX + index * optionWidth + optionWidth / 2;
    const lines = split(
      pdf,
      label,
      Math.max(12, optionWidth - gap),
      scale.kind === 'numeric' ? 7.5 : 8
    );
    const firstY = y + height / 2 - ((lines.length - 1) * 9) / 2 + 3;
    lines.forEach((line, lineIndex) =>
      pdf.text(line, centerX, firstY + lineIndex * 9, { align: 'center' })
    );
  });

  return y + height;
}

function itemRowHeight(
  pdf: PdfDoc,
  row: ExportRow,
  scale: Scale | null,
  mode: PrintMode
): number {
  const labelWidth =
    mode === 'checklist'
      ? contentWidth - 32
      : scaleLayout(scale).labelWidth - 28;
  const lines = split(pdf, row.item, labelWidth, 10);
  return Math.max(34, lines.length * 13 + 16);
}

function drawItemRow(
  pdf: PdfDoc,
  row: ExportRow,
  scale: Scale | null,
  mode: PrintMode,
  number: number,
  y: number,
  shaded: boolean,
  height: number
): number {
  if (shaded) {
    pdf.setFillColor(251, 251, 252);
    pdf.rect(marginX, y, contentWidth, height, 'F');
  }
  pdf.setDrawColor(225, 228, 232);
  pdf.setLineWidth(0.4);
  pdf.line(marginX, y + height, marginX + contentWidth, y + height);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(17, 17, 17);

  if (mode === 'checklist') {
    drawCheckbox(pdf, marginX + 8, y + 12, 9);
    const lines = split(pdf, row.item, contentWidth - 34, 10);
    lines.forEach((line, index) =>
      pdf.text(line, marginX + 25, y + 20 + index * 13)
    );
    return y + height;
  }

  const layout = scaleLayout(scale);
  pdf.setTextColor(136, 136, 136);
  pdf.text(`${number}.`, marginX + 8, y + 16);

  pdf.setTextColor(17, 17, 17);
  pdf.setFont('helvetica', 'bold');
  const lines = split(pdf, row.item, layout.labelWidth - 28, 10);
  lines.forEach((line, index) =>
    pdf.text(line, marginX + 28, y + 16 + index * 13)
  );

  if (scale) {
    drawScaleBoxes(pdf, scale, layout.scaleX, layout.scaleWidth, y, height);
  } else {
    pdf.setDrawColor(68, 68, 68);
    pdf.setLineWidth(0.7);
    pdf.line(
      layout.scaleX,
      y + height - 12,
      marginX + contentWidth - 8,
      y + height - 12
    );
  }

  return y + height;
}

function drawScaleBoxes(
  pdf: PdfDoc,
  scale: Scale,
  x: number,
  width: number,
  y: number,
  rowHeight: number
) {
  const options = scaleOptionLabels(scale);
  const count = options.length;
  const optionWidth = width / count;
  const size = scale.kind === 'numeric' ? 8 : 9;
  const boxY = y + rowHeight / 2 - size / 2;

  for (let index = 0; index < count; index++) {
    const boxX = x + index * optionWidth + optionWidth / 2 - size / 2;
    drawCheckbox(pdf, boxX, boxY, size);
  }
}

function drawCheckbox(pdf: PdfDoc, x: number, y: number, size: number) {
  pdf.setDrawColor(51, 51, 51);
  pdf.setLineWidth(0.8);
  pdf.rect(x, y, size, size);
}

function drawFeedback(pdf: PdfDoc, y: number): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(17, 17, 17);
  pdf.text(strings.kopfdaten.feedback, marginX, y);
  pdf.setDrawColor(68, 68, 68);
  pdf.setLineWidth(0.8);
  pdf.line(marginX, y + 6, marginX + contentWidth, y + 6);
  y += 18;

  pdf.setLineWidth(0.7);
  for (let index = 0; index < 5; index++) {
    pdf.line(marginX, y + 18, marginX + contentWidth, y + 18);
    y += 18;
  }
  return y + 18;
}

function scoreSummaryHeight(groupCount: number): number {
  return 42 + groupCount * 18 + 34;
}

function drawScoreSummary(
  pdf: PdfDoc,
  summary: NonNullable<ReturnType<typeof weightedScoreSummary>>,
  y: number
): number {
  const height = scoreSummaryHeight(summary.groups.length);
  pdf.setFillColor(247, 248, 250);
  pdf.setDrawColor(209, 214, 220);
  pdf.setLineWidth(0.6);
  pdf.rect(marginX, y, contentWidth, height, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(34, 34, 34);
  pdf.text(strings.labels.scoreSummaryTitle.toUpperCase(), marginX + 9, y + 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  let rowY = y + 36;
  summary.groups.forEach((group) => {
    pdf.text(
      strings.labels.scoreCategoryResult(group.title, group.weight),
      marginX + 9,
      rowY
    );
    rowY += 18;
  });
  pdf.setFont('helvetica', 'bold');
  pdf.text(strings.labels.scoreTotalResult(summary.totalWeight), marginX + 9, rowY);
  rowY += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(102, 102, 102);
  pdf.text(strings.labels.scoreTotalHint, marginX + 9, rowY);
  pdf.setTextColor(17, 17, 17);
  return y + height + 16;
}

function drawFooterFields(pdf: PdfDoc, footerFields: FooterFields, y: number) {
  const enabled = footerFieldOptions().filter(({ id }) => footerFields[id]);
  if (enabled.length === 0) return;

  const gap = 18;
  const fieldWidth =
    (contentWidth - gap * (enabled.length - 1)) / enabled.length;
  enabled.forEach(({ label }, index) => {
    const x = marginX + index * (fieldWidth + gap);
    const labelText = `${label}:`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 51, 51);
    pdf.text(labelText, x, y + 12);
    const lineX =
      x + Math.min(pdf.getTextWidth(labelText) + 7, fieldWidth * 0.55);
    pdf.setDrawColor(68, 68, 68);
    pdf.setLineWidth(0.7);
    pdf.line(lineX, y + 14, x + fieldWidth, y + 14);
  });
}

function drawWatermarks(pdf: PdfDoc) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(170, 170, 170);
    pdf.text(strings.watermark, pageWidth - 18, pageHeight - 14, {
      align: 'right',
    });
  }
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade },
  ];
}

function scaleLayout(scale: Scale | null): {
  labelWidth: number;
  scaleX: number;
  scaleWidth: number;
  gap: number;
} {
  const gap = scale?.kind === 'numeric' ? 9 : 14;
  const labelWidth =
    scale?.kind === 'numeric' ? contentWidth * 0.46 : contentWidth * 0.42;
  const scaleX = marginX + labelWidth + gap;
  const scaleWidth = contentWidth - labelWidth - gap - 8;
  return { labelWidth, scaleX, scaleWidth, gap };
}

function scaleOptionWidth(scale: Scale): number {
  const { scaleWidth } = scaleLayout(scale);
  return scaleWidth / scaleOptionLabels(scale).length;
}

function split(
  pdf: PdfDoc,
  text: string,
  width: number,
  fontSize: number
): string[] {
  pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(text, width) as string[];
}

function fitText(pdf: PdfDoc, text: string, width: number): string {
  if (pdf.getTextWidth(text) <= width) return text;
  let out = text;
  while (out.length > 1 && pdf.getTextWidth(`${out}...`) > width)
    out = out.slice(0, -1);
  return `${out}...`;
}
