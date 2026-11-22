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
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Budget sous throttling OK.');
process.exit(failed ? 1 : 0);
