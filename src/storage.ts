import {
  categoryOrderFromSelection,
  itemOrderFromSelection,
  uniqueStrings,
} from './config-order';
import {
  currentLanguage,
  strings,
  LOCALES,
  LANGUAGE_CODES,
} from './strings';
import type {
  AppConfig,
  Category,
  CustomCategory,
  CustomItem,
  DocumentTitleConfig,
  DocumentTitleMode,
  FooterFields,
  HeaderData,
  HeaderField,
  NumericScaleSettings,
  ProductFormatData,
  Scale,
  SelectedItemRef,
} from './types';

const KEY = 'bbk:config';
const SECTIONS_KEY = 'bbk:sections';
// Upper bound for an imported config file; a real Feedbackbogen config is a few KB.
const MAX_IMPORT_BYTES = 5_000_000;
const MAX_IMPORT_NODES = 20_000;
const MAX_IMPORT_STRING_LENGTH = 2_000;
const MAX_IMPORTED_SELECTED_ITEMS = 1_000;
const MAX_IMPORTED_PRODUCT_FORMATS = 300;
const MAX_IMPORTED_HEADER_FIELDS = 50;
const MAX_IMPORTED_CUSTOM_ITEMS = 1_000;
const MAX_IMPORTED_CUSTOM_CATEGORIES = 200;
const MAX_IMPORTED_ORDER_IDS = 1_500;
const MAX_IMPORTED_MAP_ENTRIES = 1_500;
export const CONFIG_FORMAT = 'feedbackbogen-generator' as const;
export const CONFIG_SCHEMA_VERSION = 5;
export const CONFIG_LIMITS = {
  bytes: MAX_IMPORT_BYTES,
  stringLength: MAX_IMPORT_STRING_LENGTH,
  selectedItems: MAX_IMPORTED_SELECTED_ITEMS,
  productFormats: MAX_IMPORTED_PRODUCT_FORMATS,
  headerFields: MAX_IMPORTED_HEADER_FIELDS,
  customItems: MAX_IMPORTED_CUSTOM_ITEMS,
  customCategories: MAX_IMPORTED_CUSTOM_CATEGORIES,
  orderIds: MAX_IMPORTED_ORDER_IDS,
  mapEntries: MAX_IMPORTED_MAP_ENTRIES,
} as const;
let configRecovery: string | null = null;

export type SectionState = Record<string, boolean>;

// Pure: merge a persisted open/closed map onto the defaults so unknown/garbage
// values are ignored and any section not present yet falls back to its default.
// `defaults` lists the section ids that are open by default.
export function resolveSectionState(
  stored: unknown,
  defaults: string[]
): SectionState {
  const state: SectionState = {};
  for (const id of defaults) state[id] = true;
  if (stored && typeof stored === 'object') {
    for (const [id, open] of Object.entries(
      stored as Record<string, unknown>
    )) {
      if (typeof open === 'boolean') state[id] = open;
    }
  }
  return state;
}

export function loadSectionState(defaults: string[]): SectionState {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    return resolveSectionState(raw ? JSON.parse(raw) : null, defaults);
  } catch {
    return resolveSectionState(null, defaults);
  }
}

export function saveSectionState(state: SectionState): void {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(state));
  } catch {
    /* localStorage unavailable — section state is non-critical UI state */
  }
}

export type ConfigImportResult =
  | { status: 'success'; config: AppConfig }
  | { status: 'cancelled' }
  | { status: 'error'; message: string; diagnostics?: ConfigDiagnostic[] };

export type ConfigDiagnostic = {
  path: string;
  code: string;
  message: string;
};

export type ConfigCatalog = {
  categories: Category[];
  scales: Scale[];
  productFormats: ProductFormatData;
};

type ConfigParseResult =
  | { status: 'success'; config: AppConfig }
  | { status: 'error'; message: string; diagnostics?: ConfigDiagnostic[] };

export const DEFAULT_HEADER_FIELDS: HeaderField[] = [
  { id: 'name', label: strings.kopfdaten.learner, value: '' },
  { id: 'learngroup', label: strings.kopfdaten.learngroup, value: '' },
  { id: 'topic', label: strings.kopfdaten.topic, value: '' },
  { id: 'date', label: strings.kopfdaten.date, value: '' },
];

export const DEFAULT_FOOTER_FIELDS: FooterFields = {
  date: true,
  signature: true,
  grade: true,
};

export const DEFAULT_DOCUMENT_TITLE: DocumentTitleConfig = {
  mode: 'feedbackbogen',
  custom: '',
};

export const EMPTY_HEADER: HeaderData = {
  fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field })),
};

// Built-in header field ids → their i18n key in `kopfdaten`.
const DEFAULT_HEADER_FIELD_KEYS: Record<
  string,
  'learner' | 'learngroup' | 'topic' | 'date'
> = {
  name: 'learner',
  learngroup: 'learngroup',
  topic: 'topic',
  date: 'date',
};

