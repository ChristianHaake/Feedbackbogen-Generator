import {
  Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, TextRun, BorderStyle
} from 'docx';
import type { ExportRow, HeaderData } from '@/types';
import { strings } from '@/strings';

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const TABLE_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideH: BORDER, insideV: BORDER };

function headerCell(text: string) {
  return new TableCell({
    borders: TABLE_BORDERS,
    shading: { fill: 'E8E8E8' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
  });
}

function dataCell(text: string) {
  return new TableCell({
    borders: TABLE_BORDERS,
    children: [new Paragraph({ children: [new TextRun(text)] })]
  });
}

export async function exportDOCX(rows: ExportRow[], header: HeaderData) {
  const metaParagraphs: Paragraph[] = [];
  if (header.learner) {
    metaParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${strings.kopfdaten.learner}: `, bold: true }), new TextRun(header.learner)] }));
  }
  if (header.topic) {
    metaParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${strings.kopfdaten.topic}: `, bold: true }), new TextRun(header.topic)] }));
  }
  if (header.date) {
    metaParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${strings.kopfdaten.date}: `, bold: true }), new TextRun(header.date)], spacing: { after: 200 } }));
  }

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('Kategorie'),
        headerCell('Kriterium'),
        headerCell('Beschreibung'),
        headerCell('Gew.'),
        headerCell('Skala'),
        headerCell('Bewertung')
      ]
    }),
    ...rows.map((r) => new TableRow({
      children: [
        dataCell(r.category),
        dataCell(r.item),
        dataCell(r.description ?? ''),
        dataCell(String(r.weight)),
        dataCell(r.scaleLabel),
        dataCell('')
      ]
    }))
  ];

  const feedbackParagraphs: Paragraph[] = [
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: `${strings.kopfdaten.feedback}:`, bold: true })], spacing: { after: 100 } })
  ];
  if (header.feedback) {
    feedbackParagraphs.push(new Paragraph({ text: header.feedback }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Bewertungsbogen', heading: HeadingLevel.TITLE }),
        new Paragraph({
          children: [new TextRun({ text: new Date().toLocaleDateString('de-DE'), color: '666666' })],
          spacing: { after: 200 }
        }),
        ...metaParagraphs,
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        ...feedbackParagraphs
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbogen.docx';
  a.click();
  URL.revokeObjectURL(a.href);
}
