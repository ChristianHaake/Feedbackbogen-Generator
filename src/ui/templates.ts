import { el, icon } from './components';

import { strings } from '@/strings';
import { scaleDisplay } from '@/scale-utils';
import { productFormatCategoryId } from '@/product-formats';
import { contentPages } from '@/content-pages';
import type {
  Category, Scale, CustomItem, DocumentTitleConfig, DocumentTitleMode,
  HeaderData, HeaderField, FooterFields, FooterFieldId, ExportRow, PrintMode, Item,
  ProductFormatData
} from '@/types';

export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'odp';
export type MobileView = 'edit' | 'preview' | 'export';
export type ContentPageId = 'imprint' | 'privacy';
export type ContentPageState = {
  id: ContentPageId;
  title: string;
  body: string;
  loading: boolean;
  error: boolean;
} | null;
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
  onCategoryScaleChange: (categoryId: string, scaleId: string) => void;
  onDefaultScaleChange: (scaleId: string) => void;
  onAddCustomItem: (categoryId: string, label: string) => void;
  onRemoveCustomItem: (itemId: string) => void;
  onRemoveSelected: (categoryId: string, itemId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onClearCategory: (categoryId: string) => void;
  onClearSelection: () => void;
  onSearchChange: (value: string) => void;
  onOpenProductFormatModal: () => void;
  onCloseProductFormatModal: () => void;
  onProductFormatSearchChange: (value: string) => void;
  onToggleProductFormat: (categoryId: string, selected: boolean) => void;
  onDocumentTitleModeChange: (mode: DocumentTitleMode) => void;
  onDocumentTitleCustomChange: (value: string) => void;
  onHeaderFieldLabelChange: (fieldId: string, label: string) => void;
  onHeaderFieldValueChange: (fieldId: string, value: string) => void;
  onAddHeaderField: () => void;
  onRemoveHeaderField: (fieldId: string) => void;
  onFooterFieldToggle: (field: FooterFieldId, checked: boolean) => void;
  onPreviewModeChange: (mode: PrintMode) => void;
  onMobileViewChange: (view: MobileView) => void;
  onOpenContentPage: (page: ContentPageId) => void;
  onCloseContentPage: () => void;
};