// Re-localize the labels of the built-in (pre-filled) header fields so a
// language switch updates them too. A field is treated as untouched only when
// its label still matches a known default in some locale; user-renamed fields
// keep their custom label.
export function localizeDefaultHeaderFields(
  fields: HeaderField[]
): HeaderField[] {
  return fields.map((field) => {
    const key = DEFAULT_HEADER_FIELD_KEYS[field.id];
    if (!key) return field;
    const isDefaultLabel = LANGUAGE_CODES.some(
      (code) => LOCALES[code].dict.kopfdaten[key] === field.label
    );
    return isDefaultLabel ? { ...field, label: strings.kopfdaten[key] } : field;
  });
}

export function createDefaultConfig(defaultScaleId?: string): AppConfig {
  return {
    format: CONFIG_FORMAT,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    language: currentLanguage,
    selectedItems: [],
    selectedProductFormats: [],
    scaleByCategory: {},
    scaleSettingsByCategory: {},
    defaultScaleId,
    documentTitle: { ...DEFAULT_DOCUMENT_TITLE },
    header: { fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field })) },
    footerFields: { ...DEFAULT_FOOTER_FIELDS },
    customItems: [],
    categoryOrder: [],
    itemOrderByCategory: {},
    categoryTitleOverrides: {},
    customCategories: [],
    categoryWeights: {},
  };
}

function normalizeDocumentTitle(value: unknown): DocumentTitleConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ...DEFAULT_DOCUMENT_TITLE };
  const title = value as Partial<DocumentTitleConfig>;
  const modes: DocumentTitleMode[] = [
    'bewertungsbogen',
    'feedbackbogen',
    'custom',
  ];
  return {
    mode:
      typeof title.mode === 'string' &&
      modes.includes(title.mode as DocumentTitleMode)
        ? (title.mode as DocumentTitleMode)
        : DEFAULT_DOCUMENT_TITLE.mode,
    custom: typeof title.custom === 'string' ? title.custom : '',
  };
}

function normalizeHeaderField(
  field: unknown,
  index: number
): HeaderField | null {
  if (!field || typeof field !== 'object') return null;
  const value = field as Partial<HeaderField>;
  if (typeof value.id !== 'string' || typeof value.label !== 'string')
    return null;
  return {
    id: value.id || `field_${index}`,
    label: value.label.trim() || strings.kopfdaten.fallbackField,
    value: typeof value.value === 'string' ? value.value : '',
  };
}

function normalizeHeader(headerValue: unknown): HeaderData {
  if (!headerValue || typeof headerValue !== 'object') {
    return { fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field })) };
  }

  const header = headerValue as Partial<HeaderData> & Record<string, unknown>;
  const fields = Array.isArray(header.fields)
    ? header.fields
        .map((field, index) => normalizeHeaderField(field, index))
        .filter((field): field is HeaderField => field !== null)
    : [
        {
          ...DEFAULT_HEADER_FIELDS[0],
          value: typeof header.learner === 'string' ? header.learner : '',
        },
        {
          ...DEFAULT_HEADER_FIELDS[1],
          value: typeof header.learngroup === 'string' ? header.learngroup : '',
        },
        {
          ...DEFAULT_HEADER_FIELDS[2],
          value: typeof header.topic === 'string' ? header.topic : '',
        },
        {
          ...DEFAULT_HEADER_FIELDS[3],
          value: typeof header.date === 'string' ? header.date : '',
        },
      ];

  return { fields };
}

function normalizeFooterFields(value: unknown): FooterFields {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { ...DEFAULT_FOOTER_FIELDS };
  const footer = value as Partial<FooterFields>;
  return {
    date:
      typeof footer.date === 'boolean'
        ? footer.date
        : DEFAULT_FOOTER_FIELDS.date,
    signature:
      typeof footer.signature === 'boolean'
        ? footer.signature
        : DEFAULT_FOOTER_FIELDS.signature,
    grade:
      typeof footer.grade === 'boolean'
        ? footer.grade
        : DEFAULT_FOOTER_FIELDS.grade,
  };
}

function normalizeSelectedItem(value: unknown): SelectedItemRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<SelectedItemRef>;
  if (typeof item.categoryId !== 'string' || typeof item.itemId !== 'string')
    return null;
  return { categoryId: item.categoryId, itemId: item.itemId };
}

function normalizeCustomItem(value: unknown): CustomItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<CustomItem>;
  if (
    typeof item.id !== 'string' ||
    typeof item.label !== 'string' ||
    typeof item.categoryId !== 'string'
  )
    return null;
  return {
    id: item.id,
    label: item.label,
    description:
      typeof item.description === 'string' ? item.description : undefined,
    categoryId: item.categoryId,
    custom: true,
  };
}

function normalizeScaleByCategory(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
}

function normalizeNumericScaleSettings(
  value: unknown
): NumericScaleSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const settings = value as Partial<NumericScaleSettings>;
  if (typeof settings.min !== 'number' || typeof settings.max !== 'number')
    return null;
  return {
    min: Math.trunc(settings.min),
    max: Math.trunc(settings.max),
  };
}

