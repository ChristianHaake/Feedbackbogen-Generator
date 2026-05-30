import './app.css';
import {
  documentTitleText, renderLayout, renderDocumentTitleForm, renderKopfdaten, renderCategories,
  renderDefaultScaleSelect, renderPreview, renderModeSwitch, renderSelectedCounter,
  renderSelectedList, renderMobileTabs, renderFooterFields, renderProductFormatControls,
  renderProductFormatModal, renderResetConfirmModal
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
  EMPTY_HEADER, DEFAULT_FOOTER_FIELDS, DEFAULT_DOCUMENT_TITLE, CONFIG_SCHEMA_VERSION,
  createDefaultConfig
} from './storage';
import { mergeOrder, orderByIds, orderCategories, swapOrder } from './config-order';
import { scaleDisplay } from './scale-utils';
import type {
  SelectedItemRef, ExportRow, CustomItem, DocumentTitleConfig, DocumentTitleMode,
  HeaderData, FooterFields, FooterFieldId, PrintMode, Category, AppConfig
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
  let categoryOrder: string[] = [];
  let itemOrderByCategory: Record<string, string[]> = {};
  const undoStack: AppConfig[] = [];
  const redoStack: AppConfig[] = [];
  let previewMode: PrintMode = 'full';
  let searchQuery = '';
  let productFormatModalOpen = false;
  let productFormatSearchQuery = '';
  let productFormatModalReturnFocus: HTMLElement | null = null;
  let resetConfirmReturnFocus: HTMLElement | null = null;
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
    categoryOrder = persisted.categoryOrder;
    itemOrderByCategory = persisted.itemOrderByCategory;
    announce(strings.messages.loaded);
  }

  const categoriesEl = document.getElementById('categories')!;
  const workspaceEl = document.querySelector('.workspace') as HTMLElement;
  const contentPageEl = document.getElementById('content-page')!;
  const productFormatControlsEl = document.getElementById('product-format-controls')!;
  const productFormatCategoriesEl = document.getElementById('product-format-categories')!;
  const productFormatModalEl = document.getElementById('product-format-modal-root')!;
  const resetConfirmModalEl = document.getElementById('reset-confirm-modal-root')!;
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
  const configMessageEl = document.getElementById('config-message')!;
  const contentMarkdownCache: Partial<Record<ContentPageId, string>> = {};
  let routeRenderId = 0;

  const handlers = {
    onToggle: (categoryId: string, itemId: string, checked: boolean) => {
      commitConfigChange(() => {
        const idx = selected.findIndex((s) => s.categoryId === categoryId && s.itemId === itemId);
        if (checked && idx === -1) selected.push({ categoryId, itemId });
        if (!checked && idx !== -1) selected.splice(idx, 1);
      });
    },
    onCategoryScaleChange: (categoryId: string, scaleId: string) => {
      commitConfigChange(() => {
        scaleByCategoryMap[categoryId] = scaleId;
      });
    },
    onDefaultScaleChange: (scaleId: string) => {
      commitConfigChange(() => {
        defaultScaleId = scaleId;
      });
    },
    onAddCustomItem: (categoryId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const id = `custom_${categoryId}_${Date.now()}`;
      commitConfigChange(() => {
        customItems.push({ id, label: trimmed, custom: true, categoryId });
        selected.push({ categoryId, itemId: id });
      });
      announce(strings.messages.customItemAdded);
    },
    onRemoveCustomItem: (itemId: string) => {
      commitConfigChange(() => {
        customItems = customItems.filter((ci) => ci.id !== itemId);
        selected = selected.filter((s) => s.itemId !== itemId);
      });
      announce(strings.messages.customItemRemoved);
    },
    onRemoveSelected: (categoryId: string, itemId: string) => {
      commitConfigChange(() => {
        selected = selected.filter((s) => !(s.categoryId === categoryId && s.itemId === itemId));
      });
    },
    onSelectCategory: (categoryId: string) => {
      commitConfigChange(() => {
        itemIdsOfCategory(categoryId).forEach((itemId) => {
          if (!selected.some((s) => s.categoryId === categoryId && s.itemId === itemId)) selected.push({ categoryId, itemId });
        });
      });
    },
    onClearCategory: (categoryId: string) => {
      commitConfigChange(() => {
        const ids = new Set(itemIdsOfCategory(categoryId));
        selected = selected.filter((s) => s.categoryId !== categoryId || !ids.has(s.itemId));
      });
    },
    onClearSelection: () => {
      commitConfigChange(() => {
        selected = [];
      });
    },
    onReorderCategory: (draggedCategoryId: string, targetCategoryId: string) => {
      commitConfigChange(() => {
        categoryOrder = swapOrder(categoryOrder, draggedCategoryId, targetCategoryId);
      });
      announce(strings.messages.categoryReordered);
      focusDragHandle(`[data-category-id="${cssEscape(draggedCategoryId)}"] > .selected-category-head .drag-handle`);
    },
    onReorderItem: (categoryId: string, draggedItemId: string, targetItemId: string) => {
      commitConfigChange(() => {
        itemOrderByCategory = {
          ...itemOrderByCategory,
          [categoryId]: swapOrder(itemOrderByCategory[categoryId] ?? [], draggedItemId, targetItemId)
        };
      });
      announce(strings.messages.criterionReordered);
      focusDragHandle(`[data-category-id="${cssEscape(categoryId)}"] [data-item-id="${cssEscape(draggedItemId)}"] .drag-handle`);
    },
    onSearchChange: (value: string) => {
      searchQuery = value;
      renderEditor();
    },
    onOpenProductFormatModal: () => {
      productFormatModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      productFormatModalOpen = true;
      renderProductFormatModalOnly(true);
    },
    onCloseProductFormatModal: () => {
      productFormatModalOpen = false;
      productFormatSearchQuery = '';
      renderProductFormatModalOnly();
      requestAnimationFrame(() => {
        const returnFocus = productFormatModalReturnFocus?.isConnected
          ? productFormatModalReturnFocus
          : document.querySelector<HTMLElement>('.choose-product-formats-btn');
        returnFocus?.focus();
        productFormatModalReturnFocus = null;
      });
    },
    onProductFormatSearchChange: (value: string) => {
      productFormatSearchQuery = value;
    },
    onToggleProductFormat: (categoryId: string, isSelected: boolean) => {
      commitConfigChange(() => {
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
      });
      focusProductFormatToggle(categoryId);
    },
    onDocumentTitleModeChange: (mode: DocumentTitleMode) => {
      commitConfigChange(() => {
        documentTitle = { ...documentTitle, mode };
      });
    },
    onDocumentTitleCustomChange: (value: string) => {
      commitConfigChange(() => {
        documentTitle = { ...documentTitle, custom: value };
      }, false);
    },
    onHeaderFieldLabelChange: (fieldId: string, label: string) => {
      commitConfigChange(() => {
        header = {
          ...header,
          fields: header.fields.map((field) => field.id === fieldId ? { ...field, label } : field)
        };
      }, false);
    },
    onHeaderFieldValueChange: (fieldId: string, value: string) => {
      commitConfigChange(() => {
        header = {
          ...header,
          fields: header.fields.map((field) => field.id === fieldId ? { ...field, value } : field)
        };
      }, false);
    },
    onAddHeaderField: () => {
      commitConfigChange(() => {
        header = {
          ...header,
          fields: [...header.fields, { id: `field_${Date.now()}`, label: strings.kopfdaten.fallbackField, value: '' }]
        };
      });
      announce(strings.messages.headerFieldReordered);
    },
    onRemoveHeaderField: (fieldId: string) => {
      commitConfigChange(() => {
        header = {
          ...header,
          fields: header.fields.filter((field) => field.id !== fieldId)
        };
      });
      announce(strings.messages.headerFieldRemoved);
    },
    onReorderHeaderField: (draggedFieldId: string, targetFieldId: string) => {
      commitConfigChange(() => {
        const order = swapOrder(header.fields.map((field) => field.id), draggedFieldId, targetFieldId);
        const fieldsById = new Map(header.fields.map((field) => [field.id, field]));
        header = {
          ...header,
          fields: order.map((fieldId) => fieldsById.get(fieldId)).filter((field): field is HeaderData['fields'][number] => Boolean(field))
        };
      });
      announce(strings.messages.headerFieldAdded);
      focusDragHandle(`[data-header-field-id="${cssEscape(draggedFieldId)}"] .header-field-drag-handle`);
    },
    onFooterFieldToggle: (field: FooterFieldId, checked: boolean) => {
      commitConfigChange(() => {
        footerFields = { ...footerFields, [field]: checked };
      }, false);
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
    return orderCategories(selectedProductFormatCategories(productFormats, selectedProductFormats), categoryOrder);
  }

  function allActiveCategories(): Category[] {
    return orderCategories([...categories, ...productCategories()], categoryOrder);
  }

  function cloneHeader(value: HeaderData): HeaderData {
    return {
      fields: value.fields.map((field) => ({ ...field }))
    };
  }

  function cloneConfig(config: AppConfig): AppConfig {
    return JSON.parse(JSON.stringify(config)) as AppConfig;
  }

  function restoreConfig(config: AppConfig) {
    selected = config.selectedItems.map((item) => ({ ...item }));
    selectedProductFormats = [...config.selectedProductFormats];
    scaleByCategoryMap = { ...config.scaleByCategory };
    defaultScaleId = config.defaultScaleId ?? scales[0]?.id ?? 'verbal_5';
    documentTitle = { ...config.documentTitle };
    header = cloneHeader(config.header);
    footerFields = { ...config.footerFields };
    customItems = config.customItems.map((item) => ({ ...item }));
    categoryOrder = [...config.categoryOrder];
    itemOrderByCategory = Object.fromEntries(
      Object.entries(config.itemOrderByCategory).map(([categoryId, itemIds]) => [categoryId, [...itemIds]])
    );
    normalizeOrderState();
  }

  function normalizeOrderState() {
    const selectedCategoryIds = Array.from(new Set(selected.map((item) => item.categoryId)));
    categoryOrder = mergeOrder(categoryOrder, selectedCategoryIds);
    itemOrderByCategory = Object.fromEntries(
      selectedCategoryIds.map((categoryId) => [
        categoryId,
        mergeOrder(
          itemOrderByCategory[categoryId] ?? [],
          selected.filter((item) => item.categoryId === categoryId).map((item) => item.itemId)
        )
      ])
    );
  }

  function commitConfigChange(mutator: () => void, rerenderEditor = true) {
    const before = cloneConfig(currentConfig());
    mutator();
    normalizeOrderState();
    if (JSON.stringify(before) === JSON.stringify(currentConfig())) return;
    undoStack.push(before);
    redoStack.length = 0;
    if (rerenderEditor) renderEditor();
    renderA4();
    updateHistoryButtons();
  }

  function replaceConfig(config: AppConfig, rememberCurrent = true) {
    if (rememberCurrent) {
      undoStack.push(cloneConfig(currentConfig()));
      redoStack.length = 0;
    }
    restoreConfig(config);
    renderEditor();
    renderA4();
    updateHistoryButtons();
  }

  function undo() {
    const previous = undoStack.pop();
    if (!previous) return;
    redoStack.push(cloneConfig(currentConfig()));
    replaceConfig(previous, false);
    announce(strings.messages.undoDone);
  }

  function redo() {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(cloneConfig(currentConfig()));
    restoreConfig(next);
    renderEditor();
    renderA4();
    updateHistoryButtons();
    announce(strings.messages.redoDone);
  }

  function confirmResetConfig() {
    replaceConfig(createDefaultConfig(scales[0]?.id ?? 'verbal_5'));
    closeResetConfirm();
    announce(strings.messages.resetDone);
  }

  function openResetConfirm() {
    resetConfirmReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    renderResetConfirmModal(resetConfirmModalEl, true, closeResetConfirm, confirmResetConfig);
    requestAnimationFrame(() => resetConfirmModalEl.querySelector<HTMLButtonElement>('.reset-confirm-action')?.focus());
  }

  function closeResetConfirm() {
    renderResetConfirmModal(resetConfirmModalEl, false, closeResetConfirm, confirmResetConfig);
    requestAnimationFrame(() => {
      resetConfirmReturnFocus?.focus();
      resetConfirmReturnFocus = null;
    });
  }

  function updateHistoryButtons() {
    document.querySelectorAll<HTMLButtonElement>('#history-undo, #history-undo-mobile').forEach((button) => {
      button.disabled = undoStack.length === 0;
    });
    document.querySelectorAll<HTMLButtonElement>('#history-redo, #history-redo-mobile').forEach((button) => {
      button.disabled = redoStack.length === 0;
    });
  }

  let configMessageTimeout: number | undefined;
  function showConfigMessage(message: string) {
    configMessageEl.textContent = message;
    configMessageEl.hidden = false;
    if (configMessageTimeout) window.clearTimeout(configMessageTimeout);
    configMessageTimeout = window.setTimeout(() => {
      configMessageEl.hidden = true;
    }, 8000);
  }

  function cssEscape(value: string): string {
    return CSS.escape(value);
  }

  function focusDragHandle(selector: string) {
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(selector)?.focus());
  }

  function flattenedCategoryItems(category: Category): { id: string; label: string }[] {
    const items: { id: string; label: string }[] = [];
    if (Array.isArray(category.items)) category.items.forEach((item) => items.push({ id: item.id, label: item.label }));
    if (Array.isArray(category.groups)) category.groups.forEach((group) => group.items.forEach((item) => items.push({ id: item.id, label: item.label })));
    return orderByIds(items, itemOrderByCategory[category.id] ?? []);
  }

  function buildExportRows(): ExportRow[] {
    const merged = buildCategoriesWithCustom(allActiveCategories(), customItems);
    const selectedKeys = selectedKeySet();
    const out: ExportRow[] = [];
    merged.forEach((c) => {
      flattenedCategoryItems(c).forEach(({ id, label }) => {
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
      flattenedCategoryItems(category).forEach((item) => {
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
    return flattenedCategoryItems(category).map((item) => item.id);
  }

  function currentConfig(): AppConfig {
    return {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      selectedItems: selected,
      selectedProductFormats,
      scaleByCategory: scaleByCategoryMap,
      defaultScaleId, documentTitle, header, footerFields, customItems,
      categoryOrder, itemOrderByCategory
    };
  }

  function autoPersist() {
    saveConfig(currentConfig());
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
    renderCategories(categoriesEl, orderCategories(categories, categoryOrder), customItems, selectedKeySet(), scales, scaleByCategoryMap, defaultScaleId, itemOrderByCategory, handlers, searchQuery);
    const currentProductCategories = productCategories();
    renderProductFormatControls(productFormatControlsEl, currentProductCategories, handlers);
    if (currentProductCategories.length > 0) {
      renderCategories(productFormatCategoriesEl, currentProductCategories, customItems, selectedKeySet(), scales, scaleByCategoryMap, defaultScaleId, itemOrderByCategory, handlers, searchQuery);
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

  function focusProductFormatToggle(categoryId: string) {
    requestAnimationFrame(() => {
      const row = Array.from(productFormatModalEl.querySelectorAll<HTMLElement>('.product-format-row'))
        .find((candidate) => candidate.dataset.categoryId === categoryId);
      row?.querySelector<HTMLButtonElement>('button')?.focus();
    });
  }

  function renderA4() {
    autoPersist();
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

  normalizeOrderState();
  renderEditor();
  renderModeSwitch(modeSwitchEl, previewMode, handlers);
  renderMobileTabs(mobileTabsEl, mobileView, handlers);
  renderA4();
  renderRoute();

  // Toolbar
  const exportJson = () => {
    exportConfigJSON(currentConfig());
  };
  const importJson = async () => {
    const result = await importConfigJSON();
    if (result.status === 'success') {
      replaceConfig(result.config);
      announce(strings.messages.imported);
    } else if (result.status === 'error') {
      showConfigMessage(result.message);
      announce(result.message);
    }
  };
  document.querySelectorAll<HTMLButtonElement>('#config-save, #config-save-mobile').forEach((btn) => {
    btn.addEventListener('click', exportJson);
  });
  document.querySelectorAll<HTMLButtonElement>('#config-load, #config-load-mobile').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await importJson();
      btn.focus();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('#history-undo, #history-undo-mobile').forEach((btn) => {
    btn.addEventListener('click', undo);
  });
  document.querySelectorAll<HTMLButtonElement>('#history-redo, #history-redo-mobile').forEach((btn) => {
    btn.addEventListener('click', redo);
  });
  document.querySelectorAll<HTMLButtonElement>('#config-reset, #config-reset-mobile').forEach((btn) => {
    btn.addEventListener('click', openResetConfirm);
  });
  updateHistoryButtons();
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
    } else if (fmt === 'odt') {
      const { exportODT } = await import('./export/export-odt');
      exportODT(buildExportRows(), documentTitleText(documentTitle), header, footerFields, previewMode);
    }
  }

  const exportMenu = document.getElementById('export-menu') as HTMLDetailsElement | null;
  const exportMenuTrigger = document.getElementById('export-menu-trigger') as HTMLElement | null;
  const closeExportMenu = (restoreFocus = false) => {
    exportMenu?.removeAttribute('open');
    if (restoreFocus) exportMenuTrigger?.focus();
  };
  const openExportMenu = () => {
    if (!exportMenu) return;
    exportMenu.setAttribute('open', '');
    requestAnimationFrame(() => exportMenu.querySelector<HTMLButtonElement>('.menu-item')?.focus());
  };
  exportMenu?.addEventListener('toggle', () => {
    if (exportMenu.open) requestAnimationFrame(() => exportMenu.querySelector<HTMLButtonElement>('.menu-item')?.focus());
  });
  exportMenu?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeExportMenu(true);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-export-format]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeExportMenu(true);
      exportFormat(btn.dataset.exportFormat as ExportFormat);
    });
  });

  setupKeyboardShortcuts(exportJson, openExportMenu, undo, redo);
}

bootstrap();
