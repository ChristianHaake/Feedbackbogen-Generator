import { useLayoutEffect, useRef, useState } from 'react';

import { renderView } from './react-view';
import type { RenderHandlers } from './templates';

import { orderByIds } from '@/config-order';
import { sanitizeNumericScaleSettings, scaleDisplay } from '@/scale-utils';
import { CONFIG_LIMITS } from '@/storage';
import { strings } from '@/strings';
import type {
  Category,
  CustomItem,
  Item,
  NumericScaleSettings,
  Scale,
} from '@/types';

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function Icon({ name }: { name: 'trash' | 'plus' }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <use href={'/icons.svg#icon-' + name} />
    </svg>
  );
}

function RemoveButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      className="btn-icon danger"
      type="button"
      title={label}
      aria-label={label}
      onClick={onRemove}
    >
      <Icon name="trash" />
    </button>
  );
}

function ItemRow({
  categoryId,
  item,
  checked,
  custom = false,
  handlers,
}: {
  categoryId: string;
  item: Item;
  checked: boolean;
  custom?: boolean;
  handlers: RenderHandlers;
}) {
  const suffix = safeId(categoryId) + '-' + safeId(item.id);
  const id = 'cb-' + suffix;
  const descriptionId = 'item-description-' + suffix;
  const description = item.description?.trim();
  return (
    <div
      className={
        'item-row item-checkbox-row' + (custom ? ' custom-item-row' : '')
      }
    >
      <div className="item-main">
        <input
          type="checkbox"
          className="item-checkbox"
          id={id}
          data-cat={categoryId}
          data-item={item.id}
          checked={checked}
          onChange={(event) =>
            handlers.onToggle(categoryId, item.id, event.currentTarget.checked)
          }
        />
        <label htmlFor={id} className="item-label-text">
          {item.label}
          {custom && (
            <span className="custom-badge">
              {strings.labels.customItemBadge}
            </span>
          )}
        </label>
        {description && (
          <span className="item-description-control">
            <button
              className="item-description-button"
              type="button"
              aria-label={strings.labels.itemDescription(item.label)}
              aria-describedby={descriptionId}
              onKeyDown={(event) => {
                if (event.key === 'Escape') event.currentTarget.blur();
              }}
            >
              <span aria-hidden="true">i</span>
            </button>
            <span
              className="item-description-tooltip"
              id={descriptionId}
              role="tooltip"
            >
              {description}
            </span>
          </span>
        )}
      </div>
      <div className="item-actions">
        {custom && (
          <RemoveButton
            label={strings.labels.remove}
            onRemove={() => handlers.onRemoveCustomItem(item.id)}
          />
        )}
      </div>
    </div>
  );
}

