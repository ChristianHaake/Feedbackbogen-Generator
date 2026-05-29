import { strings } from './strings';
import type { AppConfig, DocumentTitleConfig, DocumentTitleMode, FooterFields, HeaderData, HeaderField } from './types';

const KEY = 'bbk:config';

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
  mode: 'bewertungsbogen',
  custom: ''
};

export const EMPTY_HEADER: HeaderData = {
  fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field }))
};

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
  if (!headerValue || typeof headerValue !== 'object') return {
    fields: DEFAULT_HEADER_FIELDS.map((field) => ({ ...field }))
  };

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

function normalizeConfig(value: unknown): AppConfig | null {
  if (!value || typeof value !== 'object') return null;
  const cfg = value as Partial<AppConfig>;
  if (!Array.isArray(cfg.selectedItems)) return null;
  const scaleByCategory = cfg.scaleByCategory && typeof cfg.scaleByCategory === 'object' && !Array.isArray(cfg.scaleByCategory)
    ? cfg.scaleByCategory
    : {};
  return {
    selectedItems: cfg.selectedItems.filter((item) => item.categoryId !== 'produktebene'),
    selectedProductFormats: Array.isArray(cfg.selectedProductFormats)
      ? cfg.selectedProductFormats.filter((id): id is string => typeof id === 'string')
      : [],
    scaleByCategory,
    defaultScaleId: cfg.defaultScaleId,
    documentTitle: normalizeDocumentTitle(cfg.documentTitle),
    header: normalizeHeader(cfg.header),
    footerFields: normalizeFooterFields(cfg.footerFields),
    customItems: Array.isArray(cfg.customItems) ? cfg.customItems : []
  };
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function loadConfig(): AppConfig | null {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return normalizeConfig(JSON.parse(raw));
    } catch { /* ignore */ }
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
  const topic = config.header.fields
    .find((field) => field.id === 'topic')
    ?.value.trim()
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ');

  return `${date}_Feedbackbogen${topic ? `_${topic}` : ''}.json`;
}

export async function importConfigJSON(): Promise<AppConfig | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      try {
        resolve(normalizeConfig(JSON.parse(text)));
      } catch { resolve(null); }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
