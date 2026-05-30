import { describe, expect, it } from 'vitest';

import {
  categoryOrderFromSelection, itemOrderFromSelection, mergeOrder, orderByIds, orderCategories, swapOrder
} from '@/config-order';

describe('config order', () => {
  it('derives category and item order from the selection', () => {
    const selected = [
      { categoryId: 'b', itemId: 'b2' },
      { categoryId: 'a', itemId: 'a1' },
      { categoryId: 'b', itemId: 'b1' }
    ];

    expect(categoryOrderFromSelection(selected)).toEqual(['b', 'a']);
    expect(itemOrderFromSelection(selected)).toEqual({ b: ['b2', 'b1'], a: ['a1'] });
  });

  it('swaps two ids while preserving unrelated ids', () => {
    expect(swapOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['c', 'b', 'a']);
    expect(swapOrder(['a', 'b'], 'a', 'missing')).toEqual(['a', 'b']);
  });

  it('merges active ids into a persisted order', () => {
    expect(mergeOrder(['b', 'removed'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('orders categories and criteria while retaining source order for unknown ids', () => {
    const categories = [
      { id: 'a', title: 'A', items: [] },
      { id: 'b', title: 'B', items: [] },
      { id: 'c', title: 'C', items: [] }
    ];
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    expect(orderCategories(categories, ['c', 'a']).map((category) => category.id)).toEqual(['c', 'a', 'b']);
    expect(orderByIds(items, ['b']).map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });
});
