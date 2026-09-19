import path from 'node:path';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const clamp = (value, min = 0, max = 255) => Math.min(max, Math.max(min, value));
export const byte = (value) => clamp(Math.round(value));

export function safeName(value) {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[\\/:*?"<>|]/.test(value) || value.includes('..')) {
    throw new Error('Invalid --name. Use a plain filename without slashes, "..", or reserved filename characters.');
  }
  return value;
}

export async function fileExists(file) {
  try { await access(file, constants.F_OK); return true; } catch { return false; }
}

export async function prepareOutput(outDir, name) {
  safeName(name);
  const absoluteDir = path.resolve(outDir);
  const files = [
    `${name}.png`, 'preview-white.png', 'preview-gray.png', 'preview-black.png',
    'comparison.png', 'preview.html', 'validation.json'
  ];
  for (const file of files) {
    if (await fileExists(path.join(absoluteDir, file))) {
      throw new Error(`Output already exists: ${path.join(absoluteDir, file)}. Use a new --out-dir or --name.`);
    }
  }
  await mkdir(absoluteDir, { recursive: true });
  return absoluteDir;
}

export async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

export function parseNumber(value, label, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be a number from ${min} to ${max}.`);
  }
  return number;
}
