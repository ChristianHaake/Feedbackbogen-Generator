import { describe, it, expect } from 'vitest';
import { validateYAML, DEMO_YAML } from '@/yaml';

describe('YAML validation', () => {
  it('accepts valid demo yaml', () => {
    expect(validateYAML(DEMO_YAML)).toBe(true);
  });

  it('rejects invalid yaml', () => {
    const invalid: any = { version: 2 };
    expect(validateYAML(invalid)).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const dup: any = {
      version: 1,
      categories: [
        { id: 'a', title: 'A', items: [{ id: 'x', label: 'X' }] },
        { id: 'a', title: 'B', items: [{ id: 'y', label: 'Y' }] }
      ],
      scales: [
        { id: 's', kind: 'percent' },
        { id: 's', kind: 'percent' }
      ]
    };
    expect(validateYAML(dup)).toBe(false);
  });
});
