import './app.css';
import { renderLayout, renderKopfdaten, renderCategories, renderSelected, renderScalesPanel, renderPreview } from './ui/templates';
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
  let previewVisible = false;

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
  const scalesPanelEl = document.getElementById('scales-panel')!;
  const kopfdatenEl = document.getElementById('kopfdaten-form')!;
  const previewContentEl = document.getElementById('preview-content')!;
  const previewSection = document.getElementById('preview-section') as HTMLElement;
  const previewToggleBtn = document.getElementById('toggle-preview') as HTMLButtonElement;

  const handlers = {
    onAdd: (categoryId: string, itemId: string) => {
      if (!selected.some((s) => s.itemId === itemId)) selected.push({ categoryId, itemId });
      renderAll();
    },
    onRemove: (itemId: string) => {
      selected = selected.filter((s) => s.itemId !== itemId);
      delete scaleByItemMap[itemId];
      delete weightByItemMap[itemId];
      renderAll();
      announce(strings.messages.removed);
    },
    onReorder: (from: number, to: number) => {
      const [moved] = selected.splice(from, 1);
      selected.splice(to, 0, moved);
      renderAll();
    },
    onScaleChange: (itemId: string, scaleId: string) => {
      scaleByItemMap[itemId] = scaleId;
      renderPreview(previewContentEl, buildExportRows(), header);
    },
    onWeightChange: (itemId: string, weight: number) => {
      weightByItemMap[itemId] = weight;
      renderPreview(previewContentEl, buildExportRows(), header);
    },
    onDefaultScaleChange: (scaleId: string) => {
      defaultScaleId = scaleId;
      renderAll();
    },
    onAddCustomItem: (categoryId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const id = `custom_${categoryId}_${Date.now()}`;
      customItems.push({ id, label: trimmed, custom: true, categoryId });
      renderAll();
      announce(strings.messages.customItemAdded);
    },
    onRemoveCustomItem: (itemId: string) => {
      customItems = customItems.filter((ci) => ci.id !== itemId);
      selected = selected.filter((s) => s.itemId !== itemId);
      delete scaleByItemMap[itemId];
      delete weightByItemMap[itemId];
      renderAll();
      announce(strings.messages.customItemRemoved);
    },
    onHeaderChange: (field: keyof HeaderData, value: string) => {
      header = { ...header, [field]: value };
      renderPreview(previewContentEl, buildExportRows(), header);
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
    const cfg: AppConfigV2 = {
      version: 2,
      selectedItems: selected,
      scaleByItem: scaleByItemMap,
      weightByItem: weightByItemMap,
      defaultScaleId,
      header,
      customItems
    };
    saveConfig(cfg);
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
      renderAll();
      announce(strings.messages.loaded);
    }
  }

  function renderAll() {
    // Preserve any in-progress custom item inputs before re-render
    const savedInputs: Record<string, string> = {};
    document.querySelectorAll<HTMLInputElement>('.custom-item-input[data-cat]').forEach((el) => {
      if (el.dataset.cat) savedInputs[el.dataset.cat] = el.value;
    });

    const merged = buildCategoriesWithCustom(categories, customItems);
    renderKopfdaten(kopfdatenEl, header, handlers.onHeaderChange);
    renderCategories(categoriesEl, categories, customItems, handlers);
    renderSelected(selectedEl, selected, merged, handlers);
    renderScalesPanel(scalesPanelEl, selected, merged, scales, scaleByItemMap, weightByItemMap, defaultScaleId, handlers);
    renderPreview(previewContentEl, buildExportRows(), header);

    // Restore saved inputs
    Object.entries(savedInputs).forEach(([catId, val]) => {
      const el = document.querySelector<HTMLInputElement>(`.custom-item-input[data-cat="${catId}"]`);
      if (el) el.value = val;
    });
  }

  renderAll();

  // Preview toggle
  previewToggleBtn?.addEventListener('click', () => {
    previewVisible = !previewVisible;
    previewSection.hidden = !previewVisible;
    previewToggleBtn.setAttribute('aria-pressed', String(previewVisible));
    previewToggleBtn.classList.toggle('active', previewVisible);
  });

  // Toolbar handlers
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
      renderAll();
      announce(strings.messages.imported);
    }
  });

  const exportNowBtn = document.getElementById('export-now') as HTMLButtonElement | null;
  const exportFormatSel = document.getElementById('export-format') as HTMLSelectElement | null;
  if (exportFormatSel) exportFormatSel.value = 'pdf';

  exportNowBtn?.addEventListener('click', async () => {
    const fmt = exportFormatSel?.value ?? 'pdf';
    const rows = buildExportRows();
    announce(strings.messages.exported);
    if (fmt === 'pdf') {
      const { exportPDF } = await import('./export/export-pdf');
      exportPDF(rows, header, 'full');
    } else if (fmt === 'pdf-checklist') {
      const { exportPDF } = await import('./export/export-pdf');
      exportPDF(rows, header, 'checklist');
    } else if (fmt === 'docx') {
      const { exportDOCX } = await import('./export/export-docx');
      exportDOCX(rows, header);
    } else if (fmt === 'xlsx') {
      const { exportXLSX } = await import('./export/export-xlsx');
      exportXLSX(rows);
    } else if (fmt === 'odp') {
      const { exportODP } = await import('./export/export-odp');
      exportODP(rows);
    }
  });

  setupKeyboardShortcuts(persist, async () => {
    (document.getElementById('export-now') as HTMLButtonElement)?.click();
  });
}

bootstrap();
