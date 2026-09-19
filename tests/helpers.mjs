import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

export const tempDir = () => mkdtemp(path.join(tmpdir(), 'magic-image-'));

export async function solidImage(file, width, height, channels, background) {
  await sharp({ create: { width, height, channels, background } }).png().toFile(file);
  return file;
}

export async function rawPng(file, width, height, data) {
  await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).png().toFile(file);
  return file;
}

export async function rawRgbPng(file, width, height, data) {
  await sharp(Buffer.from(data), { raw: { width, height, channels: 3 } }).png().toFile(file);
  return file;
}
