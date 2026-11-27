export { documentTitleText, renderPreview } from './preview';
import type { DocumentTitleMode, FooterFieldId, PrintMode } from '@/types';

export type ExportFormat =
  | 'pdf-print'
  | 'pdf-fillable'
  | 'docx'
  | 'xlsx'
  | 'odt';
export type MobileView = 'edit' | 'preview' | 'export';
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
  onNumericScaleRangeChange: (
    categoryId: string,
    min: number,
    max: number
  ) => void;
  onDefaultScaleChange: (scaleId: string) => void;
  onAddCustomItem: (categoryId: string, label: string) => boolean | void;
  onBulkAddCustomItems: (
    categoryId: string,
    labels: string[]
  ) => boolean | void;
  onRemoveCustomItem: (itemId: string) => void;
  onRemoveSelected: (categoryId: string, itemId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onClearCategory: (categoryId: string) => void;
  onClearSelection: () => void;
  onReorderCategory: (
    draggedCategoryId: string,
    targetCategoryId: string
  ) => void;
  onCategoryTitleChange: (categoryId: string, title: string) => void;
  onAddCategory: (title: string) => boolean | void;
  onRemoveCategory: (categoryId: string) => void;
  onCategoryWeightChange: (categoryId: string, weight: number | null) => void;
  onReorderItem: (
    categoryId: string,
    draggedItemId: string,
    targetItemId: string
  ) => void;
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
  onReorderHeaderField: (draggedFieldId: string, targetFieldId: string) => void;
  onFooterFieldToggle: (field: FooterFieldId, checked: boolean) => void;
  onPreviewModeChange: (mode: PrintMode) => void;
  onMobileViewChange: (view: MobileView) => void;
  onLanguageChange: (lang: string) => void;
};

export {
  renderDocumentTitleForm,
  renderKopfdaten,
  renderFooterFields,
  renderSelectedList,
  renderSelectedCounter,
  renderDefaultScaleSelect,
} from './editor-fields';

export {
  renderProductFormatControls,
  renderProductFormatModal,
  renderResetConfirmModal,
} from './dialogs';

export { renderCategories } from './categories';

export function renderModeSwitch(
  container: HTMLElement,
  mode: PrintMode,
  handlers: RenderHandlers
) {
  container.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.onclick = () =>
      handlers.onPreviewModeChange(btn.dataset.mode as PrintMode);
  });
}

export function renderMobileTabs(
  container: HTMLElement,
  activeView: MobileView,
  handlers: RenderHandlers
) {
  const tabs = Array.from(
    container.querySelectorAll<HTMLButtonElement>('.mobile-tab')
  );
  tabs.forEach((btn, index) => {
    const isActive = btn.dataset.mobileView === activeView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.tabIndex = isActive ? 0 : -1;
    btn.onkeydown = (event) => {
      const next = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    };
    btn.onclick = () =>
      handlers.onMobileViewChange(btn.dataset.mobileView as MobileView);
  });
  document
    .querySelectorAll<HTMLElement>('[data-mobile-panel]')
    .forEach((panel) => {
      panel.classList.toggle(
        'mobile-active',
        panel.dataset.mobilePanel === activeView
      );
    });
}
