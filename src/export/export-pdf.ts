import type { ExportRow, HeaderData, PrintMode } from '@/types';
import { strings } from '@/strings';

export function exportPDF(rows: ExportRow[], header: HeaderData, mode: PrintMode = 'full') {
  const printView = document.getElementById('print-view')!;
  printView.innerHTML = '';
  printView.append(buildPrintView(rows, header, mode));
  window.print();
}

function buildPrintView(rows: ExportRow[], header: HeaderData, mode: PrintMode): DocumentFragment {
  const frag = document.createDocumentFragment();

  // Header
  const headerDiv = div('print-header');
  const title = p('print-title');
  title.textContent = mode === 'checklist' ? 'Bewertungscheckliste' : 'Bewertungsbogen';
  const subtitle = p('print-subtitle');
  subtitle.textContent = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  headerDiv.append(title, subtitle);

  // Meta table (Kopfdaten)
  if (header.learner || header.topic || header.date) {
    const metaTable = el('table', 'print-meta-table');
    const metaRows: [string, string][] = [];
    if (header.learner) metaRows.push([strings.kopfdaten.learner, header.learner]);
    if (header.topic) metaRows.push([strings.kopfdaten.topic, header.topic]);
    if (header.date) metaRows.push([strings.kopfdaten.date, header.date]);
    metaRows.forEach(([label, value]) => {
      const tr = el('tr');
      const td1 = el('td'); td1.textContent = `${label}:`;
      const td2 = el('td'); td2.textContent = value;
      tr.append(td1, td2);
      metaTable.append(tr);
    });
    headerDiv.append(metaTable);
  }
  frag.append(headerDiv);

  // Main content
  if (mode === 'checklist') {
    frag.append(buildChecklist(rows));
  } else {
    frag.append(buildTable(rows));
  }

  // Feedback section
  const feedbackDiv = div('print-feedback');
  const fbTitle = p('print-feedback-title');
  fbTitle.textContent = strings.kopfdaten.feedback;
  feedbackDiv.append(fbTitle);
  if (header.feedback) {
    const fbText = p('print-feedback-text');
    fbText.textContent = header.feedback;
    feedbackDiv.append(fbText);
  }
  feedbackDiv.append(div('print-feedback-space'));
  frag.append(feedbackDiv);

  return frag;
}

function buildTable(rows: ExportRow[]): HTMLElement {
  const table = el('table', 'print-table');
  const thead = el('thead');
  const headRow = el('tr');
  ['Kategorie', 'Kriterium', 'Beschreibung', 'Gew.', 'Skala', 'Bewertung'].forEach((text, i) => {
    const th = el('th');
    th.textContent = text;
    if (i === 3) th.className = 'col-weight';
    if (i === 5) th.className = 'col-eval';
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = el('tbody');
  rows.forEach((r) => {
    const tr = el('tr');
    [r.category, r.item, r.description ?? '', String(r.weight), r.scaleLabel, ''].forEach((text, i) => {
      const td = el('td');
      td.textContent = text;
      if (i === 3) td.className = 'col-weight';
      if (i === 5) td.className = 'col-eval';
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

function buildChecklist(rows: ExportRow[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  rows.forEach((r) => {
    const wrapper = div('print-checklist-item');
    const labelEl = p('print-checklist-label');
    labelEl.textContent = `${r.item}  ☐`;
    wrapper.append(labelEl);
    if (r.description) {
      const descEl = p('print-checklist-desc');
      descEl.textContent = r.description;
      wrapper.append(descEl);
    }
    frag.append(wrapper);
  });
  return frag;
}

function el(tag: string, cls?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

function div(cls: string): HTMLDivElement {
  return el('div', cls) as HTMLDivElement;
}

function p(cls: string): HTMLParagraphElement {
  return el('p', cls) as HTMLParagraphElement;
}
