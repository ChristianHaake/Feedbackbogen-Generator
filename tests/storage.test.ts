import fs from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONFIG_FORMAT,
  CONFIG_SCHEMA_VERSION,
  CONFIG_LIMITS,
  configWithinLimits,
  createDefaultConfig,
  downloadConfigRecovery,
  exportConfigJSON,
  getConfigRecovery,
  importConfigJSON,
  isConfigText,
  loadConfig,
  parseConfig,
  resolveSectionState,
  replaceStoredConfig,
  saveConfig,
  validateConfigCatalog,
} from '@/storage';
import type { AppConfig, Category, ProductFormatData, Scale } from '@/types';

const catalog = {
  categories: [
    {
      id: 'allgemeine',
      title: 'Allgemein',
      items: [
        { id: 'abgabe', label: 'Abgabe' },
        { id: 'vollstaendigkeit', label: 'Vollständigkeit' },
      ],
    },
  ] satisfies Category[],
  scales: [
    {
      id: 'verbal_5',
      label: 'Verbal',
      kind: 'verbal',
      labels: ['Ja', 'Nein'],
    },
    {
      id: 'punkte_10',
      label: 'Punkte',
      kind: 'numeric',
      defaultMin: 0,
      defaultMax: 10,
      minLimit: 0,
      maxLimit: 20,
      maxSteps: 11,
    },
  ] satisfies Scale[],
  productFormats: { groups: [] } satisfies ProductFormatData,
};

const config: AppConfig = {
  format: CONFIG_FORMAT,
  schemaVersion: CONFIG_SCHEMA_VERSION,
  language: 'de',
  selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
  selectedProductFormats: [],
  scaleByCategory: { allgemeine: 'punkte_10' },
  scaleSettingsByCategory: { allgemeine: { min: 0, max: 5 } },
  defaultScaleId: 'verbal_5',
  documentTitle: { mode: 'custom', custom: 'Testbogen' },
  header: {
    fields: [{ id: 'name', label: 'Name', value: 'Ada Lovelace' }],
  },
  footerFields: {
    date: true,
    signature: false,
    grade: true,
  },
  customItems: [],
  categoryOrder: ['allgemeine'],
  itemOrderByCategory: { allgemeine: ['abgabe'] },
  categoryTitleOverrides: {},
  customCategories: [],
  categoryWeights: {},
};

