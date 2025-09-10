import type { AppConfigV1 } from './types';

const KEY = 'bbk:config:v1';

export function saveConfig(config: AppConfigV1) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function loadConfig(): AppConfigV1 | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.selectedItems) && parsed.scaleByItem) {
      return parsed as AppConfigV1;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function exportConfigJSON(config: AppConfigV1) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bewertungsbaukasten.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importConfigJSON(): Promise<AppConfigV1 | null> {
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
        if (cfg && cfg.version === 1) resolve(cfg as AppConfigV1);
        else resolve(null);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

