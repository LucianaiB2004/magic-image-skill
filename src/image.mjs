import path from 'node:path';
import { access } from 'node:fs/promises';
import sharp from 'sharp';

export async function readImage(inputPath) {
  const absolutePath = path.resolve(inputPath);
  try { await access(absolutePath); } catch { throw new Error(`Image file does not exist: ${absolutePath}`); }
  let metadata;
  try { metadata = await sharp(absolutePath, { animated: true }).metadata(); }
  catch (error) { throw new Error(`Cannot read image ${absolutePath}: ${error.message}`); }
  if ((metadata.pages ?? 1) > 1) throw new Error(`Animated or multi-page images are not supported: ${absolutePath}`);
  const { data, info } = await sharp(absolutePath).autoOrient().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    path: absolutePath, width: info.width, height: info.height, format: metadata.format,
    originalHasAlpha: Boolean(metadata.hasAlpha), data
  };
}

export async function alignSecondary(primary, secondary, { fitSecondary = false, background = { r: 0, g: 0, b: 0, alpha: 1 } } = {}) {
  if (primary.width === secondary.width && primary.height === secondary.height) return secondary;
  if (!fitSecondary) {
    throw new Error(`Primary and secondary dimensions differ: ${primary.width}×${primary.height} vs ${secondary.width}×${secondary.height}. Align the source canvases first or use --fit-secondary only when aspect ratios are nearly identical.`);
  }
  const primaryRatio = primary.width / primary.height, secondaryRatio = secondary.width / secondary.height;
  const ratioError = Math.abs(primaryRatio - secondaryRatio) / primaryRatio;
  if (ratioError > 0.01) {
    throw new Error(`Source aspect ratios differ by ${(ratioError * 100).toFixed(2)}%, exceeding the 1% limit. Align the source canvases; stretching, cropping, and cover fitting are not allowed.`);
  }
  const { data, info } = await sharp(secondary.data, { raw: { width: secondary.width, height: secondary.height, channels: 4 } })
    .resize(primary.width, primary.height, { fit: 'contain', background }).raw().toBuffer({ resolveWithObject: true });
  return { ...secondary, width: info.width, height: info.height, data };
}

export function rgbaToRgb(image) {
  const rgb = Buffer.alloc(image.width * image.height * 3);
  for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    const a = image.data[i + 3] / 255;
    rgb[j] = Math.round(image.data[i] * a + 255 * (1 - a));
    rgb[j + 1] = Math.round(image.data[i + 1] * a + 255 * (1 - a));
    rgb[j + 2] = Math.round(image.data[i + 2] * a + 255 * (1 - a));
  }
  return rgb;
}