function normalizeScaleSettingsByCategory(
  value: unknown
): Record<string, NumericScaleSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(
        ([categoryId, settings]) =>
          [categoryId, normalizeNumericScaleSettings(settings)] as const
      )
      .filter(
        (entry): entry is [string, NumericScaleSettings] => entry[1] !== null
      )
  );
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(
        value.filter((item): item is string => typeof item === 'string')
      )
    : [];
}

function normalizeItemOrder(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([categoryId, itemIds]) => [
        categoryId,
        normalizeStringArray(itemIds),
      ])
  );
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[1].trim() !== ''
      )
      .map(([key, val]) => [key, val.trim()])
  );
}

function normalizeCustomCategories(value: unknown): CustomCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): CustomCategory | null => {
      if (!entry || typeof entry !== 'object') return null;
      const cat = entry as Partial<CustomCategory>;
      if (typeof cat.id !== 'string' || typeof cat.title !== 'string')
        return null;
      const title = cat.title.trim();
      if (!cat.id || !title) return null;
      return { id: cat.id, title };
    })
    .filter((cat): cat is CustomCategory => cat !== null);
}

function normalizeWeights(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' &&
          Number.isFinite(entry[1]) &&
          entry[1] >= 0
      )
      .map(([key, val]) => [key, Math.min(100, Math.max(0, val))])
  );
}

function countKeys(value: unknown): number {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).length
    : 0;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function configWithinLimits(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  let nodes = 0;
  const pending: unknown[] = [value];
  while (pending.length) {
    const entry = pending.pop();
    nodes += 1;
    if (nodes > MAX_IMPORT_NODES) return false;
    if (typeof entry === 'string') {
      if (!isConfigText(entry)) return false;
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const entries = Array.isArray(entry)
      ? entry
      : Object.entries(entry as Record<string, unknown>).flatMap(
          ([key, val]) => [key, val]
        );
    if (nodes + pending.length + entries.length > MAX_IMPORT_NODES)
      return false;
    for (const child of entries) pending.push(child);
  }
  const config = value as Record<string, unknown>;
  const header = config.header as Record<string, unknown> | undefined;
  const withinLimits =
    arrayLength(config.selectedItems) <= MAX_IMPORTED_SELECTED_ITEMS &&
    arrayLength(config.selectedProductFormats) <=
      MAX_IMPORTED_PRODUCT_FORMATS &&
    arrayLength(header?.fields) <= MAX_IMPORTED_HEADER_FIELDS &&
    arrayLength(config.customItems) <= MAX_IMPORTED_CUSTOM_ITEMS &&
    arrayLength(config.customCategories) <= MAX_IMPORTED_CUSTOM_CATEGORIES &&
    arrayLength(config.categoryOrder) <= MAX_IMPORTED_ORDER_IDS &&
    countKeys(config.itemOrderByCategory) <= MAX_IMPORTED_MAP_ENTRIES &&
    countKeys(config.scaleByCategory) <= MAX_IMPORTED_MAP_ENTRIES &&
    countKeys(config.scaleSettingsByCategory) <= MAX_IMPORTED_MAP_ENTRIES &&
    countKeys(config.categoryTitleOverrides) <= MAX_IMPORTED_MAP_ENTRIES &&
    countKeys(config.categoryWeights) <= MAX_IMPORTED_MAP_ENTRIES;
  if (!withinLimits) return false;
  try {
    return new Blob([JSON.stringify(value, null, 2)]).size <= MAX_IMPORT_BYTES;
  } catch {
    return false;
  }
}

export function isConfigText(value: string): boolean {
  return value.length <= MAX_IMPORT_STRING_LENGTH && isDocumentText(value);
}

function isDocumentText(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      (code >= 0xd800 && code <= 0xdfff) ||
      code === 0xfffe ||
      code === 0xffff
    )
      return false;
  }
  return true;
}

function isSafeId(value: string): boolean {
  return (
    /^[A-Za-z0-9_-]+$/.test(value) &&
    value !== 'prototype' &&
    !Object.prototype.hasOwnProperty.call(Object.prototype, value)
  );
}

