import {
  Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, TabStopType
} from 'docx';
import type { ExportRow, HeaderData, PrintMode, Scale } from '@/types';
import { strings } from '@/strings';

function scaleOptions(scale: Scale | null): string[] {
  if (!scale) return [];
  switch (scale.kind) {
    case 'verbal': return scale.labels;
    case 'numeric': {
      const out: string[] = [];
      for (let i = scale.min; i <= scale.max; i++) out.push(String(i));
      return out;
    }
    case 'emoji': return scale.set;
    case 'traffic': return ['Grün', 'Gelb', 'Rot'];
    case 'percent': return ['0 %', '25 %', '50 %', '75 %', '100 %'];
  }
}

function headerLine(label: string, value: string): Paragraph {
  const valueStr = value || '____________________________________';
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: valueStr, underline: value ? undefined : { type: 'single' } })
    ],
    spacing: { after: 80 }
  });
}

export async function exportDOCX(rows: ExportRow[], header: HeaderData, mode: PrintMode = 'full') {
  const children: Paragraph[] = [
    new Paragraph({
      text: mode === 'checklist' ? 'Bewertungscheckliste' : 'Bewertungsbogen',
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 }
    }),
    headerLine(strings.kopfdaten.learner, header.learner),
    headerLine(strings.kopfdaten.learngroup, header.learngroup),
    headerLine(strings.kopfdaten.topic, header.topic),
    headerLine(strings.kopfdaten.date, header.date),
    new Paragraph({ text: '' })
  ];

  // Group rows by category
  const groups = new Map<string, { title: string; items: ExportRow[] }>();
  rows.forEach((r) => {
    if (!groups.has(r.categoryId)) groups.set(r.categoryId, { title: r.category, items: [] });
    groups.get(r.categoryId)!.items.push(r);
  });

  let counter = 0;
  groups.forEach(({ title, items }) => {
    children.push(new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }));
    items.forEach((r) => {
      counter++;
      children.push(new Paragraph({
        children: [new TextRun({ text: `${counter}. ${r.item}`, bold: true })],
        spacing: { after: 60 }
      }));
      if (mode === 'checklist') {
        children.push(new Paragraph({
          children: [new TextRun({ text: '☐  erledigt' })],
          spacing: { after: 100 }
        }));
      } else {
        const opts = scaleOptions(r.scale);
        if (opts.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: opts.map((o) => `☐ ${o}`).join('     ') })],
            spacing: { after: 120 }
          }));
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: '____________________________________________' })],
            spacing: { after: 120 }
          }));
        }
      }
    });
  });

  // Feedback
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({
    children: [new TextRun({ text: strings.kopfdaten.feedback, bold: true })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 }
  }));
  if (header.feedback) {
    children.push(new Paragraph({ text: header.feedback, spacing: { after: 100 } }));
  }
  for (let i = 0; i < 5; i++) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '____________________________________________________________________' })],
      spacing: { after: 80 }
    }));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbogen.docx';
  a.click();
  URL.revokeObjectURL(a.href);
}
