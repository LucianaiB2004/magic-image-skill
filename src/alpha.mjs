import { byte, clamp } from './utils.mjs';

export function compositePixel(rgb, alpha, background) {
  const a = alpha / 255;
  return rgb.map((channel) => byte(a * channel + (1 - a) * background));
}

export function calculateLayersPixel(white, foregroundOpacity, hiddenOpacity) {
  const f = clamp(foregroundOpacity, 0, 1);
  const h = clamp(hiddenOpacity, 0, 1);
  const maximumResidual = Math.min(...white) / 255;
  const residual = Math.min((1 - f) * (1 - h), maximumResidual);
  const alphaFloat = 1 - residual;
  if (alphaFloat <= Number.EPSILON) return { rgb: [255, 255, 255], alpha: 0 };
  const rgb = white.map((channel) => byte(((channel / 255) - residual) / alphaFloat * 255));
  return { rgb, alpha: byte(alphaFloat * 255) };
}

export function calculatePairPixel(white, black) {
  const deltas = white.map((channel, index) => channel - black[index]);
  const meanDelta = deltas.reduce((sum, value) => sum + value, 0) / 3;
  const d = clamp(Math.round(meanDelta), 0, Math.min(...white));
  const alpha = 255 - d;
  const rgb = alpha === 0 ? [255, 255, 255] : white.map((channel) => byte(255 * (channel - d) / alpha));
  return {
    rgb, alpha,
    negativeMeanDelta: meanDelta < 0,
    nonNeutralDelta: Math.max(...deltas) - Math.min(...deltas) > 1
  };
}

export function compositeBuffer(rgba, background) {
  const result = Buffer.alloc(rgba.length / 4 * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 3) {
    const shown = compositePixel([rgba[source], rgba[source + 1], rgba[source + 2]], rgba[source + 3], background);
    result[target] = shown[0]; result[target + 1] = shown[1]; result[target + 2] = shown[2];
  }
  return result;
}

export function errorMetrics(actual, expected) {
  if (actual.length !== expected.length) throw new Error('Cannot compare buffers with different lengths.');
  let total = 0, maximum = 0;
  for (let index = 0; index < actual.length; index++) {
    const error = Math.abs(actual[index] - expected[index]); total += error; maximum = Math.max(maximum, error);
  }
  return { meanAbsoluteError: actual.length ? total / actual.length : 0, maxAbsoluteError: maximum };
}
