import { scaleOptionLabels } from '@/scale-utils';
import type { ExportRow, Scale } from '@/types';

export type ExportRowGroup = {
  title: string;
  scale: Scale | null;
  items: ExportRow[];
  weight?: number;
};

export type WeightedScoreSummary = {
  groups: { title: string; weight: number }[];
  totalWeight: number;
};

// Section heading text with an optional weight badge, e.g. "Sachebene — 40 %".
export function categoryHeadingText(title: string, weight?: number): string {
  return weight ? `${title} — ${Math.round(weight)} %` : title;
}

export function weightedScoreSummary(
  rows: ExportRow[]
): WeightedScoreSummary | null {
  const groups = groupRows(rows)
    .filter((group) => group.weight != null && group.weight > 0)
    .map((group) => ({
      title: group.title,
      weight: Math.round(group.weight ?? 0),
    }));
  if (groups.length === 0) return null;
  return {
    groups,
    totalWeight: groups.reduce((sum, group) => sum + group.weight, 0),
  };
}

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
      groups.set(row.categoryId, { title: row.category, scale: row.scale, items: [], weight: row.weight });
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
