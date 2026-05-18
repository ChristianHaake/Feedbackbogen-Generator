import './app.css';
import {
  renderLayout, renderKopfdaten, renderCategories,
  renderDefaultScaleSelect, renderPreview, renderModeSwitch, renderSelectedCounter
} from './ui/templates';
import { strings } from './strings';
import { setupKeyboardShortcuts, announce, focusVisiblePolyfill } from './a11y';
import { loadYAML, findItemById, scaleById, buildCategoriesWithCustom } from './yaml';
import { saveConfig, loadConfig, exportConfigJSON, importConfigJSON, EMPTY_HEADER } from './storage';
import type { AppConfigV2, SelectedItemRef, ExportRow, CustomItem, HeaderData, PrintMode } from './types';

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
  let scaleByItemMap: Record<string, string> = {};
  let defaultScaleId = scales[0]?.id ?? 'verbal_5';
  let header: HeaderData = { ...EMPTY_HEADER };
  let customItems: CustomItem[] = [];
  let previewMode: PrintMode = 'full';

  const persisted = loadConfig();
  if (persisted) {
    selected = persisted.selectedItems;
    scaleByItemMap = persisted.scaleByItem;
    if (persisted.defaultScaleId) defaultScaleId = persisted.defaultScaleId;
    header = { ...EMPTY_HEADER, ...(persisted.header ?? {}) };
    customItems = persisted.customItems ?? [];
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const counterEl = document.getElementById('selected-counter')!;
  const kopfdatenEl = document.getElementById('kopfdaten-form')!;
  const a4El = document.getElementById('a4-page')!;
  const defaultScaleSelectEl = document.getElementById('default-scale') as HTMLSelectElement;
  const modeSwitchEl = document.querySelector('.mode-switch') as HTMLElement;

  const handlers = {
    onToggle: (categoryId: string, itemId: string, checked: boolean) => {
      const idx = selected.findIndex((s) => s.itemId === itemId);
      if (checked && idx === -1) {
        selected.push({ categoryId, itemId });
      } else if (!checked && idx !== -1) {
        selected.splice(idx, 1);
        delete scaleByItemMap[itemId];
      }
      renderEditor();
      renderA4();
    },
    onScaleChange: (itemId: string, scaleId: string) => {
      scaleByItemMap[itemId] = scaleId;
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
      delete scaleByItemMap[itemId];
      renderEditor();
      renderA4();
      announce(strings.messages.customItemRemoved);
    },
    onHeaderChange: (field: keyof HeaderData, value: string) => {
      header = { ...header, [field]: value };
      renderA4();
    },
    onPreviewModeChange: (mode: PrintMode) => {
      previewMode = mode;
      renderModeSwitch(modeSwitchEl, previewMode, handlers);
      renderA4();
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
        const sId = scaleByItemMap[id] ?? defaultScaleId;
        const s = scaleById(scales, sId);
        out.push({ categoryId: c.id, category: c.title, item: label, scale: s });
      });
    });
    return out;
  }

  function persist() {
    saveConfig({
      version: 2,
      selectedItems: selected,
      scaleByItem: scaleByItemMap,
      defaultScaleId, header, customItems
    });
    announce(strings.messages.saved);
  }

  function loadPersisted() {
    const cfg = loadConfig();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
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
    renderCategories(categoriesEl, categories, customItems, selectedSet(), scales, scaleByItemMap, defaultScaleId, handlers);

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
  renderA4();

  // Toolbar
  document.getElementById('save')?.addEventListener('click', persist);
  document.getElementById('load')?.addEventListener('click', loadPersisted);
  document.getElementById('export-json')?.addEventListener('click', () =>
    exportConfigJSON({ version: 2, selectedItems: selected, scaleByItem: scaleByItemMap, defaultScaleId, header, customItems })
  );
  document.getElementById('import-json')?.addEventListener('click', async () => {
    const cfg = await importConfigJSON();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      header = { ...EMPTY_HEADER, ...(cfg.header ?? {}) };
      customItems = cfg.customItems ?? [];
      renderEditor();
      renderA4();
      announce(strings.messages.imported);
    }
  });

  const exportNowBtn = document.getElementById('export-now') as HTMLButtonElement | null;
  const exportFormatSel = document.getElementById('export-format') as HTMLSelectElement | null;
  if (exportFormatSel) exportFormatSel.value = 'pdf';

  exportNowBtn?.addEventListener('click', async () => {
    const fmt = exportFormatSel?.value ?? 'pdf';
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
  });

  setupKeyboardShortcuts(persist, async () => {
    (document.getElementById('export-now') as HTMLButtonElement)?.click();
  });
}

bootstrap();
