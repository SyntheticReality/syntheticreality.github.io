import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['website/index.html', 'website/enterprise/index.html', 'website/entertainment/index.html'];
const sources = new Set();

for (const page of pages) {
  const html = await readFile(path.join(root, page), 'utf8');
  for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
    const match = srcset.match(/(\/assets\/projects\/[^,\s]+)-1600\.webp\s+1600w/);
    if (match && srcset.includes(`${match[1]}-480.webp 480w`)) sources.add(match[1]);
  }
}

if (!sources.size) throw new Error('No portfolio image pairs found.');

let sourceBytes = 0;
let outputBytes = 0;

for (const base of [...sources].sort()) {
  const input = path.join(root, 'public', `${base.slice(1)}-1600.webp`);
  const output = path.join(root, 'public', `${base.slice(1)}-800.webp`);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || metadata.width < 800) throw new Error(`Source is too small for an 800w derivative: ${input}`);

  await sharp(input).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(output);

  const result = await sharp(output).metadata();
  if (result.width !== 800) throw new Error(`Unexpected output width: ${output}`);
  const originalSize = (await stat(input)).size;
  const generatedSize = (await stat(output)).size;
  sourceBytes += originalSize;
  outputBytes += generatedSize;
  console.log(`${path.basename(output)} ${result.width}x${result.height} ${generatedSize} bytes (1600w: ${originalSize})`);
}

console.log(JSON.stringify({ images: sources.size, sourceBytes, outputBytes, bytesSaved: sourceBytes - outputBytes, reductionPercent: Number((100 * (1 - outputBytes / sourceBytes)).toFixed(1)) }));