export function renderLayout(): HTMLElement {
  const app = el('div', { id: 'app-root', class: 'app' });

  const header = el(
    'header',
    { class: 'toolbar', role: 'toolbar', 'aria-label': 'Werkzeugleiste' },
    el('div', { class: 'toolbar-inner' },
      el('div', { class: 'left' },
        el('img', { src: './icon_Feedbackgenerator.svg', alt: '', width: '24', height: '24' }),
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
      editorSection(strings.kopfdaten.documentTitleSection, el('div', { id: 'document-title-form', class: 'document-title-fields' })),
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
      ),
      editorSection(strings.columns.productFormats,
        el('div', { id: 'product-format-controls', class: 'product-format-controls' }),
        el('div', { id: 'product-format-categories', class: 'accordion product-format-categories' })
      ),
      editorSection(strings.kopfdaten.footerTitle,
        el('div', { id: 'footer-fields', class: 'footer-fields' }),
        legalLinks()
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

  const contentPage = el('main', { id: 'content-page', class: 'content-page', hidden: 'true' });
  const appFooter = el('footer', { class: 'app-footer' },
    el('nav', { class: 'app-footer-nav', 'aria-label': 'Rechtliches und Projektinformationen' },
      el('a', { href: contentPages.about.path, 'data-app-route': 'about', text: contentPages.about.title }),
      el('a', { href: contentPages.imprint.path, 'data-app-route': 'imprint', text: contentPages.imprint.title }),
      el('a', { href: contentPages.privacy.path, 'data-app-route': 'privacy', text: contentPages.privacy.title })
    )
  );
  const productFormatModal = el('div', { id: 'product-format-modal-root' });
  const contentPageModal = el('div', { id: 'content-page-modal-root' });
  const live = el('div', { id: 'aria-live', 'aria-live': 'polite', 'aria-atomic': 'true', class: 'sr-only', role: 'status', 'aria-label': strings.a11y.status });

  app.append(header, workspace, productFormatModal, contentPageModal, live);
  return app;
}

function legalLinks(): HTMLElement {
  return el('div', { class: 'legal-links', 'aria-label': 'Rechtliches und Projekt' },
    legalPageLink(strings.links.imprint, 'imprint', './content/imprint.md'),
    legalPageLink(strings.links.privacy, 'privacy', './content/privacy.md'),
    el('a', {
      class: 'legal-link',
      href: 'https://github.com/ChristianHaake/Feedbackbogen-Generator/tree/master',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: strings.links.github
    })
  );
}

function legalPageLink(label: string, page: ContentPageId, href: string): HTMLAnchorElement {
  return el('a', { class: 'legal-link', href, 'data-content-page': page, text: label }) as HTMLAnchorElement;
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

export function documentTitleText(config: DocumentTitleConfig): string {
  if (config.mode === 'feedbackbogen') return strings.kopfdaten.titleFeedbackbogen;
  if (config.mode === 'custom') return config.custom.trim() || strings.kopfdaten.titleBewertungsbogen;
  return strings.kopfdaten.titleBewertungsbogen;
}

export function renderDocumentTitleForm(
  container: HTMLElement,
  documentTitle: DocumentTitleConfig,
  handlers: Pick<RenderHandlers, 'onDocumentTitleModeChange' | 'onDocumentTitleCustomChange'>
) {
  container.innerHTML = '';
  const selectId = 'document-title-mode';
  const select = el('select', {
    id: selectId,
    class: 'default-scale-select',
    'aria-label': strings.kopfdaten.documentTitle
  }) as HTMLSelectElement;
  const options: { value: DocumentTitleMode; label: string }[] = [
    { value: 'bewertungsbogen', label: strings.kopfdaten.titleBewertungsbogen },
    { value: 'feedbackbogen', label: strings.kopfdaten.titleFeedbackbogen },
    { value: 'custom', label: strings.kopfdaten.titleCustom }
  ];
  options.forEach(({ value, label }) => select.append(el('option', { value, text: label })));
  select.value = documentTitle.mode;
  select.addEventListener('change', () => handlers.onDocumentTitleModeChange(select.value as DocumentTitleMode));

  container.append(el('div', { class: 'kd-field' },
    el('label', { for: selectId, class: 'kd-label', text: strings.kopfdaten.documentTitle }),
    select
  ));

  if (documentTitle.mode === 'custom') {
    const inputId = 'document-title-custom';
    const input = el('input', {
      id: inputId,
      class: 'kd-input',
      type: 'text',
      value: documentTitle.custom,
      placeholder: strings.kopfdaten.customTitlePlaceholder
    }) as HTMLInputElement;
    input.addEventListener('input', () => handlers.onDocumentTitleCustomChange(input.value));
    container.append(el('div', { class: 'kd-field' },
      el('label', { for: inputId, class: 'kd-label', text: strings.kopfdaten.titleCustom }),
      input
    ));
  }
}

export function renderKopfdaten(
  container: HTMLElement,
  header: HeaderData,
  handlers: Pick<RenderHandlers, 'onHeaderFieldLabelChange' | 'onHeaderFieldValueChange' | 'onAddHeaderField' | 'onRemoveHeaderField'>
) {
  container.innerHTML = '';

  container.append(el('div', { class: 'header-field-head', 'aria-hidden': 'true' },
    el('span', { text: strings.kopfdaten.fieldLabel }),
    el('span', { text: strings.kopfdaten.fieldValue }),
    el('span')
  ));

  header.fields.forEach((field) => {
    container.append(renderHeaderFieldEditor(field, handlers));
  });

  const addFieldBtn = el('button', { class: 'btn btn-small btn-primary add-header-field-btn', type: 'button' });
  addFieldBtn.append(icon('icon-plus'), el('span', { text: strings.kopfdaten.addField }));
  addFieldBtn.addEventListener('click', handlers.onAddHeaderField);
  container.append(addFieldBtn);
}

function renderHeaderFieldEditor(
  field: HeaderField,
  handlers: Pick<RenderHandlers, 'onHeaderFieldLabelChange' | 'onHeaderFieldValueChange' | 'onRemoveHeaderField'>
): HTMLElement {
  const labelInputId = `kd-label-${field.id}`;
  const valueInputId = `kd-value-${field.id}`;
  const labelInput = el('input', {
    type: 'text',
    id: labelInputId,
    class: 'kd-input',
    value: field.label,
    placeholder: strings.kopfdaten.fieldLabel
  }) as HTMLInputElement;
  const valueInput = el('input', {
    type: 'text',
    id: valueInputId,
    class: 'kd-input',
    value: field.value,
    placeholder: ''
  }) as HTMLInputElement;
  const removeBtn = el('button', {
    class: 'btn-icon remove-header-field-btn',
    type: 'button',
    'aria-label': strings.labels.removeHeaderField,
    title: strings.labels.removeHeaderField
  });
  removeBtn.append(el('span', { class: 'remove-header-field-mark', text: 'x' }));

  labelInput.addEventListener('input', () => handlers.onHeaderFieldLabelChange(field.id, labelInput.value));
  valueInput.addEventListener('input', () => handlers.onHeaderFieldValueChange(field.id, valueInput.value));
  removeBtn.addEventListener('click', () => handlers.onRemoveHeaderField(field.id));

  return el('div', { class: 'header-field-row' },
    el('div', { class: 'kd-field' },
      el('label', { for: labelInputId, class: 'kd-label sr-only', text: strings.kopfdaten.fieldLabel }),
      labelInput
    ),
    el('div', { class: 'kd-field' },
      el('label', { for: valueInputId, class: 'kd-label sr-only', text: strings.kopfdaten.fieldValue }),
      valueInput
    ),
    removeBtn
  );
}

export function renderFooterFields(
  container: HTMLElement,
  footerFields: FooterFields,
  handlers: Pick<RenderHandlers, 'onFooterFieldToggle'>
) {
  container.innerHTML = '';
  footerFieldOptions().forEach(({ id, label }) => {
    const inputId = `footer-${id}`;
    const input = el('input', {
      type: 'checkbox',
      id: inputId,
      class: 'item-checkbox',
      checked: footerFields[id] ? 'true' : undefined
    }) as HTMLInputElement;
    input.checked = footerFields[id];
    input.addEventListener('change', () => handlers.onFooterFieldToggle(id, input.checked));
    container.append(el('label', { class: 'footer-field-option', for: inputId }, input, el('span', { text: label })));
  });
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
    removeBtn.addEventListener('click', () => handlers.onRemoveSelected(item.categoryId, item.itemId));
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

export function renderProductFormatControls(
  container: HTMLElement,
  selectedFormats: Category[],
  handlers: Pick<RenderHandlers, 'onOpenProductFormatModal'>
) {
  container.innerHTML = '';
  const chooseBtn = el('button', { class: 'btn btn-small btn-primary choose-product-formats-btn', type: 'button' });
  chooseBtn.append(icon('icon-plus'), el('span', { text: strings.labels.chooseProductFormats }));
  chooseBtn.addEventListener('click', handlers.onOpenProductFormatModal);
  container.append(chooseBtn);

  if (selectedFormats.length === 0) {
    container.append(el('p', { class: 'product-format-empty', text: strings.labels.selectedProductFormatsEmpty }));
  }
}

export function renderProductFormatModal(
  container: HTMLElement,
  formats: ProductFormatData,
  selectedFormatIds: Set<string>,
  isOpen: boolean,
  searchQuery: string,
  handlers: Pick<RenderHandlers, 'onCloseProductFormatModal' | 'onProductFormatSearchChange' | 'onToggleProductFormat'>
) {
  container.innerHTML = '';
  if (!isOpen) return;

  const dialog = el('div', { class: 'product-format-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'product-format-modal-title' });
  const closeBtn = el('button', { class: 'btn btn-small', type: 'button', text: strings.labels.close });
  closeBtn.addEventListener('click', handlers.onCloseProductFormatModal);

  const searchInput = el('input', {
    type: 'search',
    class: 'criteria-search product-format-search',
    placeholder: strings.labels.productFormatSearchPlaceholder,
    value: searchQuery,
    autocomplete: 'off'
  }) as HTMLInputElement;

  const body = el('div', { class: 'product-format-modal-body' });
  formats.groups.forEach((group) => {
    const groupBlock = el('section', { class: 'product-format-group' },
      el('h3', { class: 'product-format-group-title', text: group.title })
    );
    group.formats.forEach((format) => {
      const categoryId = productFormatCategoryId(group.id, format.id);
      const isSelected = selectedFormatIds.has(categoryId);
      const toggleBtn = el('button', {
        class: `btn btn-small ${isSelected ? '' : 'btn-primary'}`,
        type: 'button',
        text: isSelected ? strings.labels.removeProductFormat : strings.labels.addProductFormat
      });
      toggleBtn.addEventListener('click', () => handlers.onToggleProductFormat(categoryId, !isSelected));
      const searchText = `${group.title} ${format.title} ${format.criteria.map((criterion) => criterion.label).join(' ')}`.toLowerCase();
      groupBlock.append(el('div', { class: 'product-format-row', 'data-search-text': searchText },
        el('div', { class: 'product-format-row-main' },
          el('strong', { class: 'product-format-row-title', text: format.title }),
          el('span', { class: 'product-format-row-meta', text: `${format.criteria.length} Kriterien` })
        ),
        toggleBtn
      ));
    });
    body.append(groupBlock);
  });
  const emptyMessage = el('p', { class: 'search-empty product-format-search-empty', text: 'Keine passenden Formate gefunden.' });
  body.append(emptyMessage);
  applyProductFormatFilter(body, searchQuery);
  searchInput.addEventListener('input', () => {
    handlers.onProductFormatSearchChange(searchInput.value);
    applyProductFormatFilter(body, searchInput.value);
  });

  dialog.append(
    el('div', { class: 'product-format-modal-head' },
      el('h2', { id: 'product-format-modal-title', class: 'product-format-modal-title', text: strings.labels.productFormatModalTitle }),
      closeBtn
    ),
    el('label', { class: 'small-label', text: strings.labels.productFormatSearch }),
    searchInput,
    body
  );
  const backdrop = el('div', { class: 'product-format-modal-backdrop' }, dialog);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) handlers.onCloseProductFormatModal();
  });
  container.append(backdrop);
}

export function renderContentPageModal(root: HTMLElement, state: ContentPageState, handlers: RenderHandlers) {
  root.innerHTML = '';
  if (!state) return;

  const body = el('div', { class: 'content-page-modal-body' });
  if (state.loading) {
    body.append(el('p', { text: 'Wird geladen...' }));
  } else if (state.error) {
    body.append(el('p', { text: 'Der Inhalt konnte nicht geladen werden.' }));
  } else {
    body.append(renderMarkdown(state.body));
  }

  const closeBtn = el('button', { class: 'btn btn-small', type: 'button', text: strings.labels.close });
  closeBtn.addEventListener('click', handlers.onCloseContentPage);

  const dialog = el('div', { class: 'content-page-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'content-page-modal-title' },
    el('div', { class: 'content-page-modal-head' },
      el('h2', { id: 'content-page-modal-title', class: 'content-page-modal-title', text: state.title }),
      closeBtn
    ),
    body
  );
  const backdrop = el('div', { class: 'content-page-modal-backdrop' }, dialog);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) handlers.onCloseContentPage();
  });
  root.append(backdrop);
}

function renderMarkdown(markdown: string): HTMLElement {
  const container = el('div', { class: 'content-page-markdown' });
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: HTMLUListElement | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    container.append(el('p', {}, ...inlineText(paragraph.join(' '))));
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      list = null;
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      list = null;
      const level = Math.min(heading[1].length + 1, 4);
      container.append(el(`h${level}` as keyof HTMLElementTagNameMap, { text: heading[2] }));
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      if (!list) {
        list = el('ul');
        container.append(list);
      }
      list.append(el('li', {}, ...inlineText(trimmed.slice(2))));
      return;
    }

    list = null;
    paragraph.push(trimmed);
  });

  flushParagraph();
  return container;
}

