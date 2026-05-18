import { el, icon } from './components';

import { strings } from '@/strings';
import { scaleDisplay } from '@/scale-utils';
import type { Category, Scale, CustomItem, HeaderData, ExportRow, PrintMode, Item } from '@/types';

export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'odp';
export type MobileView = 'edit' | 'preview' | 'export';
export type SelectedSummary = {
  itemId: string;
  categoryId: string;
  category: string;
  item: string;
  scaleLabel: string;
  isCustom: boolean;
};

export type RenderHandlers = {
  onToggle: (categoryId: string, itemId: string, checked: boolean) => void;
  onScaleChange: (itemId: string, scaleId: string) => void;
  onDefaultScaleChange: (scaleId: string) => void;
  onAddCustomItem: (categoryId: string, label: string) => void;
  onRemoveCustomItem: (itemId: string) => void;
  onRemoveSelected: (itemId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onClearCategory: (categoryId: string) => void;
  onClearSelection: () => void;
  onSearchChange: (value: string) => void;
  onHeaderChange: (field: keyof HeaderData, value: string) => void;
  onPreviewModeChange: (mode: PrintMode) => void;
  onMobileViewChange: (view: MobileView) => void;
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
        actionMenu('export-menu', strings.toolbar.exportNow, 'icon-download', [
          menuAction('pdf', strings.toolbar.exportPdf, 'icon-pdf', { 'aria-keyshortcuts': 'Alt+E' }),
          menuAction('docx', strings.toolbar.exportDocx, 'icon-doc'),
          menuAction('xlsx', strings.toolbar.exportXlsx, 'icon-xlsx'),
          menuAction('odp', strings.toolbar.exportOdp, 'icon-odp')
        ]),
        actionMenu('more-menu', strings.toolbar.more, 'icon-reorder', [
          menuButton(strings.toolbar.exportJson, 'icon-download', 'export-json'),
          menuButton(strings.toolbar.importJson, 'icon-upload', 'import-json')
        ])
      )
    )
  );

  const workspace = el('div', { class: 'workspace' },
    el('nav', { class: 'mobile-tabs', role: 'tablist', 'aria-label': 'Arbeitsbereich' },
      mobileTab('edit', strings.labels.mobileEdit, true),
      mobileTab('preview', strings.labels.mobilePreview, false),
      mobileTab('export', strings.labels.mobileExport, false)
    ),
    el('aside', { class: 'editor-pane', 'aria-label': 'Editor', 'data-mobile-panel': 'edit' },
      editorSection(strings.kopfdaten.title, el('div', { id: 'kopfdaten-form', class: 'kopfdaten-fields' })),
      editorSection(strings.columns.selected,
        el('div', { class: 'selected-head' },
          el('div', { id: 'selected-counter', class: 'selected-counter' }),
          toolbarButton('trash', strings.labels.clearSelection, 'clear-selection', { class: 'btn btn-small' })
        ),
        el('div', { id: 'selected-list', class: 'selected-list' })
      ),
      editorSection(strings.columns.categories,
        el('div', { class: 'search-wrap' },
          el('label', { for: 'criteria-search', class: 'small-label', text: strings.labels.searchCriteria }),
          el('input', {
            id: 'criteria-search',
            type: 'search',
            class: 'criteria-search',
            placeholder: strings.labels.searchPlaceholder,
            autocomplete: 'off'
          })
        ),
        el('div', { class: 'scale-default-wrap' },
          el('label', { for: 'default-scale', class: 'small-label', text: strings.labels.defaultScale }),
          el('select', { id: 'default-scale', class: 'default-scale-select', 'aria-label': strings.labels.defaultScale })
        ),
        el('div', { id: 'categories', class: 'accordion' })
      )
    ),
    el('section', { class: 'preview-pane', 'aria-label': 'Druckvorschau', 'data-mobile-panel': 'preview' },
      el('div', { class: 'preview-controls' },
        el('div', { class: 'mode-switch', role: 'tablist', 'aria-label': strings.labels.previewMode },
          modeTab('full', strings.modes.full, true),
          modeTab('checklist', strings.modes.checklist, false)
        )
      ),
      el('div', { class: 'preview-pane-inner' },
        el('div', { id: 'a4-page', class: 'a4-page' })
      )
    ),
    el('section', { class: 'mobile-export-pane', 'aria-label': strings.columns.export, 'data-mobile-panel': 'export' },
      editorSection(strings.columns.export,
        el('div', { class: 'mobile-export-actions' },
          exportButton('pdf', strings.toolbar.exportPdf, 'icon-pdf'),
          exportButton('docx', strings.toolbar.exportDocx, 'icon-doc'),
          exportButton('xlsx', strings.toolbar.exportXlsx, 'icon-xlsx'),
          exportButton('odp', strings.toolbar.exportOdp, 'icon-odp')
        ),
        el('div', { class: 'mobile-secondary-actions' },
          toolbarButton('download', strings.toolbar.exportJson, 'export-json-mobile'),
          toolbarButton('upload', strings.toolbar.importJson, 'import-json-mobile')
        )
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

function mobileTab(view: MobileView, label: string, active: boolean): HTMLButtonElement {
  const btn = el('button', {
    type: 'button',
    class: `mobile-tab ${active ? 'active' : ''}`,
    role: 'tab',
    'aria-selected': String(active),
    'data-mobile-view': view
  }) as HTMLButtonElement;
  btn.textContent = label;
  return btn;
}

function toolbarButton(iconId: string, label: string, id?: string, extra: Record<string, string> = {}) {
  const className = extra.class ?? 'btn';
  const rest = { ...extra };
  delete rest.class;
  const btn = el('button', { class: className, type: 'button', ...(id ? { id } : {}), ...rest });
  btn.append(icon(`icon-${iconId}`), el('span', { class: 'btn-label', text: label }));
  return btn;
}

function actionMenu(id: string, label: string, iconId: string, actions: HTMLElement[]) {
  return el('details', { class: 'action-menu', id },
    el('summary', { class: 'btn menu-trigger' }, icon(iconId), el('span', { class: 'btn-label', text: label })),
    el('div', { class: 'menu-panel' }, ...actions)
  );
}

function menuAction(format: ExportFormat, label: string, iconId: string, extra: Record<string, string> = {}) {
  const btn = el('button', { class: 'menu-item', type: 'button', 'data-export-format': format, ...extra });
  btn.append(icon(iconId), el('span', { text: label }));
  return btn;
}

function menuButton(label: string, iconId: string, id: string) {
  const btn = el('button', { class: 'menu-item', type: 'button', id });
  btn.append(icon(iconId), el('span', { text: label }));
  return btn;
}

function exportButton(format: ExportFormat, label: string, iconId: string) {
  const btn = el('button', { class: 'export-card-button', type: 'button', 'data-export-format': format });
  btn.append(icon(iconId), el('span', { text: label }));
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
    { key: 'learngroup', label: strings.kopfdaten.learngroup, type: 'text' },
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

export function renderSelectedCounter(container: HTMLElement, count: number) {
  container.textContent = strings.labels.selectedCount(count);
}

export function renderSelectedList(
  container: HTMLElement,
  selectedItems: SelectedSummary[],
  handlers: RenderHandlers
) {
  container.innerHTML = '';

  if (selectedItems.length === 0) {
    container.append(el('p', { class: 'selected-empty', text: strings.labels.selectedEmpty }));
    return;
  }

  const list = el('ol', { class: 'selected-items' });
  selectedItems.forEach((item) => {
    const removeBtn = el('button', {
      class: 'btn-icon quiet',
      type: 'button',
      title: strings.labels.remove,
      'aria-label': `${strings.labels.remove}: ${item.item}`
    }, icon('icon-trash'));
    removeBtn.addEventListener('click', () => handlers.onRemoveSelected(item.itemId));
    const meta = item.isCustom
      ? `${item.category} · ${strings.labels.customItemBadge} · ${item.scaleLabel}`
      : `${item.category} · ${item.scaleLabel}`;
    list.append(el('li', { class: 'selected-item' },
      el('div', { class: 'selected-item-main' },
        el('span', { class: 'selected-item-label', text: item.item }),
        el('span', { class: 'selected-item-meta', text: meta })
      ),
      removeBtn
    ));
  });
  container.append(list);
}

export function renderDefaultScaleSelect(
  selectEl: HTMLSelectElement,
  scales: Scale[],
  defaultScaleId: string,
  handlers: RenderHandlers
) {
  selectEl.innerHTML = '';
  scales.forEach((s) => selectEl.append(el('option', { value: s.id, text: scaleDisplay(s) })));
  selectEl.value = defaultScaleId;
  selectEl.onchange = () => handlers.onDefaultScaleChange(selectEl.value);
}

export function renderCategories(
  container: HTMLElement,
  categories: Category[],
  customItems: CustomItem[],
  selectedIds: Set<string>,
  scales: Scale[],
  scaleByItem: Record<string, string>,
  defaultScaleId: string,
  handlers: RenderHandlers,
  searchQuery = ''
) {
  container.innerHTML = '';
  const normalizedQuery = searchQuery.trim().toLowerCase();
  let renderedCategories = 0;

  categories.forEach((c) => {
    const visibleRegular = visibleCategoryParts(c, normalizedQuery);
    const catCustomItems = customItems.filter((ci) => ci.categoryId === c.id);
    const visibleCustomItems = catCustomItems.filter((ci) => matchesItem(ci, normalizedQuery));
    const hasVisibleItems = visibleRegular.hasItems || visibleCustomItems.length > 0;
    if (normalizedQuery && !hasVisibleItems) return;
    renderedCategories++;

    const buttonId = `acc-${c.id}`;
    const headerBtn = el(
      'button',
      { class: 'accordion-header', 'aria-expanded': 'false', id: buttonId, 'aria-controls': `${buttonId}-panel`, type: 'button' },
      el('span', { class: 'acc-title', text: c.title }),
      el('span', { class: 'acc-count', 'data-cat': c.id })
    );
    const panel = el('div', { id: `${buttonId}-panel`, class: 'accordion-panel', role: 'region', 'aria-labelledby': buttonId });
    (panel as HTMLDivElement).hidden = true;
    panel.append(el('div', { class: 'category-actions' },
      smallActionButton(strings.labels.selectCategory, () => handlers.onSelectCategory(c.id)),
      smallActionButton(strings.labels.clearCategory, () => handlers.onClearCategory(c.id))
    ));

    if (Array.isArray(c.groups)) {
      visibleRegular.groups.forEach((g) => {
        const groupBlock = el('div', { class: 'group-block' });
        groupBlock.append(el('h3', { class: 'group-title', text: g.title }));
        g.items.forEach((it) => groupBlock.append(itemCheckboxRow(c.id, it, selectedIds, scales, scaleByItem, defaultScaleId, handlers)));
        panel.append(groupBlock);
      });
    } else if (Array.isArray(c.items)) {
      visibleRegular.items.forEach((it) => panel.append(itemCheckboxRow(c.id, it, selectedIds, scales, scaleByItem, defaultScaleId, handlers)));
    }

    if (visibleCustomItems.length > 0) {
      const customSection = el('div', { class: 'custom-items-section' });
      visibleCustomItems.forEach((ci) => {
        const removeBtn = el('button', { class: 'btn-icon danger', type: 'button', title: strings.labels.remove, 'aria-label': strings.labels.remove }, icon('icon-trash'));
        removeBtn.addEventListener('click', () => handlers.onRemoveCustomItem(ci.id));
        const row = itemCheckboxRow(c.id, ci, selectedIds, scales, scaleByItem, defaultScaleId, handlers, true);
        row.querySelector('.item-actions')?.append(removeBtn);
        customSection.append(row);
      });
      panel.append(customSection);
    }

    const customInput = el('input', {
      type: 'text', class: 'custom-item-input', 'data-cat': c.id,
      placeholder: strings.labels.customItemPlaceholder,
      'aria-label': strings.labels.addCustomItem
    }) as HTMLInputElement;
    const addCustomBtn = el('button', { class: 'btn-icon btn-primary', type: 'button', 'aria-label': strings.labels.addCustomItem });
    addCustomBtn.append(icon('icon-plus'));
    addCustomBtn.addEventListener('click', () => { handlers.onAddCustomItem(c.id, customInput.value); customInput.value = ''; });
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handlers.onAddCustomItem(c.id, customInput.value); customInput.value = ''; }
    });
    panel.append(el('div', { class: 'add-custom-row' }, customInput, addCustomBtn));

    headerBtn.addEventListener('click', () => {
      const expanded = headerBtn.getAttribute('aria-expanded') === 'true';
      const next = !expanded;
      headerBtn.setAttribute('aria-expanded', String(next));
      panel.classList.toggle('open', next);
      (panel as HTMLDivElement).hidden = !next;
    });

    container.append(headerBtn, panel);
  });

  // Update the per-category count badges
  refreshCategoryCounts(container, categories, customItems, selectedIds);
  if (renderedCategories === 0) {
    container.append(el('p', { class: 'search-empty', text: 'Keine passenden Kriterien gefunden.' }));
  }
}

function smallActionButton(label: string, onClick: () => void) {
  const btn = el('button', { class: 'btn-mini', type: 'button', text: label });
  btn.addEventListener('click', onClick);
  return btn;
}

function visibleCategoryParts(c: Category, normalizedQuery: string) {
  const matches = (it: Item) => matchesItem(it, normalizedQuery);
  if (Array.isArray(c.groups)) {
    const groups = c.groups
      .map((g) => ({ ...g, items: normalizedQuery ? g.items.filter(matches) : g.items }))
      .filter((g) => g.items.length > 0);
    return { groups, items: [], hasItems: groups.length > 0 };
  }
  const items = Array.isArray(c.items)
    ? (normalizedQuery ? c.items.filter(matches) : c.items)
    : [];
  return { groups: [], items, hasItems: items.length > 0 };
}

function matchesItem(item: Item, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return `${item.label} ${item.description ?? ''}`.toLowerCase().includes(normalizedQuery);
}

function refreshCategoryCounts(
  container: HTMLElement,
  categories: Category[],
  customItems: CustomItem[],
  selectedIds: Set<string>
) {
  categories.forEach((c) => {
    const all = allItemIdsOfCategory(c, customItems);
    const count = all.filter((id) => selectedIds.has(id)).length;
    const badge = container.querySelector<HTMLElement>(`.acc-count[data-cat="${c.id}"]`);
    if (badge) badge.textContent = count > 0 ? `${count}` : '';
    if (badge) badge.classList.toggle('has-selection', count > 0);
  });
}

function allItemIdsOfCategory(c: Category, customItems: CustomItem[]): string[] {
  const ids: string[] = [];
  if (Array.isArray(c.items)) c.items.forEach((it) => ids.push(it.id));
  if (Array.isArray(c.groups)) c.groups.forEach((g) => g.items.forEach((it) => ids.push(it.id)));
  customItems.filter((ci) => ci.categoryId === c.id).forEach((ci) => ids.push(ci.id));
  return ids;
}

function itemCheckboxRow(
  categoryId: string,
  item: Item,
  selectedIds: Set<string>,
  scales: Scale[],
  scaleByItem: Record<string, string>,
  defaultScaleId: string,
  handlers: RenderHandlers,
  isCustom = false
): HTMLElement {
  const isChecked = selectedIds.has(item.id);
  const row = el('div', { class: `item-row item-checkbox-row ${isCustom ? 'custom-item-row' : ''}` });

  const cb = el('input', {
    type: 'checkbox',
    class: 'item-checkbox',
    id: `cb-${item.id}`,
    'data-cat': categoryId,
    'data-item': item.id
  }) as HTMLInputElement;
  cb.checked = isChecked;
  cb.addEventListener('change', () => handlers.onToggle(categoryId, item.id, cb.checked));

  const label = el('label', { for: `cb-${item.id}`, class: 'item-label-text', text: item.label });
  if (isCustom) {
    label.append(el('span', { class: 'custom-badge', text: strings.labels.customItemBadge }));
  }

  const main = el('div', { class: 'item-main' }, cb, label);
  row.append(main);

  // Inline scale dropdown (only meaningful when checked, but always rendered for layout stability)
  const scaleSel = el('select', {
    class: 'inline-scale',
    'data-item': item.id,
    'aria-label': `${item.label} – ${strings.labels.scale}`
  }) as HTMLSelectElement;
  scales.forEach((s) => scaleSel.append(el('option', { value: s.id, text: scaleDisplay(s) })));
  scaleSel.value = scaleByItem[item.id] ?? defaultScaleId;
  scaleSel.disabled = !isChecked;
  scaleSel.addEventListener('change', () => handlers.onScaleChange(item.id, scaleSel.value));

  const actions = el('div', { class: 'item-actions' }, scaleSel);
  row.append(actions);

  return row;
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

export function renderMobileTabs(container: HTMLElement, activeView: MobileView, handlers: RenderHandlers) {
  container.querySelectorAll<HTMLButtonElement>('.mobile-tab').forEach((btn) => {
    const isActive = btn.dataset.mobileView === activeView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.onclick = () => handlers.onMobileViewChange(btn.dataset.mobileView as MobileView);
  });
  document.querySelectorAll<HTMLElement>('[data-mobile-panel]').forEach((panel) => {
    panel.classList.toggle('mobile-active', panel.dataset.mobilePanel === activeView);
  });
}

// ────────────────────────────────────────────────────────────────────
// A4 PREVIEW (= Druckausgabe)
// ────────────────────────────────────────────────────────────────────

export function renderPreview(
  container: HTMLElement,
  rows: ExportRow[],
  header: HeaderData,
  mode: PrintMode
) {
  container.innerHTML = '';

  container.append(el('h1', { class: 'a4-title', text: mode === 'checklist' ? 'Bewertungscheckliste' : 'Bewertungsbogen' }));

  // Header fields with blank lines (always shown — empty fields stay fillable on paper)
  container.append(renderA4Header(header));

  if (rows.length === 0) {
    container.append(el('p', { class: 'a4-empty', text: strings.labels.previewEmpty }));
  } else {
    container.append(renderA4Body(rows, mode));
  }

  container.append(renderA4Feedback(header));
}

function renderA4Header(header: HeaderData): HTMLElement {
  const wrap = el('div', { class: 'a4-header-fields' });

  const fields: [string, string][] = [
    [strings.kopfdaten.learner, header.learner],
    [strings.kopfdaten.learngroup, header.learngroup],
    [strings.kopfdaten.topic, header.topic],
    [strings.kopfdaten.date, header.date]
  ];

  fields.forEach(([label, value]) => {
    const row = el('div', { class: 'a4-hf-row' });
    row.append(el('span', { class: 'a4-hf-label', text: `${label}:` }));
    const valEl = el('span', { class: 'a4-hf-value' });
    if (value) valEl.textContent = value;
    row.append(valEl);
    wrap.append(row);
  });

  return wrap;
}

function renderA4Body(rows: ExportRow[], mode: PrintMode): HTMLElement {
  const wrap = el('div', { class: 'a4-body' });

  // Group rows by categoryId, preserve category order from first appearance
  const groups = new Map<string, { title: string; items: ExportRow[] }>();
  rows.forEach((r) => {
    if (!groups.has(r.categoryId)) groups.set(r.categoryId, { title: r.category, items: [] });
    groups.get(r.categoryId)!.items.push(r);
  });

  groups.forEach(({ title, items }) => {
    const section = el('section', { class: 'a4-cat-section' });
    section.append(el('h2', { class: 'a4-cat-heading', text: title }));
    const list = el('ol', { class: 'a4-items' });
    items.forEach((r) => list.append(renderA4Item(r, mode)));
    section.append(list);
    wrap.append(section);
  });

  return wrap;
}

function renderA4Item(row: ExportRow, mode: PrintMode): HTMLElement {
  const li = el('li', { class: 'a4-item' });

  if (mode === 'checklist') {
    li.append(el('span', { class: 'a4-cbox', text: '☐' }));
    li.append(el('span', { class: 'a4-item-label', text: row.item }));
    return li;
  }

  li.append(el('div', { class: 'a4-item-label', text: row.item }));
  if (row.scale) {
    li.append(renderScaleOptions(row.scale));
  } else {
    li.append(el('div', { class: 'a4-scale-line' }));
  }
  return li;
}

function renderScaleOptions(scale: Scale): HTMLElement {
  const wrap = el('div', { class: 'a4-scale-options' });
  scaleOptionLabels(scale).forEach((label) => {
    const opt = el('span', { class: 'a4-scale-opt' });
    opt.append(el('span', { class: 'a4-cbox', text: '☐' }));
    opt.append(el('span', { class: 'a4-scale-opt-text', text: label }));
    wrap.append(opt);
  });
  return wrap;
}

function scaleOptionLabels(scale: Scale): string[] {
  switch (scale.kind) {
    case 'verbal': return scale.labels;
    case 'numeric': {
      const out: string[] = [];
      for (let i = scale.min; i <= scale.max; i++) out.push(String(i));
      return out;
    }
    case 'emoji': return scale.set;
    case 'traffic': return ['Grün', 'Gelb', 'Rot'];
    case 'percent': return ['0 %', '25 %', '50 %', '75 %', '100 %'];
  }
}

function renderA4Feedback(header: HeaderData): HTMLElement {
  const section = el('div', { class: 'a4-feedback' });
  section.append(el('h2', { class: 'a4-feedback-title', text: strings.kopfdaten.feedback }));
  if (header.feedback) section.append(el('p', { class: 'a4-feedback-text', text: header.feedback }));
  // Blank lines for handwriting
  for (let i = 0; i < 5; i++) section.append(el('div', { class: 'a4-feedback-line' }));
  return section;
}
