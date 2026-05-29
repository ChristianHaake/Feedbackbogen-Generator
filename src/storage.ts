import type { AppConfig, HeaderData } from './types';

const KEY = 'bbk:config';

export const EMPTY_HEADER: HeaderData = { learner: '', learngroup: '', topic: '', date: '', feedback: '' };

function normalizeConfig(value: unknown): AppConfig | null {
  if (!value || typeof value !== 'object') return null;
  const cfg = value as Partial<AppConfig>;
  if (!Array.isArray(cfg.selectedItems)) return null;
  const scaleByItem = cfg.scaleByItem && typeof cfg.scaleByItem === 'object' && !Array.isArray(cfg.scaleByItem)
    ? cfg.scaleByItem
    : {};
  const header = cfg.header && typeof cfg.header === 'object'
    ? cfg.header
    : {};
  return {
    selectedItems: cfg.selectedItems,
    scaleByItem,
    defaultScaleId: cfg.defaultScaleId,
    header: { ...EMPTY_HEADER, ...header },
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
  a.download = 'bewertungsbaukasten.json';
  a.click();
  URL.revokeObjectURL(a.href);
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
    input.click();
  });
}
