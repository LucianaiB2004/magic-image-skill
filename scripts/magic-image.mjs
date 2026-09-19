#!/usr/bin/env node
import { createLayers } from '../src/layers.mjs';
import { createPair } from '../src/pair.mjs';
import { inspectImage } from '../src/inspect.mjs';

const help = `Magic Image Skill / 魔术图片 Skill

commands:
  layers   Compose foreground + grayscale hidden layer into one RGBA PNG
  pair     Approximate white-background and black-background target images
  inspect  Inspect PNG format and alpha usability
  demo     Generate and compose deterministic demo assets

examples:
  node scripts/magic-image.mjs layers --foreground foreground.png --hidden hidden.png --out-dir output/scene --name scene-magic
  node scripts/magic-image.mjs pair --surface surface.png --revealed revealed.png --out-dir output/pair --name magic
  node scripts/magic-image.mjs inspect --image output/demo/calm-to-storm.png
  node scripts/magic-image.mjs demo

Only <name>.png is the real transparent final image. Preview PNGs are flattened demonstrations.`;

function parseArgs(args) {
  const options = {};
  for (let i=0; i<args.length; i++) {
    const token=args[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key=token.slice(2).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
    if (key === 'fitSecondary') { options[key]=true; continue; }
    const value=args[++i]; if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${token}.`);
    options[key]=value;
  }
  return options;
}

function requireOptions(options, names) {
  for (const name of names) if (!options[name]) throw new Error(`Missing required option --${name.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}.`);
}

async function main() {
  const [command, ...rest]=process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') { console.log(help); return; }
  if (command === 'demo') { await import('./create-demo.mjs'); return; }
  const options=parseArgs(rest);
  if (command === 'layers') {
    requireOptions(options,['foreground','hidden','outDir']);
    const report=await createLayers(options); console.log(JSON.stringify(report,null,2)); return;
  }
  if (command === 'pair') {
    requireOptions(options,['surface','revealed','outDir']);
    const report=await createPair(options); console.log(JSON.stringify(report,null,2)); return;
  }
  if (command === 'inspect') {
    requireOptions(options,['image']); const report=await inspectImage(options.image); console.log(JSON.stringify(report,null,2));
    if (!report.usableMagicImagePNG) process.exitCode=2; return;
  }
  throw new Error(`Unknown command: ${command}. Run with --help to see supported commands.`);
}

main().catch((error)=>{ console.error(`Magic Image Skill: ${error.message}`); process.exitCode=1; });
