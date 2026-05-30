import type { ExportRow, Scale } from '@/types';

export type ExportRowGroup = {
  title: string;
  scale: Scale | null;
  items: ExportRow[];
};

export function scaleOptions(scale: Scale | null): string[] {
  if (!scale) return [];
  switch (scale.kind) {
    case 'verbal':
      return scale.labels;
    case 'numeric':
      return Array.from({ length: scale.max - scale.min + 1 }, (_, index) => String(scale.min + index));
    case 'symbol':
      return scale.set;
    case 'traffic':
      return ['Grün', 'Gelb', 'Rot'];
    case 'percent':
      return ['0 %', '25 %', '50 %', '75 %', '100 %'];
  }
}

export function scaleLabel(scale: Scale | null): string {
  const options = scaleOptions(scale);
  return options.join(' | ');
}

export function groupRows(rows: ExportRow[]): ExportRowGroup[] {
  const groups = new Map<string, ExportRowGroup>();
  rows.forEach((row) => {
    if (!groups.has(row.categoryId)) {
      groups.set(row.categoryId, { title: row.category, scale: row.scale, items: [] });
    }
    groups.get(row.categoryId)!.items.push(row);
  });
  return Array.from(groups.values());
}

export function downloadBlob(blob: Blob, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
