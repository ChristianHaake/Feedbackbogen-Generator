import YAML from 'yaml';

import type { YAMLData, Category, Scale, Item, CustomItem } from './types';
import { announce } from './a11y';

export const DEMO_YAML: YAMLData = {
  categories: [
    {
      id: 'allgemeine',
      title: 'Allgemeine Bewertungskriterien',
      items: [
        { id: 'abgabe', label: 'Abgabe termingerecht', description: 'Liegt die Leistung fristgerecht vor?' },
        { id: 'vollstaendigkeit', label: 'Vollständigkeit', description: 'Sind alle geforderten Teile vorhanden?' }
      ]
    }
  ],
  scales: [
    { id: 'verbal_5', kind: 'verbal', labels: ['trifft voll zu', 'trifft eher zu', 'teils/teils', 'trifft eher nicht zu', 'trifft nicht zu'] },
    { id: 'punkte_10', kind: 'numeric', min: 0, max: 10 },
    { id: 'emoji_3', kind: 'emoji', set: ['😀', '😐', '☹️'] },
    { id: 'ampel', kind: 'traffic', colors: ['#2e7d32', '#fbc02d', '#c62828'] },
    { id: 'prozent', kind: 'percent' }
  ]
};

export function validateYAML(obj: any): obj is YAMLData {
  if (!obj || typeof obj !== 'object') return false;
  if (!Array.isArray(obj.categories) || !Array.isArray(obj.scales)) return false;
  const categoryIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const c of obj.categories) {
    if (typeof c.id !== 'string' || typeof c.title !== 'string') return false;
    if (categoryIds.has(c.id)) return false;
    categoryIds.add(c.id);
    if (Array.isArray(c.items)) {
      for (const it of c.items) {
        if (typeof it.id !== 'string' || typeof it.label !== 'string') return false;
        if (itemIds.has(it.id)) return false;
        itemIds.add(it.id);
      }
    } else if (Array.isArray(c.groups)) {
      for (const g of c.groups) {
        if (typeof g.id !== 'string' || typeof g.title !== 'string' || !Array.isArray(g.items)) return false;
        for (const it of g.items) {
          if (typeof it.id !== 'string' || typeof it.label !== 'string') return false;
          if (itemIds.has(it.id)) return false;
          itemIds.add(it.id);
        }
      }
    } else {
      return false;
    }
  }
  const scaleIds = new Set<string>();
  for (const s of obj.scales) {
    if (typeof s.id !== 'string' || typeof s.kind !== 'string') return false;
    if (scaleIds.has(s.id)) return false;
    scaleIds.add(s.id);
    switch (s.kind) {
      case 'verbal': if (!Array.isArray((s as any).labels)) return false; break;
      case 'numeric': if (typeof (s as any).min !== 'number' || typeof (s as any).max !== 'number') return false; break;
      case 'emoji': if (!Array.isArray((s as any).set)) return false; break;
      case 'traffic': if (!Array.isArray((s as any).colors)) return false; break;
      case 'percent': break;
      default: return false;
    }
  }
  return true;
}

export async function loadYAML(): Promise<YAMLData> {
  try {
    const res = await fetch('/content/items.yaml');
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const text = await res.text();
    const parsed = YAML.parse(text);
    if (!validateYAML(parsed)) {
      console.error('Invalid YAML shape:', parsed);
      throw new Error('invalid');
    }
    announce('YAML geladen.');
    return parsed as YAMLData;
  } catch (err) {
    console.error('Failed to init, loading demo', err);
    announce('Fehler beim Laden/Validieren von YAML. Fallback aktiviert.');
    return DEMO_YAML;
  }
}

// Returns all items from a category, flattening groups if needed
export function getAllItemsFromCategory(c: Category): Item[] {
  if (Array.isArray(c.items)) return c.items;
  if (Array.isArray(c.groups)) return c.groups.flatMap((g) => g.items);
  return [];
}

// Finds an item within a single category (searches both items and groups)
export function findItemInCategory(c: Category, itemId: string): Item | null {
  if (Array.isArray(c.items)) {
    const found = c.items.find((i) => i.id === itemId);
    if (found) return found;
  }
  if (Array.isArray(c.groups)) {
    for (const g of c.groups) {
      const found = g.items.find((i) => i.id === itemId);
      if (found) return found;
    }
  }
  return null;
}

// Finds an item across all categories (searches both items and groups)
export function findItemById(categories: Category[], id: string) {
  for (const c of categories) {
    const item = findItemInCategory(c, id);
    if (item) return { category: c, item } as const;
  }
  return null;
}

// Merges custom items into the categories array for rendering and export.
// Group-based categories get a synthetic "Eigene Kriterien" group.
// Item-based categories get custom items appended to their items array.
export function buildCategoriesWithCustom(categories: Category[], customItems: CustomItem[]): Category[] {
  return categories.map((c) => {
    const customs = customItems.filter((ci) => ci.categoryId === c.id);
    if (customs.length === 0) return c;
    const plainItems: Item[] = customs.map(({ categoryId: _c, custom: _x, ...item }) => item);
    if (Array.isArray(c.groups)) {
      return { ...c, groups: [...c.groups, { id: `${c.id}__custom`, title: 'Eigene Kriterien', items: plainItems }] };
    }
    return { ...c, items: [...(c.items ?? []), ...plainItems] };
  });
}

export function scaleById(scales: Scale[], id: string) {
  return scales.find((s) => s.id === id) ?? null;
}
