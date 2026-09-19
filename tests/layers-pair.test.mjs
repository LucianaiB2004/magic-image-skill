import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, access } from 'node:fs/promises';
import { tempDir, solidImage, rawPng, rawRgbPng } from './helpers.mjs';
import { createLayers } from '../src/layers.mjs';
import { createPair } from '../src/pair.mjs';

test('layers creates the complete deliverable set and valid report', async () => {
  const root = await tempDir();
  const pixels = Buffer.alloc(4 * 4 * 3, 255); pixels.set([220,220,220], 0);
  const foreground = await rawRgbPng(path.join(root,'fg.png'), 4, 4, pixels);
  const hidden = await solidImage(path.join(root,'hidden.png'), 4, 4, 3, {r:180,g:180,b:180});
  const outDir = path.join(root, 'out');
  const report = await createLayers({ foreground, hidden, outDir, name: 'result' });
  for (const file of ['result.png','preview-white.png','preview-gray.png','preview-black.png','comparison.png','preview.html','validation.json']) await access(path.join(outDir,file));
  assert.equal(report.numericPass, true); assert.equal(report.mode, 'layers'); assert.match(report.sha256, /^[a-f0-9]{64}$/);
  assert.ok(report.whiteAppearanceError.maxAbsoluteError <= 1);
});

test('foreground source alpha is honored', async () => {
  const root = await tempDir();
  const foreground = await rawPng(path.join(root,'fg.png'), 1, 1, [40,50,60,64]);
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  const report = await createLayers({ foreground, hidden, outDir:path.join(root,'out'), name:'alpha' });
  assert.equal(report.processing.foregroundOpacitySource, 'alpha');
});

test('foreground without alpha uses automatic ink estimation', async () => {
  const root = await tempDir();
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:100,g:120,b:130});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  const report = await createLayers({ foreground, hidden, outDir:path.join(root,'out'), name:'ink' });
  assert.equal(report.processing.foregroundOpacitySource, 'estimated-ink');
});

test('foreground mask takes precedence and includes its alpha', async () => {
  const root = await tempDir();
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:80,g:80,b:80});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  const mask = await rawPng(path.join(root,'m.png'), 1, 1, [255,255,255,128]);
  const report = await createLayers({ foreground, hidden, foregroundMask:mask, outDir:path.join(root,'out'), name:'mask' });
  assert.equal(report.processing.foregroundOpacitySource, 'mask');
});

test('all-black hidden layer is rejected', async () => {
  const root = await tempDir();
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:100,g:100,b:100});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:0,g:0,b:0});
  await assert.rejects(() => createLayers({ foreground, hidden, outDir:path.join(root,'out'), name:'bad' }), /no usable bright content/i);
});

test('pair reports incompatibility metrics and black appearance error', async () => {
  const root = await tempDir();
  const surface = await solidImage(path.join(root,'w.png'), 2, 2, 3, {r:220,g:200,b:180});
  const revealed = await solidImage(path.join(root,'k.png'), 2, 2, 3, {r:30,g:100,b:10});
  const report = await createPair({ surface, revealed, outDir:path.join(root,'out'), name:'pair' });
  assert.equal(report.mode, 'pair'); assert.ok(report.processing.nonNeutralDeltaPixels > 0);
  assert.ok(report.blackAppearanceError.meanAbsoluteError >= 0);
});

test('existing outputs are never overwritten', async () => {
  const root = await tempDir(); const outDir = path.join(root,'out');
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:100,g:100,b:100});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  await createLayers({foreground,hidden,outDir,name:'same'});
  await assert.rejects(() => createLayers({foreground,hidden,outDir,name:'same'}), /already exists/i);
});

test('preview HTML embeds one final PNG and never switches img src', async () => {
  const root = await tempDir(); const outDir = path.join(root,'out');
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:100,g:100,b:100});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  await createLayers({foreground,hidden,outDir,name:'html'});
  const html = await readFile(path.join(outDir,'preview.html'),'utf8');
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.equal(/\.src\s*=|setAttribute\(\s*['\"]src/i.test(html), false);
  assert.match(html, /data:image\/png;base64/);
});

test('clicking the same preview image toggles an enlarged dark-background reveal', async () => {
  const root = await tempDir(); const outDir = path.join(root,'out');
  const foreground = await solidImage(path.join(root,'fg.png'), 1, 1, 3, {r:100,g:100,b:100});
  const hidden = await solidImage(path.join(root,'h.png'), 1, 1, 3, {r:255,g:255,b:255});
  await createLayers({foreground,hidden,outDir,name:'click'});
  const html = await readFile(path.join(outDir,'preview.html'),'utf8');
  assert.match(html, /stage\.addEventListener\(['"]click['"]/);
  assert.match(html, /classList\.toggle\(['"]expanded['"]\)/);
  assert.match(html, /expanded\s*\?\s*['"]#000000['"]\s*:\s*['"]#ffffff['"]/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
});
