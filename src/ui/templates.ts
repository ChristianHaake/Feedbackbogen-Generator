import type { Category, Scale, SelectedItemRef, CustomItem, HeaderData, ExportRow, PrintMode } from '@/types';
import { el, icon } from './components';
import { strings } from '@/strings';
import { scaleDisplay } from '@/scale-utils';
import { findItemInCategory } from '@/yaml';

export type RenderHandlers = {
  onAdd: (categoryId: string, itemId: string) => void;
  onRemove: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onScaleChange: (itemId: string, scaleId: string) => void;
  onWeightChange: (itemId: string, weight: number) => void;
  onDefaultScaleChange: (scaleId: string) => void;
  onAddCustomItem: (categoryId: string, label: string) => void;
  onRemoveCustomItem: (itemId: string) => void;
  onHeaderChange: (field: keyof HeaderData, value: string) => void;
  onPreviewModeChange: (mode: PrintMode) => void;
};

export function renderLayout(): HTMLElement {
  const app = el('div', { id: 'app-root', class: 'app' });

  const header = el(
    'header',
    { class: 'toolbar', role: 'toolbar', 'aria-label': 'Werkzeugleiste' },
    el('div', { class: 'toolbar-inner' },
      el('div', { class: 'left' },
        el('img', { src: './favicon.svg', alt: '', width: '24', height: '24' }),
        el('div', { class: 'title-wrap' },
          el('strong', { class: 'title', text: strings.appTitle }),
          el('div', { class: 'subtitle', text: 'Baukasten für zukunftsorientierte Prüfungsformate' })
        )
      ),
      el('div', { class: 'actions' },
        toolbarButton('save', strings.toolbar.save, 'save', { 'aria-keyshortcuts': 'Alt+S' }),
        toolbarButton('file', strings.toolbar.load, 'load'),
        el('span', { class: 'divider', role: 'separator', 'aria-orientation': 'vertical' }),
        toolbarButton('download', strings.toolbar.exportJson, 'export-json'),
        toolbarButton('upload', strings.toolbar.importJson, 'import-json'),
        el('span', { class: 'divider', role: 'separator', 'aria-orientation': 'vertical' }),
        el('div', { class: 'export-controls' },
          el('label', { for: 'export-format', class: 'sr-only', text: strings.toolbar.exportFormat }),
          el('select', { id: 'export-format', 'aria-label': strings.toolbar.exportFormat },
            el('option', { value: 'pdf', text: 'PDF (Drucken)' }),
            el('option', { value: 'docx', text: 'DOCX' }),
            el('option', { value: 'xlsx', text: 'XLSX' }),
            el('option', { value: 'odp', text: 'ODP' })
          ),
          toolbarButton('pdf', strings.toolbar.exportNow, 'export-now', { 'aria-keyshortcuts': 'Alt+E' })
        )
      )
    )
  );

  const workspace = el('div', { class: 'workspace' },
    el('aside', { class: 'editor-pane', 'aria-label': 'Editor' },
      editorSection(strings.kopfdaten.title, el('div', { id: 'kopfdaten-form', class: 'kopfdaten-fields' })),
      editorSection(strings.columns.categories, el('div', { id: 'categories', class: 'accordion' })),
      editorSection(strings.columns.selected,
        el('div', { class: 'selected-controls' },
          el('label', { for: 'default-scale', class: 'small-label', text: strings.labels.defaultScale }),
          el('select', { id: 'default-scale', class: 'default-scale-select', 'aria-label': strings.labels.defaultScale })
        ),
        el('ol', { id: 'selected', class: 'selected', role: 'list' })
      )
    ),
    el('section', { class: 'preview-pane', 'aria-label': 'Druckvorschau' },
      el('div', { class: 'preview-controls' },
        el('div', { class: 'mode-switch', role: 'tablist', 'aria-label': strings.labels.previewMode },
          modeTab('full', strings.modes.full, true),
          modeTab('checklist', strings.modes.checklist, false)
        )
      ),
      el('div', { class: 'preview-pane-inner' },
        el('div', { id: 'a4-page', class: 'a4-page' })
      )
    )
  );

  const live = el('div', { id: 'aria-live', 'aria-live': 'polite', 'aria-atomic': 'true', class: 'sr-only', role: 'status', 'aria-label': strings.a11y.status });

  app.append(header, workspace, live);
  return app;
}

function editorSection(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  const section = el('section', { class: 'editor-section' });
  section.append(el('h2', { class: 'editor-section-title', text: title }));
  children.forEach((c) => { if (c) section.append(c); });
  return section;
}

