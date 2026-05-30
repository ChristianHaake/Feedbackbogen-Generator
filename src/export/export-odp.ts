import JSZip from 'jszip';

import { downloadBlob, groupRows, scaleLabel } from '@/export/export-utils';
import { strings } from '@/strings';
import type { ExportRow, HeaderData, PrintMode } from '@/types';

const mimeType = 'application/vnd.oasis.opendocument.presentation';
const rowsPerSlide = 8;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function titleFrame(text: string) {
  return `<draw:frame draw:style-name="gr1" draw:layer="layout" svg:width="25.7cm" svg:height="1.3cm" svg:x="1cm" svg:y="0.7cm">
    <draw:text-box><text:p text:style-name="title">${escapeXml(text)}</text:p></draw:text-box>
  </draw:frame>`;
}

function titleSlide(title: string, header: HeaderData) {
  const metadata = header.fields
    .filter((field) => field.value)
    .map((field) => escapeXml(`${field.label.trim() || strings.kopfdaten.fallbackField}: ${field.value}`))
    .join('<text:line-break/>');
  return `<draw:page draw:name="Titel" draw:style-name="dp1">
    <draw:frame draw:style-name="gr1" draw:layer="layout" svg:width="25.7cm" svg:height="3cm" svg:x="1cm" svg:y="3.6cm">
      <draw:text-box><text:p text:style-name="cover-title">${escapeXml(title)}</text:p></draw:text-box>
    </draw:frame>
    <draw:frame draw:style-name="gr1" draw:layer="layout" svg:width="25.7cm" svg:height="4cm" svg:x="1cm" svg:y="7cm">
      <draw:text-box><text:p text:style-name="cover-subtitle">${metadata}</text:p></draw:text-box>
    </draw:frame>
  </draw:page>`;
}

function tableCell(text: string, style = 'body-cell', paragraphStyle = 'body-text') {
  return `<table:table-cell table:style-name="${style}" office:value-type="string"><text:p text:style-name="${paragraphStyle}">${escapeXml(text)}</text:p></table:table-cell>`;
}

function criteriaSlide(category: string, rows: ExportRow[], page: number, totalPages: number, mode: PrintMode) {
  const suffix = totalPages > 1 ? ` (${page}/${totalPages})` : '';
  const tableRows = rows
    .map((row) => {
      const rating = mode === 'checklist' ? '☐ erledigt' : scaleLabel(row.scale) || '________________';
      return `<table:table-row>${tableCell(row.item)}${tableCell(rating, 'rating-cell')}</table:table-row>`;
    })
    .join('');
  return `<draw:page draw:name="${escapeXml(`${category}-${page}`)}" draw:style-name="dp1">
    ${titleFrame(`${category}${suffix}`)}
    <draw:frame draw:style-name="gr1" draw:layer="layout" svg:width="25.7cm" svg:height="14.6cm" svg:x="1cm" svg:y="2.5cm">
      <table:table table:name="${escapeXml(`${category}-${page}`)}">
        <table:table-column table:style-name="criterion-column"/>
        <table:table-column table:style-name="rating-column"/>
        <table:table-row>${tableCell('Kriterium', 'header-cell', 'header-text')}${tableCell(mode === 'checklist' ? 'Erledigt' : 'Skala / Bewertung', 'header-cell', 'header-text')}</table:table-row>
        ${tableRows}
      </table:table>
    </draw:frame>
  </draw:page>`;
}

function feedbackSlide() {
  const lines = Array.from({ length: 7 }, () => '<text:p text:style-name="feedback-line"> </text:p>').join('');
  return `<draw:page draw:name="Feedback" draw:style-name="dp1">
    ${titleFrame(strings.kopfdaten.feedback)}
    <draw:frame draw:style-name="gr1" draw:layer="layout" svg:width="25.7cm" svg:height="13cm" svg:x="1cm" svg:y="2.7cm">
      <draw:text-box>${lines}</draw:text-box>
    </draw:frame>
  </draw:page>`;
}

function contentXml(rows: ExportRow[], title: string, header: HeaderData, mode: PrintMode) {
  const slides = [titleSlide(title, header)];
  groupRows(rows).forEach((group) => {
    const totalPages = Math.max(1, Math.ceil(group.items.length / rowsPerSlide));
    for (let page = 0; page < totalPages; page++) {
      slides.push(criteriaSlide(group.title, group.items.slice(page * rowsPerSlide, (page + 1) * rowsPerSlide), page + 1, totalPages, mode));
    }
  });
  slides.push(feedbackSlide());

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="dp1" style:family="drawing-page"><style:drawing-page-properties draw:fill="solid" draw:fill-color="#ffffff"/></style:style>
    <style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:fill="none" draw:stroke="none"/></style:style>
    <style:style style:name="title" style:family="paragraph"><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#222222"/></style:style>
    <style:style style:name="cover-title" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/><style:text-properties fo:font-size="28pt" fo:font-weight="bold" fo:color="#1e88e5"/></style:style>
    <style:style style:name="cover-subtitle" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/><style:text-properties fo:font-size="13pt" fo:color="#444444"/></style:style>
    <style:style style:name="criterion-column" style:family="table-column"><style:table-column-properties style:column-width="17cm"/></style:style>
    <style:style style:name="rating-column" style:family="table-column"><style:table-column-properties style:column-width="8.7cm"/></style:style>
    <style:style style:name="header-cell" style:family="table-cell"><style:table-cell-properties fo:background-color="#1e88e5" fo:border="0.03cm solid #1e88e5" fo:padding="0.14cm"/></style:style>
    <style:style style:name="body-cell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.14cm"/></style:style>
    <style:style style:name="rating-cell" style:family="table-cell"><style:table-cell-properties fo:border="0.03cm solid #d5d9e0" fo:padding="0.14cm" fo:background-color="#f7f8fa"/></style:style>
    <style:style style:name="header-text" style:family="paragraph"><style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#ffffff"/></style:style>
    <style:style style:name="body-text" style:family="paragraph"><style:text-properties fo:font-size="10pt" fo:color="#222222"/></style:style>
    <style:style style:name="feedback-line" style:family="paragraph"><style:paragraph-properties fo:border-bottom="0.03cm solid #888888" fo:padding-bottom="0.3cm" fo:margin-bottom="0.45cm"/><style:text-properties fo:font-size="12pt"/></style:style>
  </office:automatic-styles>
  <office:body><office:presentation>${slides.join('')}</office:presentation></office:body>
</office:document-content>`;
}

export async function createODPBlob(rows: ExportRow[], title: string, header: HeaderData, mode: PrintMode = 'full'): Promise<Blob> {
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
  zip.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" office:version="1.3"><office:styles/></office:document-styles>`
  );
  zip.file(
    'meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"><office:meta><meta:generator>Feedbackbogen-Generator</meta:generator><meta:creation-date>${new Date().toISOString()}</meta:creation-date></office:meta></office:document-meta>`
  );
  zip.file('content.xml', contentXml(rows, title, header, mode));
  return zip.generateAsync({ type: 'blob', mimeType });
}

export async function exportODP(rows: ExportRow[], title: string, header: HeaderData, mode: PrintMode = 'full') {
  downloadBlob(await createODPBlob(rows, title, header, mode), 'bewertungsbogen.odp');
}