function strictV5Diagnostics(value: Record<string, unknown>): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  const add = (path: string, code: string, message: string) =>
    diagnostics.push({ path, code, message });
  const invalid = (path: string) =>
    add(path, 'invalid-field', strings.messages.importFieldInvalid(path));
  const object = (
    candidate: unknown,
    path: string,
    allowedKeys: string[] | null
  ): Record<string, unknown> | null => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      invalid(path);
      return null;
    }
    const record = candidate as Record<string, unknown>;
    for (const key of Object.keys(record))
      if (allowedKeys && !allowedKeys.includes(key))
        add(
          `${path}.${key}`,
          'unknown-field',
          strings.messages.importUnknownField(`${path}.${key}`)
        );
    return record;
  };
  const stringField = (
    record: Record<string, unknown>,
    key: string,
    path: string,
    required = false,
    values?: readonly string[],
    id = false
  ) => {
    const candidate = record[key];
    if (candidate === undefined && !required) return;
    if (
      typeof candidate !== 'string' ||
      (values && !values.includes(candidate)) ||
      (id && typeof candidate === 'string' && !isSafeId(candidate))
    )
      invalid(`${path}.${key}`);
  };
  const stringList = (candidate: unknown, path: string) => {
    if (!Array.isArray(candidate)) {
      invalid(path);
      return;
    }
    const seen = new Set<string>();
    candidate.forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (typeof entry !== 'string') return invalid(entryPath);
      if (!isSafeId(entry)) invalid(entryPath);
      if (seen.has(entry))
        add(
          entryPath,
          'duplicate-value',
          strings.messages.importDuplicateValue(entryPath, entry)
        );
      seen.add(entry);
    });
  };
  const stringMap = (
    candidate: unknown,
    path: string,
    trimmed = false,
    valuesAreIds = true
  ) => {
    const record = object(candidate, path, null);
    if (!record) return;
    for (const [key, entry] of Object.entries(record)) {
      if (!isSafeId(key)) invalid(`${path}.${key}`);
      if (
        typeof entry !== 'string' ||
        (trimmed && (entry.trim() === '' || entry !== entry.trim())) ||
        (valuesAreIds && typeof entry === 'string' && !isSafeId(entry))
      )
        invalid(`${path}.${key}`);
    }
  };

  const top = object(value, '$', [
    'format',
    'schemaVersion',
    'language',
    'selectedItems',
    'selectedProductFormats',
    'scaleByCategory',
    'scaleSettingsByCategory',
    'defaultScaleId',
    'documentTitle',
    'header',
    'footerFields',
    'customItems',
    'categoryOrder',
    'itemOrderByCategory',
    'categoryTitleOverrides',
    'customCategories',
    'categoryWeights',
  ]);
  if (!top) return diagnostics;

  stringField(top, 'format', '$', true, [CONFIG_FORMAT]);
  if (top.schemaVersion !== CONFIG_SCHEMA_VERSION) invalid('$.schemaVersion');
  stringField(top, 'language', '$', true, LANGUAGE_CODES);

  if (!Array.isArray(top.selectedItems)) invalid('$.selectedItems');
  else {
    const seen = new Set<string>();
    top.selectedItems.forEach((entry, index) => {
      const path = `$.selectedItems[${index}]`;
      const item = object(entry, path, ['categoryId', 'itemId']);
      if (!item) return;
      stringField(item, 'categoryId', path, true, undefined, true);
      stringField(item, 'itemId', path, true, undefined, true);
      if (item.categoryId === 'produktebene') invalid(`${path}.categoryId`);
      if (typeof item.categoryId === 'string' && typeof item.itemId === 'string') {
        const key = `${item.categoryId}\u0000${item.itemId}`;
        if (seen.has(key))
          add(
            path,
            'duplicate-value',
            strings.messages.importDuplicateValue(
              path,
              `${item.categoryId}/${item.itemId}`
            )
          );
        seen.add(key);
      }
    });
  }

  if (top.selectedProductFormats !== undefined)
    stringList(top.selectedProductFormats, '$.selectedProductFormats');
  if (top.categoryOrder !== undefined)
    stringList(top.categoryOrder, '$.categoryOrder');
  if (top.defaultScaleId !== undefined)
    stringField(top, 'defaultScaleId', '$', false, undefined, true);

  for (const [key, path] of [
    ['scaleByCategory', '$.scaleByCategory'],
    ['categoryTitleOverrides', '$.categoryTitleOverrides'],
  ] as const) {
    if (top[key] !== undefined)
      stringMap(
        top[key],
        path,
        key === 'categoryTitleOverrides',
        key !== 'categoryTitleOverrides'
      );
  }

  if (top.scaleSettingsByCategory !== undefined) {
    const settings = object(
      top.scaleSettingsByCategory,
      '$.scaleSettingsByCategory',
      null
    );
    if (settings)
      for (const [categoryId, entry] of Object.entries(settings)) {
        const path = `$.scaleSettingsByCategory.${categoryId}`;
        if (!isSafeId(categoryId)) invalid(path);
        const range = object(entry, path, ['min', 'max']);
        if (!range) continue;
        for (const key of ['min', 'max'])
          if (!Number.isInteger(range[key])) invalid(`${path}.${key}`);
      }
  }

  if (top.itemOrderByCategory !== undefined) {
    const order = object(top.itemOrderByCategory, '$.itemOrderByCategory', null);
    if (order)
      for (const [categoryId, itemIds] of Object.entries(order)) {
        if (!isSafeId(categoryId))
          invalid(`$.itemOrderByCategory.${categoryId}`);
        stringList(itemIds, `$.itemOrderByCategory.${categoryId}`);
      }
  }

  if (top.categoryWeights !== undefined) {
    const weights = object(top.categoryWeights, '$.categoryWeights', null);
    if (weights)
      for (const [categoryId, weight] of Object.entries(weights)) {
        if (!isSafeId(categoryId)) invalid(`$.categoryWeights.${categoryId}`);
        if (
          typeof weight !== 'number' ||
          !Number.isFinite(weight) ||
          weight < 0 ||
          weight > 100
        )
          invalid(`$.categoryWeights.${categoryId}`);
      }
  }

  if (top.documentTitle !== undefined) {
    const title = object(top.documentTitle, '$.documentTitle', ['mode', 'custom']);
    if (title) {
      stringField(title, 'mode', '$.documentTitle', false, [
        'bewertungsbogen',
        'feedbackbogen',
        'custom',
      ]);
      stringField(title, 'custom', '$.documentTitle');
    }
  }

  if (top.header !== undefined) {
    const header = object(top.header, '$.header', ['fields']);
    if (header?.fields !== undefined) {
      if (!Array.isArray(header.fields)) invalid('$.header.fields');
      else
        header.fields.forEach((entry, index) => {
          const path = `$.header.fields[${index}]`;
          const field = object(entry, path, ['id', 'label', 'value']);
          if (!field) return;
          stringField(field, 'id', path, true, undefined, true);
          stringField(field, 'label', path, true);
          stringField(field, 'value', path);
          if (
            typeof field.label === 'string' &&
            (field.label.trim() === '' || field.label !== field.label.trim())
          )
            invalid(`${path}.label`);
        });
    }
  }

  if (top.footerFields !== undefined) {
    const footer = object(top.footerFields, '$.footerFields', [
      'date',
      'signature',
      'grade',
    ]);
    if (footer)
      for (const key of ['date', 'signature', 'grade'])
        if (footer[key] !== undefined && typeof footer[key] !== 'boolean')
          invalid(`$.footerFields.${key}`);
  }

  if (top.customItems !== undefined) {
    if (!Array.isArray(top.customItems)) invalid('$.customItems');
    else
      top.customItems.forEach((entry, index) => {
        const path = `$.customItems[${index}]`;
        const item = object(entry, path, [
          'id',
          'label',
          'description',
          'categoryId',
          'custom',
        ]);
        if (!item) return;
        stringField(item, 'id', path, true, undefined, true);
        stringField(item, 'label', path, true);
        stringField(item, 'description', path);
        stringField(item, 'categoryId', path, true, undefined, true);
        if (item.custom !== undefined && item.custom !== true)
          invalid(`${path}.custom`);
        if (typeof item.label === 'string' && item.label.trim() === '')
          invalid(`${path}.label`);
      });
  }

  if (top.customCategories !== undefined) {
    if (!Array.isArray(top.customCategories)) invalid('$.customCategories');
    else
      top.customCategories.forEach((entry, index) => {
        const path = `$.customCategories[${index}]`;
        const category = object(entry, path, ['id', 'title']);
        if (!category) return;
        stringField(category, 'id', path, true, undefined, true);
        stringField(category, 'title', path, true);
        if (
          typeof category.title === 'string' &&
          (category.title.trim() === '' || category.title !== category.title.trim())
        )
          invalid(`${path}.title`);
      });
  }

  return diagnostics;
}

