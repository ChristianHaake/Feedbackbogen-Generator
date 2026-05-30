import type { Category, SelectedItemRef } from './types';

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function swapOrder(order: string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId) return [...order];
  const next = [...order];
  const draggedIndex = next.indexOf(draggedId);
  const targetIndex = next.indexOf(targetId);
  if (draggedIndex === -1 || targetIndex === -1) return next;
  [next[draggedIndex], next[targetIndex]] = [next[targetIndex], next[draggedIndex]];
  return next;
}

export function mergeOrder(order: string[], ids: string[]): string[] {
  const available = new Set(ids);
  return [...order.filter((id) => available.has(id)), ...ids.filter((id) => !order.includes(id))];
}

export function categoryOrderFromSelection(selectedItems: SelectedItemRef[]): string[] {
  return uniqueStrings(selectedItems.map((item) => item.categoryId));
}

export function itemOrderFromSelection(selectedItems: SelectedItemRef[]): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  selectedItems.forEach(({ categoryId, itemId }) => {
    order[categoryId] ??= [];
    if (!order[categoryId].includes(itemId)) order[categoryId].push(itemId);
  });
  return order;
}

export function orderCategories(categories: Category[], order: string[]): Category[] {
  const index = new Map(order.map((id, position) => [id, position]));
  return categories
    .map((category, originalIndex) => ({ category, originalIndex }))
    .sort((left, right) => {
      const leftIndex = index.get(left.category.id);
      const rightIndex = index.get(right.category.id);
      if (leftIndex === undefined && rightIndex === undefined) return left.originalIndex - right.originalIndex;
      if (leftIndex === undefined) return 1;
      if (rightIndex === undefined) return -1;
      return leftIndex - rightIndex;
    })
    .map(({ category }) => category);
}

export function orderByIds<T extends { id: string }>(items: T[], order: string[]): T[] {
  const index = new Map(order.map((id, position) => [id, position]));
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => {
      const leftIndex = index.get(left.item.id);
      const rightIndex = index.get(right.item.id);
      if (leftIndex === undefined && rightIndex === undefined) return left.originalIndex - right.originalIndex;
      if (leftIndex === undefined) return 1;
      if (rightIndex === undefined) return -1;
      return leftIndex - rightIndex;
    })
    .map(({ item }) => item);
}
