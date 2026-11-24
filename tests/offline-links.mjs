#!/usr/bin/env node
/* Deep links hors ligne : chaque mode doit reprendre depuis le cache PWA. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.OFFLINE_PORT || '4196';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur hors ligne démarré', await waitForHttp(BASE));
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
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(async () => { if (navigator.serviceWorker) await navigator.serviceWorker.ready; });
  await new Promise((resolve) => setTimeout(resolve, 900));
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.setOfflineMode(true);

  const cases = [
    ['?trail=soie&step=2', () => window.VATLAS.getState().trail.id === 'soie' && window.VATLAS.getState().trail.index === 2],
    ['?turn=751', () => window.VATLAS.getState().turn === '751'],
    ['?histomap=1&year=1500', () => document.querySelectorAll('#histomap-svg .hm-band').length === 7],
    ['?compare=1000,1500', () => window.VATLAS.getState().compare?.[0] === 1000],
    ['?year=1000&arcs=1&value=Berry', () => window.VATLAS.getState().arcs.enabled === true],
    ['?zoom=century&year=1450', () => window.VATLAS.getState().zoom === 'century' && document.getElementById('timeline-range').max === '100'],
    ['?sun=1', () => window.VATLAS.getState().sun.enabled],
  ];

  for (const [query, assertion] of cases) {
    await page.goto(`${BASE}${query}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 15000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 900));
    const ok = await page.evaluate(assertion);
    check(`hors ligne ${query}`, ok);
  }

  check('aucune erreur console hors ligne', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Deep links hors ligne OK.');
process.exit(failed ? 1 : 0);
