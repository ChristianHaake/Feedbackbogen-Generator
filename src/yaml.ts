import YAML from 'yaml';
import type { YAMLData, Category, Scale } from './types';
import { announce } from './a11y';

export const DEMO_YAML: YAMLData = {
  version: 1,
  categories: [
    {
      id: 'allgemeine',
      title: 'Allgemeine Bewertungskriterien',
      items: [
        { id: 'abgabe', label: 'Abgabe termingerecht', description: 'Liegt die Leistung fristgerecht vor?' },
        { id: 'vollstaendigkeit', label: 'Vollständigkeit', description: 'Sind alle geforderten Teile vorhanden?' }
      ]
    },
    {
      id: 'produktebene',
      title: 'Produktebene',
      items: [
        { id: 'funktion', label: 'Funktionalität', description: 'Erfüllt das Produkt seine Aufgabe?' },
        { id: 'gestaltung', label: 'Gestaltung', description: 'Ist die Gestaltung ansprechend und konsistent?' }
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
  if (!obj || obj.version !== 1) return false;
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
      return false; // needs items or groups
    }
  }
  const scaleIds = new Set<string>();
  for (const s of obj.scales) {
    if (typeof s.id !== 'string' || typeof s.kind !== 'string') return false;
    if (scaleIds.has(s.id)) return false;
    scaleIds.add(s.id);
    switch (s.kind) {
      case 'verbal':
        if (!Array.isArray((s as any).labels)) return false;
        break;
      case 'numeric':
        if (typeof (s as any).min !== 'number' || typeof (s as any).max !== 'number') return false;
        break;
      case 'emoji':
        if (!Array.isArray((s as any).set)) return false;
        break;
      case 'traffic':
        if (!Array.isArray((s as any).colors)) return false;
        break;
      case 'percent':
        break;
      default:
        return false;
    }
  }
  return true;
}

export async function loadYAML(baseUrl: string): Promise<YAMLData> {
  try {
    const url = baseUrl + 'content/items.yaml';
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const text = await res.text();
    const parsed = YAML.parse(text);
    if (!validateYAML(parsed)) throw new Error('invalid');
    announce('YAML geladen.');
    return parsed as YAMLData;
  } catch (e) {
    announce('Fehler beim Laden/Validieren von YAML. Fallback aktiviert.');
    return DEMO_YAML;
  }
}

export function findItemById(categories: Category[], id: string) {
  for (const c of categories) {
    const found = c.items.find((i) => i.id === id);
    if (found) return { category: c, item: found } as const;
  }
  return null;
}

export function scaleById(scales: Scale[], id: string) {
  return scales.find((s) => s.id === id) || null;
}
