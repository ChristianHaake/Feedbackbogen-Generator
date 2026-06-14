import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFIG_SCHEMA_VERSION, exportConfigJSON, importConfigJSON, loadConfig, parseConfig, saveConfig } from '@/storage';
import type { AppConfig } from '@/types';

const config: AppConfig = {
  schemaVersion: CONFIG_SCHEMA_VERSION,
  selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
  selectedProductFormats: [],
  scaleByCategory: { allgemeine: 'punkte_10' },
  scaleSettingsByCategory: { allgemeine: { min: 0, max: 5 } },
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
  customItems: [],
  categoryOrder: ['allgemeine'],
  itemOrderByCategory: { allgemeine: ['abgabe'] }
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

  it('preserves custom header field labels, order and values verbatim through save/load and JSON round-trips', () => {
    const withCustomHeaders: AppConfig = {
      ...config,
      header: {
        fields: [
          { id: 'field_1', label: 'Lehrperson', value: '' },
          { id: 'field_2', label: 'Prüfung ä ö ü ß "Test"', value: 'Wert mit Leerzeichen' },
          { id: 'field_3', label: 'Lerngruppe', value: '8b' }
        ]
      }
    };

    saveConfig(withCustomHeaders);
    expect(loadConfig()?.header.fields).toEqual(withCustomHeaders.header.fields);

    const reparsed = parseConfig(JSON.parse(JSON.stringify(withCustomHeaders)));
    expect(reparsed.status).toBe('success');
    if (reparsed.status === 'success') {
      expect(reparsed.config.header.fields).toEqual(withCustomHeaders.header.fields);
    }
  });

  it('downloads the current config as JSON', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12));
    let downloadedBlob: Blob | null = null;
    let downloadedFilename = '';
    const createObjectURL = vi.fn((blob: Blob) => {
      downloadedBlob = blob;
      return 'blob:test-config';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });

    exportConfigJSON(config);

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-config');
    expect(downloadedFilename).toBe('2026-05-30_Feedbackbogen.json');
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
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
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

    expect(downloadedFilename).toBe('2026-05-30_Feedbackbogen_KI - Ethik- Chancen-.json');
  });

  it('loads and normalizes a config from an uploaded JSON file', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [{ text: async () => JSON.stringify(config) }]
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual({ status: 'success', config });
  });

  it('drops malformed nested values when loading a config', () => {
    localStorage.setItem('bbk:config', JSON.stringify({
      selectedItems: [
        { categoryId: 'allgemeine', itemId: 'abgabe' },
        null,
        { categoryId: 42, itemId: 'invalid' }
      ],
      selectedProductFormats: ['test', 42],
      scaleByCategory: { allgemeine: 'verbal_5', invalid: 42 },
      scaleSettingsByCategory: {
        allgemeine: { min: 1.8, max: 6.2 },
        invalid: { min: 'a', max: 6 }
      },
      defaultScaleId: 42,
      customItems: [
        { id: 'custom_1', label: 'Eigenes Kriterium', categoryId: 'allgemeine', custom: true },
        { id: 'custom_2', label: 42, categoryId: 'allgemeine', custom: true }
      ]
    }));

    expect(loadConfig()).toMatchObject({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
      selectedProductFormats: ['test'],
      scaleByCategory: { allgemeine: 'verbal_5' },
      scaleSettingsByCategory: { allgemeine: { min: 1, max: 6 } },
      defaultScaleId: undefined,
      customItems: [{ id: 'custom_1', label: 'Eigenes Kriterium', categoryId: 'allgemeine', custom: true }],
      categoryOrder: ['allgemeine'],
      itemOrderByCategory: { allgemeine: ['abgabe'] }
    });
  });

  it('rejects an uploaded file with invalid JSON', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [{ text: async () => '{invalid' }]
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual({
      status: 'error',
      message: 'Die Datei enthält kein gültiges JSON.'
    });
  });

  it('migrates unversioned configs to the current schema', () => {
    const result = parseConfig({
      selectedItems: [
        { categoryId: 'sachebene', itemId: 'tiefe' },
        { categoryId: 'allgemeine', itemId: 'abgabe' },
        { categoryId: 'sachebene', itemId: 'komplexitaet' }
      ]
    });

    expect(result).toMatchObject({
      status: 'success',
      config: {
        schemaVersion: CONFIG_SCHEMA_VERSION,
        categoryOrder: ['sachebene', 'allgemeine'],
        itemOrderByCategory: {
          sachebene: ['tiefe', 'komplexitaet'],
          allgemeine: ['abgabe']
        }
      }
    });
  });

  it('rejects configs from unsupported future schema versions with a readable message', () => {
    expect(parseConfig({ schemaVersion: 99, selectedItems: [] })).toEqual({
      status: 'error',
      message: 'Die Config-Version 99 wird nicht unterstützt. Unterstützt wird Version 3.'
    });
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