function modeTab(mode: PrintMode, label: string, active: boolean): HTMLButtonElement {
  const btn = el('button', {
    type: 'button',
    class: `mode-tab ${active ? 'active' : ''}`,
    role: 'tab',
    'aria-selected': String(active),
    'data-mode': mode
  }) as HTMLButtonElement;
  btn.textContent = label;
  return btn;
}

function toolbarButton(iconId: string, label: string, id?: string, extra: Record<string, string> = {}) {
  const btn = el('button', { class: 'btn', type: 'button', ...(id ? { id } : {}), ...extra });
  btn.append(icon(`icon-${iconId}`), el('span', { class: 'btn-label', text: label }));
  return btn;
}

export function renderKopfdaten(
  container: HTMLElement,
  header: HeaderData,
  onChange: (field: keyof HeaderData, value: string) => void
) {
  container.innerHTML = '';

  const fields: { key: keyof HeaderData; label: string; type: string }[] = [
    { key: 'learner', label: strings.kopfdaten.learner, type: 'text' },
    { key: 'topic', label: strings.kopfdaten.topic, type: 'text' },
    { key: 'date', label: strings.kopfdaten.date, type: 'date' }
  ];

  fields.forEach(({ key, label, type }) => {
    const inputId = `kd-${key}`;
    const input = el('input', { type, id: inputId, class: 'kd-input', value: header[key], placeholder: label }) as HTMLInputElement;
    input.addEventListener('input', () => onChange(key, input.value));
    const lbl = el('label', { for: inputId, class: 'kd-label', text: label });
    container.append(el('div', { class: 'kd-field' }, lbl, input));
  });

  const fbInput = el('textarea', { id: 'kd-feedback', class: 'kd-textarea', placeholder: strings.kopfdaten.feedback, rows: '3' }) as HTMLTextAreaElement;
  fbInput.value = header.feedback;
  fbInput.addEventListener('input', () => onChange('feedback', fbInput.value));
  const fbLabel = el('label', { for: 'kd-feedback', class: 'kd-label', text: strings.kopfdaten.feedback });
  container.append(el('div', { class: 'kd-field kd-field-wide' }, fbLabel, fbInput));
}

export function renderCategories(
  container: HTMLElement,
  categories: Category[],
  customItems: CustomItem[],
  handlers: RenderHandlers
) {
  container.innerHTML = '';

  categories.forEach((c) => {
    const buttonId = `acc-${c.id}`;
    const header = el(
      'button',
      { class: 'accordion-header', 'aria-expanded': 'false', id: buttonId, 'aria-controls': `${buttonId}-panel`, type: 'button' },
      el('span', { class: 'acc-title', text: c.title })
    );
    const panel = el('div', { id: `${buttonId}-panel`, class: 'accordion-panel', role: 'region', 'aria-labelledby': buttonId });
    (panel as HTMLDivElement).hidden = true;

    if (c.description) panel.append(el('p', { class: 'category-desc', text: c.description }));

    if (Array.isArray(c.groups)) {
      c.groups.forEach((g) => {
        const groupBlock = el('div', { class: 'group-block' });
        groupBlock.append(el('h3', { class: 'group-title', text: g.title }));
        g.items.forEach((it) => groupBlock.append(itemRow(it.label, it.description, () => handlers.onAdd(c.id, it.id))));
        panel.append(groupBlock);
      });
    } else if (Array.isArray(c.items)) {
      c.items.forEach((it) => panel.append(itemRow(it.label, it.description, () => handlers.onAdd(c.id, it.id))));
    }

    const catCustomItems = customItems.filter((ci) => ci.categoryId === c.id);
    if (catCustomItems.length > 0) {
      const customSection = el('div', { class: 'custom-items-section' });
      catCustomItems.forEach((ci) => {
        const removeBtn = el('button', { class: 'btn btn-small danger', type: 'button', title: strings.labels.remove, 'aria-label': strings.labels.remove }, icon('icon-trash'));
        removeBtn.addEventListener('click', () => handlers.onRemoveCustomItem(ci.id));
        const row = el('div', { class: 'item-row custom-item-row' },
          el('div', { class: 'item-text' }, el('div', { class: 'item-label custom-tag', text: ci.label })),
          el('div', { class: 'item-actions' }, addButton(() => handlers.onAdd(c.id, ci.id)), removeBtn)
        );
        customSection.append(row);
      });
      panel.append(customSection);
    }

    const customInput = el('input', {
      type: 'text', class: 'custom-item-input', 'data-cat': c.id,
      placeholder: strings.labels.customItemPlaceholder,
      'aria-label': strings.labels.addCustomItem
    }) as HTMLInputElement;
    const addCustomBtn = el('button', { class: 'btn btn-small btn-primary', type: 'button', 'aria-label': strings.labels.addCustomItem });
    addCustomBtn.append(icon('icon-plus'));
    addCustomBtn.addEventListener('click', () => { handlers.onAddCustomItem(c.id, customInput.value); customInput.value = ''; });
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handlers.onAddCustomItem(c.id, customInput.value); customInput.value = ''; }
    });
    panel.append(el('div', { class: 'add-custom-row' }, customInput, addCustomBtn));

    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      const next = !expanded;
      header.setAttribute('aria-expanded', String(next));
      panel.classList.toggle('open', next);
      (panel as HTMLDivElement).hidden = !next;
    });

    container.append(header, panel);
  });
}

