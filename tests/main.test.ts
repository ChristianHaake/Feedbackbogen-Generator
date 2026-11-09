import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig, Category, Scale } from '@/types';

const categories: Category[] = [
  {
    id: 'allgemeine',
    title: 'Allgemein',
    items: [
      { id: 'abgabe', label: 'Abgabe' },
      { id: 'vollstaendigkeit', label: 'Vollständigkeit' },
    ],
  },
  {
    id: 'grouped',
    title: 'Gruppiert',
    groups: [
      {
        id: 'group',
        title: 'Gruppe',
        items: [{ id: 'group_item', label: 'Gruppiertes Kriterium' }],
      },
    ],
  },
];
const scales: Scale[] = [
  { id: 'verbal_5', label: 'Skala', kind: 'verbal', labels: ['Ja', 'Nein'] },
];
let entries: Map<string, string>;
let listeners: { target: EventTarget; spy: ReturnType<typeof vi.spyOn> }[];

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  entries = new Map([
    ['bbk:lang', 'de'],
    ['bbk:onboarding-dismissed', '1'],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith('categories.json')
          ? categories
          : url.endsWith('scales.json')
            ? scales
            : { groups: [] },
    }))
  );
  document.body.innerHTML = '<div id="app"></div>';
  window.history.replaceState(null, '', '/');
  listeners = [window, document, document.body].map((target) => ({
    target,
    spy: vi.spyOn(target, 'addEventListener'),
  }));
});