function hasSafeIdentifiers(config: AppConfig): boolean {
  const uniqueIds = (ids: string[]) =>
    ids.every(isSafeId) && new Set(ids).size === ids.length;
  const ids = [
    ...config.selectedItems.flatMap(({ categoryId, itemId }) => [
      categoryId,
      itemId,
    ]),
    ...config.customItems.map(({ categoryId }) => categoryId),
    ...config.categoryOrder,
    ...config.selectedProductFormats,
    ...Object.keys(config.itemOrderByCategory),
    ...Object.values(config.itemOrderByCategory).flat(),
    ...Object.keys(config.scaleByCategory),
    ...Object.values(config.scaleByCategory),
    ...Object.keys(config.scaleSettingsByCategory),
    ...Object.keys(config.categoryTitleOverrides),
    ...Object.keys(config.categoryWeights),
  ];
  if (config.defaultScaleId !== undefined) ids.push(config.defaultScaleId);
  return (
    ids.every(isSafeId) &&
    uniqueIds(config.header.fields.map(({ id }) => id)) &&
    uniqueIds(config.customItems.map(({ id }) => id)) &&
    uniqueIds(config.customCategories.map(({ id }) => id)) &&
    new Set(
      config.selectedItems.map(({ categoryId, itemId }) =>
        JSON.stringify([categoryId, itemId])
      )
    ).size === config.selectedItems.length
  );
}

