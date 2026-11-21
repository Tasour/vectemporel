#!/usr/bin/env node
/* Harnais PWA : manifest, service worker, préchauffage du cache et survie hors ligne. */
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const puppeteer = require('puppeteer-core');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181/index.html';
const ORIGIN = new URL(BASE).origin;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
const external = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', (request) => {
  if (!request.url().startsWith(`${ORIGIN}/`)) external.push(request.url());
});

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const manifest = await page.evaluate(async () => {
    const response = await fetch('./manifest.webmanifest');
    if (!response.ok) return null;
    return response.json();
  });
  check('manifest présent', Boolean(manifest));
  check('manifest standalone', manifest?.display === 'standalone', manifest?.display);
  check('manifest scope relatif', manifest?.scope?.endsWith('/') && manifest?.start_url?.endsWith('/'));
  check('3 icônes', manifest?.icons?.length === 3, String(manifest?.icons?.length));

  const cache = await page.evaluate(async () => {
    const keys = await caches.keys();
    const store = await caches.open('vectemporel-v3');
    const entries = await store.keys();
    return {
      keys,
      count: entries.length,
      hasIndex: Boolean(await store.match('./index.html')),
      hasMap: entries.some((entry) => /chronas-map\.js/.test(entry.url)),
    };
  });
  check('cache versionné', cache.keys.includes('vectemporel-v3'), cache.keys.join(','));
  check('snapshot carte en cache', cache.hasMap);
  check('coque mise en cache', cache.hasIndex, `${cache.count} entrées`);
  check('cache préchauffé (> 10 ressources)', cache.count > 10, String(cache.count));

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 900));
  check('carte rendue hors ligne', await page.evaluate(() => window.VATLAS?.getState?.().view === 'map'));
  check('snapshot chargé hors ligne', await page.evaluate(() => window.VATLAS?.getState?.().features === 2492));
  check('hors ligne sans erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.setOfflineMode(false);
  check('aucune requête externe', external.length === 0, external.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `${failed} échec(s)` : 'PWA vérifiée.');
process.exit(failed ? 1 : 0);
