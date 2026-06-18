import { categoryOrderFromSelection, itemOrderFromSelection, uniqueStrings } from './config-order';
import { strings, LOCALES, LANGUAGE_CODES } from './strings';
import type {
  AppConfig, CustomCategory, CustomItem, DocumentTitleConfig, DocumentTitleMode, FooterFields,
  HeaderData, HeaderField, NumericScaleSettings, SelectedItemRef
} from './types';

const KEY = 'bbk:config';
const SECTIONS_KEY = 'bbk:sections';
// Upper bound for an imported config file; a real Feedbackbogen config is a few KB.
const MAX_IMPORT_BYTES = 5_000_000;
export const CONFIG_SCHEMA_VERSION = 4;

export type SectionState = Record<string, boolean>;

// Pure: merge a persisted open/closed map onto the defaults so unknown/garbage
// values are ignored and any section not present yet falls back to its default.
// `defaults` lists the section ids that are open by default.
export function resolveSectionState(stored: unknown, defaults: string[]): SectionState {
  const state: SectionState = {};
  for (const id of defaults) state[id] = true;
  if (stored && typeof stored === 'object') {
    for (const [id, open] of Object.entries(stored as Record<string, unknown>)) {
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
  | { status: 'error'; message: string };

type ConfigParseResult =
  | { status: 'success'; config: AppConfig }
  | { status: 'error'; message: string };

export const DEFAULT_HEADER_FIELDS: HeaderField[] = [
  { id: 'name', label: strings.kopfdaten.learner, value: '' },
  { id: 'learngroup', label: strings.kopfdaten.learngroup, value: '' },
  { id: 'topic', label: strings.kopfdaten.topic, value: '' },
  { id: 'date', label: strings.kopfdaten.date, value: '' }
];

export const DEFAULT_FOOTER_FIELDS: FooterFields = {
  date: true,
  signature: true,
  grade: true
};

export const DEFAULT_DOCUMENT_TITLE: DocumentTitleConfig = {
  mode: 'feedbackbogen',
  custom: ''
};

export const EMPTY_HEADER: HeaderData = {
  fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field }))
};

// Built-in header field ids → their i18n key in `kopfdaten`.
const DEFAULT_HEADER_FIELD_KEYS: Record<string, 'learner' | 'learngroup' | 'topic' | 'date'> = {
  name: 'learner',
  learngroup: 'learngroup',
  topic: 'topic',
  date: 'date'
};

// Re-localize the labels of the built-in (pre-filled) header fields so a
// language switch updates them too. A field is treated as untouched only when
// its label still matches a known default in some locale; user-renamed fields
// keep their custom label.
export function localizeDefaultHeaderFields(fields: HeaderField[]): HeaderField[] {
  return fields.map((field) => {
    const key = DEFAULT_HEADER_FIELD_KEYS[field.id];
    if (!key) return field;
    const isDefaultLabel = LANGUAGE_CODES.some((code) => LOCALES[code].dict.kopfdaten[key] === field.label);
    return isDefaultLabel ? { ...field, label: strings.kopfdaten[key] } : field;
  });
}

export function createDefaultConfig(defaultScaleId?: string): AppConfig {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
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
    categoryWeights: {}
  };
}

function normalizeDocumentTitle(value: unknown): DocumentTitleConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_DOCUMENT_TITLE };
  const title = value as Partial<DocumentTitleConfig>;
  const modes: DocumentTitleMode[] = ['bewertungsbogen', 'feedbackbogen', 'custom'];
  return {
    mode: typeof title.mode === 'string' && modes.includes(title.mode as DocumentTitleMode)
      ? title.mode as DocumentTitleMode
      : DEFAULT_DOCUMENT_TITLE.mode,
    custom: typeof title.custom === 'string' ? title.custom : ''
  };
}