function migrateConfig(value: Record<string, unknown>): ConfigParseResult {
  const rawVersion = value.schemaVersion;
  const schemaVersion = rawVersion === undefined ? 1 : rawVersion;
  if (
    !Number.isInteger(schemaVersion) ||
    typeof schemaVersion !== 'number' ||
    schemaVersion < 1
  ) {
    return { status: 'error', message: strings.messages.importInvalidVersion };
  }
  if (schemaVersion > CONFIG_SCHEMA_VERSION) {
    return {
      status: 'error',
      message: strings.messages.importUnsupportedVersion(
        schemaVersion,
        CONFIG_SCHEMA_VERSION
      ),
    };
  }
  if (value.format !== undefined && value.format !== CONFIG_FORMAT)
    return {
      status: 'error',
      message: strings.messages.importInvalidShape,
      diagnostics: [
        {
          path: '$.format',
          code: 'invalid-format',
          message: strings.messages.importFieldInvalid('$.format'),
        },
      ],
    };
  if (schemaVersion === CONFIG_SCHEMA_VERSION) {
    const diagnostics = strictV5Diagnostics(value);
    return diagnostics.length
      ? {
          status: 'error',
          message: strings.messages.importInvalidShape,
          diagnostics,
        }
      : normalizeConfig(value);
  }

  // Older configs may contain stale order entries. Preserve the relative order
  // of selected content and add missing selected IDs before upgrading to v5.
  const selectedItems = Array.isArray(value.selectedItems)
    ? value.selectedItems
        .map(normalizeSelectedItem)
        .filter((item): item is SelectedItemRef => item !== null)
    : [];
  const selectedCategoryOrder = categoryOrderFromSelection(selectedItems);
  const rawCategoryOrder = normalizeStringArray(
    value.categoryOrder ?? selectedCategoryOrder
  );
  const selectedCategoryIds = new Set(selectedCategoryOrder);
  const categoryOrder = uniqueStrings([
    ...rawCategoryOrder.filter((id) => selectedCategoryIds.has(id)),
    ...selectedCategoryOrder,
  ]);
  const selectedItemOrder = itemOrderFromSelection(selectedItems);
  const rawItemOrder = normalizeItemOrder(
    value.itemOrderByCategory ?? selectedItemOrder
  );
  const itemOrderByCategory = Object.fromEntries(
    categoryOrder.map((categoryId) => {
      const selectedIds = new Set(selectedItemOrder[categoryId] ?? []);
      return [
        categoryId,
        uniqueStrings([
          ...(rawItemOrder[categoryId] ?? []).filter((id) =>
            selectedIds.has(id)
          ),
          ...(selectedItemOrder[categoryId] ?? []),
        ]),
      ];
    })
  );
  return normalizeConfig({
    ...value,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    categoryOrder,
    itemOrderByCategory,
  });
}

function normalizeConfig(value: Record<string, unknown>): ConfigParseResult {
  if (!Array.isArray(value.selectedItems)) {
    return {
      status: 'error',
      message: strings.messages.importMissingSelection,
    };
  }
  const selectedItems = value.selectedItems
    .map(normalizeSelectedItem)
    .filter(
      (item): item is SelectedItemRef =>
        item !== null && item.categoryId !== 'produktebene'
    );
  return {
    status: 'success',
    config: {
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      language:
        typeof value.language === 'string' &&
        LANGUAGE_CODES.includes(value.language as (typeof LANGUAGE_CODES)[number])
          ? (value.language as AppConfig['language'])
          : currentLanguage,
      selectedItems,
      selectedProductFormats: normalizeStringArray(
        value.selectedProductFormats
      ),
      scaleByCategory: normalizeScaleByCategory(value.scaleByCategory),
      scaleSettingsByCategory: normalizeScaleSettingsByCategory(
        value.scaleSettingsByCategory
      ),
      defaultScaleId:
        typeof value.defaultScaleId === 'string'
          ? value.defaultScaleId
          : undefined,
      documentTitle: normalizeDocumentTitle(value.documentTitle),
      header: normalizeHeader(value.header),
      footerFields: normalizeFooterFields(value.footerFields),
      customItems: Array.isArray(value.customItems)
        ? value.customItems
            .map(normalizeCustomItem)
            .filter((item): item is CustomItem => item !== null)
        : [],
      categoryOrder: normalizeStringArray(value.categoryOrder),
      itemOrderByCategory: normalizeItemOrder(value.itemOrderByCategory),
      categoryTitleOverrides: normalizeStringMap(value.categoryTitleOverrides),
      customCategories: normalizeCustomCategories(value.customCategories),
      categoryWeights: normalizeWeights(value.categoryWeights),
    },
  };
}

export function parseConfig(value: unknown): ConfigParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'error', message: strings.messages.importInvalidShape };
  }
  if (!configWithinLimits(value)) {
    return { status: 'error', message: strings.messages.importTooComplex };
  }
  const raw = value as Record<string, unknown>;
  // Legacy migration indexes categories before normalization.
  const legacyVersion =
    raw.schemaVersion === undefined ||
    (typeof raw.schemaVersion === 'number' &&
      raw.schemaVersion < CONFIG_SCHEMA_VERSION);
  if (
    legacyVersion &&
    Array.isArray(raw.selectedItems) &&
    raw.selectedItems.some((entry) => {
      const item = normalizeSelectedItem(entry);
      return item && (!isSafeId(item.categoryId) || !isSafeId(item.itemId));
    })
  )
    return { status: 'error', message: strings.messages.importInvalidShape };
  const result = migrateConfig(raw);
  return result.status === 'success' && !hasSafeIdentifiers(result.config)
    ? {
        status: 'error',
        message: strings.messages.importInvalidShape,
        diagnostics: [
          {
            path: '$',
            code: 'unsafe-or-duplicate-id',
            message: strings.messages.importIdentifiersInvalid,
          },
        ],
      }
    : result;
}

