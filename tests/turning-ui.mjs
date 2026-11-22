#!/usr/bin/env node
/* Points de rupture dans la frise : badges, clic, fiche et deep link. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.TURN_PORT || '4193';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

check('serveur ruptures démarré', await waitForHttp(BASE));
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
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });

  check('49 badges détectés', (await page.$$('#turning-strip .turning-badge')).length === 49);
  check('badges accessibles', await page.evaluate(() => [...document.querySelectorAll('.turning-badge')]
    .every((badge) => badge.getAttribute('aria-label')?.includes('régions changent de souverain'))));
  check('cibles ≥ 44 px', await page.evaluate(() => [...document.querySelectorAll('.turning-badge')]
    .every((badge) => badge.getBoundingClientRect().width >= 44 && badge.getBoundingClientRect().height >= 44)));

  await page.click('.turning-badge[data-year="751"]');
  await page.waitForFunction(() => window.VATLAS.getState().year === 751, { timeout: 10000 });
  check('clic badge : année 751', await page.evaluate(() => window.VATLAS.getState().year === 751));
  check('clic badge : deep link', await page.evaluate(() => new URLSearchParams(location.search).get('turn') === '751'));
  check('clic badge : sélection prouvée', await page.evaluate(() => Boolean(window.VATLAS.getState().selected)
    && !document.getElementById('hud-card').hidden));
  check('clic badge : aria-current', await page.evaluate(() => document.querySelector('.turning-badge[data-year="751"]').getAttribute('aria-current') === 'true'));
  check('clic badge : libellé extrait', await page.evaluate(() => /extrait Chronas/.test(document.getElementById('hud-readout').textContent)));
  check('cinq provinces proposées', (await page.$$('#turning-provinces .turning-province')).length === 5);
  await page.click('#turning-provinces .turning-province:nth-of-type(2)');
  await wait(250);
  check('raccourci province : sélection', await page.evaluate(() => Boolean(window.VATLAS.getState().selected)));
  await page.click('.turning-back');
  await wait(120);
  check('retour aux repères', await page.evaluate(() => document.getElementById('turning-provinces').hidden
    && !document.getElementById('turning-strip').hidden));

  const restored = await browser.newPage();
  await restored.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  restored.on('pageerror', (error) => errors.push(error.message));
  await restored.goto(`${BASE}?turn=-322`, { waitUntil: 'load', timeout: 60000 });
  await restored.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  check('deep link : badge actif', await restored.evaluate(() => window.VATLAS.getState().turn === '-322'
    && document.querySelector('.turning-badge[data-year="-322"]')?.getAttribute('aria-current') === 'true'));
  check('mobile : timeline compacte', await restored.evaluate(() => document.querySelector('.timeline').getBoundingClientRect().height < 180));

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Parcours ruptures OK.');
process.exit(failed ? 1 : 0);
