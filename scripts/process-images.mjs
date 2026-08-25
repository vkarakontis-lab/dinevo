#!/usr/bin/env node
// Turn dropped photos into web-ready variants.
//   node scripts/process-images.mjs --slug <slug> --in intake/<slug> --out .tmp/<slug>
// Produces <slug>-NN-1600.webp / -800.webp / -400.webp per image + manifest.json
// (dimensions + blurDataURL). Auto-rotates from EXIF, strips metadata (GPS!),
// never upscales. Exported for add-restaurant.mjs.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseArgs, fail, log } from './lib.mjs';

export const VARIANTS = [1600, 800, 400]; // hero / card / thumb
const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;

/**
 * @param {string[]} inputs absolute image paths, in display order
 * @param {{ slug: string, outDir: string, quality?: number }} opts
 * @returns {Promise<Array<{ index:number, base:string, source:string, width:number, height:number, blurDataURL:string, files:Array<{width:number, path:string}> }>>}
 */
export async function processImages(inputs, { slug, outDir, quality = 82 }) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];
  let index = 0;
  for (const input of inputs) {
    index += 1;
    const nn = String(index).padStart(2, '0');
    const base = `${slug}-${nn}`;
    let pipeline;
    try {
      pipeline = sharp(input, { failOn: 'none' }).rotate(); // .rotate() with no args applies EXIF orientation
      const meta = await pipeline.metadata();
      if (!meta.width) throw new Error('unreadable');
    } catch (err) {
      throw new Error(`cannot decode ${path.basename(input)} (${err.message}). HEIC? Convert to JPEG first.`);
    }
    const rotated = await sharp(input, { failOn: 'none' }).rotate().toBuffer();
    const meta = await sharp(rotated).metadata();
    const entry = { index, base, source: path.basename(input), width: meta.width, height: meta.height, files: [] };

    for (const w of VARIANTS) {
      const outPath = path.join(outDir, `${base}-${w}.webp`);
      const info = await sharp(rotated)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toFile(outPath); // metadata is stripped by default (no .withMetadata())
      entry.files.push({ width: info.width, height: info.height, path: outPath });
    }
    // Largest variant defines the stored dimensions (source may be huge).
    entry.width = entry.files[0].width;
    entry.height = entry.files[0].height;

    const blur = await sharp(rotated).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
    entry.blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`;
    manifest.push(entry);
    log(`${path.basename(input)} → ${base}-{${VARIANTS.join(',')}}.webp (${entry.width}×${entry.height})`);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

export function listImages(dir) {
  return fs.readdirSync(dir).filter((f) => IMAGE_RE.test(f)).sort().map((f) => path.join(dir, f));
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.in) fail('usage: node scripts/process-images.mjs --slug <slug> --in <dir> [--out <dir>] [--quality 82]');
  const inputs = fs.statSync(args.in).isDirectory() ? listImages(args.in) : [args.in];
  if (!inputs.length) fail(`no images in ${args.in}`);
  const outDir = args.out ?? path.join('.tmp', args.slug);
  const manifest = await processImages(inputs, { slug: args.slug, outDir, quality: args.quality ? Number(args.quality) : undefined });
  log(`done: ${manifest.length} image(s) → ${outDir}/manifest.json`);
}
