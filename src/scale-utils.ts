import type { NumericScale, NumericScaleSettings, Scale } from './types';

export function scaleDisplay(scale: Scale): string {
  return scale.label;
}

export function normalizeScaleValue(scale: Scale): string {
  switch (scale.kind) {
    case 'verbal':
      return scale.labels.join(' | ');
    case 'numeric':
      return numericScaleLabel(scale);
    case 'symbol':
      return scale.set.join(' ');
    case 'traffic':
      return 'Grün / Gelb / Rot';
    case 'percent':
      return '0–100%';
  }
}

export function numericScaleBounds(scale: NumericScale): NumericScaleSettings {
  return {
    min: scale.min ?? scale.defaultMin,
    max: scale.max ?? scale.defaultMax
  };
}

export function numericScaleLabel(scale: NumericScale): string {
  const { min, max } = numericScaleBounds(scale);
  return `${min}–${max}`;
}

export function scaleOptionLabels(scale: Scale): string[] {
  switch (scale.kind) {
    case 'verbal': return scale.labels;
    case 'numeric': {
      const { min, max } = numericScaleBounds(scale);
      const out: string[] = [];
      for (let value = min; value <= max; value++) out.push(String(value));
      return out;
    }
    case 'symbol': return scale.set;
    case 'traffic': return ['Grün', 'Gelb', 'Rot'];
    case 'percent': return ['0 %', '25 %', '50 %', '75 %', '100 %'];
  }
}

export function sanitizeNumericScaleSettings(
  scale: NumericScale,
  value: Partial<NumericScaleSettings> | null | undefined,
  anchor: 'min' | 'max' = 'min'
): NumericScaleSettings {
  const fallback = numericScaleBounds(scale);
  let min = integerOr(value?.min, fallback.min);
  let max = integerOr(value?.max, fallback.max);

  min = clamp(min, scale.minLimit, scale.maxLimit);
  max = clamp(max, scale.minLimit, scale.maxLimit);
  if (min >= max && anchor === 'max') min = Math.max(scale.minLimit, max - 1);
  if (min >= max) max = Math.min(scale.maxLimit, min + 1);
  if (min >= max) min = Math.max(scale.minLimit, max - 1);

  if (max - min + 1 > scale.maxSteps && anchor === 'max') {
    min = Math.max(scale.minLimit, max - scale.maxSteps + 1);
  }
  if (max - min + 1 > scale.maxSteps) {
    max = Math.min(scale.maxLimit, min + scale.maxSteps - 1);
  }
  if (max - min + 1 > scale.maxSteps) {
    min = Math.max(scale.minLimit, max - scale.maxSteps + 1);
  }

  return { min, max };
}

export function applyNumericScaleSettings(scale: Scale | null, settings?: NumericScaleSettings): Scale | null {
  if (!scale || scale.kind !== 'numeric') return scale;
  return { ...scale, ...sanitizeNumericScaleSettings(scale, settings) };
}

function integerOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
