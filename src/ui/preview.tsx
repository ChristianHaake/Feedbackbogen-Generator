import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';

import './preview-order.css';

import { renderView } from './react-view';

import { strings } from '@/strings';
import {
  categoryHeadingText,
  weightedScoreSummary,
} from '@/export/export-utils';
import { criterionWidthPercent, scaleOptionLabels } from '@/scale-utils';
import type {
  DocumentTitleConfig,
  ExportRow,
  FooterFields,
  HeaderData,
  PrintMode,
  Scale,
} from '@/types';

export function documentTitleText(config: DocumentTitleConfig) {
  if (config.mode === 'custom')
    return config.custom.trim() || strings.kopfdaten.titleFeedbackbogen;
  return config.mode === 'feedbackbogen'
    ? strings.kopfdaten.titleFeedbackbogen
    : strings.kopfdaten.titleBewertungsbogen;
}

type Remove = (categoryId: string, itemId: string) => void;

type Move = (categoryId: string, itemId: string, destinationId: string) => void;
type RowActions = (index: number) => ReactNode;

function RowControls({
  rows,
  index,
  move,
  remove,
  startDrag,
  endDrag,
}: {
  rows: ExportRow[];
  index: number;
  move?: Move;
  remove?: Remove;
  startDrag: (event: DragEvent<HTMLButtonElement>, row: ExportRow) => void;
  endDrag: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !controls.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  const row = rows[index];
  const removeLabel = strings.labels.removeFromPreview(row.item);
  const handleLabel = strings.labels.dragCriterion(row.item);
  const moveBy = (offset: number) => {
    const target = rows[index + offset];
    if (!target || !move) return;
    setOpen(false);
    move(row.categoryId, row.itemId, target.itemId);
  };

  if (!move || rows.length < 2) {
    if (!remove) return null;
    return (
      <button
        type="button"
        className="a4-item-remove"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={() => remove(row.categoryId, row.itemId)}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
          <use href="/icons.svg#icon-trash" />
        </svg>
      </button>
    );
  }
  return (
    <div
      className="preview-row-controls"
      ref={controls}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="preview-order-handle"
        data-order-category={row.categoryId}
        data-order-item={row.itemId}
        aria-label={handleLabel}
        title={handleLabel}
        aria-expanded={open}
        aria-keyshortcuts="ArrowUp ArrowDown"
        draggable
        onClick={() => setOpen(!open)}
        onDragStart={(event) => {
          setOpen(false);
          startDrag(event, row);
        }}
        onDragEnd={endDrag}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            moveBy(event.key === 'ArrowUp' ? -1 : 1);
          }
        }}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="20"
          viewBox="0 0 14 20"
          fill="currentColor"
        >
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="4" cy="16" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          className="preview-order-actions"
          role="group"
          aria-label={handleLabel}
        >
          <button
            type="button"
            disabled={index === 0}
            aria-label={strings.labels.moveCriterionUp}
            title={strings.labels.moveCriterionUp}
            onClick={() => moveBy(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === rows.length - 1}
            aria-label={strings.labels.moveCriterionDown}
            title={strings.labels.moveCriterionDown}
            onClick={() => moveBy(1)}
          >
            ↓
          </button>
          {remove && (
            <button
              type="button"
              aria-label={removeLabel}
              title={removeLabel}
              onClick={() => remove(row.categoryId, row.itemId)}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
              >
                <use href="/icons.svg#icon-trash" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ScaleTable({
  rows,
  scale,
  rowActions,
}: {
  rows: ExportRow[];
  scale: Scale;
  rowActions: RowActions;
}) {
  const numeric = scale.kind === 'numeric';
  const options = scaleOptionLabels(scale);
  const gradePoints = numeric && scale.fixedRange;
  const criterionWidth = criterionWidthPercent(scale);
  return (
    <table
      style={{ '--a4-option-count': options.length, '--a4-criterion-width': criterionWidth + '%' } as CSSProperties}
      className={[
        'a4-scale-table',
        numeric && 'a4-scale-table-numeric',
        gradePoints && 'a4-grade-points',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <colgroup>
        <col
          className="a4-scale-col-criterion"
          style={{ width: criterionWidth + '%' }}
        />
        {options.map((_, i) => (
          <col
            key={i}
            className="a4-scale-col-option"
            style={{ width: (100 - criterionWidth) / options.length + '%' }}
          />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="a4-scale-criterion-head" scope="col" />
          {options.map((label, i) => (
            <th
              key={i}
              className="a4-scale-option-head a4-scale-opt-text"
              scope="col"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const label = (
            <span className="a4-item-label">
              <span className="a4-item-number">{row.number}.</span>
              <span className="a4-item-text">{row.item}</span>
            </span>
          );
          return (
            <tr
              key={row.itemId}
              className="a4-item a4-scale-row a4-item-removable"
              data-preview-item={row.itemId}
            >
              <td className="a4-scale-criterion-cell">
                {label}
                {rowActions(index)}
              </td>
              {options.map((_, i) => (
                <td key={i} className="a4-scale-cell">
                  <span className="a4-cbox">☐</span>
                </td>
              ))}
              <td className="a4-print-criterion" colSpan={options.length + 1}>
                <div className="a4-print-row">
                  {label}
                  {options.map((_, i) => <span className="a4-cbox" key={i}>☐</span>)}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Criteria({
  rows,
  mode,
  rowActions,
}: {
  rows: ExportRow[];
  mode: PrintMode;
  rowActions: RowActions;
}) {
  const { scale } = rows[0];
  const checklist = mode === 'checklist';
  if (!checklist && scale)
    return <ScaleTable rows={rows} scale={scale} rowActions={rowActions} />;
  return (
    <ol className="a4-items">
      {rows.map((row, index) => (
        <li
          key={row.itemId}
          data-preview-item={row.itemId}
          className={[
            'a4-item',
            checklist && 'a4-item-checklist',
            'a4-item-removable',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {checklist && <span className="a4-cbox">☐</span>}
          <span className="a4-item-label">
            <span className="a4-item-text">{row.item}</span>
          </span>
          {!checklist && <div className="a4-scale-line" />}
          {rowActions(index)}
        </li>
      ))}
    </ol>
  );
}

function CategorySection({
  rows,
  mode,
  move,
  remove,
}: {
  rows: ExportRow[];
  mode: PrintMode;
  move?: Move;
  remove?: Remove;
}) {
  const dragged = useRef<string | null>(null);
  const highlighted = useRef<HTMLElement | null>(null);
  const highlight = (next: HTMLElement | null) => {
    if (next === highlighted.current) return;
    highlighted.current?.classList.remove('preview-drop-target');
    next?.classList.add('preview-drop-target');
    highlighted.current = next;
  };
  const endDrag = () => {
    dragged.current = null;
    highlight(null);
  };
  const targetRow = (event: DragEvent<HTMLElement>) => {
    const row =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-preview-item]')
        : null;
    return row && row.dataset.previewItem !== dragged.current ? row : null;
  };
  return (
    <section
      className="a4-cat-section"
      onDragOver={(event) => {
        if (!dragged.current) return;
        const target = targetRow(event);
        highlight(target);
        if (target) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          highlight(null);
      }}
      onDrop={(event) => {
        const from = dragged.current;
        const to = targetRow(event)?.dataset.previewItem;
        endDrag();
        if (from && to && move) {
          event.preventDefault();
          move(rows[0].categoryId, from, to);
        }
      }}
    >
      <h2 className="a4-cat-heading">
        {categoryHeadingText(
          rows[0].category,
          rows[0].weight,
          mode === 'full' ? rows[0].scale : null
        )}
      </h2>
      <Criteria
        rows={rows}
        mode={mode}
        rowActions={(index) => (
          <RowControls
            rows={rows}
            index={index}
            move={move}
            remove={remove}
            endDrag={endDrag}
            startDrag={(event, row) => {
              dragged.current = row.itemId;
              event.dataTransfer.setData(
                'application/x-feedback-preview-item',
                row.itemId
              );
              event.dataTransfer.effectAllowed = 'move';
            }}
          />
        )}
      />
    </section>
  );
}

export function renderPreview(
  container: HTMLElement,
  rows: ExportRow[],
  title: DocumentTitleConfig,
  header: HeaderData,
  footer: FooterFields,
  mode: PrintMode,
  remove?: Remove,
  move?: Move
) {
  const groups = new Map<string, ExportRow[]>();
  for (const row of rows) {
    const group = groups.get(row.categoryId);
    if (group) group.push(row);
    else groups.set(row.categoryId, [row]);
  }
  const summary = weightedScoreSummary(rows);
  return renderView(
    container,
    <>
      <h1 className="a4-title">{documentTitleText(title)}</h1>
      <div className="a4-header-fields">
        {header.fields.map((field) => (
          <div className="a4-hf-row" key={field.id}>
            <span className="a4-hf-label">
              {field.label.trim() || strings.kopfdaten.fallbackField}:
            </span>
            <span className="a4-hf-value">{field.value}</span>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="a4-empty">{strings.labels.previewEmpty}</p>
      ) : (
        <div className="a4-body">
          {Array.from(groups, ([id, items]) => (
            <CategorySection
              key={id}
              rows={items}
              mode={mode}
              move={move}
              remove={remove}
            />
          ))}
        </div>
      )}
      {summary && (
        <section className="a4-score-summary">
          <h2 className="a4-score-title">{strings.labels.scoreSummaryTitle}</h2>
          <ul className="a4-score-list">
            {summary.groups.map((g, i) => (
              <li key={i} className="a4-score-row">
                {strings.labels.scoreCategoryResult(g.title, g.weight)}
              </li>
            ))}
          </ul>
          <p className="a4-score-total">
            {strings.labels.scoreTotalResult(summary.totalWeight)}
          </p>
          <p className="a4-score-hint">{strings.labels.scoreTotalHint}</p>
        </section>
      )}
      <div className="a4-feedback">
        <h2 className="a4-feedback-title">{strings.kopfdaten.feedback}</h2>
        {Array.from({ length: 5 }, (_, i) => (
          <div className="a4-feedback-line" key={i} />
        ))}
      </div>
      <div className="a4-footer-fields">
        {(['date', 'signature', 'grade'] as const)
          .filter((id) => footer[id])
          .map((id) => (
            <div key={id} className="a4-footer-field">
              <span className="a4-footer-label">{strings.kopfdaten[id]}:</span>
              <span className="a4-footer-line" />
            </div>
          ))}
      </div>
      <div className="a4-watermark">{strings.watermark}</div>
    </>
  );
}
