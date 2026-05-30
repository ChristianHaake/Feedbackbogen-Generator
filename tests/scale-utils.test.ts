import { describe, it, expect } from 'vitest';

import { normalizeScaleValue, scaleDisplay } from '@/scale-utils';

describe('scale utils', () => {
  it('verbal scale', () => {
    const s: any = { id: 'v', label: 'Dreistufig verbal', kind: 'verbal', labels: ['a', 'b', 'c'] };
    expect(normalizeScaleValue(s)).toBe('a | b | c');
    expect(scaleDisplay(s)).toBe('Dreistufig verbal');
  });
  it('numeric scale', () => {
    const s: any = { id: 'n', label: 'Punkte', kind: 'numeric', min: 0, max: 10 };
    expect(normalizeScaleValue(s)).toBe('0–10');
  });
  it('symbol scale', () => {
    const s: any = { id: 'e', label: 'Symbole', kind: 'symbol', set: ['😀','😐','☹️'] };
    expect(normalizeScaleValue(s)).toContain('😀');
  });
  it('traffic scale', () => {
    const s: any = { id: 't', label: 'Ampel', kind: 'traffic', colors: ['#2e7d32','#fbc02d','#c62828'] };
    expect(normalizeScaleValue(s)).toBe('Grün / Gelb / Rot');
  });
  it('percent scale', () => {
    const s: any = { id: 'p', label: 'Prozent', kind: 'percent' };
    expect(normalizeScaleValue(s)).toBe('0–100%');
  });
});