function normalizeHeaderField(field: unknown, index: number): HeaderField | null {
  if (!field || typeof field !== 'object') return null;
  const value = field as Partial<HeaderField>;
  if (typeof value.id !== 'string' || typeof value.label !== 'string') return null;
  return {
    id: value.id || `field_${index}`,
    label: value.label.trim() || strings.kopfdaten.fallbackField,
    value: typeof value.value === 'string' ? value.value : ''
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
      { ...DEFAULT_HEADER_FIELDS[0], value: typeof header.learner === 'string' ? header.learner : '' },
      { ...DEFAULT_HEADER_FIELDS[1], value: typeof header.learngroup === 'string' ? header.learngroup : '' },
      { ...DEFAULT_HEADER_FIELDS[2], value: typeof header.topic === 'string' ? header.topic : '' },
      { ...DEFAULT_HEADER_FIELDS[3], value: typeof header.date === 'string' ? header.date : '' }
    ];

  return { fields };
}

function normalizeFooterFields(value: unknown): FooterFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_FOOTER_FIELDS };
  const footer = value as Partial<FooterFields>;
  return {
    date: typeof footer.date === 'boolean' ? footer.date : DEFAULT_FOOTER_FIELDS.date,
    signature: typeof footer.signature === 'boolean' ? footer.signature : DEFAULT_FOOTER_FIELDS.signature,
    grade: typeof footer.grade === 'boolean' ? footer.grade : DEFAULT_FOOTER_FIELDS.grade
  };
}

function normalizeSelectedItem(value: unknown): SelectedItemRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<SelectedItemRef>;
  if (typeof item.categoryId !== 'string' || typeof item.itemId !== 'string') return null;
  return { categoryId: item.categoryId, itemId: item.itemId };
}

function normalizeCustomItem(value: unknown): CustomItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<CustomItem>;
  if (typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.categoryId !== 'string') return null;
  return {
    id: item.id,
    label: item.label,
    description: typeof item.description === 'string' ? item.description : undefined,
    categoryId: item.categoryId,
    custom: true
  };
}

function normalizeScaleByCategory(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

function normalizeNumericScaleSettings(value: unknown): NumericScaleSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const settings = value as Partial<NumericScaleSettings>;
  if (typeof settings.min !== 'number' || typeof settings.max !== 'number') return null;
  return {
    min: Math.trunc(settings.min),
    max: Math.trunc(settings.max)
  };
}

function normalizeScaleSettingsByCategory(value: unknown): Record<string, NumericScaleSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([categoryId, settings]) => [categoryId, normalizeNumericScaleSettings(settings)] as const)
      .filter((entry): entry is [string, NumericScaleSettings] => entry[1] !== null)
  );
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? uniqueStrings(value.filter((item): item is string => typeof item === 'string')) : [];
}

function normalizeItemOrder(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([categoryId, itemIds]) => [categoryId, normalizeStringArray(itemIds)])
  );
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== '')
      .map(([key, val]) => [key, val.trim()])
  );
}

function normalizeCustomCategories(value: unknown): CustomCategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): CustomCategory | null => {
      if (!entry || typeof entry !== 'object') return null;
      const cat = entry as Partial<CustomCategory>;
      if (typeof cat.id !== 'string' || typeof cat.title !== 'string') return null;
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
      .filter((entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0)
      .map(([key, val]) => [key, Math.min(100, Math.max(0, val))])
  );
}

function migrateConfig(value: Record<string, unknown>): ConfigParseResult {
  const rawVersion = value.schemaVersion;
  const schemaVersion = rawVersion === undefined ? 1 : rawVersion;
  if (!Number.isInteger(schemaVersion) || typeof schemaVersion !== 'number' || schemaVersion < 1) {
    return { status: 'error', message: strings.messages.importInvalidVersion };
  }
  if (schemaVersion > CONFIG_SCHEMA_VERSION) {
    return {
      status: 'error',
      message: strings.messages.importUnsupportedVersion(schemaVersion, CONFIG_SCHEMA_VERSION)
    };
  }
  if (schemaVersion === CONFIG_SCHEMA_VERSION) return normalizeConfig(value);

  // Older config: derive ordering from selection only when the fields are absent
  // (pre-v3). v3 configs already carry explicit order — preserve it, just add the
  // v4 fields (which normalizeConfig defaults from missing). New fields need no
  // special migration: their normalizers return empty defaults when absent.
  const selectedItems = Array.isArray(value.selectedItems)
    ? value.selectedItems.map(normalizeSelectedItem).filter((item): item is SelectedItemRef => item !== null)
    : [];
  return normalizeConfig({
    ...value,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    categoryOrder: value.categoryOrder ?? categoryOrderFromSelection(selectedItems),
    itemOrderByCategory: value.itemOrderByCategory ?? itemOrderFromSelection(selectedItems)
  });
}