function itemRow(label: string, description: string | undefined, onAdd: () => void) {
  return el('div', { class: 'item-row' },
    el('div', { class: 'item-text' },
      el('div', { class: 'item-label', text: label }),
      description ? el('div', { class: 'item-desc', text: description }) : null
    ),
    el('div', { class: 'item-actions' }, addButton(onAdd))
  );
}

function addButton(onClick: () => void) {
  const btn = el('button', { class: 'btn btn-small', type: 'button', title: strings.labels.add, 'aria-label': strings.labels.add });
  btn.append(icon('icon-plus'));
  btn.addEventListener('click', onClick);
  return btn;
}

export function renderDefaultScaleSelect(
  selectEl: HTMLSelectElement,
  scales: Scale[],
  defaultScaleId: string,
  handlers: RenderHandlers
) {
  selectEl.innerHTML = '';
  scales.forEach((s) => selectEl.append(el('option', { value: s.id, text: `${s.id} – ${scaleDisplay(s)}` })));
  selectEl.value = defaultScaleId;
  selectEl.onchange = () => handlers.onDefaultScaleChange(selectEl.value);
}

export function renderSelected(
  container: HTMLElement,
  selected: SelectedItemRef[],
  categories: Category[],
  scales: Scale[],
  scaleByItem: Record<string, string>,
  weightByItem: Record<string, number>,
  defaultScaleId: string,
  handlers: RenderHandlers
) {
  container.innerHTML = '';

  if (selected.length === 0) {
    const empty = el('li', { class: 'selected-empty', text: strings.labels.selectedEmpty });
    container.append(empty);
    return;
  }

  selected.forEach((ref, index) => {
    const cat = categories.find((c) => c.id === ref.categoryId);
    if (!cat) return;
    const item = findItemInCategory(cat, ref.itemId);
    if (!item) return;

    const li = el('li', { class: 'selected-row', draggable: 'true', role: 'listitem', tabindex: '0', 'aria-label': item.label });
    li.dataset.index = String(index);

    const handle = el('span', { class: 'drag-handle', title: strings.labels.reorder, 'aria-hidden': 'true' }, icon('icon-reorder'));
    const text = el('span', { class: 'selected-text', text: item.label });
    const removeBtn = el('button', { class: 'btn btn-small danger', type: 'button', title: strings.labels.remove, 'aria-label': strings.labels.remove }, icon('icon-trash'));
    removeBtn.addEventListener('click', () => handlers.onRemove(ref.itemId));

    const topRow = el('div', { class: 'selected-top' }, handle, text, removeBtn);

    // Inline scale + weight
    const scaleSelect = el('select', { class: 'inline-scale', 'data-item': ref.itemId, 'aria-label': `${item.label} – ${strings.labels.scale}` }) as HTMLSelectElement;
    scales.forEach((s) => scaleSelect.append(el('option', { value: s.id, text: scaleDisplay(s) })));
    scaleSelect.value = scaleByItem[ref.itemId] ?? defaultScaleId;
    scaleSelect.addEventListener('change', () => handlers.onScaleChange(ref.itemId, scaleSelect.value));

    const weightInput = el('input', {
      type: 'number', min: '1', max: '10', step: '1',
      class: 'weight-input',
      value: String(weightByItem[ref.itemId] ?? 1),
      'aria-label': `${item.label} – ${strings.labels.weight}`,
      title: strings.labels.weight
    }) as HTMLInputElement;
    weightInput.addEventListener('change', () => {
      const v = parseInt(weightInput.value, 10);
      handlers.onWeightChange(ref.itemId, Number.isNaN(v) ? 1 : Math.max(1, Math.min(10, v)));
    });

    const bottomRow = el('div', { class: 'selected-bottom' },
      el('label', { class: 'inline-label', text: strings.labels.scale }), scaleSelect,
      el('label', { class: 'inline-label', text: strings.labels.weight }), weightInput
    );

    li.append(topRow, bottomRow);

    // Drag-and-drop
    li.addEventListener('dragstart', (e) => {
      (e.dataTransfer as DataTransfer).setData('text/plain', String(index));
      (e.dataTransfer as DataTransfer).effectAllowed = 'move';
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => { e.preventDefault(); (e.dataTransfer as DataTransfer).dropEffect = 'move'; });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number((e.dataTransfer as DataTransfer).getData('text/plain'));
      const to = Number(li.dataset.index ?? '0');
      if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) handlers.onReorder(from, to);
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handlers.onRemove(ref.itemId); }
      if (e.key === 'ArrowUp' && index > 0) { e.preventDefault(); handlers.onReorder(index, index - 1); }
      if (e.key === 'ArrowDown' && index < selected.length - 1) { e.preventDefault(); handlers.onReorder(index, index + 1); }
    });

    container.append(li);
  });
}