afterEach(() => {
  vi.doUnmock('@/export/export-pdf');
  for (const { target, spy } of listeners) {
    for (const [type, callback, options] of spy.mock.calls)
      target.removeEventListener(type, callback, options);
  }
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

async function start() {
  await import('@/main');
  await vi.waitFor(() =>
    expect(document.querySelector('#cb-allgemeine-abgabe')).not.toBeNull()
  );
}

function control<T extends HTMLElement = HTMLButtonElement>(
  selector: string
): T {
  const element = document.querySelector<T>(selector);
  expect(element, selector).not.toBeNull();
  return element!;
}

function type(selector: string, value: string) {
  const input = control<HTMLInputElement>(selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function saved(): AppConfig {
  return JSON.parse(entries.get('bbk:config')!);
}

describe('application persistence and history', () => {
  it('exports one consistent document snapshot while the export module is loading', async () => {
    let releaseImport!: () => void;
    let importStarted = false;
    const gate = new Promise<void>((resolve) => {
      releaseImport = resolve;
    });
    const exportPDF = vi.fn();
    vi.doMock('@/export/export-pdf', async () => {
      importStarted = true;
      await gate;
      return { exportPDF };
    });
    await start();
    control('[data-title-mode="custom"]').click();
    type('#document-title-custom', 'Original title');
    type('#kd-value-name', 'Original name');
    control('#cb-allgemeine-abgabe').click();
    control('[data-export-format="pdf-print"]').click();
    await vi.waitFor(() => expect(importStarted).toBe(true));
    type('#document-title-custom', 'Changed title');
    type('#kd-value-name', 'Changed name');
    control('#cb-allgemeine-abgabe').click();
    releaseImport();
    await vi.waitFor(() => expect(exportPDF).toHaveBeenCalledOnce());
    expect(exportPDF).toHaveBeenCalledWith(
      [expect.objectContaining({ itemId: 'abgabe' })],
      'Original title',
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({ id: 'name', value: 'Original name' }),
        ]),
      }),
      { date: true, signature: true, grade: true },
      'full'
    );
  });

  it('keeps a replacement export locked when a timed-out predecessor finishes late', async () => {
    const completions: (() => void)[] = [];
    const exportPDF = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve);
        })
    );
    vi.doMock('@/export/export-pdf', () => ({ exportPDF }));
    await start();
    control('[data-export-format="pdf-print"]').click();
    await vi.waitFor(() => expect(exportPDF).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(30_000);
    control('[data-export-format="pdf-print"]').click();
    await vi.waitFor(() => expect(exportPDF).toHaveBeenCalledTimes(2));
    completions[0]();
    await vi.advanceTimersByTimeAsync(0);
    control('[data-export-format="pdf-print"]').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(exportPDF).toHaveBeenCalledTimes(2);
    completions[1]();
    await vi.advanceTimersByTimeAsync(0);
    control('[data-export-format="pdf-print"]').click();
    await vi.waitFor(() => expect(exportPDF).toHaveBeenCalledTimes(3));
    completions[2]();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('preserves rejected autosave bytes while editing and replaces them only after confirmed reset', async () => {
    const raw = JSON.stringify({ schemaVersion: 99, selectedItems: [] });
    entries.set('bbk:config', raw);
    await start();
    expect(control('.recovery-notice').getAttribute('role')).toBe('alert');
    control('#cb-allgemeine-abgabe').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(entries.get('bbk:config')).toBe(raw);
    control('#config-reset').click();
    control('.reset-confirm-action').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(saved().selectedItems).toEqual([]);
    expect(document.querySelector('.recovery-notice')).toBeNull();
  });

  it('imports and resets in memory when storage writes fail while preserving recoverable bytes', async () => {
    const { createDefaultConfig } = await import('@/storage');
    const imported = createDefaultConfig('verbal_5');
    imported.selectedItems = [
      { categoryId: 'allgemeine', itemId: 'vollstaendigkeit' },
    ];
    imported.header.fields[0].value = 'Imported name';
    const raw = JSON.stringify({ schemaVersion: 99, selectedItems: [] });
    entries.set('bbk:config', raw);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    await start();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement
    ) {
      Object.defineProperty(this, 'files', {
        value: [{ size: 1000, text: async () => JSON.stringify(imported) }],
      });
      this.dispatchEvent(new Event('change'));
    });
    control('#config-load').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(control<HTMLInputElement>('#kd-value-name').value).toBe(
      'Imported name'
    );
    expect(
      control<HTMLInputElement>('#cb-allgemeine-vollstaendigkeit').checked
    ).toBe(true);
    expect(control('#config-message').textContent).toContain(
      'nicht automatisch gespeichert'
    );
    expect(control('#config-message').hidden).toBe(false);
    expect(entries.get('bbk:config')).toBe(raw);
    expect(document.querySelector('.recovery-notice')).not.toBeNull();
    control('#config-reset').click();
    control('.reset-confirm-action').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(control<HTMLInputElement>('#kd-value-name').value).toBe('');
    expect(
      control<HTMLInputElement>('#cb-allgemeine-vollstaendigkeit').checked
    ).toBe(false);
    expect(control('#config-message').textContent).toContain(
      'nicht automatisch gespeichert'
    );
    expect(entries.get('bbk:config')).toBe(raw);
    expect(document.querySelector('.recovery-notice')).not.toBeNull();
  });

  it('keeps immutable selection snapshots and persists undo and redo after autosave settled', async () => {
    await start();
    control('#cb-allgemeine-abgabe').click();
    await vi.advanceTimersByTimeAsync(300);
    control('#cb-allgemeine-vollstaendigkeit').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(saved().selectedItems).toHaveLength(2);
    control('#history-undo').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(control<HTMLInputElement>('#cb-allgemeine-abgabe').checked).toBe(
      true
    );
    expect(
      control<HTMLInputElement>('#cb-allgemeine-vollstaendigkeit').checked
    ).toBe(false);
    expect(saved().selectedItems).toEqual([
      { categoryId: 'allgemeine', itemId: 'abgabe' },
    ]);
    control('#history-redo').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(saved().selectedItems).toHaveLength(2);
  });

  it('groups consecutive edits in one field while keeping different fields separately undoable', async () => {
    await start();
    type('#kd-value-name', 'A');
    type('#kd-value-name', 'Ada');
    type('#kd-value-topic', 'KI');
    control('#history-undo').click();
    expect(control<HTMLInputElement>('#kd-value-topic').value).toBe('');
    expect(control<HTMLInputElement>('#kd-value-name').value).toBe('Ada');
    control('#history-undo').click();
    expect(control<HTMLInputElement>('#kd-value-name').value).toBe('');
    control('#history-redo').click();
    expect(control<HTMLInputElement>('#kd-value-name').value).toBe('Ada');
    expect(control<HTMLInputElement>('#kd-value-topic').value).toBe('');
    control('#history-redo').click();
    expect(control<HTMLInputElement>('#kd-value-topic').value).toBe('KI');
  });

  it('keeps near-limit restored work exportable when text edits would exceed the byte cap', async () => {
    const { CONFIG_LIMITS, createDefaultConfig } = await import('@/storage');
    const config = createDefaultConfig('verbal_5');
    config.categoryTitleOverrides = Object.fromEntries(
      Array.from({ length: 1250 }, (_, i) => [`unused_${i}`, 'ä'])
    );
    let remaining =
      CONFIG_LIMITS.bytes -
      100 -
      new Blob([JSON.stringify(config, null, 2)]).size;
    for (const key of Object.keys(config.categoryTitleOverrides)) {
      const extra = Math.min(
        CONFIG_LIMITS.stringLength - 1,
        Math.floor(remaining / 2)
      );
      config.categoryTitleOverrides[key] = 'ä'.repeat(1 + extra);
      remaining -= extra * 2;
    }
    entries.set('bbk:config', JSON.stringify(config));
    await start();
    expect(document.querySelector('.recovery-notice')).toBeNull();
    const original = entries.get('bbk:config');
    type('#kd-value-name', 'ä'.repeat(CONFIG_LIMITS.stringLength));
    await vi.advanceTimersByTimeAsync(300);
    expect(entries.get('bbk:config')).toBe(original);
    type('#kd-value-name', 'Ada');
    await vi.advanceTimersByTimeAsync(300);
    expect(saved().header.fields[0].value).toBe('Ada');
    expect(
      new Blob([JSON.stringify(saved(), null, 2)]).size
    ).toBeLessThanOrEqual(CONFIG_LIMITS.bytes);
  });

  it('protects stored catalog collisions with the same recovery flow as malformed data', async () => {
    const { createDefaultConfig } = await import('@/storage');
    const config = createDefaultConfig('verbal_5');
    config.customItems = [
      {
        id: 'group_item',
        categoryId: 'grouped',
        label: 'Collision',
        custom: true,
      },
    ];
    const raw = JSON.stringify(config);
    entries.set('bbk:config', raw);
    await start();
    expect(control('.recovery-notice').getAttribute('role')).toBe('alert');
    expect(entries.get('bbk:config')).toBe(raw);
  });

  it('protects builtin selections when a custom ID collides across category boundaries', async () => {
    const { createDefaultConfig } = await import('@/storage');
    const config = createDefaultConfig('verbal_5');
    config.selectedItems = [
      { categoryId: 'allgemeine', itemId: 'abgabe' },
      { categoryId: 'grouped', itemId: 'abgabe' },
    ];
    config.customItems = [
      { id: 'abgabe', categoryId: 'grouped', label: 'Collision', custom: true },
    ];
    const raw = JSON.stringify(config);
    entries.set('bbk:config', raw);
    await start();
    expect(control('.recovery-notice').getAttribute('role')).toBe('alert');
    expect(document.querySelector('.custom-item-row')).toBeNull();
    control('#cb-allgemeine-abgabe').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(entries.get('bbk:config')).toBe(raw);
    expect(saved().selectedItems).toEqual(config.selectedItems);
  });

  it.each([
    { customCategories: [{ id: 'allgemeine', title: 'Collision' }] },
    {
      customItems: [
        {
          id: 'abgabe',
          categoryId: 'allgemeine',
          label: 'Collision',
          custom: true,
        },
      ],
    },
    {
      customItems: [
        {
          id: 'group_item',
          categoryId: 'grouped',
          label: 'Collision',
          custom: true,
        },
      ],
    },
  ])(
    'rejects imported catalog identity collisions without replacing existing work: %j',
    async (collision) => {
      await start();
      control('#cb-allgemeine-abgabe').click();
      await vi.advanceTimersByTimeAsync(300);
      const before = entries.get('bbk:config');
      const imported = { ...saved(), selectedItems: [], ...collision };
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(
        function (this: HTMLInputElement) {
          Object.defineProperty(this, 'files', {
            value: [{ size: 1000, text: async () => JSON.stringify(imported) }],
          });
          this.dispatchEvent(new Event('change'));
        }
      );
      control('#config-load').click();
      await vi.advanceTimersByTimeAsync(300);
      expect(entries.get('bbk:config')).toBe(before);
      expect(control<HTMLInputElement>('#cb-allgemeine-abgabe').checked).toBe(
        true
      );
      expect(document.querySelectorAll('#acc-allgemeine')).toHaveLength(1);
    }
  );
});
