import { renderView } from './react-view';

import { strings } from '@/strings';
import {
  categoryHeadingText,
  weightedScoreSummary,
} from '@/export/export-utils';
import { scaleOptionLabels } from '@/scale-utils';
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

function RemoveButton({ row, remove }: { row: ExportRow; remove?: Remove }) {
  if (!remove) return null;
  const label = strings.labels.removeFromPreview(row.item);
  return (
    <button
      type="button"
      className="a4-item-remove"
      aria-label={label}
      title={label}
      onClick={() => remove(row.categoryId, row.itemId)}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
        <use href="/icons.svg#icon-trash" />
      </svg>
    </button>
  );
}

function ScaleTable({
  rows,
  scale,
  remove,
}: {
  rows: ExportRow[];
  scale: Scale;
  remove?: Remove;
}) {
  const numeric = scale.kind === 'numeric';
  const options = scaleOptionLabels(scale);
  const criterionWidth = numeric ? 46 : 42;
  return (
    <table
      className={'a4-scale-table' + (numeric ? ' a4-scale-table-numeric' : '')}
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
        {rows.map((row) => (
          <tr
            key={row.itemId}
            className={
              'a4-item a4-scale-row' + (remove ? ' a4-item-removable' : '')
            }
          >
            <td className="a4-item-label a4-scale-criterion-cell">
              <span className="a4-item-number">{row.number}.</span>
              <span className="a4-item-text">{row.item}</span>
              <RemoveButton row={row} remove={remove} />
            </td>
            {options.map((_, i) => (
              <td key={i} className="a4-scale-cell">
                <span className="a4-cbox">☐</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Criteria({
  rows,
  mode,
  remove,
}: {
  rows: ExportRow[];
  mode: PrintMode;
  remove?: Remove;
}) {
  const { scale } = rows[0];
  const checklist = mode === 'checklist';
  if (!checklist && scale && !(scale.kind === 'numeric' && scale.fixedRange))
    return <ScaleTable rows={rows} scale={scale} remove={remove} />;
  return (
    <ol className="a4-items">
      {rows.map((row) => (
        <li
          key={row.itemId}
          className={[
            'a4-item',
            checklist && 'a4-item-checklist',
            !checklist && scale?.kind === 'numeric' && 'a4-item-numeric',
            remove && 'a4-item-removable',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {checklist && <span className="a4-cbox">☐</span>}
          <span className="a4-item-label">
            <span className="a4-item-text">{row.item}</span>
          </span>
          {!checklist &&
            (scale ? (
              <div className="grade-points-options">
                {scaleOptionLabels(scale).map((label) => (
                  <span key={label}>
                    {label}
                    {'\u00a0☐'}
                  </span>
                ))}
              </div>
            ) : (
              <div className="a4-scale-line" />
            ))}
          <RemoveButton row={row} remove={remove} />
        </li>
      ))}
    </ol>
  );
}

export function renderPreview(
  container: HTMLElement,
  rows: ExportRow[],
  title: DocumentTitleConfig,
  header: HeaderData,
  footer: FooterFields,
  mode: PrintMode,
  remove?: Remove
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
            <section key={id} className="a4-cat-section">
              <h2 className="a4-cat-heading">
                {categoryHeadingText(
                  items[0].category,
                  items[0].weight,
                  mode === 'full' ? items[0].scale : null
                )}
              </h2>
              <Criteria rows={items} mode={mode} remove={remove} />
            </section>
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
