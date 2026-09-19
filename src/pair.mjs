import path from 'node:path';
import sharp from 'sharp';
import { calculatePairPixel, errorMetrics } from './alpha.mjs';
import { alignSecondary, readImage, rgbaToRgb } from './image.mjs';
import { createPreviews } from './preview.mjs';
import { buildValidation } from './validation.mjs';
import { parseNumber, prepareOutput } from './utils.mjs';

export async function createPair(options) {
  const { surface, revealed, outDir, name = 'magic-image', fitSecondary = false } = options;
  const gray = parseNumber(options.gray ?? 80, '--gray', { min:0, max:255 });
  const absoluteOut = await prepareOutput(outDir, name);
  const whiteImage = await readImage(surface);
  const blackImage = await alignSecondary(whiteImage, await readImage(revealed), { fitSecondary, background:{r:0,g:0,b:0,alpha:1} });
  const whiteTarget = rgbaToRgb(whiteImage), blackTarget = rgbaToRgb(blackImage);
  const output = Buffer.alloc(whiteImage.width * whiteImage.height * 4);
  let negativeMeanDeltaPixels=0, nonNeutralDeltaPixels=0;
  for (let pixel=0; pixel<whiteImage.width*whiteImage.height; pixel++) {
    const i=pixel*3, o=pixel*4;
    const p=calculatePairPixel([whiteTarget[i],whiteTarget[i+1],whiteTarget[i+2]],[blackTarget[i],blackTarget[i+1],blackTarget[i+2]]);
    output[o]=p.rgb[0]; output[o+1]=p.rgb[1]; output[o+2]=p.rgb[2]; output[o+3]=p.alpha;
    if(p.negativeMeanDelta) negativeMeanDeltaPixels++; if(p.nonNeutralDelta) nonNeutralDeltaPixels++;
  }
  const finalPath=path.join(absoluteOut,`${name}.png`);
  await sharp(output,{raw:{width:whiteImage.width,height:whiteImage.height,channels:4}}).png().toFile(finalPath);
  const previews=await createPreviews(finalPath,absoluteOut,gray);
  const whiteAppearanceError=errorMetrics(previews.white,whiteTarget), blackAppearanceError=errorMetrics(previews.black,blackTarget);
  const warnings=[]; if(blackAppearanceError.meanAbsoluteError>5) warnings.push('Black-background mean absolute error exceeds 5; the two color targets are not closely representable with one shared alpha channel.');
  return buildValidation({mode:'pair',finalPath,image:previews.image,whiteAppearanceError,blackAppearanceError,
    processing:{algorithm:'pair-shared-alpha-v1',gray,fitSecondary:Boolean(fitSecondary),negativeMeanDeltaPixels,nonNeutralDeltaPixels},warnings});
}
