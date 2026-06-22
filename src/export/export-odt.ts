import JSZip from 'jszip';

import {
  categoryHeadingText,
  downloadBlob,
  groupRows,
  scaleOptions,
} from '@/export/export-utils';
import { strings } from '@/strings';
import type {
  ExportRow,
  FooterFieldId,
  FooterFields,
  HeaderData,
  PrintMode,
} from '@/types';

const mimeType = 'application/vnd.oasis.opendocument.text';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraph(text: string, style = 'Body') {
  return `<text:p text:style-name="${style}">${escapeXml(text)}</text:p>`;
}

function tableCell(text: string, style = 'BodyCell', paragraphStyle = 'Body') {
  return `<table:table-cell table:style-name="${style}" office:value-type="string">${paragraph(text, paragraphStyle)}</table:table-cell>`;
}

function tableRow(cells: string[], style = 'TableRow') {
  return `<table:table-row table:style-name="${style}">${cells.join('')}</table:table-row>`;
}

function metadataTable(header: HeaderData) {
  if (header.fields.length === 0) return '';
  const rows: string[] = [];
  for (let index = 0; index < header.fields.length; index += 2) {
    const fields = header.fields.slice(index, index + 2);
    while (fields.length < 2) fields.push({ id: '', label: '', value: '' });
    rows.push(
      tableRow(
        fields.map((field) => {
          const label = field.label.trim() || strings.kopfdaten.fallbackField;
          return tableCell(
            `${label}: ${field.value || '________________________________'}`
          );
        })
      )
    );
  }
  return `<table:table table:name="Kopfdaten" table:style-name="MetadataTable">
    <table:table-column table:style-name="MetadataColumn" table:number-columns-repeated="2"/>
    ${rows.join('')}
  </table:table>${paragraph('', 'Spacer')}`;
}

function categoryColumnStyles(rows: ExportRow[], mode: PrintMode) {
  return groupRows(rows)
    .map((group, index) => {
      const optionCount =
        mode === 'full'
          ? scaleOptions(group.items[0]?.scale ?? null).length
          : 0;
      const criterionWeight = optionCount > 0 ? optionCount : 5;
      return `<style:style style:name="CriterionColumn${index + 1}" style:family="table-column"><style:table-column-properties style:rel-column-width="${criterionWeight}*"/></style:style>
    <style:style style:name="RatingColumn${index + 1}" style:family="table-column"><style:table-column-properties style:rel-column-width="1*"/></style:style>`;
    })
    .join('');
}

function categoryTable(
  items: ExportRow[],
  category: string,
  mode: PrintMode,
  index: number
) {
  const options = mode === 'full' ? scaleOptions(items[0]?.scale ?? null) : [];
  const columns = options.length > 0 ? 1 + options.length : 2;
  const headerLabel =
    mode === 'checklist'
      ? strings.documentExport.checklistDone
      : strings.documentExport.rating;
  const headerCells = [
    tableCell(strings.documentExport.criterion, 'HeaderCell', 'HeaderText'),
    ...(options.length > 0
      ? options.map((option) =>
          tableCell(option, 'HeaderCell', 'HeaderTextCenter')
        )
      : [tableCell(headerLabel, 'HeaderCell', 'HeaderTextCenter')]),
  ];
  const rows = items.map((row, rowIndex) =>
    tableRow([
      tableCell(
        `${row.number}. ${row.item}`,
        rowIndex % 2 === 1 ? 'ShadedCell' : 'BodyCell'
      ),
      ...(options.length > 0
        ? options.map(() =>
            tableCell(
              '☐',
              rowIndex % 2 === 1 ? 'ShadedCell' : 'BodyCell',
              'Center'
            )
          )
        : [
            tableCell(
              '☐',
              rowIndex % 2 === 1 ? 'ShadedCell' : 'BodyCell',
              'Center'
            ),
          ]),
    ])
  );
  return `${paragraph(category.toUpperCase(), 'Category')}
  <table:table table:name="Kategorie-${index + 1}" table:style-name="CriteriaTable">
    <table:table-column table:style-name="CriterionColumn${index + 1}"/>
    <table:table-column table:style-name="RatingColumn${index + 1}" table:number-columns-repeated="${columns - 1}"/>
    ${tableRow(headerCells, 'HeaderRow')}
    ${rows.join('')}
  </table:table>${paragraph('', 'Spacer')}`;
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade },
  ];
}

function footerFieldsTable(footerFields: FooterFields) {
  const enabledFields = footerFieldOptions().filter(
    ({ id }) => footerFields[id]
  );
  if (enabledFields.length === 0) return '';
  return `${paragraph('', 'Spacer')}<table:table table:name="Abschlussfelder" table:style-name="FooterFieldsTable">
    <table:table-column table:style-name="FooterFieldColumn" table:number-columns-repeated="${enabledFields.length}"/>
    ${tableRow(enabledFields.map(({ label }) => tableCell(`${label}: ____________________`, 'BodyCell', 'Bold')))}
  </table:table>`;
}

