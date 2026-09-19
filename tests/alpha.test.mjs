import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLayersPixel, calculatePairPixel, compositePixel, errorMetrics } from '../src/alpha.mjs';

test('layers math reconstructs supplied white appearance within one level', () => {
  const p = calculateLayersPixel([80, 100, 120], 0.75, 0.4);
  const shown = compositePixel(p.rgb, p.alpha, 255);
  assert.deepEqual(shown, [80, 100, 120]);
});

test('layers math reveals content on black background', () => {
  const p = calculateLayersPixel([180, 180, 180], 0.3, 0.8);
  const black = compositePixel(p.rgb, p.alpha, 0);
  assert.ok(black.every((value) => value > 80));
});

test('pair math prioritizes white target and reports shared-alpha approximation', () => {
  const p = calculatePairPixel([200, 190, 180], [100, 80, 90]);
  assert.ok(compositePixel(p.rgb, p.alpha, 255).every((v, i) => Math.abs(v - [200,190,180][i]) <= 1));
  assert.equal(p.nonNeutralDelta, true);
});

test('error metrics returns mean and maximum absolute channel errors', () => {
  assert.deepEqual(errorMetrics(Buffer.from([1, 2, 3]), Buffer.from([2, 4, 6])), { meanAbsoluteError: 2, maxAbsoluteError: 3 });
});
