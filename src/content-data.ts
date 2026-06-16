import { announce } from './a11y';
import { currentLanguage, strings } from './strings';
import type { Category, CustomItem, Item, Scale } from './types';

export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 'allgemeine',
    title: 'Allgemeine Bewertungskriterien',
    items: [
      { id: 'abgabe', label: 'Abgabe termingerecht', description: 'Liegt die Leistung fristgerecht vor?' },
      { id: 'vollstaendigkeit', label: 'Vollständigkeit', description: 'Sind alle geforderten Teile vorhanden?' }
    ]
  }
];

export const FALLBACK_SCALES: Scale[] = [
  {
    id: 'verbal_5',
    label: 'Zustimmungsskala (5 Stufen)',
    kind: 'verbal',
    labels: ['trifft voll zu', 'trifft eher zu', 'teils/teils', 'trifft eher nicht zu', 'trifft nicht zu']
  },
  {
    id: 'punkte_10',
    label: 'Punktebewertung',
    kind: 'numeric',
    defaultMin: 0,
    defaultMax: 10,
    minLimit: 0,
    maxLimit: 20,
    maxSteps: 11
  },
  { id: 'ascii_3', label: 'ASCII-Feedback (3 Stufen)', kind: 'symbol', set: [':(', ':/', ':)'] },
  { id: 'ampel', label: 'Ampelbewertung', kind: 'traffic', colors: ['#2e7d32', '#fbc02d', '#c62828'] },
  { id: 'prozent', label: 'Prozentbewertung', kind: 'percent' }
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validateItem(value: unknown): value is Item {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.label)) return false;
  return value.description === undefined || typeof value.description === 'string';
}

export function validateCategories(value: unknown): value is Category[] {
  if (!Array.isArray(value)) return false;
  const categoryIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const category of value) {
    if (!isObject(category)) return false;
    if (!isNonEmptyString(category.id) || !isNonEmptyString(category.title)) return false;
    if (category.description !== undefined && typeof category.description !== 'string') return false;
    if (categoryIds.has(category.id)) return false;
    categoryIds.add(category.id);

    if (Array.isArray(category.items)) {
      for (const item of category.items) {
        if (!validateItem(item) || itemIds.has(item.id)) return false;
        itemIds.add(item.id);
      }
    } else if (Array.isArray(category.groups)) {
      const groupIds = new Set<string>();
      for (const group of category.groups) {
        if (!isObject(group)) return false;
        if (!isNonEmptyString(group.id) || !isNonEmptyString(group.title) || !Array.isArray(group.items)) return false;
        if (groupIds.has(group.id)) return false;
        groupIds.add(group.id);
        for (const item of group.items) {
          if (!validateItem(item) || itemIds.has(item.id)) return false;
          itemIds.add(item.id);
        }
      }
    } else {
      return false;
    }
  }

  return true;
}

export function validateScales(value: unknown): value is Scale[] {
  if (!Array.isArray(value)) return false;
  const scaleIds = new Set<string>();

  for (const scale of value) {
    if (!isObject(scale)) return false;
    if (!isNonEmptyString(scale.id) || !isNonEmptyString(scale.label) || !isNonEmptyString(scale.kind)) return false;
    if (scaleIds.has(scale.id)) return false;
    scaleIds.add(scale.id);

    switch (scale.kind) {
      case 'verbal':
        if (!Array.isArray(scale.labels) || scale.labels.length === 0 || !scale.labels.every(isNonEmptyString)) return false;
        break;
      case 'numeric':
        if (
          typeof scale.defaultMin !== 'number' ||
          typeof scale.defaultMax !== 'number' ||
          typeof scale.minLimit !== 'number' ||
          typeof scale.maxLimit !== 'number' ||
          !Number.isInteger(scale.maxSteps)
        ) return false;
        {
          const defaultMin = scale.defaultMin as number;
          const defaultMax = scale.defaultMax as number;
          const minLimit = scale.minLimit as number;
          const maxLimit = scale.maxLimit as number;
          const maxSteps = scale.maxSteps as number;
          if (
            maxSteps < 2 ||
            minLimit > defaultMin ||
            defaultMin >= defaultMax ||
            defaultMax > maxLimit ||
            defaultMax - defaultMin + 1 > maxSteps
          ) return false;
        }
        break;
      case 'symbol':
        if (!Array.isArray(scale.set) || scale.set.length === 0 || !scale.set.every(isNonEmptyString)) return false;
        break;
      case 'traffic':
        if (!Array.isArray(scale.colors) || scale.colors.length === 0 || !scale.colors.every(isNonEmptyString)) return false;
        break;
      case 'percent':
        break;
      default:
        return false;
    }
  }

  return true;
}

async function loadJson<T>(
  url: string,
  validate: (value: unknown) => value is T,
  fallback: T,
  label: string
): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const parsed = await res.json();
    if (!validate(parsed)) throw new Error('invalid shape');
    return parsed;
  } catch (err) {
    console.error(`Failed to load ${label}, using fallback`, err);
    announce(strings.messages.contentLoadError);
    return fallback;
  }
}

export function loadCategories(baseUrl: string): Promise<Category[]> {
  return loadJson(baseUrl + `content/${currentLanguage}/categories.json`, validateCategories, FALLBACK_CATEGORIES, 'categories');
}

export function loadScales(baseUrl: string): Promise<Scale[]> {
  return loadJson(baseUrl + `content/${currentLanguage}/scales.json`, validateScales, FALLBACK_SCALES, 'scales');
}

export function getAllItemsFromCategory(category: Category): Item[] {
  if (Array.isArray(category.items)) return category.items;
  if (Array.isArray(category.groups)) return category.groups.flatMap((group) => group.items);
  return [];
}

export function findItemInCategory(category: Category, itemId: string): Item | null {
  return getAllItemsFromCategory(category).find((item) => item.id === itemId) ?? null;
}

export function findItemById(categories: Category[], id: string) {
  for (const category of categories) {
    const item = findItemInCategory(category, id);
    if (item) return { category, item } as const;
  }
  return null;
}

export function buildCategoriesWithCustom(categories: Category[], customItems: CustomItem[]): Category[] {
  return categories.map((category) => {
    const customs = customItems.filter((item) => item.categoryId === category.id);
    if (customs.length === 0) return category;
    const plainItems: Item[] = customs.map(({ categoryId: _categoryId, custom: _custom, ...item }) => item);
    if (Array.isArray(category.groups)) {
      return { ...category, groups: [...category.groups, { id: `${category.id}__custom`, title: 'Eigene Kriterien', items: plainItems }] };
    }
    return { ...category, items: [...(category.items ?? []), ...plainItems] };
  });
}

export function scaleById(scales: Scale[], id: string) {
  return scales.find((scale) => scale.id === id) ?? null;
}
