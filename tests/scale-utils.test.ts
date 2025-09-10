import { describe, it, expect } from 'vitest';
import { normalizeScaleValue, scaleDisplay } from '@/scale-utils';

describe('scale utils', () => {
  it('verbal scale', () => {
    const s: any = { id: 'v', kind: 'verbal', labels: ['a', 'b', 'c'] };
    expect(normalizeScaleValue(s)).toBe('a | b | c');
    expect(scaleDisplay(s)).toMatch(/Verbal/);
  });
  it('numeric scale', () => {
    const s: any = { id: 'n', kind: 'numeric', min: 0, max: 10 };
    expect(normalizeScaleValue(s)).toBe('0–10');
  });
  it('emoji scale', () => {
    const s: any = { id: 'e', kind: 'emoji', set: ['😀','😐','☹️'] };
    expect(normalizeScaleValue(s)).toContain('😀');
  });
  it('traffic scale', () => {
    const s: any = { id: 't', kind: 'traffic', colors: ['#2e7d32','#fbc02d','#c62828'] };
    expect(normalizeScaleValue(s)).toBe('Grün / Gelb / Rot');
  });
  it('percent scale', () => {
    const s: any = { id: 'p', kind: 'percent' };
    expect(normalizeScaleValue(s)).toBe('0–100%');
  });
});

