import writeExcelFile from 'write-excel-file/universal';
import type { Cell, SheetData } from 'write-excel-file/universal';

import { downloadBlob, scaleLabel } from '@/export/export-utils';
import type { ExportRow } from '@/types';

const headerStyle = {
  backgroundColor: '#245DCC',
  fontWeight: 'bold' as const,
  textColor: '#FFFFFF',
  align: 'center' as const,
  alignVertical: 'center' as const,
  wrap: true
};

function bodyCell(value: string, shaded: boolean): Cell {
  return {
    value,
    alignVertical: 'top',
    backgroundColor: shaded ? '#F7F8FA' : undefined,
    wrap: true
  };
}

export async function createXLSXBlob(rows: ExportRow[]): Promise<Blob> {
  const data: SheetData = [
    ['Kategorie', 'Kriterium', 'Skala', 'Bewertung'].map((value) => ({ value, ...headerStyle })),
    ...rows.map((row, index) => {
      const shaded = index % 2 === 1;
      return [
        bodyCell(row.category, shaded),
        bodyCell(row.item, shaded),
        bodyCell(scaleLabel(row.scale), shaded),
        bodyCell('', shaded)
      ];
    })
  ];
  return writeExcelFile(data, {
    sheet: 'Feedbackbogen',
    stickyRowsCount: 1,
    orientation: 'landscape',
    columns: [{ width: 28 }, { width: 72 }, { width: 40 }, { width: 18 }]
  }).toBlob();
}

export async function exportXLSX(rows: ExportRow[]) {
  downloadBlob(await createXLSXBlob(rows), 'bewertungsbogen.xlsx');
}
