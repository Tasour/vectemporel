#!/usr/bin/env node
/* Arcs de simultanéité : bascule HUD, contenu, clavier, deep link, mobile. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.ARCS_PORT || '4194';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

check('serveur arcs démarré', await waitForHttp(BASE));
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
  await page.goto(`${BASE}?year=1000&type=area&value=Berry&pos=47.08,2.4,4.2`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.VATLAS?.getState?.().year === 1000, { timeout: 20000 });
  await wait(900);

  check('bouton simultanéité présent', Boolean(await page.$('#hud-arcs-button')));
  check('bouton 44 px', await page.evaluate(() => {
    const box = document.getElementById('hud-arcs-button').getBoundingClientRect();
    return box.width >= 44 && box.height >= 44;
  }));
  await page.click('#hud-arcs-button');
  await wait(300);
  check('bascule activée', await page.evaluate(() => window.VATLAS.getState().arcs.enabled
    && document.getElementById('hud-arcs-button').getAttribute('aria-pressed') === 'true'));
  check('quatre provinces liées', await page.evaluate(() => window.VATLAS.getState().arcs.linked.length === 4),
    await page.evaluate(() => window.VATLAS.getState().arcs.linked.join(',')));
  check('arcs dessinés sur la sphère', await page.evaluate(() => window.VATLAS.getState().mesh.arcCount >= 3));
  check('marqueurs d’arcs', (await page.$$('#arc-host .arc-marker')).length === 4);
  await page.evaluate(() => document.querySelector('#arc-host .arc-marker').dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })));
  check('tooltip d’arc', await page.evaluate(() => {
    const text = document.getElementById('arc-tip').textContent;
    return !document.getElementById('arc-tip').hidden && /hab/.test(text) && /Chronas/.test(text);
  }));
  await page.click('#arc-host .arc-marker');
  await wait(250);
  check('clic marqueur : fiche province', await page.evaluate(() => !document.getElementById('hud-card').hidden));
  check('deep link arcs=1', await page.evaluate(() => new URLSearchParams(location.search).get('arcs') === '1'));
  check('readout catégorie/valeur/unité', await page.evaluate(() => {
    const text = document.getElementById('hud-readout').textContent;
    return /Simultanéité en 1000/.test(text) && /hab/.test(text);
  }));

  await page.keyboard.press('s');
  await wait(250);
  check('touche S désactive', await page.evaluate(() => !window.VATLAS.getState().arcs.enabled
    && window.VATLAS.getState().mesh.arcCount === 0
    && new URLSearchParams(location.search).get('arcs') === '0'));

  const restored = await browser.newPage();
  await restored.setViewport({ width: 1440, height: 900 });
  restored.on('pageerror', (error) => errors.push(error.message));
  await restored.goto(`${BASE}?arcs=1&year=1000&type=area&value=Berry&pos=47.08,2.4,4.2`, { waitUntil: 'load', timeout: 60000 });
  await restored.waitForFunction(() => window.VATLAS?.getState?.().arcs?.enabled === true, { timeout: 20000 });
  await wait(800);
  check('deep link : arcs repris', await restored.evaluate(() => window.VATLAS.getState().arcs.linked.length === 4));

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await mobile.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await wait(500);
  check('mobile : titre et actions séparés', await mobile.evaluate(() => {
    const brand = document.querySelector('.hud-brand').getBoundingClientRect();
    const actions = document.querySelector('.hud-actions').getBoundingClientRect();
    return brand.right < actions.x;
  }));
  check('mobile : cibles ≥ 44 px', await mobile.evaluate(() => [...document.querySelectorAll('.hud-actions .hud-btn')]
    .every((button) => button.getBoundingClientRect().height >= 44)));
  await mobile.close();

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Parcours arcs OK.');
process.exit(failed ? 1 : 0);