export function validateConfigCatalog(
  config: AppConfig,
  catalog: ConfigCatalog
): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  const addUnknown = (path: string, id: string) =>
    diagnostics.push({
      path,
      code: 'unknown-reference',
      message: strings.messages.importUnknownReference(path, id),
    });
  const itemsByCategory = new Map<string, Set<string>>();
  const catalogItemIds = new Set<string>();
  const catalogCategoryIds = new Set<string>();

  const addCategory = (categoryId: string, itemIds: string[]) => {
    catalogCategoryIds.add(categoryId);
    itemsByCategory.set(categoryId, new Set(itemIds));
    itemIds.forEach((id) => catalogItemIds.add(id));
  };
  for (const category of catalog.categories)
    addCategory(category.id, [
      ...(category.items ?? []).map(({ id }) => id),
      ...(category.groups ?? []).flatMap(({ items }) =>
        items.map(({ id }) => id)
      ),
    ]);

  const productIds = new Set<string>();
  for (const group of catalog.productFormats.groups)
    for (const format of group.formats) {
      productIds.add(format.id);
      addCategory(
        format.id,
        format.criteria.map(({ id }) => id)
      );
    }

  const scaleById = new Map(catalog.scales.map((scale) => [scale.id, scale]));
  const customCategoryIds = new Set<string>();
  config.customCategories.forEach((category, index) => {
    if (catalogCategoryIds.has(category.id))
      diagnostics.push({
        path: `$.customCategories[${index}].id`,
        code: 'catalog-collision',
        message: strings.messages.importReferenceCollision(
          `$.customCategories[${index}].id`,
          category.id
        ),
      });
    customCategoryIds.add(category.id);
    itemsByCategory.set(category.id, new Set());
  });

  config.selectedProductFormats.forEach((id, index) => {
    if (!productIds.has(id))
      addUnknown(`$.selectedProductFormats[${index}]`, id);
  });

  const activeCategoryIds = new Set([
    ...catalog.categories.map(({ id }) => id),
    ...config.selectedProductFormats.filter((id) => productIds.has(id)),
    ...customCategoryIds,
  ]);

  config.customItems.forEach((item, index) => {
    const path = `$.customItems[${index}]`;
    if (!activeCategoryIds.has(item.categoryId))
      addUnknown(`${path}.categoryId`, item.categoryId);
    if (catalogItemIds.has(item.id))
      diagnostics.push({
        path: `${path}.id`,
        code: 'catalog-collision',
        message: strings.messages.importReferenceCollision(
          `${path}.id`,
          item.id
        ),
      });
    itemsByCategory.get(item.categoryId)?.add(item.id);
  });

  config.selectedItems.forEach((item, index) => {
    const path = `$.selectedItems[${index}]`;
    if (!activeCategoryIds.has(item.categoryId)) {
      addUnknown(`${path}.categoryId`, item.categoryId);
      return;
    }
    if (!itemsByCategory.get(item.categoryId)?.has(item.itemId))
      addUnknown(`${path}.itemId`, item.itemId);
  });

  const validateCategoryKeys = (
    record: Record<string, unknown>,
    path: string
  ) => {
    for (const categoryId of Object.keys(record))
      if (!activeCategoryIds.has(categoryId))
        addUnknown(`${path}.${categoryId}`, categoryId);
  };
  validateCategoryKeys(config.scaleByCategory, '$.scaleByCategory');
  validateCategoryKeys(
    config.scaleSettingsByCategory,
    '$.scaleSettingsByCategory'
  );
  validateCategoryKeys(
    config.itemOrderByCategory,
    '$.itemOrderByCategory'
  );
  validateCategoryKeys(
    config.categoryTitleOverrides,
    '$.categoryTitleOverrides'
  );
  validateCategoryKeys(config.categoryWeights, '$.categoryWeights');

  const selectedCategoryIds = new Set(
    config.selectedItems.map(({ categoryId }) => categoryId)
  );
  config.categoryOrder.forEach((categoryId, index) => {
    if (
      !activeCategoryIds.has(categoryId) ||
      !selectedCategoryIds.has(categoryId)
    )
      addUnknown(`$.categoryOrder[${index}]`, categoryId);
  });
  const selectedItemsByCategory = new Map<string, Set<string>>();
  for (const { categoryId, itemId } of config.selectedItems) {
    const selectedIds = selectedItemsByCategory.get(categoryId) ?? new Set();
    selectedIds.add(itemId);
    selectedItemsByCategory.set(categoryId, selectedIds);
  }
  for (const [categoryId, itemIds] of Object.entries(
    config.itemOrderByCategory
  ))
    itemIds.forEach((itemId, index) => {
      if (!selectedItemsByCategory.get(categoryId)?.has(itemId))
        addUnknown(`$.itemOrderByCategory.${categoryId}[${index}]`, itemId);
    });

  if (config.defaultScaleId && !scaleById.has(config.defaultScaleId))
    addUnknown('$.defaultScaleId', config.defaultScaleId);
  for (const [categoryId, scaleId] of Object.entries(config.scaleByCategory))
    if (!scaleById.has(scaleId))
      addUnknown(`$.scaleByCategory.${categoryId}`, scaleId);

  for (const [categoryId, settings] of Object.entries(
    config.scaleSettingsByCategory
  )) {
    const scaleId =
      config.scaleByCategory[categoryId] ?? config.defaultScaleId;
    const scale = scaleId ? scaleById.get(scaleId) : undefined;
    const path = `$.scaleSettingsByCategory.${categoryId}`;
    if (!scale || scale.kind !== 'numeric') {
      diagnostics.push({
        path,
        code: 'invalid-scale-settings',
        message: strings.messages.importFieldInvalid(path),
      });
      continue;
    }
    if (
      settings.min < scale.minLimit ||
      settings.max > scale.maxLimit ||
      settings.min >= settings.max ||
      settings.max - settings.min + 1 > scale.maxSteps
    )
      diagnostics.push({
        path,
        code: 'scale-range',
        message: strings.messages.importScaleRangeInvalid(
          path,
          scale.minLimit,
          scale.maxLimit,
          scale.maxSteps
        ),
      });
  }

  return diagnostics;
}

