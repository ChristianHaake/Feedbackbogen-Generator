import './app.css';
import {
  renderLayout, renderKopfdaten, renderCategories, renderSelected,
  renderDefaultScaleSelect, renderPreview, renderModeSwitch
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
  let weightByItemMap: Record<string, number> = {};
  let defaultScaleId = scales[0]?.id ?? 'verbal_5';
  let header: HeaderData = { ...EMPTY_HEADER };
  let customItems: CustomItem[] = [];
  let previewMode: PrintMode = 'full';

  const persisted = loadConfig();
  if (persisted) {
    selected = persisted.selectedItems;
    scaleByItemMap = persisted.scaleByItem;
    weightByItemMap = persisted.weightByItem ?? {};
    if (persisted.defaultScaleId) defaultScaleId = persisted.defaultScaleId;
    header = persisted.header ?? { ...EMPTY_HEADER };
    customItems = persisted.customItems ?? [];
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const selectedEl = document.getElementById('selected')!;
  const kopfdatenEl = document.getElementById('kopfdaten-form')!;
  const a4El = document.getElementById('a4-page')!;
  const defaultScaleSelectEl = document.getElementById('default-scale') as HTMLSelectElement;
  const modeSwitchEl = document.querySelector('.mode-switch') as HTMLElement;

  const handlers = {
    onAdd: (categoryId: string, itemId: string) => {
      if (!selected.some((s) => s.itemId === itemId)) selected.push({ categoryId, itemId });
      renderEditor();
      renderA4();
    },
    onRemove: (itemId: string) => {
      selected = selected.filter((s) => s.itemId !== itemId);
      delete scaleByItemMap[itemId];
      delete weightByItemMap[itemId];
      renderEditor();
      renderA4();
      announce(strings.messages.removed);
    },
    onReorder: (from: number, to: number) => {
      const [moved] = selected.splice(from, 1);
      selected.splice(to, 0, moved);
      renderEditor();
      renderA4();
    },
    onScaleChange: (itemId: string, scaleId: string) => {
      scaleByItemMap[itemId] = scaleId;
      renderA4();
    },
    onWeightChange: (itemId: string, weight: number) => {
      weightByItemMap[itemId] = weight;
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
      delete weightByItemMap[itemId];
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

  function buildExportRows(): ExportRow[] {
    const merged = buildCategoriesWithCustom(categories, customItems);
    return selected.map((ref) => {
      const found = findItemById(merged, ref.itemId);
      if (!found) return null;
      const sId = scaleByItemMap[ref.itemId] ?? defaultScaleId;
      const s = scaleById(scales, sId);
      let scaleLabel = '';
      if (s) {
        switch (s.kind) {
          case 'verbal': scaleLabel = s.labels.join(' | '); break;
          case 'numeric': scaleLabel = `${s.min}–${s.max}`; break;
          case 'emoji': scaleLabel = s.set.join(' '); break;
          case 'traffic': scaleLabel = 'Grün / Gelb / Rot'; break;
          case 'percent': scaleLabel = '0–100%'; break;
        }
      }
      return {
        category: found.category.title,
        item: found.item.label,
        description: found.item.description,
        scaleLabel,
        weight: weightByItemMap[ref.itemId] ?? 1
      };
    }).filter((r): r is ExportRow => r !== null);
  }

  function persist() {
    saveConfig({
      version: 2,
      selectedItems: selected,
      scaleByItem: scaleByItemMap,
      weightByItem: weightByItemMap,
      defaultScaleId, header, customItems
    });
    announce(strings.messages.saved);
  }

  function loadPersisted() {
    const cfg = loadConfig();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
      weightByItemMap = cfg.weightByItem ?? {};
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      header = cfg.header ?? { ...EMPTY_HEADER };
      customItems = cfg.customItems ?? [];
      renderEditor();
      renderA4();
      announce(strings.messages.loaded);
    }
  }

  // Render the editor sidebar (kopfdaten + categories + selected)
  function renderEditor() {
    const savedInputs: Record<string, string> = {};
    document.querySelectorAll<HTMLInputElement>('.custom-item-input[data-cat]').forEach((el) => {
      if (el.dataset.cat) savedInputs[el.dataset.cat] = el.value;
    });

    const merged = buildCategoriesWithCustom(categories, customItems);
    renderKopfdaten(kopfdatenEl, header, handlers.onHeaderChange);
    renderCategories(categoriesEl, categories, customItems, handlers);
    renderDefaultScaleSelect(defaultScaleSelectEl, scales, defaultScaleId, handlers);
    renderSelected(selectedEl, selected, merged, scales, scaleByItemMap, weightByItemMap, defaultScaleId, handlers);

    Object.entries(savedInputs).forEach(([catId, val]) => {
      const el = document.querySelector<HTMLInputElement>(`.custom-item-input[data-cat="${catId}"]`);
      if (el) el.value = val;
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
    exportConfigJSON({ version: 2, selectedItems: selected, scaleByItem: scaleByItemMap, weightByItem: weightByItemMap, defaultScaleId, header, customItems })
  );
  document.getElementById('import-json')?.addEventListener('click', async () => {
    const cfg = await importConfigJSON();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
      weightByItemMap = cfg.weightByItem ?? {};
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      header = cfg.header ?? { ...EMPTY_HEADER };
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
      exportDOCX(buildExportRows(), header);
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