function inlineText(text: string): Node[] {
  const nodes: Node[] = [];
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
    const url = match[0];
    nodes.push(el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url }));
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) nodes.push(document.createTextNode(text.slice(lastIndex)));
  return nodes;
}

function applyProductFormatFilter(body: HTMLElement, searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  let visibleRows = 0;

  body.querySelectorAll<HTMLElement>('.product-format-group').forEach((group) => {
    let groupHasVisibleRows = false;
    group.querySelectorAll<HTMLElement>('.product-format-row').forEach((row) => {
      const rowMatches = !normalizedQuery || (row.dataset.searchText ?? '').includes(normalizedQuery);
      row.hidden = !rowMatches;
      if (rowMatches) {
        visibleRows++;
        groupHasVisibleRows = true;
      }
    });
    group.hidden = !groupHasVisibleRows;
  });

  const emptyMessage = body.querySelector<HTMLElement>('.product-format-search-empty');
  if (emptyMessage) emptyMessage.hidden = visibleRows > 0;
}

export function renderCategories(
  container: HTMLElement,
  categories: Category[],
  customItems: CustomItem[],
  selectedKeys: Set<string>,
  scales: Scale[],
  scaleByCategory: Record<string, string>,
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
    panel.append(categoryScaleRow(c, scales, scaleByCategory[c.id] ?? defaultScaleId, handlers));
    panel.append(el('div', { class: 'category-actions' },
      smallActionButton(strings.labels.selectCategory, () => handlers.onSelectCategory(c.id)),
      smallActionButton(strings.labels.clearCategory, () => handlers.onClearCategory(c.id))
    ));

    if (Array.isArray(c.groups)) {
      visibleRegular.groups.forEach((g) => {
        const groupBlock = el('div', { class: 'group-block' });
        groupBlock.append(el('h3', { class: 'group-title', text: g.title }));
        g.items.forEach((it) => groupBlock.append(itemCheckboxRow(c.id, it, selectedKeys, handlers)));
        panel.append(groupBlock);
      });
    } else if (Array.isArray(c.items)) {
      visibleRegular.items.forEach((it) => panel.append(itemCheckboxRow(c.id, it, selectedKeys, handlers)));
    }

    if (visibleCustomItems.length > 0) {
      const customSection = el('div', { class: 'custom-items-section' });
      visibleCustomItems.forEach((ci) => {
        const removeBtn = el('button', { class: 'btn-icon danger', type: 'button', title: strings.labels.remove, 'aria-label': strings.labels.remove }, icon('icon-trash'));
        removeBtn.addEventListener('click', () => handlers.onRemoveCustomItem(ci.id));
        const row = itemCheckboxRow(c.id, ci, selectedKeys, handlers, true);
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
    const addCustomBtn = el('button', { class: 'btn btn-small btn-primary add-custom-btn', type: 'button', 'aria-label': strings.labels.addCustomItem });
    addCustomBtn.append(icon('icon-plus'), el('span', { text: strings.labels.add }));
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
  refreshCategoryCounts(container, categories, customItems, selectedKeys);
  if (renderedCategories === 0) {
    container.append(el('p', { class: 'search-empty', text: 'Keine passenden Kriterien gefunden.' }));
  }
}

function categoryScaleRow(category: Category, scales: Scale[], scaleId: string, handlers: RenderHandlers): HTMLElement {
  const select = el('select', {
    class: 'category-scale-select',
    'aria-label': `${category.title} – ${strings.labels.scale}`
  }) as HTMLSelectElement;
  scales.forEach((s) => select.append(el('option', { value: s.id, text: scaleDisplay(s) })));
  select.value = scaleId;
  select.addEventListener('change', () => handlers.onCategoryScaleChange(category.id, select.value));

  return el('div', { class: 'category-scale-row' },
    el('label', { class: 'small-label', text: strings.labels.scale }),
    select
  );
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
  selectedKeys: Set<string>
) {
  categories.forEach((c) => {
    const all = allItemIdsOfCategory(c, customItems);
    const count = all.filter((id) => selectedKeys.has(selectionKey(c.id, id))).length;
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
  selectedKeys: Set<string>,
  handlers: RenderHandlers,
  isCustom = false
): HTMLElement {
  const isChecked = selectedKeys.has(selectionKey(categoryId, item.id));
  const checkboxId = `cb-${domSafeId(categoryId)}-${domSafeId(item.id)}`;
  const row = el('div', { class: `item-row item-checkbox-row ${isCustom ? 'custom-item-row' : ''}` });

  const cb = el('input', {
    type: 'checkbox',
    class: 'item-checkbox',
    id: checkboxId,
    'data-cat': categoryId,
    'data-item': item.id
  }) as HTMLInputElement;
  cb.checked = isChecked;
  cb.addEventListener('change', () => handlers.onToggle(categoryId, item.id, cb.checked));

  const label = el('label', { for: checkboxId, class: 'item-label-text', text: item.label });
  if (isCustom) {
    label.append(el('span', { class: 'custom-badge', text: strings.labels.customItemBadge }));
  }

  const main = el('div', { class: 'item-main' }, cb, label);
  row.append(main);

  row.append(el('div', { class: 'item-actions' }));

  return row;
}

function selectionKey(categoryId: string, itemId: string): string {
  return `${categoryId}::${itemId}`;
}

function domSafeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
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
  documentTitle: DocumentTitleConfig,
  header: HeaderData,
  footerFields: FooterFields,
  mode: PrintMode
) {
  container.innerHTML = '';

  container.append(el('h1', { class: 'a4-title', text: documentTitleText(documentTitle) }));

  // Header fields with blank lines (always shown — empty fields stay fillable on paper)
  container.append(renderA4Header(header));

  if (rows.length === 0) {
    container.append(el('p', { class: 'a4-empty', text: strings.labels.previewEmpty }));
  } else {
    container.append(renderA4Body(rows, mode));
  }

  container.append(renderA4Feedback());
  container.append(renderA4Footer(footerFields));
  container.append(el('div', { class: 'a4-watermark', text: 'Made with Bewertungsbaukasten' }));
}

function renderA4Header(header: HeaderData): HTMLElement {
  const wrap = el('div', { class: 'a4-header-fields' });

  header.fields.forEach(({ label, value }) => {
    const safeLabel = label.trim() || strings.kopfdaten.fallbackField;
    const row = el('div', { class: 'a4-hf-row' });
    row.append(el('span', { class: 'a4-hf-label', text: `${safeLabel}:` }));
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
  const groups = new Map<string, { title: string; scale: Scale | null; items: ExportRow[] }>();
  rows.forEach((r) => {
    if (!groups.has(r.categoryId)) groups.set(r.categoryId, { title: r.category, scale: r.scale, items: [] });
    groups.get(r.categoryId)!.items.push(r);
  });

  groups.forEach(({ title, scale, items }) => {
    const section = el('section', { class: 'a4-cat-section' });
    section.append(el('h2', { class: 'a4-cat-heading', text: title }));
    if (mode === 'full' && scale) section.append(renderScaleHeader(scale));
    const list = el('ol', { class: 'a4-items' });
    items.forEach((r) => list.append(renderA4Item(r, mode, scale)));
    section.append(list);
    wrap.append(section);
  });

  return wrap;
}

function renderA4Item(row: ExportRow, mode: PrintMode, scale: Scale | null): HTMLElement {
  const itemClasses = ['a4-item'];
  if (mode === 'checklist') itemClasses.push('a4-item-checklist');
  if (mode === 'full' && scale?.kind === 'numeric') itemClasses.push('a4-item-numeric');

  const li = el('li', { class: itemClasses.join(' ') });
  const label = el('span', { class: 'a4-item-label' }, el('span', { class: 'a4-item-text', text: row.item }));

  if (mode === 'checklist') {
    li.append(el('span', { class: 'a4-cbox', text: '☐' }));
    li.append(label);
    return li;
  }

  li.append(label);
  if (scale) {
    li.append(renderScaleBoxes(scale));
  } else {
    li.append(el('div', { class: 'a4-scale-line' }));
  }
  return li;
}

function renderScaleHeader(scale: Scale): HTMLElement {
  if (scale.kind === 'numeric') return renderNumericScaleHeader(scale);

  const wrap = el('div', { class: 'a4-scale-header' });
  wrap.append(el('div', { class: 'a4-scale-header-spacer' }));
  const options = el('div', { class: 'a4-scale-options', style: scaleGridStyle(scale) });
  scaleOptionLabels(scale).forEach((label) => {
    options.append(el('span', { class: 'a4-scale-opt-text', text: label }));
  });
  wrap.append(options);
  return wrap;
}

function renderScaleBoxes(scale: Scale): HTMLElement {
  if (scale.kind === 'numeric') return renderNumericScaleBoxes(scale);

  const wrap = el('div', { class: 'a4-scale-boxes', style: scaleGridStyle(scale) });
  scaleOptionLabels(scale).forEach(() => {
    wrap.append(el('span', { class: 'a4-cbox', text: '☐' }));
  });
  return wrap;
}

function renderNumericScaleHeader(scale: Scale & { kind: 'numeric' }): HTMLElement {
  const wrap = el('div', { class: 'a4-scale-header a4-scale-header-numeric' });
  wrap.append(el('div', { class: 'a4-scale-header-spacer' }));
  const options = el('div', { class: 'a4-scale-options a4-scale-options-numeric', style: scaleGridStyle(scale) });
  scaleOptionLabels(scale).forEach((label) => {
    options.append(el('span', { class: 'a4-scale-opt-text', text: label }));
  });
  wrap.append(options);
  return wrap;
}

function renderNumericScaleBoxes(scale: Scale & { kind: 'numeric' }): HTMLElement {
  const wrap = el('div', { class: 'a4-scale-boxes a4-scale-boxes-numeric', style: scaleGridStyle(scale) });
  scaleOptionLabels(scale).forEach(() => {
    wrap.append(el('span', { class: 'a4-cbox', text: '☐' }));
  });
  return wrap;
}

function scaleGridStyle(scale: Scale): string {
  const minColumnWidth = scale.kind === 'numeric' ? '13pt' : '26pt';
  return `grid-template-columns: repeat(${scaleOptionLabels(scale).length}, minmax(${minColumnWidth}, 1fr))`;
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

function renderA4Feedback(): HTMLElement {
  const section = el('div', { class: 'a4-feedback' });
  section.append(el('h2', { class: 'a4-feedback-title', text: strings.kopfdaten.feedback }));
  // Blank lines for handwriting
  for (let i = 0; i < 5; i++) section.append(el('div', { class: 'a4-feedback-line' }));
  return section;
}

function footerFieldOptions(): { id: FooterFieldId; label: string }[] {
  return [
    { id: 'date', label: strings.kopfdaten.date },
    { id: 'signature', label: strings.kopfdaten.signature },
    { id: 'grade', label: strings.kopfdaten.grade }
  ];
}

function renderA4Footer(footerFields: FooterFields): HTMLElement {
  const enabled = footerFieldOptions().filter(({ id }) => footerFields[id]);
  const wrap = el('div', { class: 'a4-footer-fields' });
  enabled.forEach(({ label }) => {
    wrap.append(el('div', { class: 'a4-footer-field' },
      el('span', { class: 'a4-footer-label', text: `${label}:` }),
      el('span', { class: 'a4-footer-line' })
    ));
  });
  return wrap;
}
