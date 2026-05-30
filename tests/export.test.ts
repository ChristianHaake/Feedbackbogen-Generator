import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createDOCXBlob } from '@/export/export-docx';
import { createODPBlob } from '@/export/export-odp';
import { createXLSXBlob } from '@/export/export-xlsx';
import type { ExportRow, FooterFields, HeaderData, NumericScale } from '@/types';

const scale: NumericScale = { id: 'points', kind: 'numeric', min: 1, max: 3 };
const header: HeaderData = { fields: [{ id: 'topic', label: 'Thema', value: 'Test & Qualität' }] };
const footerFields: FooterFields = { date: true, signature: true, grade: false };
const rows: ExportRow[] = [
  { categoryId: 'general', category: 'Allgemein', item: 'Inhalt vollständig', scale },
  { categoryId: 'general', category: 'Allgemein', item: 'Quellen korrekt', scale }
];

describe('document exports', () => {
  it('creates a styled XLSX workbook with frozen header and criteria', async () => {
    const blob = await createXLSXBlob(rows);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const workbookXml = await zip.file('xl/workbook.xml')!.async('text');
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('text');
    const sharedStringsXml = await zip.file('xl/sharedStrings.xml')!.async('text');
    const stylesXml = await zip.file('xl/styles.xml')!.async('text');

    expect(workbookXml).toContain('name="Feedbackbogen"');
    expect(sheetXml).toContain('<pane ySplit="1"');
    expect(sheetXml).toContain('width="72"');
    expect(sharedStringsXml).toContain('Kategorie');
    expect(sharedStringsXml).toContain('Inhalt vollständig');
    expect(sharedStringsXml).toContain('1 | 2 | 3');
    expect(stylesXml).toContain('FF1E88E5');
  });

  it('creates a DOCX with structured tables, feedback area and footer', async () => {
    const blob = await createDOCXBlob(rows, 'Feedbackbogen', header, footerFields);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')!.async('text');
    const footerXml = await zip.file('word/footer1.xml')!.async('text');

    expect(documentXml).toContain('<w:tbl>');
    expect(documentXml).toContain('Feedbackbogen');
    expect(documentXml).toContain('ALLGEMEIN');
    expect(documentXml).toContain('Inhalt vollständig');
    expect(documentXml).toContain('Feedback / Anmerkungen');
    expect(documentXml).toContain('Unterschrift: ____________________');
    expect(footerXml).toContain('Erstellt mit Feedbackbogen-Generator');
  });

  it('creates a paginated ODP with styled criteria and feedback slides', async () => {
    const manyRows = Array.from({ length: 9 }, (_, index) => ({
      ...rows[0],
      item: `Kriterium ${index + 1}`
    }));
    const blob = await createODPBlob(manyRows, 'Feedbackbogen', header);
    const archive = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(archive);
    const mimetype = await zip.file('mimetype')!.async('text');
    const contentXml = await zip.file('content.xml')!.async('text');
    const bytes = new Uint8Array(archive);
    const firstFilenameLength = bytes[26] + bytes[27] * 256;
    const firstFilename = new TextDecoder().decode(bytes.slice(30, 30 + firstFilenameLength));
    const parsedXml = new DOMParser().parseFromString(contentXml, 'application/xml');

    expect(mimetype).toBe('application/vnd.oasis.opendocument.presentation');
    expect(firstFilename).toBe('mimetype');
    expect(contentXml.match(/<draw:page /g)).toHaveLength(4);
    expect(contentXml).toContain('Allgemein (1/2)');
    expect(contentXml).toContain('Allgemein (2/2)');
    expect(contentXml).toContain('Test &amp; Qualität');
    expect(contentXml).toContain('Feedback / Anmerkungen');
    expect(contentXml).toContain('style:name="header-cell"');
    expect(parsedXml.querySelector('parsererror')).toBeNull();
  });
});
