import { describe, expect, it, vi } from 'vitest';

import {
  renderCategories, renderKopfdaten, renderSelectedList, type RenderHandlers, type SelectedSummary
} from '@/ui/templates';
import type { Category, HeaderData, Scale } from '@/types';

const items: SelectedSummary[] = [
  { categoryId: 'a', category: 'Kategorie A', itemId: 'a1', item: 'Kriterium A1', scaleLabel: 'Skala', isCustom: false },
  { categoryId: 'a', category: 'Kategorie A', itemId: 'a2', item: 'Kriterium A2', scaleLabel: 'Skala', isCustom: false },
  { categoryId: 'b', category: 'Kategorie B', itemId: 'b1', item: 'Kriterium B1', scaleLabel: 'Skala', isCustom: false }
];

describe('selected order UI', () => {
  it('renders an accessible item description tooltip only for non-empty descriptions', () => {
    const handlers = handlerSpies();
    const container = document.createElement('div');
    document.body.append(container);
    const categories: Category[] = [{
      id: 'a',
      title: 'Kategorie A',
      items: [
        { id: 'with-description', label: 'Mit Beschreibung', description: 'Eine längere Erklärung zum Kriterium.' },
        { id: 'empty-description', label: 'Leere Beschreibung', description: '   ' },
        { id: 'without-description', label: 'Ohne Beschreibung' }
      ]
    }];
    const scales: Scale[] = [{ id: 'percent', label: 'Prozent', kind: 'percent' }];

    renderCategories(container, categories, [], new Set(), scales, {}, {}, 'percent', {}, handlers);

    const button = container.querySelector<HTMLButtonElement>('.item-description-button');
    const tooltip = container.querySelector<HTMLElement>('.item-description-tooltip');
    expect(container.querySelectorAll('.item-description-button')).toHaveLength(1);
    expect(button?.getAttribute('aria-label')).toBe('Beschreibung zu Mit Beschreibung');
    expect(button?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(tooltip?.textContent).toBe('Eine längere Erklärung zum Kriterium.');

    button?.focus();
    expect(document.activeElement).toBe(button);
    container.remove();
  });

  it('moves categories through the drag-and-drop handler', () => {
    const handlers = handlerSpies();
    const container = document.createElement('div');
    renderSelectedList(container, items, handlers);
    const source = container.querySelector<HTMLButtonElement>('[aria-label^="Kategorie verschieben: Kategorie B"]')!;
    const target = container.querySelector<HTMLElement>('[data-category-id="a"]')!;
    const transfer = dataTransfer();

    source.dispatchEvent(dragEvent('dragstart', transfer));
    target.dispatchEvent(dragEvent('dragover', transfer));
    target.dispatchEvent(dragEvent('drop', transfer));

    expect(handlers.onReorderCategory).toHaveBeenCalledWith('b', 'a');
  });

  it('moves criteria through the drag-and-drop and keyboard handlers', () => {
    const handlers = handlerSpies();
    const container = document.createElement('div');
    renderSelectedList(container, items, handlers);
    const source = container.querySelector<HTMLButtonElement>('[aria-label^="Kriterium verschieben: Kriterium A2"]')!;
    const target = container.querySelector<HTMLElement>('[data-category-id="a"] [data-item-id="a1"]')!;
    const transfer = dataTransfer();

    source.dispatchEvent(dragEvent('dragstart', transfer));
    target.dispatchEvent(dragEvent('drop', transfer));
    expect(handlers.onReorderItem).toHaveBeenCalledWith('a', 'a2', 'a1');

    source.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(handlers.onReorderItem).toHaveBeenCalledWith('a', 'a2', 'a1');
  });

  it('moves header fields through the drag-and-drop and keyboard handlers', () => {
    const handlers = handlerSpies();
    const header: HeaderData = {
      fields: [
        { id: 'name', label: 'Name', value: '' },
        { id: 'topic', label: 'Thema', value: '' }
      ]
    };
    const container = document.createElement('div');
    renderKopfdaten(container, header, handlers);
    const source = container.querySelector<HTMLButtonElement>('[aria-label^="Kopffeld verschieben: Thema"]')!;
    const target = container.querySelector<HTMLElement>('[data-header-field-id="name"]')!;
    const transfer = dataTransfer();

    source.dispatchEvent(dragEvent('dragstart', transfer));
    target.dispatchEvent(dragEvent('drop', transfer));
    expect(handlers.onReorderHeaderField).toHaveBeenCalledWith('topic', 'name');

    source.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(handlers.onReorderHeaderField).toHaveBeenCalledWith('topic', 'name');
  });

  it('passes the exact header field label to the change handler without mutation', () => {
    const handlers = handlerSpies();
    const header: HeaderData = { fields: [{ id: 'name', label: '', value: '' }] };
    const container = document.createElement('div');
    renderKopfdaten(container, header, handlers);
    const labelInput = container.querySelector<HTMLInputElement>('#kd-label-name')!;

    labelInput.value = 'Lehrperson ä ö ü ß';
    labelInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handlers.onHeaderFieldLabelChange).toHaveBeenCalledWith('name', 'Lehrperson ä ö ü ß');
  });

  it('filters and clamps numeric scale range inputs', () => {
    const handlers = handlerSpies();
    const container = document.createElement('div');
    const categories: Category[] = [{ id: 'a', title: 'Kategorie A', items: [{ id: 'a1', label: 'Kriterium A1' }] }];
    const scales: Scale[] = [{
      id: 'points',
      label: 'Punkte',
      kind: 'numeric',
      defaultMin: 0,
      defaultMax: 10,
      minLimit: 0,
      maxLimit: 20,
      maxSteps: 11
    }];

    renderCategories(container, categories, [], new Set(), scales, { a: 'points' }, {}, 'points', {}, handlers);
    const minInput = container.querySelector<HTMLInputElement>('#a-scale-min')!;
    const maxInput = container.querySelector<HTMLInputElement>('#a-scale-max')!;

    minInput.value = '10';
    minInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '10' }));
    maxInput.value = '99';
    maxInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '99' }));
    expect(handlers.onNumericScaleRangeChange).toHaveBeenLastCalledWith('a', 10, 20);
    expect(maxInput.value).toBe('20');

    minInput.value = 'e.7';
    minInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'e.7' }));
    maxInput.value = '1.2e3';
    maxInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '1.2e3' }));
    expect(handlers.onNumericScaleRangeChange).toHaveBeenLastCalledWith('a', 7, 12);
    expect(minInput.value).toBe('7');
    expect(maxInput.value).toBe('12');
  });
});

