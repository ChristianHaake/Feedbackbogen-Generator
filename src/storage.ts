import type { AppConfigV1, AppConfigV2, HeaderData } from './types';

const KEY_V2 = 'bbk:config:v2';
const KEY_V1 = 'bbk:config:v1';

export const EMPTY_HEADER: HeaderData = { learner: '', learngroup: '', topic: '', date: '', feedback: '' };

export function saveConfig(config: AppConfigV2) {
  localStorage.setItem(KEY_V2, JSON.stringify(config));
}

export function loadConfig(): AppConfigV2 | null {
  const raw = localStorage.getItem(KEY_V2);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2) {
        return { ...parsed, header: { ...EMPTY_HEADER, ...(parsed.header ?? {}) } } as AppConfigV2;
      }
    } catch { /* ignore */ }
  }
  // Migrate from V1
  const rawV1 = localStorage.getItem(KEY_V1);
  if (rawV1) {
    try {
      const v1 = JSON.parse(rawV1) as AppConfigV1;
      if (v1?.version === 1 && Array.isArray(v1.selectedItems)) {
        return {
          version: 2,
          selectedItems: v1.selectedItems,
          scaleByItem: v1.scaleByItem ?? {},
          defaultScaleId: v1.defaultScaleId,
          header: { ...EMPTY_HEADER },
          customItems: []
        };
      }
    } catch { /* ignore */ }
  }
  return null;
}

export function exportConfigJSON(config: AppConfigV2) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbaukasten.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importConfigJSON(): Promise<AppConfigV2 | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      try {
        const cfg = JSON.parse(text);
        if (cfg?.version === 2) {
          resolve({ ...cfg, header: { ...EMPTY_HEADER, ...(cfg.header ?? {}) } });
        } else if (cfg?.version === 1 && Array.isArray(cfg.selectedItems)) {
          resolve({
            version: 2,
            selectedItems: cfg.selectedItems,
            scaleByItem: cfg.scaleByItem ?? {},
            defaultScaleId: cfg.defaultScaleId,
            header: { ...EMPTY_HEADER },
            customItems: []
          });
        } else {
          resolve(null);
        }
      } catch { resolve(null); }
    };
    input.click();
  });
}
