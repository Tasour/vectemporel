#!/usr/bin/env node
/* Ergonomie : 20 répétitions par option, latence médiane et arrêts Tab. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.ERGO_PORT || '4199';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

check('serveur ergonomie démarré', await waitForHttp(BASE));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  const skip = await page.$('#onboarding .onboarding-skip');
  if (skip) await skip.click();

  const options = [
    ['arcs', '#hud-arcs-button'],
    ['ombre', '#hud-sun-button'],
    ['récits', '#hud-trails-button'],
    ['apprendre', '#hud-learn-button'],
    ['qualité', '#hud-quality-button'],
    ['comparaison', '#hud-compare-button'],
    ['Histomap', '#hud-histomap-button'],
    ['ruptures', '#timeline-turning'],
  ];
  await page.evaluate(() => document.getElementById('hud-tools-button')?.click());
  await new Promise((resolve) => setTimeout(resolve, 100));
  const medians = {};
  for (const [name, selector] of options) {
    const latencies = [];
    for (let index = 0; index < 20; index += 1) {
      await page.evaluate(() => {
        if (!document.body.classList.contains('tools-open')) document.getElementById('hud-tools-button')?.click();
      });
      await page.click(selector);
      await new Promise((resolve) => setTimeout(resolve, 30));
      const action = await page.evaluate(() => window.__vatlasLastAction || null);
      if (action && action.name && action.latency >= 0) latencies.push(action.latency);
    }
    latencies.sort((a, b) => a - b);
    medians[name] = latencies[Math.floor(latencies.length / 2)] ?? -1;
    check(`${name} : 20 actions sans erreur`, latencies.length === 20, `médiane ${medians[name]} ms`);
    check(`${name} : latence < 300 ms`, medians[name] >= 0 && medians[name] < 300, `${medians[name]} ms`);
  }

  const tabStops = await page.evaluate(() => [...document.querySelectorAll(
    'a[href], button, input, select, [tabindex]',
  )].filter((element) => element.getClientRects().length && element.tabIndex >= 0).length);
  check('arrêts Tab réduits', tabStops <= 70, `${tabStops}`);
  check('liens d’évitement', await page.evaluate(() => document.querySelectorAll('.skip-link').length === 2));
  check('recherche par commande', await page.evaluate(() => {
    const input = document.getElementById('region-search');
    input.value = 'ombre';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return [...document.querySelectorAll('#region-suggestions li')].some((item) => /Commande/.test(item.textContent));
  }));
  check('aucune erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Ergonomie OK.');
process.exit(failed ? 1 : 0);
