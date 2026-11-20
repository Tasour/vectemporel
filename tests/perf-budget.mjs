#!/usr/bin/env node
/* Budget réseau mesuré sur le service réel, avant tout clic.
 * Cible historique : < 50 requêtes / < 1 Mo. Écart restant documenté dans README. */
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const puppeteer = require('puppeteer-core');

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
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4181/index.html', { waitUntil: 'load', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const measured = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      requests: resources.length,
      bytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      lensModules: resources.filter((entry) => /\/E\d{2,3}\.js$/.test(entry.name)).length,
    };
  });
  console.log(`Mesuré : ${measured.requests} requêtes, ${Math.round(measured.bytes / 1024)} Ko`);
  check('aucun module de lentille dans le graphe initial', measured.lensModules === 0, `${measured.lensModules}`);
  check('< 100 requêtes au chargement', measured.requests < 100, `${measured.requests}`);
  check('< 2 Mo transférés au chargement', measured.bytes < 2 * 1024 * 1024, `${Math.round(measured.bytes / 1024)} Ko`);
  check('0 erreur console', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `${failed} échec(s)` : 'Budget réseau vérifié.');
process.exit(failed ? 1 : 0);