function normalizeConfig(value: Record<string, unknown>): ConfigParseResult {
  if (!Array.isArray(value.selectedItems)) {
    return { status: 'error', message: strings.messages.importMissingSelection };
  }
  const selectedItems = value.selectedItems
    .map(normalizeSelectedItem)
    .filter((item): item is SelectedItemRef => item !== null && item.categoryId !== 'produktebene');
  return {
    status: 'success',
    config: {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      selectedItems,
      selectedProductFormats: normalizeStringArray(value.selectedProductFormats),
      scaleByCategory: normalizeScaleByCategory(value.scaleByCategory),
      scaleSettingsByCategory: normalizeScaleSettingsByCategory(value.scaleSettingsByCategory),
      defaultScaleId: typeof value.defaultScaleId === 'string' ? value.defaultScaleId : undefined,
      documentTitle: normalizeDocumentTitle(value.documentTitle),
      header: normalizeHeader(value.header),
      footerFields: normalizeFooterFields(value.footerFields),
      customItems: Array.isArray(value.customItems)
        ? value.customItems.map(normalizeCustomItem).filter((item): item is CustomItem => item !== null)
        : [],
      categoryOrder: normalizeStringArray(value.categoryOrder),
      itemOrderByCategory: normalizeItemOrder(value.itemOrderByCategory),
      categoryTitleOverrides: normalizeStringMap(value.categoryTitleOverrides),
      customCategories: normalizeCustomCategories(value.customCategories),
      categoryWeights: normalizeWeights(value.categoryWeights)
    }
  };
}

export function parseConfig(value: unknown): ConfigParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'error', message: strings.messages.importInvalidShape };
  }
  return migrateConfig(value as Record<string, unknown>);
}

export function saveConfig(config: AppConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable or quota exceeded (e.g. Safari private mode).
    // Persistence is best-effort — never let it break the active editing session.
  }
}

export function loadConfig(): AppConfig | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const result = parseConfig(JSON.parse(raw));
    if (result.status === 'success') {
      saveConfig(result.config);
      return result.config;
    }
  } catch {
    // Ignore invalid local state and use defaults.
  }
  return null;
}

export function exportConfigJSON(config: AppConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
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
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  const sanitize = (value: string): string => value.trim()
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const titleByMode: Record<DocumentTitleMode, string> = {
    bewertungsbogen: 'Bewertungsbogen',
    feedbackbogen: 'Feedbackbogen',
    custom: ''
  };
  const base = sanitize(
    config.documentTitle.mode === 'custom'
      ? config.documentTitle.custom
      : titleByMode[config.documentTitle.mode]
  ) || 'Feedbackbogen';

  const topic = sanitize(config.header.fields.find((field) => field.id === 'topic')?.value ?? '');

  return `${date}_${base}${topic ? `_${topic}` : ''}.json`;
}

export async function importConfigJSON(): Promise<ConfigImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve({ status: 'cancelled' });
      if (file.size > MAX_IMPORT_BYTES) return resolve({ status: 'error', message: strings.messages.importTooLarge });
      try {
        resolve(parseConfig(JSON.parse(await file.text())));
      } catch {
        resolve({ status: 'error', message: strings.messages.importInvalidJson });
      }
    };
    input.oncancel = () => resolve({ status: 'cancelled' });
    input.click();
  });
}
