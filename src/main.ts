import './app.css';
import {
  documentTitleText, renderLayout, renderDocumentTitleForm, renderKopfdaten, renderCategories,
  renderDefaultScaleSelect, renderPreview, renderModeSwitch, renderSelectedCounter,
  renderSelectedList, renderMobileTabs, renderFooterFields, renderProductFormatControls,
  renderProductFormatModal
} from './ui/templates';
import { strings } from './strings';
import { setupKeyboardShortcuts, announce, focusVisiblePolyfill } from './a11y';
import { loadYAML, scaleById, buildCategoriesWithCustom } from './yaml';
import { loadProductFormats, selectedProductFormatCategories } from './product-formats';
import {
  contentPages, loadContentMarkdown, renderContentPage, routeFromPath,
  type AppRoute, type ContentPageId
} from './content-pages';
import {
  saveConfig, loadConfig, exportConfigJSON, importConfigJSON,
  EMPTY_HEADER, DEFAULT_FOOTER_FIELDS, DEFAULT_DOCUMENT_TITLE
} from './storage';
import { scaleDisplay } from './scale-utils';
import type {
  SelectedItemRef, ExportRow, CustomItem, DocumentTitleConfig, DocumentTitleMode,
  HeaderData, FooterFields, FooterFieldId, PrintMode, Category
} from './types';
import type { ExportFormat, MobileView, SelectedSummary } from './ui/templates';