describe('category editing (rename / add / weight)', () => {
  const categories: Category[] = [
    { id: 'a', title: 'Kategorie A', items: [{ id: 'a1', label: 'Kriterium A1' }] },
    { id: 'custom_cat_1', title: 'Eigene Kategorie', items: [] }
  ];
  const scales: Scale[] = [{ id: 'percent', label: 'Prozent', kind: 'percent' }];

  function renderEditable(weights: Record<string, number> = {}) {
    const handlers = handlerSpies();
    const container = document.createElement('div');
    document.body.append(container);
    renderCategories(container, categories, [], new Set(), scales, {}, {}, 'percent', {}, handlers, '', true, weights);
    return { handlers, container };
  }

  it('renders a title input per category, a weight input, and an add-category row', () => {
    const { container } = renderEditable({ a: 40 });
    expect(container.querySelectorAll('.category-title-input')).toHaveLength(2);
    expect(container.querySelector('.add-category-row')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('.category-weight-input[data-cat="a"]')?.value).toBe('40');
    // delete button only on the custom category's edit row
    expect(container.querySelectorAll('.category-edit-row .btn-icon.danger')).toHaveLength(1);
    container.remove();
  });

  it('warns when the weight sum is not 100 %', () => {
    const { container } = renderEditable({ a: 40 });
    expect(container.querySelector('.weight-sum-note')?.textContent).toContain('40');
    container.remove();
  });

  it('fires rename, add and weight handlers from the editing controls', () => {
    const { handlers, container } = renderEditable();
    const titleInput = container.querySelector<HTMLInputElement>('.category-title-input[data-cat="a"]')!;
    titleInput.value = 'Inhalt';
    titleInput.dispatchEvent(new Event('blur'));
    expect(handlers.onCategoryTitleChange).toHaveBeenCalledWith('a', 'Inhalt');

    const weightInput = container.querySelector<HTMLInputElement>('.category-weight-input[data-cat="a"]')!;
    weightInput.value = '40';
    weightInput.dispatchEvent(new Event('change'));
    expect(handlers.onCategoryWeightChange).toHaveBeenCalledWith('a', 40);

    const addInput = container.querySelector<HTMLInputElement>('.add-category-input')!;
    addInput.value = 'Sprache';
    container.querySelector<HTMLButtonElement>('.add-category-btn')!.click();
    expect(handlers.onAddCategory).toHaveBeenCalledWith('Sprache');
    container.remove();
  });
});

function dataTransfer(): DataTransfer {
  const entries = new Map<string, string>();
  const transfer = {
    effectAllowed: 'uninitialized',
    dropEffect: 'none',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: vi.fn(),
    getData: (type: string) => entries.get(type) ?? '',
    setData: (type: string, value: string) => {
      entries.set(type, value);
      (transfer.types as string[]).splice(0, transfer.types.length, ...entries.keys());
    },
    setDragImage: vi.fn()
  } as unknown as DataTransfer;
  return transfer;
}

function dragEvent(type: string, dataTransfer: DataTransfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

function handlerSpies(): RenderHandlers {
  return {
    onToggle: vi.fn(),
    onCategoryScaleChange: vi.fn(),
    onNumericScaleRangeChange: vi.fn(),
    onDefaultScaleChange: vi.fn(),
    onAddCustomItem: vi.fn(),
    onBulkAddCustomItems: vi.fn(),
    onRemoveCustomItem: vi.fn(),
    onRemoveSelected: vi.fn(),
    onSelectCategory: vi.fn(),
    onClearCategory: vi.fn(),
    onClearSelection: vi.fn(),
    onReorderCategory: vi.fn(),
    onCategoryTitleChange: vi.fn(),
    onAddCategory: vi.fn(),
    onRemoveCategory: vi.fn(),
    onCategoryWeightChange: vi.fn(),
    onReorderItem: vi.fn(),
    onSearchChange: vi.fn(),
    onOpenProductFormatModal: vi.fn(),
    onCloseProductFormatModal: vi.fn(),
    onProductFormatSearchChange: vi.fn(),
    onToggleProductFormat: vi.fn(),
    onDocumentTitleModeChange: vi.fn(),
    onDocumentTitleCustomChange: vi.fn(),
    onHeaderFieldLabelChange: vi.fn(),
    onHeaderFieldValueChange: vi.fn(),
    onAddHeaderField: vi.fn(),
    onRemoveHeaderField: vi.fn(),
    onReorderHeaderField: vi.fn(),
    onFooterFieldToggle: vi.fn(),
    onPreviewModeChange: vi.fn(),
    onMobileViewChange: vi.fn()
  };
}
