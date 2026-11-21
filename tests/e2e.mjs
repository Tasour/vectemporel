#!/usr/bin/env node
/* Parcours fonctionnel de la carte : deep link, recherche, zoom, clavier, hasard. */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181/index.html';
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.goto(`${BASE}?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(800);

  check('vue carte active', await page.evaluate(() => window.VATLAS?.getState?.().view === 'map'));
  check('2 492 géométries annoncées', await page.evaluate(() => window.VATLAS.getState().features === 2492));
  check('deep link : Berry sélectionnée', await page.evaluate(() => window.VATLAS.getState().selected === 'Berry'));
  check('panneau Berry', await page.evaluate(() => document.getElementById('region-title')?.textContent === 'Berry'));
  check('capitale Bourges', await page.evaluate(() => /Bourges/.test(document.querySelector('.region-facts')?.textContent || '')));
  check('année 1000', await page.evaluate(() => window.VATLAS.getState().year === 1000));
  check('URL synchronisée', await page.evaluate(() => new URLSearchParams(location.search).get('value') === 'Berry'));
  check('canvas dimensionné', await page.evaluate(() => document.getElementById('world-map').width > 600));
  check('readout live', await page.evaluate(() => document.getElementById('map-readout')?.getAttribute('aria-live') === 'polite'));

  const before = await page.evaluate(() => window.VATLAS.getState().camera.zoom);
  await page.click('button[aria-label="Zoomer"]');
  await wait(250);
  check('zoom bouton', await page.evaluate((value) => window.VATLAS.getState().camera.zoom > value, before));

  const cameraBefore = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  await page.focus('#world-map');
  await page.keyboard.press('ArrowLeft');
  await wait(250);
  check('déplacement clavier', await page.evaluate((value) => window.VATLAS.getState().camera.lon !== value, cameraBefore));

  await page.evaluate(() => { document.getElementById('region-search').value = 'Finnmark'; document.getElementById('region-search').dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(200);
  check('suggestions', (await page.$$('#region-suggestions li')).length > 0);
  await page.focus('#region-search');
  await page.keyboard.press('Enter');
  await wait(400);
  check('sélection via recherche', await page.evaluate(() => window.VATLAS.getState().selected === 'Finnmark'));

  await page.click('.map-bar button.map-btn');
  await wait(400);
  check('hasard déterministe', await page.evaluate(() => Boolean(window.VATLAS.getState().selected)));

  const rootPath = new URL(BASE).pathname;
  await page.goto(`${new URL(BASE).origin}${rootPath}?year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(500);
  check('accueil sans deep link', await page.evaluate(() => window.VATLAS.getState().selected === null && Boolean(document.querySelector('.map-empty'))));
  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `${failed} échec(s)` : 'Parcours carte OK.');
process.exit(failed ? 1 : 0);
