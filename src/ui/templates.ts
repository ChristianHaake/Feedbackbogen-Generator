import type { Category, Scale, SelectedItemRef } from '@/types';
import { el, icon } from './components';
import { strings } from '@/strings';
import { scaleDisplay } from '@/scale-utils';

export type RenderHandlers = {
  onAdd: (categoryId: string, itemId: string) => void;
  onRemove: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onScaleChange: (itemId: string, scaleId: string) => void;
  onDefaultScaleChange: (scaleId: string) => void;
};

export function renderLayout(): HTMLElement {
  const app = el('div', { id: 'app-root', class: 'app' });
  const header = el(
    'header',
    { class: 'toolbar', role: 'toolbar', 'aria-label': 'Werkzeugleiste' },
    el('div', { class: 'left' }, el('img', { src: './favicon.svg', alt: '', width: '24', height: '24' }), el('strong', { class: 'title', text: strings.appTitle })),
    el(
      'div',
      { class: 'actions' },
      toolbarButton('save', strings.toolbar.save, 'save'),
      toolbarButton('file', strings.toolbar.load, 'load'),
      el('span', { class: 'divider', role: 'separator', 'aria-orientation': 'vertical' }),
      toolbarButton('download', strings.toolbar.exportJson, 'export-json'),
      toolbarButton('upload', strings.toolbar.importJson, 'import-json'),
      el('span', { class: 'divider', role: 'separator', 'aria-orientation': 'vertical' }),
      toolbarButton('pdf', strings.toolbar.exportPdf, 'export-pdf'),
      toolbarButton('doc', strings.toolbar.exportDocx, 'export-docx'),
      toolbarButton('xlsx', strings.toolbar.exportXlsx, 'export-xlsx'),
      toolbarButton('odp', strings.toolbar.exportOdp, 'export-odp')
    )
  );

  const main = el(
    'main',
    { class: 'columns' },
    el('section', { class: 'col col-left' }, el('h2', { text: strings.columns.categories }), el('div', { id: 'categories', class: 'accordion' })),
    el('section', { class: 'col col-middle' }, el('h2', { text: strings.columns.selected }), el('ol', { id: 'selected', class: 'selected', role: 'list' })),
    el('section', { class: 'col col-right' }, el('h2', { text: strings.columns.scales }), el('div', { id: 'scales-panel', class: 'scales' }))
  );

  const live = el('div', { id: 'aria-live', 'aria-live': 'polite', 'aria-atomic': 'true', class: 'sr-only', role: 'status', 'aria-label': strings.a11y.status });

  app.append(header, main, live);
  return app;
}

function toolbarButton(iconId: string, label: string, id?: string) {
  const btn = el('button', { class: 'btn', type: 'button', id: id || undefined });
  btn.append(icon(`icon-${iconId}`), el('span', { class: 'btn-label', text: label }));
  return btn;
}

