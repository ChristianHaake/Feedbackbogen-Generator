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
});

