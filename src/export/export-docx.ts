import {
  Document, Packer, Paragraph, HeadingLevel, TextRun
} from 'docx';

import type { ExportRow, FooterFields, FooterFieldId, HeaderData, PrintMode, Scale } from '@/types';
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
  const safeLabel = label.trim() || strings.kopfdaten.fallbackField;
  const valueStr = value || '____________________________________';
  return new Paragraph({
    children: [
      new TextRun({ text: `${safeLabel}: `, bold: true }),
      new TextRun({ text: valueStr, underline: { type: 'single' } })
    ],
    spacing: { after: 80 }
  });
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade }
  ];
}

export async function exportDOCX(rows: ExportRow[], title: string, header: HeaderData, footerFields: FooterFields, mode: PrintMode = 'full') {
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 }
    }),
    ...header.fields.map((field) => headerLine(field.label, field.value)),
    new Paragraph({ text: '' })
  ];

  // Group rows by category
  const groups = new Map<string, { title: string; scale: Scale | null; items: ExportRow[] }>();
  rows.forEach((r) => {
    if (!groups.has(r.categoryId)) groups.set(r.categoryId, { title: r.category, scale: r.scale, items: [] });
    groups.get(r.categoryId)!.items.push(r);
  });

  let counter = 0;
  groups.forEach(({ title, scale, items }) => {
    children.push(new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }));
    const opts = scaleOptions(scale);
    if (mode === 'full' && opts.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: opts.join('     '), bold: true })],
        spacing: { after: 80 }
      }));
    }
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
        if (opts.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: opts.map(() => '☐').join('     ') })],
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
  for (let i = 0; i < 5; i++) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '____________________________________________________________________' })],
      spacing: { after: 80 }
    }));
  }

  const enabledFooterFields = footerFieldOptions().filter(({ id }) => footerFields[id]);
  if (enabledFooterFields.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: enabledFooterFields.map(({ label }) => `${label}: ____________________`).join('     '),
        bold: true
      })],
      spacing: { before: 200, after: 80 }
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
