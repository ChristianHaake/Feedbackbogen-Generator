import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const deepmerge = createRequire(
  path.resolve(process.cwd(), 'node_modules/@rollup/plugin-node-resolve/package.json'),
)('deepmerge') as (target: object, source: object) => object;

describe('patched deepmerge dependency', () => {
  it('keeps __proto__ as an own property without polluting Object.prototype', () => {
    const source = JSON.parse('{"__proto__":{"polluted":true}}');
    const merged = deepmerge(Object.create(null), source);

    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Object.prototype.hasOwnProperty.call(merged, '__proto__')).toBe(true);
  });
});
