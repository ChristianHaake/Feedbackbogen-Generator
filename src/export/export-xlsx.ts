import * as XLSX from 'xlsx';
import type { ExportRow } from '@/types';

export function exportXLSX(rows: ExportRow[]) {
  const header = ['Kategorie', 'Kriterium', 'Beschreibung', 'Skala', 'Punkte', 'Notizen'];
  const data = rows.map((r) => [r.category, r.item, r.description || '', r.scaleLabel, '', '']);
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

