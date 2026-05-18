import * as XLSX from 'xlsx';

import type { ExportRow, Scale } from '@/types';

function scaleLabel(scale: Scale | null): string {
  if (!scale) return '';
  switch (scale.kind) {
    case 'verbal': return scale.labels.join(' | ');
    case 'numeric': return `${scale.min}–${scale.max}`;
    case 'emoji': return scale.set.join(' ');
    case 'traffic': return 'Grün / Gelb / Rot';
    case 'percent': return '0–100 %';
  }
}

export function exportXLSX(rows: ExportRow[]) {
  const header = ['Kategorie', 'Kriterium', 'Skala', 'Bewertung'];
  const data = rows.map((r) => [r.category, r.item, scaleLabel(r.scale), '']);
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bewertungsbogen');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbogen.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}
