import { scaleOptionLabels } from '@/scale-utils';
import type { ExportRow, Scale } from '@/types';

export type ExportRowGroup = {
  title: string;
  scale: Scale | null;
  items: ExportRow[];
};

export function scaleOptions(scale: Scale | null): string[] {
  return scale ? scaleOptionLabels(scale) : [];
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
