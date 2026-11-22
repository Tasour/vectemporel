#!/usr/bin/env node
/* Budget réseau mesuré sur le service réel, avant tout clic.
 * Cible historique : < 50 requêtes / < 1 Mo. Écart restant documenté dans README. */
import { createRequire } from 'node:module';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';
const require = createRequire(`${process.cwd()}/package.json`);
const puppeteer = require('puppeteer-core');

const PORT = process.env.PERF_PORT || '4187';
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
  headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
let firstVisitRequests = 0;
let countingFirst = true;
page.on('request', () => { if (countingFirst) firstVisitRequests += 1; });
page.on('pageerror', (error) => errors.push(error.message));
try {
  const url = BASE;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  const firstBytes = await page.evaluate(() => performance.getEntriesByType('resource')
    .reduce((sum, entry) => sum + (entry.transferSize || 0), 0));
  // Première visite : le service worker se remplit (coût d'installation PWA).
  await page.evaluate(async () => { if (navigator.serviceWorker) await navigator.serviceWorker.ready; });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Régime établi : le SW contrôle la page et sert le cache.
  countingFirst = false;
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  const measured = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      requests: resources.length,
      bytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      lensModules: resources.filter((entry) => /\/E\d{2,3}\.js$/.test(entry.name)).length,
    };
  });
  console.log(`Première visite : ${firstVisitRequests} requêtes / ${Math.round(firstBytes / 1024)} Ko · régime établi : ${Math.round(measured.bytes / 1024)} Ko`);
  check('aucun module de lentille dans le graphe initial', measured.lensModules === 0, `${measured.lensModules}`);
  check('Three.js chargé depuis le site', await page.evaluate(() => performance.getEntriesByType('resource')
    .some((entry) => /three-bundle\.js/.test(entry.name))));
  check('sphère WebGL active', await page.evaluate(() => window.VATLAS?.getState?.().webgl === true));
  check('première visite < 50 requêtes', firstVisitRequests < 50, `${firstVisitRequests} requêtes`);
  check('première visite < 1 Mo', firstBytes < 1024 * 1024, `${Math.round(firstBytes / 1024)} Ko`);
  check('régime établi servi par le cache SW', measured.bytes < 64 * 1024, `${Math.round(measured.bytes / 1024)} Ko`);
  check('0 erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}
console.log(failed ? `${failed} échec(s)` : 'Budget réseau vérifié.');
process.exit(failed ? 1 : 0);
