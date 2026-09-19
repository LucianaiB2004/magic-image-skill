import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { tempDir } from './helpers.mjs';
import { createDemo } from '../scripts/create-demo.mjs';

test('default demo composes the bundled calm-to-storm AI case without network access', async () => {
  const outDir = path.join(await tempDir(), 'demo');
  const report = await createDemo({ outDir });
  assert.equal(report.mode, 'layers');
  assert.equal(report.numericPass, true);
  assert.equal(report.processing.caseName, 'calm-to-storm');
  await access(path.join(outDir, 'calm-to-storm.png'));
  await access(path.join(outDir, 'preview.html'));
});
