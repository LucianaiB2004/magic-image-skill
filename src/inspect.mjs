import { readImage } from './image.mjs';

export function alphaStats(data) {
  const levels = new Set(); let min = 255, max = 0, fullyTransparent = 0, fullyOpaque = 0, semiTransparent = 0, visible = 0;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i]; levels.add(alpha); min = Math.min(min, alpha); max = Math.max(max, alpha);
    if (alpha === 0) fullyTransparent++; else { visible++; if (alpha === 255) fullyOpaque++; else semiTransparent++; }
  }
  return { levels: levels.size, min, max, fullyTransparent, fullyOpaque, semiTransparent, usableTransparency: fullyTransparent + semiTransparent > 0 };
}

export async function inspectImage(file) {
  const image = await readImage(file); const alpha = alphaStats(image.data);
  return {
    format: image.format, width: image.width, height: image.height, hasAlpha: image.originalHasAlpha,
    alpha,
    usableMagicImagePNG: image.format === 'png' && alpha.max > 0 && alpha.usableTransparency
  };
}
