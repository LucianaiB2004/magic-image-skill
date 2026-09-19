import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { readImage } from './image.mjs';
import { compositeBuffer } from './alpha.mjs';

async function writeFlat(image, background, file) {
  const rgb = compositeBuffer(image.data, background);
  await sharp(rgb, { raw: { width: image.width, height: image.height, channels: 3 } }).png().toFile(file);
  return rgb;
}

export async function createPreviews(finalPath, outDir, gray = 80) {
  const saved = await readImage(finalPath);
  const white = await writeFlat(saved, 255, path.join(outDir, 'preview-white.png'));
  await writeFlat(saved, gray, path.join(outDir, 'preview-gray.png'));
  const black = await writeFlat(saved, 0, path.join(outDir, 'preview-black.png'));
  await sharp({ create: { width: saved.width * 2, height: saved.height, channels: 3, background: '#ffffff' } })
    .composite([
      { input: await readFile(path.join(outDir, 'preview-white.png')), left: 0, top: 0 },
      { input: await readFile(path.join(outDir, 'preview-black.png')), left: saved.width, top: 0 }
    ]).png().toFile(path.join(outDir, 'comparison.png'));
  const base64 = (await readFile(finalPath)).toString('base64');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>魔术图片预览</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#f3f3f1;color:#111}.wrap{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}.panel{text-align:center}.stage{display:inline-block;max-width:90vw;background:#fff;cursor:zoom-in;box-shadow:0 18px 60px #0002;transition:background .45s ease,transform .45s ease,box-shadow .45s ease}.stage img{display:block;max-width:76vw;max-height:70vh;transition:max-width .45s ease,max-height .45s ease}.stage.expanded{cursor:zoom-out;transform:scale(1.035);box-shadow:0 24px 90px #0008}.stage.expanded img{max-width:92vw;max-height:86vh}.buttons{margin:18px;display:flex;gap:8px;justify-content:center}.buttons button{padding:9px 16px}.note{display:inline-block;background:#fff;color:#111;padding:8px 12px;border-radius:8px}</style></head><body><main class="wrap"><section class="panel"><p class="note">当前始终是同一张 PNG。点击图片：放大并切换平静 / 风暴。</p><div class="stage" id="stage" style="background:#fff" role="button" tabindex="0" aria-label="点击放大并切换背景"><img alt="同一张透明魔术图片" src="data:image/png;base64,${base64}"></div><div class="buttons"><button data-color="#ffffff">白底</button><button data-color="rgb(${gray},${gray},${gray})">灰底</button><button data-color="#000000">黑底</button></div></section></main><script>const stage=document.getElementById('stage');const reveal=()=>{const expanded=stage.classList.toggle('expanded');stage.style.backgroundColor=expanded ? '#000000' : '#ffffff';};stage.addEventListener('click',reveal);stage.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();reveal();}});document.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{stage.style.backgroundColor=button.dataset.color;}));</script></body></html>`;
  await writeFile(path.join(outDir, 'preview.html'), html);
  return { image: saved, white, black };
}
