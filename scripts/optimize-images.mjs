#!/usr/bin/env node
/* Compresse les vignettes en JPEG 560 px pour limiter le poids du dépôt. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const FILE = path.join(ROOT, 'event-images.js');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(FILE, 'utf8'), context);
const images = context.window.VECTEMPOREL_EVENT_IMAGES;
let converted = 0;
for (const entry of Object.values(images)) {
  const source = path.join(ROOT, entry.src);
  if (!fs.existsSync(source)) continue;
  const target = entry.src.replace(/\.[^.]+$/, '.jpg');
  const destination = path.join(ROOT, target);
  try {
    execFileSync('magick', [
      source,
      '-background', '#0a0d12', '-alpha', 'remove', '-alpha', 'off',
      '-resize', '520x520>', '-strip', '-quality', '74', destination,
    ], { stdio: 'ignore' });
    entry.src = target;
    if (source !== destination) fs.unlinkSync(source);
    converted += 1;
  } catch (error) {
    console.warn(`Compression impossible pour ${entry.src} : ${error.message}`);
  }
}
fs.writeFileSync(FILE, `/* Généré par npm run build:images:all — images vérifiées et compressées.
 * ${new Date().toISOString().slice(0, 10)}
 */
window.VECTEMPOREL_EVENT_IMAGES = ${JSON.stringify(images, null, 2)};
`);
console.log(`${converted} vignettes compressées en JPEG.`);
