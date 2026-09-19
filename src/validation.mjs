import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { alphaStats } from './inspect.mjs';
import { sha256 } from './utils.mjs';

export async function buildValidation({ mode, finalPath, image, whiteAppearanceError, blackAppearanceError = null, processing, warnings = [] }) {
  const alpha = alphaStats(image.data);
  const report = {
    mode, width: image.width, height: image.height, format: image.format, hasAlpha: image.originalHasAlpha,
    alpha, whiteAppearanceError, blackAppearanceError,
    numericPass: image.format === 'png' && alpha.max > 0 && alpha.usableTransparency && whiteAppearanceError.maxAbsoluteError <= 1,
    visualReviewRequired: true, warnings, processing, sha256: await sha256(finalPath)
  };
  await writeFile(path.join(path.dirname(finalPath), 'validation.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