export function renderCategories(container: HTMLElement, categories: Category[], handlers: RenderHandlers) {
  container.innerHTML = '';
  categories.forEach((c) => {
    const buttonId = `acc-${c.id}`;
    const header = el(
      'button',
      { class: 'accordion-header', 'aria-expanded': 'false', id: buttonId, 'aria-controls': `${buttonId}-panel` },
      el('span', { class: 'acc-title', text: c.title })
    );
    const panel = el('div', { id: `${buttonId}-panel`, class: 'accordion-panel', role: 'region', 'aria-labelledby': buttonId });
    (panel as HTMLDivElement).hidden = true;
    c.items.forEach((it) => {
      const row = el('div', { class: 'item-row' }, el('div', { class: 'item-text' }, el('div', { class: 'item-label', text: it.label }), it.description ? el('div', { class: 'item-desc', text: it.description }) : null), el('div', { class: 'item-actions' }, addButton(() => handlers.onAdd(c.id, it.id))));
      panel.append(row);
    });
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

function addButton(onClick: () => void) {
  const btn = el('button', { class: 'btn btn-small', type: 'button', title: strings.labels.add, 'aria-label': strings.labels.add });
  btn.append(icon('icon-plus'));
  btn.addEventListener('click', onClick);
  return btn;
}

export function renderSelected(
  container: HTMLElement,
  selected: SelectedItemRef[],
  categories: Category[],
  handlers: RenderHandlers
) {
  container.innerHTML = '';
  selected.forEach((ref, index) => {
    const cat = categories.find((c) => c.id === ref.categoryId);
    if (!cat) return;
    const item = cat.items.find((i) => i.id === ref.itemId);
    if (!item) return;
    const li = el('li', { class: 'selected-row', draggable: 'true', role: 'listitem', tabindex: '0', 'aria-label': item.label });
    li.dataset.index = String(index);
    const handle = el('span', { class: 'drag-handle', title: strings.labels.reorder, 'aria-hidden': 'true' }, icon('icon-reorder'));
    const text = el('span', { class: 'selected-text' }, item.label);
    const removeBtn = el('button', { class: 'btn btn-small danger', type: 'button', title: strings.labels.remove, 'aria-label': strings.labels.remove }, icon('icon-trash'));
    removeBtn.addEventListener('click', () => handlers.onRemove(ref.itemId));
    li.append(handle, text, removeBtn);

    // Drag-and-drop
    li.addEventListener('dragstart', (e) => {
      (e.dataTransfer as DataTransfer).setData('text/plain', String(index));
      (e.dataTransfer as DataTransfer).effectAllowed = 'move';
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      (e.dataTransfer as DataTransfer).dropEffect = 'move';
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number((e.dataTransfer as DataTransfer).getData('text/plain'));
      const to = Number(li.dataset.index || '0');
      if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) handlers.onReorder(from, to);
    });

    // Keyboard reordering
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handlers.onRemove(ref.itemId);
      }
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        handlers.onReorder(index, index - 1);
      }
      if (e.key === 'ArrowDown' && index < selected.length - 1) {
        e.preventDefault();
        handlers.onReorder(index, index + 1);
      }
    });

    container.append(li);
  });
}

export function renderScalesPanel(
  container: HTMLElement,
  selected: SelectedItemRef[],
  categories: Category[],
  scales: Scale[],
  scaleByItem: Record<string, string>,
  defaultScaleId: string,
  handlers: RenderHandlers
) {
  container.innerHTML = '';

  const defaultSelect = el('select', { id: 'default-scale', 'aria-label': strings.labels.defaultScale });
  scales.forEach((s) => defaultSelect.append(el('option', { value: s.id, text: `${s.id} – ${scaleDisplay(s)}` })));
  defaultSelect.value = defaultScaleId;
  defaultSelect.addEventListener('change', () => handlers.onDefaultScaleChange((defaultSelect as HTMLSelectElement).value));
  const defaultWrap = el('div', { class: 'default-scale' }, el('label', { for: 'default-scale', text: strings.labels.defaultScale }), defaultSelect);
  container.append(defaultWrap);

  selected.forEach((ref) => {
    const cat = categories.find((c) => c.id === ref.categoryId);
    if (!cat) return;
    const item = cat.items.find((i) => i.id === ref.itemId);
    if (!item) return;

    const select = el('select', { 'data-item': ref.itemId, 'aria-label': `${item.label} – ${strings.labels.scale}` }) as HTMLSelectElement;
    scales.forEach((s) => select.append(el('option', { value: s.id, text: `${s.id} – ${scaleDisplay(s)}` })));
    select.value = scaleByItem[ref.itemId] || defaultScaleId;
    select.addEventListener('change', () => handlers.onScaleChange(ref.itemId, select.value));

    const row = el('div', { class: 'scale-row' }, el('div', { class: 'scale-item-label', text: item.label }), select);
    container.append(row);
  });
}
