import path from 'node:path';
import sharp from 'sharp';
import { calculateLayersPixel, errorMetrics } from './alpha.mjs';
import { alignSecondary, readImage, rgbaToRgb } from './image.mjs';
import { createPreviews } from './preview.mjs';
import { buildValidation } from './validation.mjs';
import { clamp, parseNumber, prepareOutput } from './utils.mjs';

function opacityFromMask(mask, pixel) {
  const i = pixel * 4; const luma = 0.2126 * mask.data[i] + 0.7152 * mask.data[i+1] + 0.0722 * mask.data[i+2];
  return luma / 255 * (mask.data[i+3] / 255);
}

export async function createLayers(options) {
  const { foreground, hidden, foregroundMask, outDir, name = 'magic-image', fitSecondary = false } = options;
  const blackPoint = parseNumber(options.blackPoint ?? 8, '--black-point', { min: 0, max: 254 });
  const hiddenGain = parseNumber(options.hiddenGain ?? 1, '--hidden-gain', { min: 0.01, max: 4 });
  const foregroundSolidAt = parseNumber(options.foregroundSolidAt ?? 32, '--foreground-solid-at', { min: 1, max: 255 });
  const gray = parseNumber(options.gray ?? 80, '--gray', { min: 0, max: 255 });
  const absoluteOut = await prepareOutput(outDir, name);
  const fg = await readImage(foreground);
  const alignedHidden = await alignSecondary(fg, await readImage(hidden), { fitSecondary, background: {r:0,g:0,b:0,alpha:1} });
  const mask = foregroundMask ? await alignSecondary(fg, await readImage(foregroundMask), { fitSecondary, background:{r:0,g:0,b:0,alpha:1} }) : null;
  const targetWhite = rgbaToRgb(fg); const output = Buffer.alloc(fg.width * fg.height * 4);
  const opacitySource = mask ? 'mask' : fg.originalHasAlpha ? 'alpha' : 'estimated-ink';
  let brightPixels = 0;
  for (let pixel = 0; pixel < fg.width * fg.height; pixel++) {
    const fi = pixel * 4, wi = pixel * 3;
    let f;
    if (mask) f = opacityFromMask(mask, pixel);
    else if (fg.originalHasAlpha) f = fg.data[fi + 3] / 255;
    else f = clamp((255 - Math.min(fg.data[fi], fg.data[fi+1], fg.data[fi+2])) / foregroundSolidAt, 0, 1);
    const hiddenLuma = (0.2126 * alignedHidden.data[fi] + 0.7152 * alignedHidden.data[fi+1] + 0.0722 * alignedHidden.data[fi+2]) * alignedHidden.data[fi+3] / 255;
    const h = clamp((hiddenLuma - blackPoint) / (255 - blackPoint) * hiddenGain, 0, 1);
    if (h > 0) brightPixels++;
    const p = calculateLayersPixel([targetWhite[wi], targetWhite[wi+1], targetWhite[wi+2]], f, h);
    output[fi]=p.rgb[0]; output[fi+1]=p.rgb[1]; output[fi+2]=p.rgb[2]; output[fi+3]=p.alpha;
  }
  if (brightPixels === 0) throw new Error(`Hidden image has no usable bright content above black point ${blackPoint}. Use a white/gray subject on black, lower --black-point, or increase --hidden-gain.`);
  const finalPath = path.join(absoluteOut, `${name}.png`);
  await sharp(output, { raw:{width:fg.width,height:fg.height,channels:4} }).png().toFile(finalPath);
  const previews = await createPreviews(finalPath, absoluteOut, gray);
  const whiteAppearanceError = errorMetrics(previews.white, targetWhite);
  return buildValidation({ mode:'layers', finalPath, image:previews.image, whiteAppearanceError,
    processing:{ algorithm:'layers-v1', ...(options.caseName ? { caseName: options.caseName } : {}), blackPoint, hiddenGain, foregroundSolidAt, gray, fitSecondary:Boolean(fitSecondary), foregroundOpacitySource:opacitySource }, warnings:[] });
}
