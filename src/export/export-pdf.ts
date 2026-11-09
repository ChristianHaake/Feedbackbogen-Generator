import { createPDFBlob } from '@/export/export-pdf-fillable';
import { downloadBlob } from '@/export/export-utils';
import { strings } from '@/strings';
import type { ExportRow, FooterFields, HeaderData, PrintMode } from '@/types';

export async function exportPDF(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
) {
  downloadBlob(
    await createPDFBlob(rows, title, header, footerFields, mode),
    strings.documentExport.fileNames.pdfPrint
  );
}
