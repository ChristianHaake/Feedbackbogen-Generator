import type { Scale } from './types';

export function scaleDisplay(scale: Scale): string {
  return scale.label;
}

export function normalizeScaleValue(scale: Scale): string {
  switch (scale.kind) {
    case 'verbal':
      return scale.labels.join(' | ');
    case 'numeric':
      return `${scale.min}–${scale.max}`;
    case 'symbol':
      return scale.set.join(' ');
    case 'traffic':
      return 'Grün / Gelb / Rot';
    case 'percent':
      return '0–100%';
  }
}