export function saveConfig(config: AppConfig): boolean {
  if (configRecovery !== null || parseConfig(config).status !== 'success')
    return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
    return true;
  } catch {
    // localStorage unavailable or quota exceeded (e.g. Safari private mode).
    // Persistence is best-effort — never let it break the active editing session.
    return false;
  }
}

export function loadConfig(accept: (config: AppConfig) => boolean = () => true): AppConfig | null {
  configRecovery = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    configRecovery = raw;
    const result = parseConfig(JSON.parse(raw));
    if (result.status === 'success' && accept(result.config)) {
      configRecovery = null;
      saveConfig(result.config);
      return result.config;
    }
  } catch {
    // Keep rejected bytes protected until an explicit reset or import succeeds.
  }
  return null;
}

export function getConfigRecovery(): string | null {
  return configRecovery;
}

export function replaceStoredConfig(config: AppConfig): boolean {
  if (parseConfig(config).status !== 'success') return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
    configRecovery = null;
    return true;
  } catch {
    return false;
  }
}

export function downloadConfigRecovery(): void {
  if (configRecovery === null) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([configRecovery], { type: 'application/json' })
  );
  a.download = 'feedbackbogen-wiederherstellung.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportConfigJSON(config: AppConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = configDownloadFilename(config);
  a.click();
  URL.revokeObjectURL(a.href);
}

function configDownloadFilename(config: AppConfig): string {
  const now = new Date();
  const date = [
    String(now.getFullYear()).padStart(4, '0'),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const sanitize = (value: string): string =>
    value
      .trim()
      .split('')
      .filter((character) => character.charCodeAt(0) >= 32)
      .join('')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

  const titleByMode: Record<DocumentTitleMode, string> = {
    bewertungsbogen: strings.kopfdaten.titleBewertungsbogen,
    feedbackbogen: strings.kopfdaten.titleFeedbackbogen,
    custom: '',
  };
  const base =
    sanitize(
      config.documentTitle.mode === 'custom'
        ? config.documentTitle.custom
        : titleByMode[config.documentTitle.mode]
    ) || strings.kopfdaten.titleFeedbackbogen;

  const topic = sanitize(
    config.header.fields.find((field) => field.id === 'topic')?.value ?? ''
  );

  return `${date}_${base}${topic ? `_${topic}` : ''}.json`;
}

export async function importConfigJSON(
  catalog?: ConfigCatalog
): Promise<ConfigImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve({ status: 'cancelled' });
      if (file.size > MAX_IMPORT_BYTES)
        return resolve({
          status: 'error',
          message: strings.messages.importTooLarge,
        });
      try {
        const result = parseConfig(JSON.parse(await file.text()));
        if (result.status !== 'success' || !catalog) return resolve(result);
        const diagnostics = validateConfigCatalog(result.config, catalog);
        resolve(
          diagnostics.length
            ? {
                status: 'error',
                message: strings.messages.importInvalidShape,
                diagnostics,
              }
            : result
        );
      } catch {
        resolve({
          status: 'error',
          message: strings.messages.importInvalidJson,
        });
      }
    };
    input.oncancel = () => resolve({ status: 'cancelled' });
    input.click();
  });
}
