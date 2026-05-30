import { describe, it, expect } from 'vitest';

import {
  applyNumericScaleSettings, normalizeScaleValue, numericScaleBounds, sanitizeNumericScaleSettings, scaleDisplay,
  scaleOptionLabels
} from '@/scale-utils';

describe('scale utils', () => {
  it('verbal scale', () => {
    const s: any = { id: 'v', label: 'Dreistufig verbal', kind: 'verbal', labels: ['a', 'b', 'c'] };
    expect(normalizeScaleValue(s)).toBe('a | b | c');
    expect(scaleDisplay(s)).toBe('Dreistufig verbal');
  });
  it('numeric scale', () => {
    const s: any = {
      id: 'n',
      label: 'Punkte',
      kind: 'numeric',
      defaultMin: 0,
      defaultMax: 10,
      minLimit: 0,
      maxLimit: 20,
      maxSteps: 11
    };
    expect(normalizeScaleValue(s)).toBe('0–10');
    expect(scaleOptionLabels(applyNumericScaleSettings(s, { min: 5, max: 15 })!)).toEqual([
      '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'
    ]);
    expect(numericScaleBounds(applyNumericScaleSettings(s, { min: 0, max: 20 }) as any)).toEqual({ min: 0, max: 10 });
    expect(sanitizeNumericScaleSettings(s, { min: 0, max: 99 }, 'max')).toEqual({ min: 10, max: 20 });
    expect(sanitizeNumericScaleSettings(s, { min: 99, max: 10 }, 'min')).toEqual({ min: 19, max: 20 });
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
