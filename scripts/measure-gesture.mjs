/**
 * Harnais de mesure du geste de timeline.
 *
 * Usage : node scripts/measure-gesture.mjs [URL]
 * Nécessite un serveur de dev (window.__chronasMap n'est exposé qu'en dev/test).
 * Sortie : JSON sur stdout, archivé dans docs/harness/gesture-*.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/?year=1000';
const viewport = { width: 1658, height: 1150 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text().slice(0, 200));
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="timeline"]');
await page.waitForTimeout(9000);

await page.evaluate(() => {
  window.__perf = { renders: 0, long: [] };
  window.__chronasMap?.on('render', () => { window.__perf.renders += 1; });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.long.push(Math.round(entry.duration));
  }).observe({ entryTypes: ['longtask'] });
});

const read = () => page.evaluate(() => {
  const timeline = document.querySelector('[data-testid="timeline"]');
  const grid = document.querySelector('.vis-grid.vis-year1000');
  const overlay = document.querySelector('[data-testid="map-gesture-overlay"]');
  const vector = overlay?.querySelectorAll('canvas')[1];
  let ink = 0;
  if (vector?.width) {
    const data = vector.getContext('2d')?.getImageData(0, 0, vector.width, Math.min(400, vector.height)).data;
    if (data) for (let index = 3; index < data.length; index += 4 * 53) if (data[index] > 0) ink += 1;
  }
  return {
    t: Math.round(performance.now()),
    year: Number(timeline?.getAttribute('data-year')),
    span: Number(timeline?.getAttribute('data-span')),
    gridX: grid ? Math.round(new DOMMatrix(getComputedStyle(grid).transform).m41) : null,
    overlay: overlay?.dataset['gestureOverlay'] ?? 'missing',
    overlayWidth: vector?.width ?? 0,
    ink,
    renders: window.__perf.renders,
    long: window.__perf.long,
  };
});

const box = await page.locator('[data-testid="timeline"]').boundingBox();
if (!box) throw new Error('Timeline introuvable');
const y = box.y + box.height / 2;
const x = box.x + box.width / 2;

await page.evaluate(() => { window.__perf.renders = 0; window.__perf.long = []; });
await page.mouse.move(x, y);
await page.mouse.down();
for (let step = 1; step <= 12; step += 1) {
  await page.mouse.move(x + step * 12, y);
  await page.waitForTimeout(40);
}
const during = await read();
await page.mouse.up();
const after = [];
for (let index = 0; index < 20; index += 1) {
  await page.waitForTimeout(50);
  after.push(await read());
}

const final = after[after.length - 1];
const yearAtRelease = after[0].year;
const gridAtRelease = after[0].gridX;
const regressions = after.reduce((count, sample, index) => (
  index > 0 && sample.year > after[index - 1].year ? count + 1 : count
), 0);
const longSorted = [...during.long].sort((a, b) => a - b);
const percentile = (p) => longSorted.length
  ? longSorted[Math.min(longSorted.length - 1, Math.floor(longSorted.length * p))]
  : null;
const gpu = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return 'notMeasured';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
});

const result = {
  url,
  viewport,
  gpu,
  softwareRendering: /swiftshader|llvmpipe|softpipe|software/i.test(gpu),
  dpr: await page.evaluate(() => window.devicePixelRatio),
  during: {
    renders: during.renders,
    overlay: during.overlay,
    overlayWidth: during.overlayWidth,
    ink: during.ink,
    longTasks: during.long.length,
    longP50: percentile(0.5),
    longP95: percentile(0.95),
  },
  release: {
    yearAtRelease,
    finalYear: final.year,
    gridAtRelease,
    finalGrid: final.gridX,
    gridSettleMs: (after.find((sample) => sample.gridX === final.gridX)?.t ?? final.t) - after[0].t,
    yearSettleMs: (after.find((sample) => sample.year === final.year)?.t ?? final.t) - after[0].t,
    regressions,
    rendersAfterRelease: final.renders - during.renders,
  },
  errors: errors.slice(0, 5),
};

await browser.close();
console.log(JSON.stringify(result, null, 2));
const directory = path.resolve('docs/harness');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(
  path.join(directory, `gesture-${Date.now()}.json`),
  JSON.stringify(result, null, 2),
);
