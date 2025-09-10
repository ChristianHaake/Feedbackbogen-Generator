import './app.css';
import { renderLayout, renderCategories, renderSelected, renderScalesPanel } from './ui/templates';
import { strings } from './strings';
import { setupKeyboardShortcuts, announce, focusVisiblePolyfill } from './a11y';
import { loadYAML, findItemById, scaleById } from './yaml';
import { saveConfig, loadConfig, exportConfigJSON, importConfigJSON } from './storage';
import type { AppConfigV1, SelectedItemRef, ExportRow } from './types';

async function bootstrap() {
  focusVisiblePolyfill();
  const root = document.getElementById('app')!;
  const app = renderLayout();
  root.append(app);

  const baseUrl = import.meta.env.BASE_URL as string; // './' by config
  const data = await loadYAML(baseUrl);
  const categories = data.categories;
  const scales = data.scales;

  // State
  let selected: SelectedItemRef[] = [];
  let scaleByItemMap: Record<string, string> = {};
  let defaultScaleId = (scales[0]?.id) || 'verbal_5';

  // Try load persisted config
  const persisted = loadConfig();
  if (persisted) {
    selected = persisted.selectedItems;
    scaleByItemMap = persisted.scaleByItem;
    if (persisted.defaultScaleId) defaultScaleId = persisted.defaultScaleId;
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const selectedEl = document.getElementById('selected')!;
  const scalesPanelEl = document.getElementById('scales-panel')!;

  const handlers = {
    onAdd: (categoryId: string, itemId: string) => {
      if (!selected.some((s) => s.itemId === itemId)) selected.push({ categoryId, itemId });
      renderAll();
    },
    onRemove: (itemId: string) => {
      selected = selected.filter((s) => s.itemId !== itemId);
      delete scaleByItemMap[itemId];
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
    },
    onDefaultScaleChange: (scaleId: string) => {
      defaultScaleId = scaleId;
      renderAll();
    }
  };

  function exportRows(): ExportRow[] {
    return selected.map((ref) => {
      const found = findItemById(categories, ref.itemId)!;
      const sId = scaleByItemMap[ref.itemId] || defaultScaleId;
      const s = scaleById(scales, sId)!;
      let scaleLabel = '';
      switch (s.kind) {
        case 'verbal':
          scaleLabel = s.labels.join(' | '); break;
        case 'numeric':
          scaleLabel = `${s.min}–${s.max}`; break;
        case 'emoji':
          scaleLabel = s.set.join(' '); break;
        case 'traffic':
          scaleLabel = 'Grün / Gelb / Rot'; break;
        case 'percent':
          scaleLabel = '0–100%'; break;
      }
      return { category: found.category.title, item: found.item.label, description: found.item.description, scaleLabel };
    });
  }

  function persist() {
    const cfg: AppConfigV1 = { version: 1, selectedItems: selected, scaleByItem: scaleByItemMap, defaultScaleId };
    saveConfig(cfg);
    announce(strings.messages.saved);
  }

  function loadPersisted() {
    const cfg = loadConfig();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      renderAll();
      announce(strings.messages.loaded);
    }
  }

  function renderAll() {
    renderCategories(categoriesEl, categories, handlers);
    renderSelected(selectedEl, selected, categories, handlers);
    renderScalesPanel(scalesPanelEl, selected, categories, scales, scaleByItemMap, defaultScaleId, handlers);
  }

  renderAll();

  // Toolbar handlers
  (document.getElementById('save') as HTMLButtonElement)?.addEventListener('click', persist);
  (document.getElementById('load') as HTMLButtonElement)?.addEventListener('click', loadPersisted);
  (document.getElementById('export-json') as HTMLButtonElement)?.addEventListener('click', () => exportConfigJSON({ version: 1, selectedItems: selected, scaleByItem: scaleByItemMap, defaultScaleId }));
  (document.getElementById('import-json') as HTMLButtonElement)?.addEventListener('click', async () => {
    const cfg = await importConfigJSON();
    if (cfg) {
      selected = cfg.selectedItems;
      scaleByItemMap = cfg.scaleByItem;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      renderAll();
      announce(strings.messages.imported);
    }
  });
  (document.getElementById('export-pdf') as HTMLButtonElement)?.addEventListener('click', async () => {
    const { exportPDF } = await import('./export/export-pdf');
    exportPDF(exportRows());
  });
  (document.getElementById('export-docx') as HTMLButtonElement)?.addEventListener('click', async () => {
    const { exportDOCX } = await import('./export/export-docx');
    exportDOCX(exportRows());
  });
  (document.getElementById('export-xlsx') as HTMLButtonElement)?.addEventListener('click', async () => {
    const { exportXLSX } = await import('./export/export-xlsx');
    exportXLSX(exportRows());
  });
  (document.getElementById('export-odp') as HTMLButtonElement)?.addEventListener('click', async () => {
    const { exportODP } = await import('./export/export-odp');
    exportODP(exportRows());
  });

  setupKeyboardShortcuts(persist, () => announce(strings.messages.exported));
}

bootstrap();
