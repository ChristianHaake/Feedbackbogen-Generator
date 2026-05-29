import './app.css';
import {
  renderLayout, renderKopfdaten, renderCategories,
  renderDefaultScaleSelect, renderPreview, renderModeSwitch, renderSelectedCounter,
  renderSelectedList, renderMobileTabs
} from './ui/templates';
import { strings } from './strings';
import { setupKeyboardShortcuts, announce, focusVisiblePolyfill } from './a11y';
import { loadYAML, scaleById, buildCategoriesWithCustom } from './yaml';
import { saveConfig, loadConfig, exportConfigJSON, importConfigJSON, EMPTY_HEADER } from './storage';
import { scaleDisplay } from './scale-utils';
import type { SelectedItemRef, ExportRow, CustomItem, HeaderData, PrintMode } from './types';
import type { ExportFormat, MobileView, SelectedSummary } from './ui/templates';

async function bootstrap() {
  focusVisiblePolyfill();
  const root = document.getElementById('app')!;
  const app = renderLayout();
  root.append(app);

  const baseUrl = import.meta.env.BASE_URL as string;
  const data = await loadYAML(baseUrl);
  const categories = data.categories;
  const scales = data.scales;

  // State
  let selected: SelectedItemRef[] = [];
  let scaleByCategoryMap: Record<string, string> = {};
  let defaultScaleId = scales[0]?.id ?? 'verbal_5';
  let header: HeaderData = { ...EMPTY_HEADER };
  let customItems: CustomItem[] = [];
  let previewMode: PrintMode = 'full';
  let searchQuery = '';
  let mobileView: MobileView = 'edit';

  const persisted = loadConfig();
  if (persisted) {
    selected = persisted.selectedItems;
    scaleByCategoryMap = persisted.scaleByCategory;
    if (persisted.defaultScaleId) defaultScaleId = persisted.defaultScaleId;
    header = { ...EMPTY_HEADER, ...(persisted.header ?? {}) };
    customItems = persisted.customItems ?? [];
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const counterEl = document.getElementById('selected-counter')!;
  const selectedListEl = document.getElementById('selected-list')!;
  const kopfdatenEl = document.getElementById('kopfdaten-form')!;
  const a4El = document.getElementById('a4-page')!;
  const defaultScaleSelectEl = document.getElementById('default-scale') as HTMLSelectElement;
  const criteriaSearchEl = document.getElementById('criteria-search') as HTMLInputElement;
  const clearSelectionEl = document.getElementById('clear-selection') as HTMLButtonElement;
  const modeSwitchEl = document.querySelector('.mode-switch') as HTMLElement;
  const mobileTabsEl = document.querySelector('.mobile-tabs') as HTMLElement;

  const handlers = {
    onToggle: (categoryId: string, itemId: string, checked: boolean) => {
      const idx = selected.findIndex((s) => s.itemId === itemId);
      if (checked && idx === -1) {
        selected.push({ categoryId, itemId });
      } else if (!checked && idx !== -1) {
        selected.splice(idx, 1);
      }
      renderEditor();
      renderA4();
    },
    onCategoryScaleChange: (categoryId: string, scaleId: string) => {
      scaleByCategoryMap[categoryId] = scaleId;
      renderEditor();
      renderA4();
    },
    onDefaultScaleChange: (scaleId: string) => {
      defaultScaleId = scaleId;
      renderEditor();
      renderA4();
    },
    onAddCustomItem: (categoryId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const id = `custom_${categoryId}_${Date.now()}`;
      customItems.push({ id, label: trimmed, custom: true, categoryId });
      renderEditor();
      announce(strings.messages.customItemAdded);
    },
    onRemoveCustomItem: (itemId: string) => {
      customItems = customItems.filter((ci) => ci.id !== itemId);
      selected = selected.filter((s) => s.itemId !== itemId);
      renderEditor();
      renderA4();
      announce(strings.messages.customItemRemoved);
    },
    onRemoveSelected: (itemId: string) => {
      selected = selected.filter((s) => s.itemId !== itemId);
      renderEditor();
      renderA4();
    },
    onSelectCategory: (categoryId: string) => {
      const ids = itemIdsOfCategory(categoryId);
      ids.forEach((itemId) => {
        if (!selected.some((s) => s.itemId === itemId)) selected.push({ categoryId, itemId });
      });
      renderEditor();
      renderA4();
    },
    onClearCategory: (categoryId: string) => {
      const ids = new Set(itemIdsOfCategory(categoryId));
      selected = selected.filter((s) => !ids.has(s.itemId));
      renderEditor();
      renderA4();
    },
    onClearSelection: () => {
      selected = [];
      renderEditor();
      renderA4();
    },
    onSearchChange: (value: string) => {
      searchQuery = value;
      renderEditor();
    },
    onHeaderChange: (field: keyof HeaderData, value: string) => {
      header = { ...header, [field]: value };
      renderA4();
    },
    onPreviewModeChange: (mode: PrintMode) => {
      previewMode = mode;
      renderModeSwitch(modeSwitchEl, previewMode, handlers);
      renderA4();
    },
    onMobileViewChange: (view: MobileView) => {
      mobileView = view;
      renderMobileTabs(mobileTabsEl, mobileView, handlers);
    }
  };

  function selectedSet(): Set<string> {
    return new Set(selected.map((s) => s.itemId));
  }

  function buildExportRows(): ExportRow[] {
    const merged = buildCategoriesWithCustom(categories, customItems);
    // Output: grouped by category (YAML category order), within category in YAML item order;
    // only items that are selected appear.
    const selectedIds = selectedSet();
    const out: ExportRow[] = [];
    merged.forEach((c) => {
      const ids: { id: string; label: string }[] = [];
      if (Array.isArray(c.items)) c.items.forEach((it) => ids.push({ id: it.id, label: it.label }));
      if (Array.isArray(c.groups)) c.groups.forEach((g) => g.items.forEach((it) => ids.push({ id: it.id, label: it.label })));
      ids.forEach(({ id, label }) => {
        if (!selectedIds.has(id)) return;
        const sId = scaleByCategoryMap[c.id] ?? defaultScaleId;
        const s = scaleById(scales, sId);
        out.push({ categoryId: c.id, category: c.title, item: label, scale: s });
      });
    });
    return out;
  }

  function buildSelectedSummaries(): SelectedSummary[] {
    const customIds = new Set(customItems.map((ci) => ci.id));
    const merged = buildCategoriesWithCustom(categories, customItems);
    const selectedIds = selectedSet();
    const out: SelectedSummary[] = [];
    merged.forEach((category) => {
      const items: { id: string; label: string }[] = [];
      if (Array.isArray(category.items)) category.items.forEach((item) => items.push({ id: item.id, label: item.label }));
      if (Array.isArray(category.groups)) category.groups.forEach((group) => group.items.forEach((item) => items.push({ id: item.id, label: item.label })));
      items.forEach((item) => {
        if (!selectedIds.has(item.id)) return;
        const scale = scaleById(scales, scaleByCategoryMap[category.id] ?? defaultScaleId);
        out.push({
          itemId: item.id,
          categoryId: category.id,
          category: category.title,
          item: item.label,
          scaleLabel: scale ? scaleDisplay(scale) : strings.labels.scale,
          isCustom: customIds.has(item.id)
        });
      });
    });
    return out;
  }

  function itemIdsOfCategory(categoryId: string): string[] {
    const merged = buildCategoriesWithCustom(categories, customItems);
    const category = merged.find((c) => c.id === categoryId);
    if (!category) return [];
    const ids: string[] = [];
    if (Array.isArray(category.items)) category.items.forEach((item) => ids.push(item.id));
    if (Array.isArray(category.groups)) category.groups.forEach((group) => group.items.forEach((item) => ids.push(item.id)));
    return ids;
  }

  function persist() {
    saveConfig({
      selectedItems: selected,
      scaleByCategory: scaleByCategoryMap,
      defaultScaleId, header, customItems
    });
    announce(strings.messages.saved);
  }

  function loadPersisted() {
    const cfg = loadConfig();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByCategoryMap = cfg.scaleByCategory;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      header = { ...EMPTY_HEADER, ...(cfg.header ?? {}) };
      customItems = cfg.customItems ?? [];
      renderEditor();
      renderA4();
      announce(strings.messages.loaded);
    }
  }

  function renderEditor() {
    // Preserve any in-progress custom item inputs
    const savedInputs: Record<string, string> = {};
    document.querySelectorAll<HTMLInputElement>('.custom-item-input[data-cat]').forEach((el) => {
      if (el.dataset.cat) savedInputs[el.dataset.cat] = el.value;
    });
    // Preserve accordion open state
    const openCats = new Set<string>();
    document.querySelectorAll<HTMLButtonElement>('.accordion-header[aria-expanded="true"]').forEach((h) => {
      const id = h.id.replace(/^acc-/, '');
      openCats.add(id);
    });

    renderKopfdaten(kopfdatenEl, header, handlers.onHeaderChange);
    renderDefaultScaleSelect(defaultScaleSelectEl, scales, defaultScaleId, handlers);
    renderSelectedCounter(counterEl, selected.length);
    renderSelectedList(selectedListEl, buildSelectedSummaries(), handlers);
    renderCategories(categoriesEl, categories, customItems, selectedSet(), scales, scaleByCategoryMap, defaultScaleId, handlers, searchQuery);
    criteriaSearchEl.value = searchQuery;
    clearSelectionEl.disabled = selected.length === 0;

    // Restore inputs
    Object.entries(savedInputs).forEach(([catId, val]) => {
      const el = document.querySelector<HTMLInputElement>(`.custom-item-input[data-cat="${catId}"]`);
      if (el) el.value = val;
    });
    // Restore accordion state
    openCats.forEach((catId) => {
      const header = document.getElementById(`acc-${catId}`);
      const panel = document.getElementById(`acc-${catId}-panel`);
      if (header && panel) {
        header.setAttribute('aria-expanded', 'true');
        panel.classList.add('open');
        (panel as HTMLDivElement).hidden = false;
      }
    });
  }

  function renderA4() {
    renderPreview(a4El, buildExportRows(), header, previewMode);
  }

  renderEditor();
  renderModeSwitch(modeSwitchEl, previewMode, handlers);
  renderMobileTabs(mobileTabsEl, mobileView, handlers);
  renderA4();

  // Toolbar
  document.getElementById('save')?.addEventListener('click', persist);
  document.getElementById('load')?.addEventListener('click', loadPersisted);
  const exportJson = () => {
    exportConfigJSON({ selectedItems: selected, scaleByCategory: scaleByCategoryMap, defaultScaleId, header, customItems });
  };
  const importJson = async () => {
    const cfg = await importConfigJSON();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByCategoryMap = cfg.scaleByCategory;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      header = { ...EMPTY_HEADER, ...(cfg.header ?? {}) };
      customItems = cfg.customItems ?? [];
      renderEditor();
      renderA4();
      announce(strings.messages.imported);
    }
  };
  document.getElementById('export-json')?.addEventListener('click', exportJson);
  document.getElementById('export-json-mobile')?.addEventListener('click', exportJson);
  document.getElementById('import-json')?.addEventListener('click', importJson);
  document.getElementById('import-json-mobile')?.addEventListener('click', importJson);
  criteriaSearchEl.addEventListener('input', () => handlers.onSearchChange(criteriaSearchEl.value));
  clearSelectionEl.addEventListener('click', handlers.onClearSelection);

  async function exportFormat(fmt: ExportFormat) {
    announce(strings.messages.exported);
    if (fmt === 'pdf') {
      window.print();
    } else if (fmt === 'docx') {
      const { exportDOCX } = await import('./export/export-docx');
      exportDOCX(buildExportRows(), header, previewMode);
    } else if (fmt === 'xlsx') {
      const { exportXLSX } = await import('./export/export-xlsx');
      exportXLSX(buildExportRows());
    } else if (fmt === 'odp') {
      const { exportODP } = await import('./export/export-odp');
      exportODP(buildExportRows());
    }
  }

  document.querySelectorAll<HTMLButtonElement>('[data-export-format]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll<HTMLDetailsElement>('.action-menu[open]').forEach((menu) => menu.removeAttribute('open'));
      exportFormat(btn.dataset.exportFormat as ExportFormat);
    });
  });

  setupKeyboardShortcuts(persist, async () => {
    exportFormat('pdf');
  });
}

bootstrap();
