#!/usr/bin/env node
/* Histomap : ouverture, rubans D3, tooltips, clavier, échelle, deep link, mobile. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.HISTOMAP_PORT || '4197';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const external = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur histomap démarré', await waitForHttp(BASE));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    if (!request.url().startsWith(new URL(BASE).origin)) external.push(request.url());
  });
  await page.goto(`${BASE}?year=1000`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await page.click('#hud-histomap-button');
  await page.waitForFunction(() => window.VATLAS?.getState?.().histomap?.open === true, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('#histomap-svg .hm-band').length === 7, { timeout: 10000 });

  check('panneau ouvert', await page.evaluate(() => !document.getElementById('histomap-panel').hidden
    && document.body.classList.contains('histomap-open')));
  check('sept rubans D3', (await page.$$('#histomap-svg .hm-band')).length === 7);
  check('étiquetage direct', await page.evaluate(() => document.querySelectorAll('#histomap-svg .hm-label').length === 7));
  check('minimap interne', Boolean(await page.$('#histomap-minimap')));
  check('tableau miroir 7 lignes', await page.evaluate(() => document.querySelectorAll('#histomap-table tbody tr').length === 7));
  check('SVG nommé et focusable', await page.evaluate(() => {
    const svg = document.getElementById('histomap-svg');
    return svg.getAttribute('role') === 'img' && svg.getAttribute('tabindex') === '0' && svg.getAttribute('aria-label').length > 40;
  }));
  check('cible HUD ≥ 44 px', await page.evaluate(() => document.getElementById('hud-histomap-button').getBoundingClientRect().height >= 44));
  check('deep link histomap=1', await page.evaluate(() => new URLSearchParams(location.search).get('histomap') === '1'));

  const tip = await page.evaluate(() => {
    const band = document.querySelector('#histomap-svg .hm-band[data-key="Chinois"]');
    band.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    const text = document.getElementById('histomap-tip').textContent;
    return text;
  });
  check('tooltip catégorie/valeur/unité', /Chinois/.test(tip) && /habitants/.test(tip) && /%/.test(tip) && /Chronas/.test(tip), tip.slice(0, 90));

  await page.evaluate(() => document.getElementById('histomap-svg').focus());
  const before = await page.evaluate(() => window.VATLAS.getState().year);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((previous) => window.VATLAS.getState().year !== previous, { timeout: 10000 }, before);
  check('clavier ←/→ change l’année', await page.evaluate(() => window.VATLAS.getState().year === 1025));
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.VATLAS.getState().year === -2000, { timeout: 10000 });
  check('clavier Home', await page.evaluate(() => window.VATLAS.getState().year === -2000));
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.VATLAS.getState().year === 2000, { timeout: 10000 });
  check('clavier End', await page.evaluate(() => window.VATLAS.getState().year === 2000));

  await page.click('#histomap-scale');
  await page.waitForFunction(() => window.VATLAS.getState().histomap.mode === 'recent', { timeout: 10000 });
  check('échelle partagée avec la frise', await page.evaluate(() => window.VATLAS.getState().scale === 'recent'
    && window.VATLAS.getState().histomap.mode === 'recent'));

  await page.click('#histomap-close');
  await waitForClose(page);
  check('fermeture propre', await page.evaluate(() => document.getElementById('histomap-panel').hidden
    && !document.body.classList.contains('histomap-open')
    && !new URLSearchParams(location.search).has('histomap')));

  await page.click('#hud-histomap-button');
  await page.waitForFunction(() => document.querySelectorAll('#histomap-svg .hm-band').length === 7, { timeout: 20000 });
  await page.evaluate(() => document.querySelector('#histomap-svg .hm-band[data-key="Chinois"]')
    .dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForFunction(() => window.VATLAS.getState().trail.id === 'asie', { timeout: 10000 });
  check('pont Histomap → récit', await page.evaluate(() => window.VATLAS.getState().trail.active
    && document.getElementById('histomap-panel').hidden));

  const restored = await browser.newPage();
  await restored.setViewport({ width: 1440, height: 900 });
  restored.on('pageerror', (error) => errors.push(error.message));
  await restored.goto(`${BASE}?histomap=1&year=1500`, { waitUntil: 'load', timeout: 60000 });
  await restored.waitForFunction(() => window.VATLAS?.getState?.().histomap?.open === true, { timeout: 20000 });
  await restored.waitForFunction(() => document.querySelectorAll('#histomap-svg .hm-band').length === 7, { timeout: 10000 });
  check('deep link restaure l’Histomap', await restored.evaluate(() => window.VATLAS.getState().histomap.year === 1500
    && document.getElementById('histomap-year').textContent.includes('1500')));
  await restored.close();

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await mobile.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await mobile.click('#hud-histomap-button');
  await mobile.waitForFunction(() => document.querySelectorAll('#histomap-svg .hm-band').length === 7, { timeout: 20000 });
  check('mobile : panneau dans le viewport', await mobile.evaluate(() => {
    const box = document.getElementById('histomap-panel').getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth + 1 && box.top >= 0 && box.bottom <= innerHeight + 1;
  }));
  check('mobile : tableau dense lisible', await mobile.evaluate(() => document.querySelector('#histomap-table tbody tr th').getBoundingClientRect().height >= 14));
  await mobile.close();

  check('aucune requête externe', external.length === 0, external.slice(0, 2).join(' | '));
  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

async function waitForClose(target) {
  await target.waitForFunction(() => document.getElementById('histomap-panel').hidden, { timeout: 10000 });
}

console.log(failed ? `${failed} échec(s)` : 'Parcours Histomap OK.');
process.exit(failed ? 1 : 0);
