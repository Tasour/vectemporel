#!/usr/bin/env node
/* Détails du rendu : focus empire, marqueurs d'arcs, ombre et fil de fer. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.GLOBE_PORT || '4198';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur détails démarré', await waitForHttp(BASE));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}?year=1000&value=Berry&pos=47.08,2.4,4.2`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await new Promise((resolve) => setTimeout(resolve, 700));

  await page.evaluate(() => window.VATLAS.focusEmpire(true));
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('focus empire actif', await page.evaluate(() => window.VATLAS.getState().empire.active));
  await page.evaluate(() => window.VATLAS.setYear(1200));
  await new Promise((resolve) => setTimeout(resolve, 700));
  check('focus empire survit à l’année', await page.evaluate(() => window.VATLAS.getState().empire.active));

  await page.evaluate(() => window.VATLAS.toggleSun());
  await new Promise((resolve) => setTimeout(resolve, 150));
  const sunYear = await page.evaluate(() => window.VATLAS.getState().mesh.sunYear);
  await page.evaluate(() => window.VATLAS.setView({ lat: 20, lon: 170, zoom: 2.4 }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('ombre stable quand la sphère tourne', await page.evaluate((year) => window.VATLAS.getState().mesh.sunYear === year, sunYear));
  for (let index = 0; index < 3; index += 1) await page.evaluate(() => window.VATLAS.toggleSun());
  check('bascules répétées de l’ombre sans erreur', errors.length === 0, errors.slice(0, 2).join(' | '));

  const before = await page.evaluate(() => performance.getEntriesByType('resource').length);
  await page.evaluate(() => window.VATLAS.setView({ lat: 47, lon: 2, zoom: 4.2 }));
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.evaluate(() => window.VATLAS.toggleArcs?.());
  await page.evaluate(() => document.getElementById('hud-arcs-button')?.click());
  await new Promise((resolve) => setTimeout(resolve, 300));
  const markers = await page.$$('#arc-host .arc-marker');
  check('marqueurs d’arcs présents', markers.length > 0, `${markers.length}`);
  check('compteur de libellés masqués', await page.evaluate(() => Number.isInteger(window.VATLAS.getState().labelsHidden)));
  check('raycast ignore les arcs', await page.evaluate(() => {
    const picked = window.VATLAS.pickAt(720, 450);
    return picked === null || !/arc/i.test(String(picked));
  }));
  if (markers.length) {
    await page.evaluate(() => document.querySelector('#arc-host .arc-marker').focus());
    await new Promise((resolve) => setTimeout(resolve, 150));
    check('tooltip d’arc au clavier', await page.evaluate(() => !document.getElementById('arc-tip').hidden));
  }
  await page.evaluate(() => window.VATLAS.setView({ lat: -40, lon: 170, zoom: 1.8 }));
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('marqueurs masqués côté globe', await page.evaluate(() => [...document.querySelectorAll('#arc-host .arc-marker')]
    .some((marker) => marker.hidden)));
  await page.click('#hud-arcs-button');
  const after = await page.evaluate(() => performance.getEntriesByType('resource').length);
  check('bascule graphique sans requête', after === before, `${before} → ${after}`);

  await page.evaluate(() => window.VATLAS.toggleWire());
  await page.evaluate(() => window.VATLAS.setView({ lat: 20, lon: 0, zoom: 7.2 }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('zoom maximal en fil de fer', await page.evaluate(() => window.VATLAS.getState().wireframe
    && window.VATLAS.getState().camera.zoom > 7.1));
  await page.evaluate(() => window.VATLAS.toggleWire());
  check('retour du rendu vectoriel', await page.evaluate(() => !window.VATLAS.getState().wireframe));

  check('aucune erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Détails du globe OK.');
process.exit(failed ? 1 : 0);
