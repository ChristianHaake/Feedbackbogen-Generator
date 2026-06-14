import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';

import { downloadBlob, groupRows, scaleOptions } from '@/export/export-utils';
import { strings } from '@/strings';
import type { ExportRow, FooterFieldId, FooterFields, HeaderData, PrintMode } from '@/types';

const contentWidth = 10440;
const border = { style: BorderStyle.SINGLE, size: 4, color: 'D5D9E0' };
const borders = { top: border, right: border, bottom: border, left: border };
const cellMargins = { top: 80, right: 100, bottom: 80, left: 100 };

function textParagraph(text: string, bold = false, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({
    children: [new TextRun({ text, bold })],
    alignment,
    spacing: { after: 0 }
  });
}

function cell(
  text: string,
  options: {
    bold?: boolean;
    width?: number;
    fill?: string;
    columnSpan?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {}
) {
  return new TableCell({
    children: [textParagraph(text, options.bold, options.alignment)],
    borders,
    columnSpan: options.columnSpan,
    margins: cellMargins,
    shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined
  });
}

function table(rows: TableRow[], columnWidths: number[]) {
  return new Table({
    rows,
    columnWidths,
    layout: TableLayoutType.FIXED,
    width: { size: contentWidth, type: WidthType.DXA }
  });
}

function headerTable(header: HeaderData): Table | null {
  if (header.fields.length === 0) return null;
  const width = contentWidth / 2;
  const rows: TableRow[] = [];
  for (let index = 0; index < header.fields.length; index += 2) {
    const rowFields = header.fields.slice(index, index + 2);
    while (rowFields.length < 2) rowFields.push({ id: '', label: '', value: '' });
    rows.push(
      new TableRow({
        cantSplit: true,
        children: rowFields.map((field) => {
          const label = field.label.trim() || strings.kopfdaten.fallbackField;
          return cell(`${label}: ${field.value || '________________________________'}`, { width });
        })
      })
    );
  }
  return table(rows, [width, width]);
}

function categoryTable(items: ExportRow[], category: string, mode: PrintMode): Table {
  const scale = items[0]?.scale ?? null;
  const options = mode === 'full' ? scaleOptions(scale) : [];
  const criterionWidth = mode === 'checklist' || options.length === 0 ? 8700 : 5400;
  const ratingWidth = mode === 'checklist' || options.length === 0 ? contentWidth - criterionWidth : 0;
  const optionWidth = options.length > 0 ? Math.floor((contentWidth - criterionWidth) / options.length) : 0;
  const columnWidths =
    options.length > 0 ? [criterionWidth, ...options.map(() => optionWidth)] : [criterionWidth, ratingWidth];

  const rows = [
    new TableRow({
      tableHeader: true,
      children: [cell(category.toUpperCase(), { bold: true, fill: 'E9EEF3', columnSpan: columnWidths.length })]
    }),
    new TableRow({
      tableHeader: true,
      children: [
        cell('Kriterium', { bold: true, fill: 'F7F8FA', width: criterionWidth }),
        ...(options.length > 0
          ? options.map((option) =>
              cell(option, { bold: true, fill: 'F7F8FA', width: optionWidth, alignment: AlignmentType.CENTER })
            )
          : [cell(mode === 'checklist' ? 'Erledigt' : 'Bewertung', { bold: true, fill: 'F7F8FA', width: ratingWidth })])
      ]
    })
  ];

  items.forEach((row, index) => {
    const fill = index % 2 === 1 ? 'FBFBFC' : undefined;
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          cell(`${index + 1}. ${row.item}`, { width: criterionWidth, fill }),
          ...(options.length > 0
            ? options.map(() => cell('☐', { width: optionWidth, fill, alignment: AlignmentType.CENTER }))
            : [cell('☐', { width: ratingWidth, fill, alignment: AlignmentType.CENTER })])
        ]
      })
    );
  });

  return table(rows, columnWidths);
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade }
  ];
}

function footerFieldsTable(footerFields: FooterFields): Table | null {
  const enabledFields = footerFieldOptions().filter(({ id }) => footerFields[id]);
  if (enabledFields.length === 0) return null;
  const width = Math.floor(contentWidth / enabledFields.length);
  return table(
    [
      new TableRow({
        cantSplit: true,
        children: enabledFields.map(({ label }) => cell(`${label}: ____________________`, { bold: true, width }))
      })
    ],
    enabledFields.map(() => width)
  );
}

export async function createDOCXBlob(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 180 } })
  ];
  const metadata = headerTable(header);
  if (metadata) children.push(metadata, new Paragraph({ text: '', spacing: { after: 120 } }));

  groupRows(rows).forEach((group) => {
    children.push(categoryTable(group.items, group.title, mode), new Paragraph({ text: '', spacing: { after: 120 } }));
  });

  if (rows.length === 0) {
    children.push(new Paragraph({ text: strings.labels.previewEmpty, spacing: { after: 180 } }));
  }

  children.push(
    new Paragraph({ text: strings.kopfdaten.feedback, heading: HeadingLevel.HEADING_2, spacing: { before: 120, after: 80 } }),
    table(
      Array.from(
        { length: 5 },
        () => new TableRow({ cantSplit: true, children: [cell(' ', { width: contentWidth })] })
      ),
      [contentWidth]
    )
  );

  const selectedFooterFields = footerFieldsTable(footerFields);
  if (selectedFooterFields) {
    children.push(new Paragraph({ text: '', spacing: { after: 120 } }), selectedFooterFields);
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720, footer: 360 } } },
        footers: {
          default: new Footer({
            children: [textParagraph(strings.watermark, false, AlignmentType.CENTER)]
          })
        },
        children
      }
    ]
  });
  return Packer.toBlob(doc);
}

export async function exportDOCX(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
) {
  downloadBlob(await createDOCXBlob(rows, title, header, footerFields, mode), 'bewertungsbogen.docx');
}
