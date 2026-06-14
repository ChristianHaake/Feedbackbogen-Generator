import type { Category, ProductFormat, ProductFormatData, ProductFormatGroup } from './types';

export function productFormatCategoryId(formatId: string): string {
  return formatId;
}

export function findProductFormat(data: ProductFormatData, categoryId: string): { group: ProductFormatGroup; format: ProductFormat } | null {
  for (const group of data.groups) {
    for (const format of group.formats) {
      if (productFormatCategoryId(format.id) === categoryId) return { group, format };
    }
  }
  return null;
}

export function productFormatToCategory(group: ProductFormatGroup, format: ProductFormat): Category {
  return {
    id: productFormatCategoryId(format.id),
    title: format.title,
    description: group.title,
    items: format.criteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      description: criterion.description
    }))
  };
}

export function selectedProductFormatCategories(data: ProductFormatData, selectedIds: string[]): Category[] {
  const selectedSet = new Set(selectedIds);
  const out: Category[] = [];
  data.groups.forEach((group) => {
    group.formats.forEach((format) => {
      const categoryId = productFormatCategoryId(format.id);
      if (selectedSet.has(categoryId)) out.push(productFormatToCategory(group, format));
    });
  });
  return out;
}

export function validateProductFormats(value: unknown): value is ProductFormatData {
  if (!value || typeof value !== 'object') return false;
  const data = value as ProductFormatData;
  if (!Array.isArray(data.groups)) return false;
  const groupIds = new Set<string>();
  const categoryIds = new Set<string>();

  for (const group of data.groups) {
    if (typeof group.id !== 'string' || typeof group.title !== 'string' || !Array.isArray(group.formats)) return false;
    if (groupIds.has(group.id)) return false;
    groupIds.add(group.id);

    const formatIds = new Set<string>();
    for (const format of group.formats) {
      if (typeof format.id !== 'string' || typeof format.title !== 'string' || !Array.isArray(format.criteria)) return false;
      if (formatIds.has(format.id)) return false;
      formatIds.add(format.id);

      const categoryId = productFormatCategoryId(format.id);
      if (categoryIds.has(categoryId)) return false;
      categoryIds.add(categoryId);

      const criterionIds = new Set<string>();
      for (const criterion of format.criteria) {
        if (typeof criterion.id !== 'string' || typeof criterion.label !== 'string') return false;
        if (criterion.description !== undefined && typeof criterion.description !== 'string') return false;
        if (criterionIds.has(criterion.id)) return false;
        criterionIds.add(criterion.id);
      }
    }
  }

  return true;
}

export async function loadProductFormats(baseUrl: string): Promise<ProductFormatData> {
  try {
    const res = await fetch(baseUrl + 'content/product-formats.json');
    if (!res.ok) throw new Error('fetch failed');
    const parsed = await res.json();
    if (!validateProductFormats(parsed)) throw new Error('invalid');
    return parsed;
  } catch {
    return { groups: [] };
  }
}
