import { useRef, useState } from 'react';

import type { RenderHandlers } from './templates';
import { renderView } from './react-view';
import { Icon } from './editor-fields';

import { CreatorDialog } from '@/creator/CreatorShell';
import { strings } from '@/strings';
import { productFormatCategoryId } from '@/product-formats';
import type { Category, ProductFormatData } from '@/types';

export function renderProductFormatControls(
  host: HTMLElement,
  formats: Category[],
  h: Pick<RenderHandlers, 'onOpenProductFormatModal'>
) {
  renderView(
    host,
    <>
      <button
        type="button"
        className="btn btn-small btn-primary choose-product-formats-btn"
        onClick={h.onOpenProductFormatModal}
      >
        <Icon id="plus" />
        <span>{strings.labels.chooseProductFormats}</span>
      </button>
      {!formats.length && (
        <p className="product-format-empty">
          {strings.labels.selectedProductFormatsEmpty}
        </p>
      )}
    </>
  );
}

type FormatHandlers = Pick<
  RenderHandlers,
  | 'onCloseProductFormatModal'
  | 'onProductFormatSearchChange'
  | 'onToggleProductFormat'
>;

function FormatDialog({
  formats,
  selected,
  initial,
  h,
}: {
  formats: ProductFormatData;
  selected: Set<string>;
  initial: string;
  h: FormatHandlers;
}) {
  const opener = useRef<HTMLElement>(null);
  const [query, setQuery] = useState(initial);
  const normalized = query.trim().toLowerCase();
  const groups = formats.groups
    .map((group) => ({
      ...group,
      formats: group.formats.filter((f) =>
        [group.title, f.title, ...f.criteria.map((c) => c.label)]
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      ),
    }))
    .filter((group) => group.formats.length);
  return (
    <CreatorDialog
      open
      title={strings.labels.productFormatModalTitle}
      className="product-format-modal"
      returnFocus={opener}
      closeOnBackdrop
      cancelLabel={strings.labels.close}
      onCancel={h.onCloseProductFormatModal}
      actions={
        <button
          className="btn btn-primary product-format-done-btn"
          onClick={h.onCloseProductFormatModal}
        >
          {strings.labels.productFormatDone}
        </button>
      }
    >
      <label className="small-label" htmlFor="product-format-search">
        {strings.labels.productFormatSearch}
      </label>
      <input
        id="product-format-search"
        type="search"
        autoComplete="off"
        className="criteria-search product-format-search"
        placeholder={strings.labels.productFormatSearchPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          h.onProductFormatSearchChange(e.target.value);
        }}
      />
      <div className="product-format-modal-body">
        {groups.map((group) => (
          <section key={group.id} className="product-format-group">
            <h3 className="product-format-group-title">{group.title}</h3>
            {group.formats.map((format) => {
              const id = productFormatCategoryId(format.id);
              const active = selected.has(id);
              const label = active
                ? strings.labels.removeProductFormat
                : strings.labels.addProductFormat;
              return (
                <div
                  key={id}
                  className="product-format-row"
                  data-category-id={id}
                >
                  <div className="product-format-row-main">
                    <strong className="product-format-row-title">
                      {format.title}
                    </strong>
                    <span className="product-format-row-meta">
                      {strings.labels.productFormatCriteriaCount(
                        format.criteria.length
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={'btn btn-small' + (active ? '' : ' btn-primary')}
                    aria-label={label + ': ' + format.title}
                    onClick={() => h.onToggleProductFormat(id, !active)}
                  >
                    {label}
                  </button>
                </div>
              );
            })}
          </section>
        ))}
        {!groups.length && (
          <p className="search-empty product-format-search-empty">
            {strings.labels.productFormatSearchEmpty}
          </p>
        )}
      </div>
      <span className="product-format-selected-count" aria-live="polite">
        {strings.labels.productFormatSelectedCount(selected.size)}
      </span>
    </CreatorDialog>
  );
}

export function renderProductFormatModal(
  host: HTMLElement,
  formats: ProductFormatData,
  selected: Set<string>,
  open: boolean,
  query: string,
  h: FormatHandlers
) {
  renderView(
    host,
    open ? (
      <FormatDialog
        formats={formats}
        selected={selected}
        initial={query}
        h={h}
      />
    ) : null
  );
}

function ResetDialog({
  cancel,
  confirm,
}: {
  cancel: () => void;
  confirm: () => void;
}) {
  const opener = useRef<HTMLElement>(null);
  return (
    <CreatorDialog
      open
      returnFocus={opener}
      className="reset-confirm-modal"
      title={strings.toolbar.resetConfirmTitle}
      cancelLabel={strings.toolbar.cancel}
      onCancel={cancel}
      closeOnBackdrop
      actions={
        <button
          type="button"
          className="btn btn-small danger reset-confirm-action"
          onClick={confirm}
        >
          {strings.toolbar.resetConfirmAction}
        </button>
      }
    >
      <p className="reset-confirm-body">{strings.toolbar.resetConfirmBody}</p>
    </CreatorDialog>
  );
}
export function renderResetConfirmModal(
  host: HTMLElement,
  open: boolean,
  cancel: () => void,
  confirm: () => void
) {
  renderView(
    host,
    open ? <ResetDialog cancel={cancel} confirm={confirm} /> : null
  );
}
