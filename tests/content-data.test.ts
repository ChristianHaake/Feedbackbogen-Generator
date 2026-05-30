import { describe, expect, it } from 'vitest';

import {
  FALLBACK_CATEGORIES, FALLBACK_SCALES, validateCategories, validateScales
} from '@/content-data';

describe('content data validation', () => {
  it('accepts valid fallback categories and scales', () => {
    expect(validateCategories(FALLBACK_CATEGORIES)).toBe(true);
    expect(validateScales(FALLBACK_SCALES)).toBe(true);
  });

  it('rejects invalid category data', () => {
    expect(validateCategories({ categories: [] })).toBe(false);
    expect(validateCategories([{ id: 'a', title: 'A' }])).toBe(false);
  });

  it('rejects duplicate ids', () => {
    expect(validateCategories([
      { id: 'a', title: 'A', items: [{ id: 'x', label: 'X' }] },
      { id: 'a', title: 'B', items: [{ id: 'y', label: 'Y' }] }
    ])).toBe(false);

    expect(validateScales([
      { id: 's', label: 'Prozent', kind: 'percent' },
      { id: 's', label: 'Prozent 2', kind: 'percent' }
    ])).toBe(false);
  });

  it('requires scale labels', () => {
    expect(validateScales([{ id: 's', kind: 'percent' }])).toBe(false);
  });
});