function feedbackTable() {
  const rows = Array.from({ length: 5 }, () =>
    tableRow([tableCell(' ', 'FeedbackCell')])
  );
  return `${paragraph(strings.kopfdaten.feedback, 'FeedbackHeading')}
  <table:table table:name="Feedback" table:style-name="FeedbackTable">
    <table:table-column table:style-name="FeedbackColumn"/>
    ${rows.join('')}
  </table:table>`;
}

function contentXml(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode
) {
  const categories = groupRows(rows)
    .map((group, index) =>
      categoryTable(
        group.items,
        categoryHeadingText(group.title, group.weight),
        mode,
        index
      )
    )
    .join('');
  const emptyState =
    rows.length === 0 ? paragraph(strings.labels.previewEmpty) : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="Body" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:color="#222222"/></style:style>
    <style:style style:name="Bold" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="Center" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/><style:text-properties fo:font-size="10pt"/></style:style>
    <style:style style:name="HeaderText" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="HeaderTextCenter" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/><style:text-properties fo:font-size="10pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="Spacer" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.15cm"/></style:style>
    <style:style style:name="Category" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.12cm" fo:margin-bottom="0.08cm"/><style:text-properties fo:font-size="11pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="FeedbackHeading" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.12cm" fo:margin-bottom="0.08cm"/><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>
    <style:style style:name="MetadataTable" style:family="table"><style:table-properties table:align="margins" style:width="17cm"/></style:style>
    <style:style style:name="CriteriaTable" style:family="table"><style:table-properties table:align="margins" style:width="17cm"/></style:style>
    <style:style style:name="FeedbackTable" style:family="table"><style:table-properties table:align="margins" style:width="17cm"/></style:style>
    <style:style style:name="FooterFieldsTable" style:family="table"><style:table-properties table:align="margins" style:width="17cm"/></style:style>
    <style:style style:name="MetadataColumn" style:family="table-column"><style:table-column-properties style:column-width="8.5cm"/></style:style>
    ${categoryColumnStyles(rows, mode)}
    <style:style style:name="FeedbackColumn" style:family="table-column"><style:table-column-properties style:column-width="17cm"/></style:style>
    <style:style style:name="FooterFieldColumn" style:family="table-column"><style:table-column-properties style:rel-column-width="1*"/></style:style>
    <style:style style:name="TableRow" style:family="table-row"><style:table-row-properties fo:keep-together="always"/></style:style>
    <style:style style:name="HeaderRow" style:family="table-row"><style:table-row-properties fo:keep-together="always"/></style:style>
    <style:style style:name="BodyCell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.14cm"/></style:style>
    <style:style style:name="ShadedCell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.14cm" fo:background-color="#fbfbfc"/></style:style>
    <style:style style:name="HeaderCell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.14cm" fo:background-color="#f7f8fa"/></style:style>
    <style:style style:name="FeedbackCell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.18cm"/></style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      ${paragraph(title, 'DocumentTitle')}
      ${metadataTable(header)}
      ${categories}
      ${emptyState}
      ${feedbackTable()}
      ${footerFieldsTable(footerFields)}
    </office:text>
  </office:body>
</office:document-content>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
  <office:styles>
    <style:style style:name="DocumentTitle" style:family="paragraph">
      <style:paragraph-properties fo:margin-bottom="0.3cm"/>
      <style:text-properties fo:font-size="20pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Footer" style:family="paragraph">
      <style:paragraph-properties fo:text-align="center"/>
      <style:text-properties fo:font-size="8pt" fo:color="#666666"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="PageLayout">
      <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait" fo:margin="1.27cm"/>
      <style:footer-style><style:header-footer-properties fo:min-height="0.5cm" fo:margin-top="0.2cm"/></style:footer-style>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PageLayout">
      <style:footer>${paragraph(strings.watermark, 'Footer')}</style:footer>
    </style:master-page>
  </office:master-styles>
</office:document-styles>`;
}

export async function createODTBlob(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
): Promise<Blob> {
  const zip = new JSZip();
  zip.file('mimetype', mimeType, { compression: 'STORE' });
  zip.file(
    'META-INF/manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:media-type="${mimeType}" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`
  );
  zip.file('styles.xml', stylesXml());
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"><office:meta><meta:generator>Feedbackbogen-Generator</meta:generator><meta:creation-date>${new Date().toISOString()}</meta:creation-date></office:meta></office:document-meta>`
  );
  zip.file('content.xml', contentXml(rows, title, header, footerFields, mode));
  return zip.generateAsync({ type: 'blob', mimeType });
}

export async function exportODT(
  rows: ExportRow[],
  title: string,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode = 'full'
) {
  downloadBlob(
    await createODTBlob(rows, title, header, footerFields, mode),
    strings.documentExport.fileNames.odt
  );
}
