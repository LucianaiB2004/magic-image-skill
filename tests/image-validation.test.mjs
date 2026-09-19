import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { tempDir, solidImage, rawPng } from './helpers.mjs';
import { readImage, alignSecondary } from '../src/image.mjs';
import { inspectImage } from '../src/inspect.mjs';

test('readImage detects source alpha and normalizes to RGBA', async () => {
  const dir = await tempDir(); const file = path.join(dir, 'a.png');
  await rawPng(file, 1, 1, [1, 2, 3, 64]);
  const image = await readImage(file);
  assert.equal(image.originalHasAlpha, true); assert.equal(image.data.length, 4);
});

test('inspect rejects RGB opaque and fully transparent PNG candidates', async () => {
  const dir = await tempDir();
  const opaque = await solidImage(path.join(dir, 'opaque.png'), 2, 2, 3, { r: 1, g: 2, b: 3 });
  const clear = await solidImage(path.join(dir, 'clear.png'), 2, 2, 4, { r: 0, g: 0, b: 0, alpha: 0 });
  assert.equal((await inspectImage(opaque)).usableMagicImagePNG, false);
  assert.equal((await inspectImage(clear)).usableMagicImagePNG, false);
});

test('inspect accepts visible PNG with usable transparency', async () => {
  const dir = await tempDir(); const file = path.join(dir, 'valid.png');
  await rawPng(file, 2, 1, [255,255,255,0, 10,20,30,128]);
  const result = await inspectImage(file);
  assert.equal(result.usableMagicImagePNG, true); assert.equal(result.alpha.semiTransparent, 1);
});

test('dimension mismatch fails by default and aspect-ratio mismatch fails even with fitting', async () => {
  const dir = await tempDir();
  const a = await readImage(await solidImage(path.join(dir,'a.png'), 10, 10, 3, {r:0,g:0,b:0}));
  const b = await readImage(await solidImage(path.join(dir,'b.png'), 12, 12, 3, {r:0,g:0,b:0}));
  const c = await readImage(await solidImage(path.join(dir,'c.png'), 20, 10, 3, {r:0,g:0,b:0}));
  await assert.rejects(() => alignSecondary(a, b, { fitSecondary: false }), /dimensions differ/i);
  await assert.rejects(() => alignSecondary(a, c, { fitSecondary: true }), /aspect ratio/i);
});

test('fit-secondary contains a nearly identical aspect ratio without distortion', async () => {
  const dir = await tempDir();
  const main = await readImage(await solidImage(path.join(dir,'a.png'), 100, 100, 3, {r:255,g:255,b:255}));
  const secondary = await readImage(await solidImage(path.join(dir,'b.png'), 99, 99, 3, {r:255,g:255,b:255}));
  const fit = await alignSecondary(main, secondary, { fitSecondary: true, background: {r:0,g:0,b:0,alpha:1} });
  assert.equal(fit.width, 100); assert.equal(fit.height, 100);
});

test('animated images are rejected', async () => {
  const dir = await tempDir(); const file = path.join(dir, 'animated.gif');
  const twoFrameGif = '47494638396101000100800000000000ffffff21f904000a0000002c000000000100010000020244010021f904000a0000002c00000000010001000002024401003b';
  await writeFile(file, Buffer.from(twoFrameGif, 'hex'));
  await assert.rejects(() => readImage(file), /animated|multi-page/i);
});
