import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const script = resolve('scripts/generate-formats.mjs');

describe('product format generator', () => {
  afterEach(() => {
    temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  });

  it('rejects collisions between generated criterion ids', () => {
    const directory = mkdtempSync(join(tmpdir(), 'feedback-formats-'));
    temporaryDirectories.push(directory);
    const source = join(directory, 'format.yaml');
    const output = join(directory, 'format.json');
    writeFileSync(source, `
version: 1
groups:
  - id: gruppe
    title: Gruppe
    formats:
      - id: format
        title: Format
        criteria:
          - label: Qualität
          - label: Qualität
`);

    const result = spawnSync(process.execPath, [script, '--source', source, '--output', output], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/ID-Kollision bei "qualitat"/);
  });
});
