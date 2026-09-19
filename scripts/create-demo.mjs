import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLayers } from '../src/layers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function createDemo({ outDir = path.join(root, 'output', 'demo') } = {}) {
  return createLayers({
    foreground: path.join(root, 'examples', 'storm-ai', 'foreground-calm.png'),
    hidden: path.join(root, 'examples', 'storm-ai', 'hidden-storm.png'),
    outDir,
    name: 'calm-to-storm',
    blackPoint: 10,
    hiddenGain: 0.9,
    foregroundSolidAt: 32,
    gray: 80,
    caseName: 'calm-to-storm'
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  createDemo().then((report) => {
    const finalPath = path.join(root, 'output', 'demo', 'calm-to-storm.png');
    console.log(`Demo created: ${finalPath}\nOnly calm-to-storm.png is the real RGBA result; preview files are flattened.\nNumeric pass: ${report.numericPass}\nSHA-256: ${report.sha256}`);
  }).catch((error) => {
    console.error(`Magic Image Skill demo: ${error.message}`);
    process.exitCode = 1;
  });
}
