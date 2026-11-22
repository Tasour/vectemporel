#!/usr/bin/env node
/* Budget sous CPU lente : temps de première frame et nombre de requêtes. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.THROTTLE_PORT || '4197';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur perf démarré', await waitForHttp(BASE));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const client = await page.createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8,
  });

  const started = Date.now();
  await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 60000 });
  const elapsed = Date.now() - started;
  const metrics = await page.evaluate(() => ({
    requests: performance.getEntriesByType('resource').length,
    webgl: window.VATLAS.getState().webgl,
    features: window.VATLAS.getState().features,
  }));

  check('globe prêt sous CPU x4 et réseau lent', metrics.webgl && metrics.features === 2492, `${elapsed} ms`);
  check('première frame < 45 s', elapsed < 45000, `${elapsed} ms`);
  check('moins de 50 requêtes', metrics.requests < 50, `${metrics.requests}`);
  check('aucune erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));

  /* Une seule boucle rAF : on compte les callbacks sur 500 ms. */
  const frames = await page.evaluate(() => new Promise((resolve) => {
    const original = window.requestAnimationFrame;
    let count = 0;
    window.requestAnimationFrame = function counted(callback) {
      count += 1;
      return original.call(window, callback);
    };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    setTimeout(() => { window.requestAnimationFrame = original; resolve(count); }, 500);
  }));
  check('boucle rAF unique', frames <= 45, `${frames} callbacks / 500 ms`);

  const heapBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
  for (let index = 0; index < 5; index += 1) {
    await page.click('#hud-trails-button');
    await page.keyboard.press('Escape');
    await page.click('#hud-learn-button');
    await page.keyboard.press('Escape');
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  const heapAfter = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
  check('pas de fuite mémoire évidente', heapBefore === 0 || heapAfter < heapBefore * 1.25,
    `${Math.round(heapBefore / 1e6)} → ${Math.round(heapAfter / 1e6)} Mo`);

  const contextResult = await page.evaluate(() => {
    const canvas = document.getElementById('globe-canvas');
    const event = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(event);
    return { defaultPrevented: event.defaultPrevented, ready: document.documentElement.dataset.globeReady };
  });
  check('context loss sans plantage', contextResult.ready === 'true' && errors.length === 0, JSON.stringify(contextResult));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Budget sous throttling OK.');
process.exit(failed ? 1 : 0);