function CategoryOptions({
  category,
  weight,
  handlers,
}: {
  category: Category;
  weight?: number;
  handlers: RenderHandlers;
}) {
  const id = safeId(category.id);
  const titleId = 'category-title-' + id;
  const weightId = 'category-weight-' + id;
  return (
    <>
      <div className="category-edit-row">
        <label className="small-label" htmlFor={titleId}>
          {strings.labels.renameCategory}
        </label>
        <input
          key={category.title}
          type="text"
          id={titleId}
          className="category-title-input"
          maxLength={CONFIG_LIMITS.stringLength}
          data-cat={category.id}
          defaultValue={category.title}
          aria-label={strings.labels.renameCategory}
          ref={(input) => {
            if (input)
              input.onblur = () =>
                handlers.onCategoryTitleChange(category.id, input.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        {category.id.startsWith('custom_cat_') && (
          <RemoveButton
            label={strings.labels.removeCategory}
            onRemove={() => handlers.onRemoveCategory(category.id)}
          />
        )}
      </div>
      <div className="category-edit-row">
        <label className="small-label" htmlFor={weightId}>
          {strings.labels.categoryWeight}
        </label>
        <input
          key={weight ?? ''}
          type="number"
          id={weightId}
          className="category-weight-input"
          min="0"
          max="100"
          step="5"
          data-cat={category.id}
          defaultValue={weight ?? ''}
          placeholder="—"
          aria-label={strings.labels.categoryWeight}
          ref={(input) => {
            if (input)
              input.onchange = () => {
                const raw = input.value.trim();
                handlers.onCategoryWeightChange(
                  category.id,
                  raw === '' ? null : Number(raw)
                );
              };
          }}
        />
        <span className="weight-unit">%</span>
      </div>
    </>
  );
}

function NumericRange({
  categoryId,
  scale,
  settings,
  handlers,
}: {
  categoryId: string;
  scale: Extract<Scale, { kind: 'numeric' }>;
  settings?: NumericScaleSettings;
  handlers: RenderHandlers;
}) {
  const low = useRef<HTMLInputElement>(null);
  const high = useRef<HTMLInputElement>(null);
  const bounds = sanitizeNumericScaleSettings(scale, settings);
  useLayoutEffect(() => {
    if (low.current) low.current.value = String(bounds.min);
    if (high.current) high.current.value = String(bounds.max);
  }, [bounds.min, bounds.max]);
  const commit = (anchor: 'min' | 'max') => {
    if (!low.current || !high.current) return;
    const next = sanitizeNumericScaleSettings(
      scale,
      {
        min: low.current.value === '' ? bounds.min : Number(low.current.value),
        max:
          high.current.value === '' ? bounds.max : Number(high.current.value),
      },
      anchor
    );
    low.current.value = String(next.min);
    high.current.value = String(next.max);
    handlers.onNumericScaleRangeChange(categoryId, next.min, next.max);
  };
  return (
    <div className="numeric-scale-range">
      {(['min', 'max'] as const).map((anchor) => {
        const label =
          anchor === 'min' ? strings.labels.scaleMin : strings.labels.scaleMax;
        const id = categoryId + '-scale-' + anchor;
        return (
          <label
            key={anchor}
            className="small-label numeric-scale-field"
            htmlFor={id}
          >
            <span>{label}</span>
            <input
              type="text"
              id={id}
              aria-label={label}
              className="numeric-scale-input"
              defaultValue={bounds[anchor]}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              ref={(input) => {
                const ref = anchor === 'min' ? low : high;
                ref.current = input;
                if (input) {
                  input.onbeforeinput = (event) => {
                    if (event.data && /\D/.test(event.data))
                      event.preventDefault();
                  };
                  input.onchange = () => commit(anchor);
                }
              }}
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = input.value.replace(/\D/g, '').slice(0, 2);
                if (low.current?.value && high.current?.value) commit(anchor);
              }}
            />
          </label>
        );
      })}
      <span className="numeric-scale-help">
        {strings.labels.scaleMaxSteps(scale.maxSteps)}
      </span>
    </div>
  );
}

function ScaleRow({
  category,
  scales,
  scaleId,
  settings,
  handlers,
}: {
  category: Category;
  scales: Scale[];
  scaleId: string;
  settings?: NumericScaleSettings;
  handlers: RenderHandlers;
}) {
  const id = 'category-scale-' + safeId(category.id);
  const scale = scales.find((candidate) => candidate.id === scaleId);
  return (
    <div className="category-scale-row">
      <label className="small-label" htmlFor={id}>
        {strings.labels.scale}
      </label>
      <select
        id={id}
        className="category-scale-select"
        value={scaleId}
        aria-label={category.title + ' – ' + strings.labels.scale}
        onChange={(event) =>
          handlers.onCategoryScaleChange(category.id, event.currentTarget.value)
        }
      >
        {scales.map((option) => (
          <option key={option.id} value={option.id}>
            {scaleDisplay(option)}
          </option>
        ))}
      </select>
      <p className="scale-hint">{strings.labels.categoryScaleHint}</p>
      {scale?.kind === 'numeric' && !scale.fixedRange && (
        <NumericRange
          categoryId={category.id}
          scale={scale}
          settings={settings}
          handlers={handlers}
        />
      )}
    </div>
  );
}

function commitDraft(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  submit: (value: string) => boolean | void
) {
  if (!input || !input.value.trim()) return;
  const draft = input.value;
  // A successful change may synchronously rerender and restore all unfinished drafts.
  input.value = '';
  if (submit(draft) === false) input.value = draft;
}

function CustomItemsForm({
  categoryId,
  handlers,
}: {
  categoryId: string;
  handlers: RenderHandlers;
}) {
  const single = useRef<HTMLInputElement>(null);
  const bulk = useRef<HTMLTextAreaElement>(null);
  const suffix = safeId(categoryId);
  const addSingle = () =>
    commitDraft(single.current, (value) =>
      handlers.onAddCustomItem(categoryId, value)
    );
  const addBulk = () =>
    commitDraft(bulk.current, (value) =>
      handlers.onBulkAddCustomItems(
        categoryId,
        value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      )
    );
  return (
    <>
      <div className="add-custom-row">
        <input
          ref={single}
          type="text"
          id={'custom-input-' + suffix}
          className="custom-item-input"
          maxLength={CONFIG_LIMITS.stringLength}
          data-cat={categoryId}
          placeholder={strings.labels.customItemPlaceholder}
          aria-label={strings.labels.addCustomItem}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addSingle();
            }
          }}
        />
        <button
          type="button"
          id={'add-custom-' + suffix}
          className="btn btn-small btn-primary add-custom-btn"
          aria-label={strings.labels.addCustomItem}
          onClick={addSingle}
        >
          <Icon name="plus" />
          <span>{strings.labels.add}</span>
        </button>
      </div>
      <div className="bulk-add-row">
        <textarea
          ref={bulk}
          id={'bulk-input-' + suffix}
          className="bulk-add-input"
          data-cat={categoryId}
          rows={3}
          placeholder={strings.labels.bulkAddPlaceholder}
          aria-label={strings.labels.bulkAdd}
        />
        <button
          type="button"
          id={'add-bulk-' + suffix}
          className="btn btn-small add-bulk-btn"
          onClick={addBulk}
        >
          <Icon name="plus" />
          <span>{strings.labels.bulkAddButton}</span>
        </button>
      </div>
    </>
  );
}