describe('config storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    loadConfig();
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

  it('accepts a minimal v5 config and fills optional defaults', () => {
    const result = parseConfig({
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      language: 'de',
      selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
    });

    expect(result).toMatchObject({
      status: 'success',
      config: {
        format: CONFIG_FORMAT,
        schemaVersion: CONFIG_SCHEMA_VERSION,
        language: 'de',
        selectedProductFormats: [],
        customItems: [],
        customCategories: [],
      },
    });
  });

  it('rejects unknown or malformed v5 fields instead of dropping them', () => {
    const result = parseConfig({
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      language: 'de',
      selectedItems: [],
      inventedRule: true,
      customItems: [{ id: 'custom', label: 42, categoryId: 'allgemeine' }],
      customCategories: [{ id: '', title: 'Kategorie' }],
      header: { fields: [{ id: '', label: 'Feld' }] },
    });

    expect(result.status).toBe('error');
    if (result.status === 'error')
      expect(result.diagnostics?.map(({ path }) => path)).toEqual(
        expect.arrayContaining([
          '$.inventedRule',
          '$.customItems[0].label',
          '$.customCategories[0].id',
          '$.header.fields[0].id',
        ])
      );
  });

  it('reports unsafe v5 identifiers at their field path', () => {
    const result = parseConfig({
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      language: 'de',
      selectedItems: [{ categoryId: 'constructor', itemId: 'item' }],
    });

    expect(result.status).toBe('error');
    if (result.status === 'error')
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ path: '$.selectedItems[0].categoryId' })
      );
  });

  it('accepts explicit custom content and rejects unresolved references', () => {
    const customResult = parseConfig({
      format: CONFIG_FORMAT,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      language: 'de',
      selectedItems: [{ categoryId: 'custom_cat', itemId: 'custom_item' }],
      customCategories: [{ id: 'custom_cat', title: 'Eigene Kategorie' }],
      customItems: [
        { id: 'custom_item', label: 'Eigenes Kriterium', categoryId: 'custom_cat' },
      ],
    });
    expect(customResult.status).toBe('success');
    if (customResult.status === 'success')
      expect(validateConfigCatalog(customResult.config, catalog)).toEqual([]);

    const unresolved = { ...config, selectedItems: [{ categoryId: 'allgemeine', itemId: 'invented' }] };
    expect(validateConfigCatalog(unresolved, catalog)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '$.selectedItems[0].itemId',
          code: 'unknown-reference',
        }),
      ])
    );
  });

  it('validates numeric scale ranges against the referenced catalog scale', () => {
    expect(
      validateConfigCatalog(
        {
          ...config,
          scaleSettingsByCategory: { allgemeine: { min: 0, max: 20 } },
        },
        catalog
      )
    ).toEqual([
      expect.objectContaining({
        path: '$.scaleSettingsByCategory.allgemeine',
        code: 'scale-range',
      }),
    ]);
  });

  it('rejects ordering entries that would be silently removed', () => {
    expect(
      validateConfigCatalog(
        {
          ...config,
          customCategories: [{ id: 'unused_category', title: 'Unbenutzt' }],
          categoryOrder: ['allgemeine', 'unused_category'],
          itemOrderByCategory: {
            allgemeine: ['abgabe', 'vollstaendigkeit'],
          },
        },
        catalog
      ).map(({ path }) => path)
    ).toEqual(
      expect.arrayContaining([
        '$.categoryOrder[1]',
        '$.itemOrderByCategory.allgemeine[1]',
      ])
    );
  });

  it('keeps the published v5 examples importable', async () => {
    for (const name of ['minimal-v5.json', 'full-v5.json']) {
      const raw = await fs.readFile(
        `content/config/${name}`,
        'utf8'
      );
      const result = parseConfig(JSON.parse(raw));
      expect(result.status, name).toBe('success');
      if (result.status === 'success')
        expect(validateConfigCatalog(result.config, catalog), name).toEqual([]);
    }
  });

  it('uses the same text and count limits for editor, saving and restoring', () => {
    const maximum = {
      ...config,
      documentTitle: {
        mode: 'custom' as const,
        custom: 'x'.repeat(CONFIG_LIMITS.stringLength),
      },
      header: {
        fields: Array.from({ length: CONFIG_LIMITS.headerFields }, (_, i) => ({
          id: `field_${i}`,
          label: 'Feld',
          value: '',
        })),
      },
    };
    expect(configWithinLimits(maximum)).toBe(true);
    expect(saveConfig(maximum)).toBe(true);
    expect(loadConfig()).toEqual(maximum);
    const saved = localStorage.getItem('bbk:config');
    expect(
      saveConfig({
        ...maximum,
        documentTitle: {
          mode: 'custom',
          custom: 'x'.repeat(CONFIG_LIMITS.stringLength + 1),
        },
      })
    ).toBe(false);
    expect(
      saveConfig({
        ...maximum,
        header: {
          fields: [
            ...maximum.header.fields,
            { id: 'extra', label: 'Extra', value: '' },
          ],
        },
      })
    ).toBe(false);
    expect(localStorage.getItem('bbk:config')).toBe(saved);
  });

  it.each([
    '',
    '{invalid',
    JSON.stringify({ ...config, schemaVersion: 99 }),
    JSON.stringify({
      ...config,
      documentTitle: { mode: 'custom', custom: 'x'.repeat(2001) },
    }),
  ])(
    'protects rejected stored bytes until an explicit replacement: %s',
    (raw) => {
      localStorage.setItem('bbk:config', raw);
      expect(loadConfig()).toBeNull();
      expect(getConfigRecovery()).toBe(raw);
      expect(saveConfig(createDefaultConfig())).toBe(false);
      expect(localStorage.getItem('bbk:config')).toBe(raw);
      expect(replaceStoredConfig({ ...config, schemaVersion: 99 })).toBe(false);
      expect(getConfigRecovery()).toBe(raw);
      expect(replaceStoredConfig(config)).toBe(true);
      expect(getConfigRecovery()).toBeNull();
      expect(saveConfig(createDefaultConfig())).toBe(true);
    }
  );

  it('retains recovery protection when explicit replacement cannot be saved', () => {
    localStorage.setItem('bbk:config', '{invalid');
    loadConfig();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(replaceStoredConfig(config)).toBe(false);
    expect(getConfigRecovery()).toBe('{invalid');
    expect(localStorage.getItem('bbk:config')).toBe('{invalid');
  });

  it('downloads the exact rejected bytes for recovery', async () => {
    const raw = '{original invalid JSON';
    localStorage.setItem('bbk:config', raw);
    loadConfig();
    let blob: Blob | undefined;
    vi.stubGlobal('URL', {
      createObjectURL: (value: Blob) => {
        blob = value;
        return 'blob:recovery';
      },
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      expect(this.download).toBe('feedbackbogen-wiederherstellung.json');
    });
    downloadConfigRecovery();
    expect(await blob?.text()).toBe(raw);
    expect(getConfigRecovery()).toBe(raw);
  });

  it.each([
    ...Object.getOwnPropertyNames(Object.prototype),
    'prototype',
    'custom_"',
    'category id',
  ])(
    'rejects unsafe IDs before current and legacy migration: %s',
    (categoryId) => {
      for (const schemaVersion of [undefined, CONFIG_SCHEMA_VERSION]) {
        expect(
          parseConfig({
            schemaVersion,
            selectedItems: [{ categoryId, itemId: 'x' }],
          }).status
        ).toBe('error');
      }
      expect(
        parseConfig({
          ...config,
          customCategories: [{ id: categoryId, title: 'Custom' }],
        }).status
      ).toBe('error');
      expect(
        parseConfig({
          ...config,
          categoryTitleOverrides: Object.fromEntries([[categoryId, 'Title']]),
        }).status
      ).toBe('error');
    }
  );

  it('rejects duplicate header, custom item, category and selection identities', () => {
    const item = {
      id: 'custom_1',
      label: 'Item',
      categoryId: 'allgemeine',
      custom: true as const,
    };
    const category = { id: 'custom_cat_1', title: 'Category' };
    for (const duplicate of [
      {
        header: { fields: [config.header.fields[0], config.header.fields[0]] },
      },
      { customItems: [item, item] },
      { customCategories: [category, category] },
      { selectedItems: [config.selectedItems[0], config.selectedItems[0]] },
    ])
      expect(parseConfig({ ...config, ...duplicate }).status).toBe('error');
  });

  it.each([
    '\u0000',
    '\u0001',
    '\u000b',
    '\u001f',
    '\ufffe',
    '\uffff',
    '\ud800',
    '\udfff',
  ])('rejects XML-disallowed document characters: %j', (character) => {
    expect(
      parseConfig({
        ...config,
        documentTitle: { mode: 'custom', custom: `Test${character}Text` },
      }).status
    ).toBe('error');
    expect(
      parseConfig({
        ...config,
        customItems: [
          { id: 'custom_1', categoryId: 'allgemeine', label: character },
        ],
      }).status
    ).toBe('error');
    expect(
      saveConfig({
        ...config,
        header: { fields: [{ id: 'h', label: 'Label', value: character }] },
      })
    ).toBe(false);
  });

  it('preserves tabs, line endings and supplementary Unicode document text', () => {
    const title = 'Test\tZeile\nText\r\n\u{1f9ea}';
    expect(isConfigText(title)).toBe(true);
    expect(isConfigText('x'.repeat(CONFIG_LIMITS.stringLength))).toBe(true);
    expect(isConfigText('x'.repeat(CONFIG_LIMITS.stringLength + 1))).toBe(
      false
    );
    expect(isConfigText('Text\u0001')).toBe(false);
    const value = {
      ...config,
      documentTitle: { mode: 'custom' as const, custom: title },
    };
    expect(saveConfig(value)).toBe(true);
    expect(loadConfig()?.documentTitle.custom).toBe(title);
  });

  it('rejects deeply nested input without overflowing the call stack', () => {
    let value: unknown = 'x';
    for (let i = 0; i < 25_000; i++) value = [value];
    expect(parseConfig({ selectedItems: [], unknown: value }).status).toBe(
      'error'
    );
  });

  it('applies the file byte limit to saved configurations too', () => {
    const tooLarge = {
      ...config,
      categoryTitleOverrides: Object.fromEntries(
        Array.from({ length: 1400 }, (_, i) => [
          `category_${i}`,
          'ä'.repeat(2000),
        ])
      ),
    };
    expect(configWithinLimits(tooLarge)).toBe(false);
    expect(saveConfig(tooLarge)).toBe(false);
  });

  it('falls back to defaults when localStorage reads throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage);

    expect(loadConfig()).toBeNull();
  });

  it('preserves custom header field labels, order and values verbatim through save/load and JSON round-trips', () => {
    const withCustomHeaders: AppConfig = {
      ...config,
      header: {
        fields: [
          { id: 'field_1', label: 'Lehrperson', value: '' },
          {
            id: 'field_2',
            label: 'Prüfung ä ö ü ß "Test"',
            value: 'Wert mit Leerzeichen',
          },
          { id: 'field_3', label: 'Lerngruppe', value: '8b' },
        ],
      },
    };

    saveConfig(withCustomHeaders);

    // Inspect the raw stored bytes to isolate serialization from the load path:
    // a write-side bug must show up here even if loadConfig() normalizes it away.
    const rawStored = localStorage.getItem('bbk:config');
    expect(rawStored).not.toBeNull();
    expect(rawStored).toContain('Prüfung ä ö ü ß \\"Test\\"');
    expect((JSON.parse(rawStored!) as AppConfig).header.fields).toEqual(
      withCustomHeaders.header.fields
    );

    expect(loadConfig()?.header.fields).toEqual(
      withCustomHeaders.header.fields
    );

    const reparsed = parseConfig(JSON.parse(JSON.stringify(withCustomHeaders)));
    expect(reparsed.status).toBe('success');
    if (reparsed.status === 'success') {
      expect(reparsed.config.header.fields).toEqual(
        withCustomHeaders.header.fields
      );
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
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });

    exportConfigJSON(config);

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-config');
    expect(downloadedFilename).toBe('2026-05-30_Testbogen.json');
    expect(downloadedBlob).not.toBeNull();
    expect(JSON.parse(await downloadedBlob!.text())).toEqual(config);
  });

  it('adds a sanitized topic to the downloaded filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12));
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test-config',
      revokeObjectURL: () => {},
    });
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadedFilename = this.download;
    });
    const configWithTopic: AppConfig = {
      ...config,
      header: {
        fields: [
          ...config.header.fields,
          { id: 'topic', label: 'Thema', value: ' KI / Ethik: Chancen? ' },
        ],
      },
    };

    exportConfigJSON(configWithTopic);

    expect(downloadedFilename).toBe(
      '2026-05-30_Testbogen_KI - Ethik- Chancen-.json'
    );
  });

  it('loads and normalizes a config from an uploaded JSON file', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement
    ) {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [{ text: async () => JSON.stringify(config) }],
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual({
      status: 'success',
      config,
    });
  });

  it('drops malformed nested values when loading a config', () => {
    localStorage.setItem(
      'bbk:config',
      JSON.stringify({
        selectedItems: [
          { categoryId: 'allgemeine', itemId: 'abgabe' },
          null,
          { categoryId: 42, itemId: 'invalid' },
        ],
        selectedProductFormats: ['test', 42],
        scaleByCategory: { allgemeine: 'verbal_5', invalid: 42 },
        scaleSettingsByCategory: {
          allgemeine: { min: 1.8, max: 6.2 },
          invalid: { min: 'a', max: 6 },
        },
        defaultScaleId: 42,
        customItems: [
          {
            id: 'custom_1',
            label: 'Eigenes Kriterium',
            categoryId: 'allgemeine',
            custom: true,
          },
          { id: 'custom_2', label: 42, categoryId: 'allgemeine', custom: true },
        ],
      })
    );

    expect(loadConfig()).toMatchObject({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
      selectedProductFormats: ['test'],
      scaleByCategory: { allgemeine: 'verbal_5' },
      scaleSettingsByCategory: { allgemeine: { min: 1, max: 6 } },
      defaultScaleId: undefined,
      customItems: [
        {
          id: 'custom_1',
          label: 'Eigenes Kriterium',
          categoryId: 'allgemeine',
          custom: true,
        },
      ],
      categoryOrder: ['allgemeine'],
      itemOrderByCategory: { allgemeine: ['abgabe'] },
    });
  });

  it('rejects an uploaded file that exceeds the size limit before reading it', async () => {
    let read = false;
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement
    ) {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [
          {
            size: 10_000_000,
            text: async () => {
              read = true;
              return '{}';
            },
          },
        ],
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual({
      status: 'error',
      message: 'Die Datei ist zu groß für eine Feedbackbogen-Konfiguration.',
    });
    expect(read).toBe(false);
  });

  it('rejects imported configs with excessive entry counts', () => {
    const result = parseConfig({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      selectedItems: Array.from({ length: 1001 }, (_, index) => ({
        categoryId: 'allgemeine',
        itemId: `item-${index}`,
      })),
    });

    expect(result).toEqual({
      status: 'error',
      message:
        'Die Datei enthält zu viele oder zu lange Einträge für eine Feedbackbogen-Konfiguration.',
    });
  });

  it('rejects an uploaded file with invalid JSON', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement
    ) {
      Object.defineProperty(this, 'files', {
        configurable: true,
        value: [{ text: async () => '{invalid' }],
      });
      this.onchange?.(new Event('change'));
    });

    await expect(importConfigJSON()).resolves.toEqual({
      status: 'error',
      message: 'Die Datei enthält kein gültiges JSON.',
    });
  });

  it('migrates unversioned configs to the current schema', () => {
    const result = parseConfig({
      selectedItems: [
        { categoryId: 'sachebene', itemId: 'tiefe' },
        { categoryId: 'allgemeine', itemId: 'abgabe' },
        { categoryId: 'sachebene', itemId: 'komplexitaet' },
      ],
    });

    expect(result).toMatchObject({
      status: 'success',
      config: {
        schemaVersion: CONFIG_SCHEMA_VERSION,
        categoryOrder: ['sachebene', 'allgemeine'],
        itemOrderByCategory: {
          sachebene: ['tiefe', 'komplexitaet'],
          allgemeine: ['abgabe'],
        },
      },
    });
  });

  it('rejects configs from unsupported future schema versions with a readable message', () => {
    expect(parseConfig({ schemaVersion: 99, selectedItems: [] })).toEqual({
      status: 'error',
      message:
        'Die Config-Version 99 wird nicht unterstützt. Unterstützt wird Version 5.',
    });
  });

  it('adds v4 fields when migrating v3 and removes stale order entries', () => {
    const result = parseConfig({
      schemaVersion: 3,
      selectedItems: [{ categoryId: 'sachebene', itemId: 'tiefe' }],
      categoryOrder: ['allgemeine', 'sachebene'],
      itemOrderByCategory: { sachebene: ['tiefe'] },
    });

    expect(result).toMatchObject({
      status: 'success',
      config: {
        schemaVersion: CONFIG_SCHEMA_VERSION,
        categoryOrder: ['sachebene'],
        categoryTitleOverrides: {},
        customCategories: [],
        categoryWeights: {},
      },
    });
  });

  it('normalizes v4 fields: trims titles, drops blanks, clamps weights', () => {
    const result = parseConfig({
      schemaVersion: 4,
      selectedItems: [],
      categoryTitleOverrides: {
        sachebene: '  Inhalt  ',
        praesentation: '   ',
        allgemeine: 42,
      },
      customCategories: [
        { id: 'custom_cat_1', title: '  Vortrag ' },
        { id: '', title: 'no id' },
        { id: 'x', title: '   ' },
      ],
      categoryWeights: {
        sachebene: 40,
        praesentation: 150,
        allgemeine: 0,
        sprachgebrauch: 'x',
      },
    });

    expect(result).toMatchObject({
      status: 'success',
      config: {
        categoryTitleOverrides: { sachebene: 'Inhalt' },
        customCategories: [{ id: 'custom_cat_1', title: 'Vortrag' }],
        categoryWeights: { sachebene: 40, praesentation: 100 },
      },
    });
  });
});

describe('section state', () => {
  const defaults = ['title', 'kopfdaten', 'criteria'];

  it('returns all defaults open when nothing is stored', () => {
    expect(resolveSectionState(null, defaults)).toEqual({
      title: true,
      kopfdaten: true,
      criteria: true,
    });
  });

  it('ignores invalid stored values and falls back to defaults', () => {
    expect(resolveSectionState('garbage', defaults)).toEqual({
      title: true,
      kopfdaten: true,
      criteria: true,
    });
    expect(
      resolveSectionState({ title: 'yes', kopfdaten: 1 }, defaults)
    ).toEqual({ title: true, kopfdaten: true, criteria: true });
  });

  it('merges persisted booleans over the defaults', () => {
    expect(
      resolveSectionState({ title: false, footer: true }, defaults)
    ).toEqual({ title: false, kopfdaten: true, criteria: true, footer: true });
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
    setItem: (key, value) => entries.set(key, value),
  };
}