async function bootstrap() {
  focusVisiblePolyfill();
  const root = document.getElementById('app')!;
  const app = renderLayout();
  root.append(app);

  const baseUrl = import.meta.env.BASE_URL as string;
  const data = await loadYAML();
  const productFormats = await loadProductFormats(baseUrl);
  const categories = data.categories;
  const scales = data.scales;

  // State
  let selected: SelectedItemRef[] = [];
  let selectedProductFormats: string[] = [];
  let scaleByCategoryMap: Record<string, string> = {};
  let defaultScaleId = scales[0]?.id ?? 'verbal_5';
  let documentTitle: DocumentTitleConfig = { ...DEFAULT_DOCUMENT_TITLE };
  let header: HeaderData = cloneHeader(EMPTY_HEADER);
  let footerFields: FooterFields = { ...DEFAULT_FOOTER_FIELDS };
  let customItems: CustomItem[] = [];
  let previewMode: PrintMode = 'full';
  let searchQuery = '';
  let productFormatModalOpen = false;
  let productFormatSearchQuery = '';
  let mobileView: MobileView = 'edit';

  const persisted = loadConfig();
  if (persisted) {
    selected = persisted.selectedItems;
    selectedProductFormats = persisted.selectedProductFormats;
    scaleByCategoryMap = persisted.scaleByCategory;
    if (persisted.defaultScaleId) defaultScaleId = persisted.defaultScaleId;
    documentTitle = { ...persisted.documentTitle };
    header = cloneHeader(persisted.header);
    footerFields = persisted.footerFields;
    customItems = persisted.customItems ?? [];
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const workspaceEl = document.querySelector('.workspace') as HTMLElement;
  const contentPageEl = document.getElementById('content-page')!;
  const productFormatControlsEl = document.getElementById('product-format-controls')!;
  const productFormatCategoriesEl = document.getElementById('product-format-categories')!;
  const productFormatModalEl = document.getElementById('product-format-modal-root')!;
  const counterEl = document.getElementById('selected-counter')!;
  const selectedListEl = document.getElementById('selected-list')!;
  const documentTitleEl = document.getElementById('document-title-form')!;
  const kopfdatenEl = document.getElementById('kopfdaten-form')!;
  const footerFieldsEl = document.getElementById('footer-fields')!;
  const a4El = document.getElementById('a4-page')!;
  const defaultScaleSelectEl = document.getElementById('default-scale') as HTMLSelectElement;
  const criteriaSearchEl = document.getElementById('criteria-search') as HTMLInputElement;
  const clearSelectionEl = document.getElementById('clear-selection') as HTMLButtonElement;
  const toolbarActionsEl = document.querySelector('.toolbar .actions') as HTMLElement;
  const modeSwitchEl = document.querySelector('.mode-switch') as HTMLElement;
  const mobileTabsEl = document.querySelector('.mobile-tabs') as HTMLElement;
  const contentMarkdownCache: Partial<Record<ContentPageId, string>> = {};
  let routeRenderId = 0;

  const handlers = {
    onToggle: (categoryId: string, itemId: string, checked: boolean) => {
      const idx = selected.findIndex((s) => s.categoryId === categoryId && s.itemId === itemId);
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
    onRemoveSelected: (categoryId: string, itemId: string) => {
      selected = selected.filter((s) => !(s.categoryId === categoryId && s.itemId === itemId));
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
    onOpenProductFormatModal: () => {
      productFormatModalOpen = true;
      renderProductFormatModalOnly(true);
    },
    onCloseProductFormatModal: () => {
      productFormatModalOpen = false;
      productFormatSearchQuery = '';
      renderProductFormatModalOnly();
    },
    onProductFormatSearchChange: (value: string) => {
      productFormatSearchQuery = value;
    },
    onToggleProductFormat: (categoryId: string, isSelected: boolean) => {
      if (isSelected && !selectedProductFormats.includes(categoryId)) {
        selectedProductFormats = [...selectedProductFormats, categoryId];
        announce(strings.messages.productFormatAdded);
      } else if (!isSelected) {
        selectedProductFormats = selectedProductFormats.filter((id) => id !== categoryId);
        selected = selected.filter((item) => item.categoryId !== categoryId);
        customItems = customItems.filter((item) => item.categoryId !== categoryId);
        const { [categoryId]: _removed, ...rest } = scaleByCategoryMap;
        scaleByCategoryMap = rest;
        announce(strings.messages.productFormatRemoved);
      }
      renderEditor();
      renderA4();
    },
    onDocumentTitleModeChange: (mode: DocumentTitleMode) => {
      documentTitle = { ...documentTitle, mode };
      renderEditor();
      renderA4();
    },
    onDocumentTitleCustomChange: (value: string) => {
      documentTitle = { ...documentTitle, custom: value };
      renderA4();
    },
    onHeaderFieldLabelChange: (fieldId: string, label: string) => {
      header = {
        ...header,
        fields: header.fields.map((field) => field.id === fieldId ? { ...field, label } : field)
      };
      renderA4();
    },
    onHeaderFieldValueChange: (fieldId: string, value: string) => {
      header = {
        ...header,
        fields: header.fields.map((field) => field.id === fieldId ? { ...field, value } : field)
      };
      renderA4();
    },
    onAddHeaderField: () => {
      header = {
        ...header,
        fields: [...header.fields, { id: `field_${Date.now()}`, label: strings.kopfdaten.fallbackField, value: '' }]
      };
      renderEditor();
      renderA4();
      announce(strings.messages.headerFieldAdded);
    },
    onRemoveHeaderField: (fieldId: string) => {
      header = {
        ...header,
        fields: header.fields.filter((field) => field.id !== fieldId)
      };
      renderEditor();
      renderA4();
      announce(strings.messages.headerFieldRemoved);
    },
    onFooterFieldToggle: (field: FooterFieldId, checked: boolean) => {
      footerFields = { ...footerFields, [field]: checked };
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

  function selectionKey(categoryId: string, itemId: string): string {
    return `${categoryId}::${itemId}`;
  }

  function selectedKeySet(): Set<string> {
    return new Set(selected.map((s) => selectionKey(s.categoryId, s.itemId)));
  }

  function productCategories(): Category[] {
    return selectedProductFormatCategories(productFormats, selectedProductFormats);
  }

  function allActiveCategories(): Category[] {
    return [...categories, ...productCategories()];
  }

  function cloneHeader(value: HeaderData): HeaderData {
    return {
      fields: value.fields.map((field) => ({ ...field }))
    };
  }

  function buildExportRows(): ExportRow[] {
    const merged = buildCategoriesWithCustom(allActiveCategories(), customItems);
    // Output: grouped by category (YAML category order), within category in YAML item order;
    // only items that are selected appear.
    const selectedKeys = selectedKeySet();
    const out: ExportRow[] = [];
    merged.forEach((c) => {
      const ids: { id: string; label: string }[] = [];
      if (Array.isArray(c.items)) c.items.forEach((it) => ids.push({ id: it.id, label: it.label }));
      if (Array.isArray(c.groups)) c.groups.forEach((g) => g.items.forEach((it) => ids.push({ id: it.id, label: it.label })));
      ids.forEach(({ id, label }) => {
        if (!selectedKeys.has(selectionKey(c.id, id))) return;
        const sId = scaleByCategoryMap[c.id] ?? defaultScaleId;
        const s = scaleById(scales, sId);
        out.push({ categoryId: c.id, category: c.title, item: label, scale: s });
      });
    });
    return out;
  }

  function buildSelectedSummaries(): SelectedSummary[] {
    const customIds = new Set(customItems.map((ci) => ci.id));
    const merged = buildCategoriesWithCustom(allActiveCategories(), customItems);
    const selectedKeys = selectedKeySet();
    const out: SelectedSummary[] = [];
    merged.forEach((category) => {
      const items: { id: string; label: string }[] = [];
      if (Array.isArray(category.items)) category.items.forEach((item) => items.push({ id: item.id, label: item.label }));
      if (Array.isArray(category.groups)) category.groups.forEach((group) => group.items.forEach((item) => items.push({ id: item.id, label: item.label })));
      items.forEach((item) => {
        if (!selectedKeys.has(selectionKey(category.id, item.id))) return;
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
    const merged = buildCategoriesWithCustom(allActiveCategories(), customItems);
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
      selectedProductFormats,
      scaleByCategory: scaleByCategoryMap,
      defaultScaleId, documentTitle, header, footerFields, customItems
    });
    announce(strings.messages.saved);
  }

  function loadPersisted() {
    const cfg = loadConfig();
    if (cfg) {
      selected = cfg.selectedItems;
      selectedProductFormats = cfg.selectedProductFormats;
      scaleByCategoryMap = cfg.scaleByCategory;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      documentTitle = { ...cfg.documentTitle };
      header = cloneHeader(cfg.header);
      footerFields = cfg.footerFields;
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

    renderDocumentTitleForm(documentTitleEl, documentTitle, handlers);
    renderKopfdaten(kopfdatenEl, header, handlers);
    renderFooterFields(footerFieldsEl, footerFields, handlers);
    renderDefaultScaleSelect(defaultScaleSelectEl, scales, defaultScaleId, handlers);
    renderSelectedCounter(counterEl, selected.length);
    renderSelectedList(selectedListEl, buildSelectedSummaries(), handlers);
    renderCategories(categoriesEl, categories, customItems, selectedKeySet(), scales, scaleByCategoryMap, defaultScaleId, handlers, searchQuery);
    const currentProductCategories = productCategories();
    renderProductFormatControls(productFormatControlsEl, currentProductCategories, handlers);
    if (currentProductCategories.length > 0) {
      renderCategories(productFormatCategoriesEl, currentProductCategories, customItems, selectedKeySet(), scales, scaleByCategoryMap, defaultScaleId, handlers, searchQuery);
    } else {
      productFormatCategoriesEl.innerHTML = '';
    }
    renderProductFormatModal(productFormatModalEl, productFormats, new Set(selectedProductFormats), productFormatModalOpen, productFormatSearchQuery, handlers);
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

  function renderProductFormatModalOnly(focusSearch = false) {
    renderProductFormatModal(productFormatModalEl, productFormats, new Set(selectedProductFormats), productFormatModalOpen, productFormatSearchQuery, handlers);
    if (!focusSearch || !productFormatModalOpen) return;

    requestAnimationFrame(() => {
      const searchInput = productFormatModalEl.querySelector<HTMLInputElement>('.product-format-search');
      if (!searchInput) return;
      searchInput.focus();
      const cursorPosition = searchInput.value.length;
      try {
        searchInput.setSelectionRange(cursorPosition, cursorPosition);
      } catch {
        // Some browsers do not expose selection APIs for search inputs.
      }
    });
  }

  function renderA4() {
    renderPreview(a4El, buildExportRows(), documentTitle, header, footerFields, previewMode);
  }

  function isContentRoute(route: AppRoute): route is ContentPageId {
    return route !== 'generator';
  }

  async function renderRoute() {
    const route = routeFromPath(window.location.pathname);
    const renderId = ++routeRenderId;
    updateFooterNav(route);

    workspaceEl.hidden = route !== 'generator';
    contentPageEl.hidden = route === 'generator';
    toolbarActionsEl.hidden = route !== 'generator';
    if (!isContentRoute(route)) return;

    contentPageEl.innerHTML = '';
    contentPageEl.append(simpleContentMessage('Inhalt wird geladen...'));
    try {
      const markdown = contentMarkdownCache[route] ?? await loadContentMarkdown(route);
      contentMarkdownCache[route] = markdown;
      if (renderId !== routeRenderId) return;
      renderContentPage(contentPageEl, route, markdown);
      contentPageEl.scrollTo({ top: 0 });
    } catch {
      if (renderId !== routeRenderId) return;
      contentPageEl.innerHTML = '';
      contentPageEl.append(simpleContentMessage('Der Inhalt konnte nicht geladen werden.'));
    }
  }

  function simpleContentMessage(message: string): HTMLElement {
    const wrap = document.createElement('article');
    wrap.className = 'content-page-card';
    const p = document.createElement('p');
    p.textContent = message;
    wrap.append(p);
    return wrap;
  }

  function updateFooterNav(route: AppRoute) {
    document.querySelectorAll<HTMLAnchorElement>('[data-app-route]').forEach((link) => {
      const linkRoute = link.dataset.appRoute as AppRoute | undefined;
      if (linkRoute && linkRoute === route) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  renderEditor();
  renderModeSwitch(modeSwitchEl, previewMode, handlers);
  renderMobileTabs(mobileTabsEl, mobileView, handlers);
  renderA4();
  renderRoute();

  // Toolbar
  document.getElementById('save')?.addEventListener('click', persist);
  document.getElementById('load')?.addEventListener('click', loadPersisted);
  const exportJson = () => {
    exportConfigJSON({ selectedItems: selected, selectedProductFormats, scaleByCategory: scaleByCategoryMap, defaultScaleId, documentTitle, header, footerFields, customItems });
  };
  const importJson = async () => {
    const cfg = await importConfigJSON();
    if (cfg) {
      selected = cfg.selectedItems;
      selectedProductFormats = cfg.selectedProductFormats;
      scaleByCategoryMap = cfg.scaleByCategory;
      if (cfg.defaultScaleId) defaultScaleId = cfg.defaultScaleId;
      documentTitle = { ...cfg.documentTitle };
      header = cloneHeader(cfg.header);
      footerFields = cfg.footerFields;
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
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const link = target?.closest<HTMLAnchorElement>('a[data-app-route]');
    if (!link) return;

    const route = link.dataset.appRoute as AppRoute | undefined;
    const path = route === 'generator' ? '/' : route && isContentRoute(route) ? contentPages[route].path : null;
    if (!path) return;

    event.preventDefault();
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    renderRoute();
  });
  window.addEventListener('popstate', renderRoute);

  async function exportFormat(fmt: ExportFormat) {
    announce(strings.messages.exported);
    if (fmt === 'pdf') {
      const { exportPDF } = await import('./export/export-pdf');
      exportPDF(buildExportRows(), documentTitleText(documentTitle), header, footerFields, previewMode);
    } else if (fmt === 'docx') {
      const { exportDOCX } = await import('./export/export-docx');
      exportDOCX(buildExportRows(), documentTitleText(documentTitle), header, footerFields, previewMode);
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