export function renderModeSwitch(
  container: HTMLElement,
  mode: PrintMode,
  handlers: RenderHandlers
) {
  container.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.onclick = () => handlers.onPreviewModeChange(btn.dataset.mode as PrintMode);
  });
}

export function renderPreview(
  container: HTMLElement,
  rows: ExportRow[],
  header: HeaderData,
  mode: PrintMode
) {
  container.innerHTML = '';

  // Title
  const title = el('h1', { class: 'a4-title', text: mode === 'checklist' ? 'Bewertungscheckliste' : 'Bewertungsbogen' });
  container.append(title);

  // Meta: Lernende/Thema/Datum als Definitionsliste
  if (header.learner || header.topic || header.date) {
    const meta = el('table', { class: 'a4-meta' });
    const tbody = el('tbody');
    const metaRows: [string, string][] = [];
    if (header.learner) metaRows.push([`${strings.kopfdaten.learner}:`, header.learner]);
    if (header.topic) metaRows.push([`${strings.kopfdaten.topic}:`, header.topic]);
    if (header.date) metaRows.push([`${strings.kopfdaten.date}:`, header.date]);
    metaRows.forEach(([k, v]) => {
      tbody.append(el('tr', {}, el('td', { class: 'a4-meta-key', text: k }), el('td', { class: 'a4-meta-val', text: v })));
    });
    meta.append(tbody);
    container.append(meta);
  }

  // Content
  if (rows.length === 0) {
    container.append(el('p', { class: 'a4-empty', text: strings.labels.previewEmpty }));
  } else if (mode === 'checklist') {
    container.append(buildChecklist(rows));
  } else {
    container.append(buildTable(rows));
  }

  // Feedback
  const fbSection = el('div', { class: 'a4-feedback' });
  fbSection.append(el('h2', { class: 'a4-feedback-title', text: strings.kopfdaten.feedback }));
  if (header.feedback) fbSection.append(el('p', { class: 'a4-feedback-text', text: header.feedback }));
  fbSection.append(el('div', { class: 'a4-feedback-space' }));
  container.append(fbSection);
}

function buildTable(rows: ExportRow[]): HTMLElement {
  const table = el('table', { class: 'a4-table' });
  const thead = el('thead');
  const headRow = el('tr');
  [
    ['Kategorie', ''],
    ['Kriterium', ''],
    ['Beschreibung', ''],
    ['Gew.', 'a4-col-weight'],
    ['Skala', ''],
    ['Bewertung', 'a4-col-eval']
  ].forEach(([text, cls]) => {
    const th = el('th', cls ? { class: cls } : {});
    th.textContent = text;
    headRow.append(th);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = el('tbody');
  rows.forEach((r) => {
    const tr = el('tr');
    tr.append(
      tdText(r.category),
      tdText(r.item),
      tdText(r.description ?? ''),
      tdText(String(r.weight), 'a4-col-weight'),
      tdText(r.scaleLabel),
      tdText('', 'a4-col-eval')
    );
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

function buildChecklist(rows: ExportRow[]): HTMLElement {
  const list = el('div', { class: 'a4-checklist' });
  rows.forEach((r) => {
    const item = el('div', { class: 'a4-checklist-item' });
    item.append(el('span', { class: 'a4-checkbox', text: '☐' }));
    const txt = el('div', { class: 'a4-checklist-text' });
    txt.append(el('div', { class: 'a4-checklist-label', text: r.item }));
    if (r.description) txt.append(el('div', { class: 'a4-checklist-desc', text: r.description }));
    item.append(txt);
    list.append(item);
  });
  return list;
}

function tdText(text: string, cls?: string): HTMLElement {
  const td = el('td', cls ? { class: cls } : {});
  td.textContent = text;
  return td;
}
