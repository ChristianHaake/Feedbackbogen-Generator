import { type DragEvent } from 'react';

import type { RenderHandlers, SelectedSummary } from './templates';
import { renderView } from './react-view';

import { strings } from '@/strings';
import { CONFIG_LIMITS } from '@/storage';
import { scaleDisplay } from '@/scale-utils';
import type {
  DocumentTitleConfig,
  DocumentTitleMode,
  FooterFields,
  HeaderData,
  Scale,
} from '@/types';

export function Icon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <use href={'/icons.svg#icon-' + id} />
    </svg>
  );
}

export function renderDocumentTitleForm(
  host: HTMLElement,
  title: DocumentTitleConfig,
  handlers: Pick<
    RenderHandlers,
    'onDocumentTitleModeChange' | 'onDocumentTitleCustomChange'
  >
) {
  const options: [DocumentTitleMode, string][] = [
    ['feedbackbogen', strings.kopfdaten.titleFeedbackbogen],
    ['bewertungsbogen', strings.kopfdaten.titleBewertungsbogen],
    ['custom', strings.kopfdaten.titleCustom],
  ];
  renderView(
    host,
    <>
      <div className="kd-field document-title-field">
        <span className="small-label">{strings.kopfdaten.documentTitle}</span>
        <div
          id="document-title-mode"
          className="title-segment"
          role="radiogroup"
          aria-label={strings.kopfdaten.documentTitle}
        >
          {options.map(([mode, label]) => (
            <button
              type="button"
              key={mode}
              role="radio"
              aria-checked={title.mode === mode}
              className={
                'title-segment__opt' + (title.mode === mode ? ' is-active' : '')
              }
              data-title-mode={mode}
              onClick={() => handlers.onDocumentTitleModeChange(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {title.mode === 'custom' && (
        <div className="kd-field">
          <label htmlFor="document-title-custom" className="kd-label">
            {strings.kopfdaten.titleCustom}
          </label>
          <input
            id="document-title-custom"
            type="text"
            className="kd-input"
            maxLength={CONFIG_LIMITS.stringLength}
            defaultValue={title.custom}
            ref={(node) => {
              if (node && node.value !== title.custom)
                node.value = title.custom;
            }}
            placeholder={strings.kopfdaten.customTitlePlaceholder}
            onInput={(e) =>
              handlers.onDocumentTitleCustomChange(e.currentTarget.value)
            }
          />
        </div>
      )}
    </>
  );
}

type SortKind = 'category' | 'item' | 'header-field';

function dropProps(
  kind: SortKind,
  id: string,
  reorder: (dragged: string, target: string) => void
) {
  const mime = 'application/x-feedback-' + kind;
  return {
    onDragOver(event: DragEvent) {
      if (!event.dataTransfer.types.includes(mime)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.add('drag-over');
    },
    onDragLeave(event: DragEvent) {
      event.currentTarget.classList.remove('drag-over');
    },
    onDrop(event: DragEvent) {
      event.currentTarget.classList.remove('drag-over');
      const dragged = event.dataTransfer.getData(mime);
      if (!dragged || dragged === id) return;
      event.preventDefault();
      event.stopPropagation();
      reorder(dragged, id);
    },
  };
}

function Handle({
  kind,
  id,
  label,
  move,
}: {
  kind: SortKind;
  id: string;
  label: string;
  move: (offset: number) => void;
}) {
  return (
    <button
      type="button"
      className={
        'drag-handle' +
        (kind === 'header-field' ? ' header-field-drag-handle' : '')
      }
      title={label}
      aria-label={label}
      draggable
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        move(e.key === 'ArrowUp' ? -1 : 1);
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/x-feedback-' + kind, id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      ⋮⋮
    </button>
  );
}

export function renderKopfdaten(
  host: HTMLElement,
  header: HeaderData,
  h: Pick<
    RenderHandlers,
    | 'onAddHeaderField'
    | 'onHeaderFieldLabelChange'
    | 'onHeaderFieldValueChange'
    | 'onRemoveHeaderField'
    | 'onReorderHeaderField'
  >
) {
  renderView(
    host,
    <>
      <div className="header-field-head" aria-hidden="true">
        <span />
        <span>{strings.kopfdaten.fieldLabel}</span>
        <span>{strings.kopfdaten.fieldValue}</span>
        <span />
      </div>
      {header.fields.map((field, i) => (
        <div
          key={field.id}
          className="header-field-row"
          data-header-field-id={field.id}
          {...dropProps('header-field', field.id, h.onReorderHeaderField)}
        >
          <Handle
            kind="header-field"
            id={field.id}
            label={strings.labels.dragHeaderField(
              field.label.trim() || strings.kopfdaten.fallbackField
            )}
            move={(offset) => {
              const to = header.fields[i + offset];
              if (to) h.onReorderHeaderField(field.id, to.id);
            }}
          />
          {(['label', 'value'] as const).map((key) => {
            const label =
              key === 'label'
                ? strings.kopfdaten.fieldLabel
                : strings.kopfdaten.fieldValue;
            const id = 'kd-' + key + '-' + field.id;
            return (
              <div key={key} className="kd-field">
                <label htmlFor={id} className="kd-label">
                  {label}
                </label>
                <input
                  ref={(node) => {
                    if (node && node.value !== field[key])
                      node.value = field[key];
                  }}
                  type="text"
                  id={id}
                  className="kd-input"
                  maxLength={CONFIG_LIMITS.stringLength}
                  defaultValue={field[key]}
                  placeholder={key === 'label' ? label : ''}
                  onInput={(e) =>
                    (key === 'label'
                      ? h.onHeaderFieldLabelChange
                      : h.onHeaderFieldValueChange)(
                      field.id,
                      e.currentTarget.value
                    )
                  }
                />
              </div>
            );
          })}
          <button
            className="btn-icon remove-header-field-btn"
            type="button"
            aria-label={strings.labels.removeHeaderField}
            title={strings.labels.removeHeaderField}
            onClick={() => h.onRemoveHeaderField(field.id)}
          >
            <Icon id="trash" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small btn-primary add-header-field-btn"
        onClick={h.onAddHeaderField}
      >
        <Icon id="plus" />
        <span>{strings.kopfdaten.addField}</span>
      </button>
    </>
  );
}

export function renderFooterFields(
  host: HTMLElement,
  footer: FooterFields,
  handlers: Pick<RenderHandlers, 'onFooterFieldToggle'>
) {
  renderView(
    host,
    (['date', 'signature', 'grade'] as const).map((id) => (
      <button
        key={id}
        type="button"
        id={'footer-' + id}
        role="switch"
        aria-checked={footer[id]}
        className={'footer-chip' + (footer[id] ? ' is-active' : '')}
        data-footer-field={id}
        onClick={() => {
          const checked = !footer[id];
          handlers.onFooterFieldToggle(id, checked);
          renderFooterFields(host, { ...footer, [id]: checked }, handlers);
        }}
      >
        <span>{strings.kopfdaten[id]}</span>
      </button>
    ))
  );
}

export function renderSelectedList(
  host: HTMLElement,
  selected: SelectedSummary[],
  h: RenderHandlers
) {
  const groups = new Map<string, SelectedSummary[]>();
  for (const item of selected) {
    const group = groups.get(item.categoryId);
    if (group) group.push(item);
    else groups.set(item.categoryId, [item]);
  }
  const ids = Array.from(groups.keys());
  renderView(
    host,
    selected.length ? (
      <>
        <p className="selected-order-hint">{strings.labels.reorderSelection}</p>
        <div className="selected-categories">
          {ids.map((id, i) => {
            const items = groups.get(id)!;
            const title = items[0].category;
            const reorder = (from: string, to: string) =>
              h.onReorderItem(id, from, to);
            return (
              <section
                key={id}
                className="selected-category"
                data-category-id={id}
                {...dropProps('category', id, h.onReorderCategory)}
              >
                <div className="selected-category-head">
                  <Handle
                    kind="category"
                    id={id}
                    label={strings.labels.dragCategory(title)}
                    move={(offset) => {
                      if (ids[i + offset])
                        h.onReorderCategory(id, ids[i + offset]);
                    }}
                  />
                  <h3>{title}</h3>
                </div>
                <ol className="selected-items">
                  {items.map((item, j) => {
                    const meta = [
                      title,
                      item.isCustom && strings.labels.customItemBadge,
                      item.scaleLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <li
                        key={item.itemId}
                        className="selected-item"
                        data-item-id={item.itemId}
                        {...dropProps('item', item.itemId, reorder)}
                      >
                        <Handle
                          kind="item"
                          id={item.itemId}
                          label={strings.labels.dragCriterion(item.item)}
                          move={(offset) => {
                            if (items[j + offset])
                              reorder(item.itemId, items[j + offset].itemId);
                          }}
                        />
                        <div className="selected-item-main">
                          <span
                            className="selected-item-label"
                            title={item.item}
                          >
                            {item.item}
                          </span>
                          <span className="selected-item-meta" title={meta}>
                            {meta}
                          </span>
                        </div>
                        <button
                          className="btn-icon quiet"
                          type="button"
                          title={strings.labels.remove}
                          aria-label={strings.labels.remove + ': ' + item.item}
                          onClick={() => h.onRemoveSelected(id, item.itemId)}
                        >
                          <Icon id="trash" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </>
    ) : (
      <p className="selected-empty">{strings.labels.selectedEmpty}</p>
    )
  );
}

export function renderDefaultScaleSelect(
  select: HTMLSelectElement,
  scales: Scale[],
  id: string,
  h: RenderHandlers
) {
  renderView(
    select,
    scales.map((s) => (
      <option value={s.id} key={s.id}>
        {scaleDisplay(s)}
      </option>
    ))
  );
  select.value = id;
  select.onchange = () => h.onDefaultScaleChange(select.value);
}

export function renderSelectedCounter(host: HTMLElement, count: number) {
  renderView(host, strings.labels.selectedCount(count));
}
