import type { Scale } from './types';

export function scaleDisplay(scale: Scale): string {
  switch (scale.kind) {
    case 'verbal':
      return `Verbal (${scale.labels.length})`;
    case 'numeric':
      return `Punkte (${scale.min}–${scale.max})`;
    case 'emoji':
      return `Emojis (${scale.set.join(' ')})`;
    case 'traffic':
      return `Ampel (${scale.colors.length})`;
    case 'percent':
      return 'Prozent (0–100%)';
  }
}

export function normalizeScaleValue(scale: Scale): string {
  switch (scale.kind) {
    case 'verbal':
      return scale.labels.join(' | ');
    case 'numeric':
      return `${scale.min}–${scale.max}`;
    case 'emoji':
      return scale.set.join(' ');
    case 'traffic':
      return 'Grün / Gelb / Rot';
    case 'percent':
      return '0–100%';
  }
}

