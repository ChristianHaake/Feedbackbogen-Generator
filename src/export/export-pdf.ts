import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportRow } from '@/types';

export function exportPDF(rows: ExportRow[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.text('Bewertungsbogen', margin, margin);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), margin, margin + 16);

  autoTable(doc, {
    startY: margin + 32,
    head: [['Kategorie', 'Kriterium', 'Beschreibung', 'Skala']],
    body: rows.map((r) => [r.category, r.item, r.description || '', r.scaleLabel]),
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 180 },
      2: { cellWidth: 160 },
      3: { cellWidth: 80 }
    },
    margin: { left: margin, right: margin }
  });

  doc.save('bewertungsbogen.pdf');
}
