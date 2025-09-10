import JSZip from 'jszip';
import type { ExportRow } from '@/types';

// Creates a minimal ODP (OpenDocument Presentation). Limited styling; opens in LibreOffice.
export async function exportODP(rows: ExportRow[]) {
  const zip = new JSZip();

  // The mimetype file must be stored with no compression at top-level
  zip.file('mimetype', 'application/vnd.oasis.opendocument.presentation', { compression: 'STORE' });

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
  <manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
    <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.presentation" manifest:full-path="/"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
    <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  </manifest:manifest>`;
  zip.file('META-INF/manifest.xml', manifest);

  const styles = `<?xml version="1.0" encoding="UTF-8"?>
  <office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3">
    <office:styles/>
  </office:document-styles>`;
  zip.file('styles.xml', styles);

  const meta = `<?xml version="1.0" encoding="UTF-8"?>
  <office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3">
    <office:meta>
      <meta:generator>Bewertungsbaukasten</meta:generator>
      <meta:creation-date>${new Date().toISOString()}</meta:creation-date>
    </office:meta>
  </office:document-meta>`;
  zip.file('meta.xml', meta);

  // Build a very simple content.xml with title slide and a table slide
  const tableRows = rows
    .map(
      (r) => `
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>${escapeXml(r.category)}</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>${escapeXml(r.item)}</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>${escapeXml(r.description || '')}</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>${escapeXml(r.scaleLabel)}</text:p></table:table-cell>
      </table:table-row>`
    )
    .join('');

  const content = `<?xml version="1.0" encoding="UTF-8"?>
  <office:document-content
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
    xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    office:version="1.3">
    <office:body>
      <office:presentation>
        <draw:page draw:name="Title" draw:style-name="dp1" presentation:presentation-page-layout-name="AL1T">
          <draw:frame presentation:class="title" draw:style-name="gr1" draw:layer="layout" svg:width="25cm" svg:height="3cm" svg:x="1cm" svg:y="2cm" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">
            <draw:text-box>
              <text:p>Bewertungsbogen</text:p>
            </draw:text-box>
          </draw:frame>
          <draw:frame presentation:class="subtitle" draw:style-name="gr2" draw:layer="layout" svg:width="25cm" svg:height="2cm" svg:x="1cm" svg:y="5.5cm" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">
            <draw:text-box>
              <text:p>${escapeXml(new Date().toLocaleString())}</text:p>
            </draw:text-box>
          </draw:frame>
        </draw:page>
        <draw:page draw:name="Tabelle" draw:style-name="dp1" presentation:presentation-page-layout-name="AL1T">
          <draw:frame draw:layer="layout" svg:width="25cm" svg:height="14cm" svg:x="1cm" svg:y="2cm" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">
            <draw:text-box>
              <table:table table:name="Bewertungsbogen">
                <table:table-row>
                  <table:table-cell office:value-type="string"><text:p>Kategorie</text:p></table:table-cell>
                  <table:table-cell office:value-type="string"><text:p>Kriterium</text:p></table:table-cell>
                  <table:table-cell office:value-type="string"><text:p>Beschreibung</text:p></table:table-cell>
                  <table:table-cell office:value-type="string"><text:p>Skala</text:p></table:table-cell>
                </table:table-row>
                ${tableRows}
              </table:table>
            </draw:text-box>
          </draw:frame>
        </draw:page>
      </office:presentation>
    </office:body>
  </office:document-content>`;
  zip.file('content.xml', content);

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbogen.odp';
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeXml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
