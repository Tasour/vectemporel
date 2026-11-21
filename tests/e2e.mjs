#!/usr/bin/env node
/* Parcours fonctionnel de la sphère : deep link, clavier, recherche, aide, HUD. */
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
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.goto(`${BASE}?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1600);

  check('vue sphère active', await page.evaluate(() => window.VATLAS?.getState?.().view === 'globe'));
  check('WebGL disponible', await page.evaluate(() => window.VATLAS.getState().webgl === true));
  check('2 492 géométries', await page.evaluate(() => window.VATLAS.getState().features === 2492));
  check('deep link : Berry sélectionnée', await page.evaluate(() => window.VATLAS.getState().selected === 'Berry'));
  check('fiche Berry visible', await page.evaluate(() => !document.getElementById('hud-card').hidden));
  check('titre Berry', await page.evaluate(() => document.querySelector('.hud-title')?.textContent === 'Berry'));
  check('capitale Bourges', await page.evaluate(() => /Bourges/.test(document.querySelector('.hud-facts')?.textContent || '')));
  check('crédit CC BY-SA', await page.evaluate(() => /CC BY-SA/.test(document.querySelector('.hud-credit')?.textContent || '')));
  check('URL synchronisée', await page.evaluate(() => new URLSearchParams(location.search).get('value') === 'Berry'));
  check('canvas plein écran', await page.evaluate(() => {
    const canvas = document.getElementById('globe-canvas');
    return canvas.width > 1000 && canvas.getBoundingClientRect().width >= window.innerWidth - 1;
  }));
  check('readout live', await page.evaluate(() => document.getElementById('hud-readout')?.getAttribute('aria-live') === 'polite'));

  const cameraBefore = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  await page.focus('#globe-canvas');
  await page.keyboard.press('ArrowLeft');
  await wait(300);
  check('rotation clavier', await page.evaluate((value) => Math.abs(window.VATLAS.getState().camera.lon - value) > 0.5, cameraBefore));

  const zoomBefore = await page.evaluate(() => window.VATLAS.getState().camera.zoom);
  await page.keyboard.press('+');
  await wait(300);
  check('zoom clavier', await page.evaluate((value) => window.VATLAS.getState().camera.zoom > value, zoomBefore));

  await page.click('#hud-search-button');
  await page.type('#region-search', 'Finnmark');
  await wait(250);
  check('suggestions', (await page.$$('#region-suggestions li')).length > 0);
  await page.focus('#region-search');
  await page.keyboard.press('Enter');
  await wait(500);
  check('sélection via recherche', await page.evaluate(() => window.VATLAS.getState().selected === 'Finnmark'));

  await page.click('#hud-help-button');
  await wait(120);
  check('aide visible', await page.evaluate(() => !document.getElementById('hud-help').hidden));
  await page.keyboard.press('Escape');
  await wait(120);
  check('aide fermée', await page.evaluate(() => document.getElementById('hud-help').hidden));

  const rootPath = new URL(BASE).pathname;
  await page.goto(`${new URL(BASE).origin}${rootPath}?year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1000);
  check('accueil sans deep link', await page.evaluate(() => window.VATLAS.getState().selected === null && document.getElementById('hud-card').hidden));
  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `${failed} échec(s)` : 'Parcours sphère OK.');
process.exit(failed ? 1 : 0);
