import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportConfigJSON, importConfigJSON, loadConfig, saveConfig } from '@/storage';
import type { AppConfig } from '@/types';

const config: AppConfig = {
  selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
  selectedProductFormats: [],
  scaleByCategory: { allgemeine: 'punkte_10' },
  defaultScaleId: 'verbal_5',
  documentTitle: { mode: 'custom', custom: 'Testbogen' },
  header: {
    fields: [{ id: 'name', label: 'Name', value: 'Ada Lovelace' }]
  },
  footerFields: {
    date: true,
    signature: false,
    grade: true
  },
  customItems: []
};

describe('config storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores and loads a config from localStorage', () => {
    saveConfig(config);

    expect(loadConfig()).toEqual(config);
  });

  it('downloads the current config as JSON', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12));
    let downloadedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      downloadedBlob = blob;
      return 'blob:test-config';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportConfigJSON(config);

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-config');
    expect(click.mock.instances[0].download).toBe('2026-05-30_Feedbackbogen.json');
    expect(downloadedBlob).not.toBeNull();
    expect(JSON.parse(await downloadedBlob!.text())).toEqual(config);
  });

  it('adds a sanitized topic to the downloaded filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12));
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test-config',
      revokeObjectURL: () => {}
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const configWithTopic: AppConfig = {
      ...config,
      header: {
        fields: [
          ...config.header.fields,
          { id: 'topic', label: 'Thema', value: ' KI / Ethik: Chancen? ' }
        ]
      }
    };

    exportConfigJSON(configWithTopic);

    expect(click.mock.instances[0].download).toBe('2026-05-30_Feedbackbogen_KI - Ethik- Chancen-.json');
  });

  it('loads and normalizes a config from an uploaded JSON file', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function () {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [{ text: async () => JSON.stringify(config) }]
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual(config);
  });
});

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, value)
  };
}
