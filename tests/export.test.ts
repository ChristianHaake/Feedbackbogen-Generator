import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { createDOCXBlob } from '@/export/export-docx';
import { createODTBlob } from '@/export/export-odt';
import { createFillablePDFBlob } from '@/export/export-pdf-fillable';
import { createXLSXBlob } from '@/export/export-xlsx';
import type { ExportRow, FooterFields, HeaderData, NumericScale } from '@/types';

const scale: NumericScale = {
  id: 'points',
  label: 'Punkte',
  kind: 'numeric',
  defaultMin: 1,
  defaultMax: 3,
  minLimit: 0,
  maxLimit: 20,
  maxSteps: 11
};
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

  it('creates an editable ODT with structured tables, feedback area and footer', async () => {
    const blob = await createODTBlob(rows, 'Feedbackbogen', header, footerFields);
    const archive = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(archive);
    const mimetype = await zip.file('mimetype')!.async('text');
    const contentXml = await zip.file('content.xml')!.async('text');
    const stylesXml = await zip.file('styles.xml')!.async('text');
    const manifestXml = await zip.file('META-INF/manifest.xml')!.async('text');
    const metaXml = await zip.file('meta.xml')!.async('text');
    const bytes = new Uint8Array(archive);
    const firstFilenameLength = bytes[26] + bytes[27] * 256;
    const firstFilename = new TextDecoder().decode(bytes.slice(30, 30 + firstFilenameLength));
    const parsedXml = new DOMParser().parseFromString(contentXml, 'application/xml');
    const parsedStylesXml = new DOMParser().parseFromString(stylesXml, 'application/xml');

    expect(mimetype).toBe('application/vnd.oasis.opendocument.text');
    expect(firstFilename).toBe('mimetype');
    expect(bytes[8]).toBe(0);
    expect(bytes[9]).toBe(0);
    expect(contentXml).toContain('Feedbackbogen');
    expect(contentXml).toContain('ALLGEMEIN');
    expect(contentXml).toContain('Inhalt vollständig');
    expect(contentXml).toContain('Test &amp; Qualität');
    expect(contentXml).toContain('Feedback / Anmerkungen');
    expect(contentXml).toContain('Unterschrift: ____________________');
    expect(stylesXml).toContain('Erstellt mit Feedbackbogen-Generator');
    expect(manifestXml).toContain(`manifest:media-type="${mimetype}" manifest:full-path="/"`);
    expect(manifestXml).toContain('manifest:full-path="content.xml"');
    expect(manifestXml).toContain('manifest:full-path="styles.xml"');
    expect(manifestXml).toContain('manifest:full-path="meta.xml"');
    expect(metaXml).toContain('<meta:generator>Feedbackbogen-Generator</meta:generator>');
    expect(parsedXml.querySelector('parsererror')).toBeNull();
    expect(parsedStylesXml.querySelector('parsererror')).toBeNull();
  });

  it('creates ODT scale columns, checklist mode and empty state', async () => {
    const fullContent = await odtContentXml(await createODTBlob(rows, 'Feedbackbogen', header, footerFields));
    const checklistContent = await odtContentXml(await createODTBlob(rows, 'Feedbackbogen', header, footerFields, 'checklist'));
    const emptyContent = await odtContentXml(await createODTBlob([], 'Feedbackbogen', header, footerFields));

    expect(fullContent).toContain('>1</text:p>');
    expect(fullContent).toContain('>2</text:p>');
    expect(fullContent).toContain('>3</text:p>');
    expect(checklistContent).toContain('>Erledigt</text:p>');
    expect(checklistContent).not.toContain('>1</text:p>');
    expect(emptyContent).toContain('Noch keine Kriterien ausgewählt');
  });

  it('creates a fillable PDF with real AcroForm widgets and appearances', async () => {
    const blob = await createFillablePDFBlob(rows, 'Feedbackbogen', header, footerFields);
    const bytes = await blob.arrayBuffer();
    const rawPdf = new TextDecoder().decode(bytes);
    const pdf = await PDFDocument.load(bytes);
    const fieldNames = pdf.getForm().getFields().map((field) => field.getName());

    expect(blob.type).toBe('application/pdf');
    expect(fieldNames.some((name) => name.includes('header_topic'))).toBe(true);
    expect(fieldNames.some((name) => name.includes('scale_general_1'))).toBe(true);
    expect(fieldNames.some((name) => name.includes('feedback'))).toBe(true);
    expect(fieldNames.some((name) => name.includes('footer_signature'))).toBe(true);
    expect(rawPdf).toContain('/AcroForm');
    expect(rawPdf).toContain('/Subtype /Widget');
    expect(rawPdf).toContain('/AP');
    expect(rawPdf).not.toContain('/ObjStm');
  });
});

async function odtContentXml(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file('content.xml')!.async('text');
}