function AddCategory({ handlers }: { handlers: RenderHandlers }) {
  const input = useRef<HTMLInputElement>(null);
  const submit = () => commitDraft(input.current, handlers.onAddCategory);
  return (
    <div className="add-category-row">
      <input
        ref={input}
        type="text"
        id="add-category-input"
        className="add-category-input"
        maxLength={CONFIG_LIMITS.stringLength}
        placeholder={strings.labels.addCategoryPlaceholder}
        aria-label={strings.labels.addCategory}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        id="add-category-button"
        className="btn btn-small btn-primary add-category-btn"
        aria-label={strings.labels.addCategory}
        onClick={submit}
      >
        <Icon name="plus" />
        <span>{strings.labels.addCategory}</span>
      </button>
    </div>
  );
}

function CategoryAccordion({
  category,
  count,
  initiallyOpen,
  results,
  controls,
  search,
  handlers,
}: {
  category: Category;
  count: number;
  initiallyOpen: boolean;
  results: React.ReactNode;
  controls: React.ReactNode;
  search: boolean;
  handlers: RenderHandlers;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const headerId = 'acc-' + category.id;
  return (
    <>
      <button
        className="accordion-header"
        id={headerId}
        type="button"
        aria-controls={headerId + '-panel'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="acc-title">{category.title}</span>
        <span
          className={'acc-count' + (count ? ' has-selection' : '')}
          data-cat={category.id}
        >
          {count || ''}
        </span>
      </button>
      <div
        id={headerId + '-panel'}
        className={'accordion-panel' + (open ? ' open' : '')}
        aria-labelledby={headerId}
        role="region"
        hidden={!open}
      >
        {search && results}
        {controls}
        <div className="category-actions">
          <button
            type="button"
            className="btn-mini"
            onClick={() => handlers.onSelectCategory(category.id)}
          >
            {strings.labels.selectCategory}
          </button>
          <button
            type="button"
            className="btn-mini"
            onClick={() => handlers.onClearCategory(category.id)}
          >
            {strings.labels.clearCategory}
          </button>
        </div>
        {!search && results}
        <CustomItemsForm categoryId={category.id} handlers={handlers} />
      </div>
    </>
  );
}

export function renderCategories(
  container: HTMLElement,
  categories: Category[],
  customItems: CustomItem[],
  selectedKeys: Set<string>,
  scales: Scale[],
  scaleByCategory: Record<string, string>,
  scaleSettingsByCategory: Record<string, NumericScaleSettings>,
  defaultScaleId: string,
  itemOrderByCategory: Record<string, string[]>,
  handlers: RenderHandlers,
  searchQuery = '',
  editable = false,
  categoryWeights: Record<string, number> = {},
  openCats: readonly string[] = []
) {
  const query = searchQuery.trim().toLowerCase();
  const matches = (item: Item) =>
    (item.label + ' ' + (item.description ?? '')).toLowerCase().includes(query);
  const rendered = categories.flatMap((category) => {
    const itemOrder = itemOrderByCategory[category.id] ?? [];
    const groups = (category.groups ?? [])
      .map((group) => ({
        ...group,
        items: orderByIds(group.items.filter(matches), itemOrder),
      }))
      .filter((group) => group.items.length > 0);
    const items = orderByIds((category.items ?? []).filter(matches), itemOrder);
    const custom = customItems.filter(
      (item) => item.categoryId === category.id
    );
    const visibleCustom = orderByIds(custom.filter(matches), itemOrder);
    if (query && !items.length && !groups.length && !visibleCustom.length)
      return [];
    const selected = (item: Item) =>
      selectedKeys.has(category.id + '::' + item.id);
    const allItems = [
      ...(category.items ?? []),
      ...(category.groups ?? []).flatMap((group) => group.items),
      ...custom,
    ];
    const row = (item: Item, isCustom = false) => (
      <ItemRow
        key={item.id}
        categoryId={category.id}
        item={item}
        custom={isCustom}
        checked={selected(item)}
        handlers={handlers}
      />
    );
    const results = (
      <>
        {category.groups
          ? groups.map((group) => (
              <div key={group.id} className="group-block">
                <h3 className="group-title">{group.title}</h3>
                {group.items.map((item) => row(item))}
              </div>
            ))
          : items.map((item) => row(item))}
        {visibleCustom.length > 0 && (
          <div className="custom-items-section">
            {visibleCustom.map((item) => row(item, true))}
          </div>
        )}
      </>
    );
    const controls = (
      <>
        {editable && (
          <CategoryOptions
            category={category}
            weight={categoryWeights[category.id]}
            handlers={handlers}
          />
        )}
        <ScaleRow
          category={category}
          scales={scales}
          scaleId={scaleByCategory[category.id] ?? defaultScaleId}
          settings={scaleSettingsByCategory[category.id]}
          handlers={handlers}
        />
      </>
    );
    return [
      <CategoryAccordion
        key={query + ':' + category.id}
        category={category}
        count={allItems.filter(selected).length}
        initiallyOpen={Boolean(query) || openCats.includes(category.id)}
        results={results}
        controls={controls}
        search={Boolean(query)}
        handlers={handlers}
      />,
    ];
  });
  const weightSum = categories.reduce(
    (sum, category) => sum + (categoryWeights[category.id] ?? 0),
    0
  );
  renderView(
    container,
    <>
      {rendered.length ? (
        rendered
      ) : (
        <p className="search-empty">{strings.labels.searchEmpty}</p>
      )}
      {editable && !query && weightSum > 0 && Math.round(weightSum) !== 100 && (
        <p className="weight-sum-note">
          {strings.labels.weightSumWarn(Math.round(weightSum))}
        </p>
      )}
      {editable && !query && <AddCategory handlers={handlers} />}
    </>
  );
}
