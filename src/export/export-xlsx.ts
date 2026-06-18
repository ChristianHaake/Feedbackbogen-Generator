import writeExcelFile from 'write-excel-file/universal';
import type { Cell, SheetData } from 'write-excel-file/universal';

import { downloadBlob, scaleLabel } from '@/export/export-utils';
import { strings } from '@/strings';
import type { ExportRow } from '@/types';

const headerStyle = {
  backgroundColor: '#245DCC',
  fontWeight: 'bold' as const,
  textColor: '#FFFFFF',
  align: 'center' as const,
  alignVertical: 'center' as const,
  wrap: true
};

// Guard against CSV/spreadsheet formula injection: a cell whose text begins with
// =, +, -, @ (or a control char) is treated as a formula by Excel/Sheets/LibreOffice.
// User-authored content is escaped with a leading apostrophe so it stays literal text.
function sanitizeCellValue(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function bodyCell(value: string, shaded: boolean): Cell {
  return {
    value: sanitizeCellValue(value),
    alignVertical: 'top',
    backgroundColor: shaded ? '#F7F8FA' : undefined,
    wrap: true
  };
}

export async function createXLSXBlob(rows: ExportRow[]): Promise<Blob> {
  const data: SheetData = [
    strings.xlsx.headers.map((value) => ({ value, ...headerStyle })),
    ...rows.map((row, index) => {
      const shaded = index % 2 === 1;
      return [
        bodyCell(row.category, shaded),
        bodyCell(row.weight ? `${Math.round(row.weight)} %` : '', shaded),
        bodyCell(`${row.number}. ${row.item}`, shaded),
        bodyCell(scaleLabel(row.scale), shaded),
        bodyCell('', shaded)
      ];
    })
  ];
  return writeExcelFile(data, {
    sheet: strings.xlsx.sheetName,
    stickyRowsCount: 1,
    orientation: 'landscape',
    columns: [{ width: 28 }, { width: 14 }, { width: 72 }, { width: 40 }, { width: 18 }]
  }).toBlob();
}

export async function exportXLSX(rows: ExportRow[]) {
  downloadBlob(await createXLSXBlob(rows), strings.xlsx.fileName);
}
