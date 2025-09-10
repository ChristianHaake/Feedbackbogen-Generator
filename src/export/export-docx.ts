import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun } from 'docx';
import type { ExportRow } from '@/types';

export async function exportDOCX(rows: ExportRow[]) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Bewertungsbogen',
            heading: HeadingLevel.TITLE
          }),
          new Paragraph({ text: new Date().toLocaleString(), spacing: { after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: ['Kategorie', 'Kriterium', 'Beschreibung', 'Skala'].map(
                  (t) =>
                    new TableCell({
                      children: [new Paragraph({ text: t, alignment: AlignmentType.LEFT })]
                    })
                )
              }),
              ...rows.map(
                (r) =>
                  new TableRow({
                    children: [r.category, r.item, r.description || '', r.scaleLabel].map(
                      (t) => new TableCell({ children: [new Paragraph({ children: [new TextRun(t)] })] })
                    )
                  })
              )
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbogen.docx';
  a.click();
  URL.revokeObjectURL(a.href);
}

