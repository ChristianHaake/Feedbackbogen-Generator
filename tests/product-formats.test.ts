import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadProductFormats } from '@/product-formats';

describe('product formats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns an empty catalog and reports a load failure when product formats cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 }))
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(loadProductFormats('/')).resolves.toEqual({ groups: [] });
    expect(console.error).toHaveBeenCalledWith(
      'Failed to load product formats, disabling product-format catalog',
      expect.any(Error)
    );
  });
});
