#!/usr/bin/env node
/* V2-07 — captures reproductibles des 6 vues en desktop et mobile.
 * Produit screenshots/v2/<vue>-<viewport>.png et un rapport de densité JSON. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(`${process.cwd()}`);
const OUT = path.join(ROOT, 'screenshots', 'v2');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181/index.html';
const VIEWS = ['globe', 'chronology', 'recit', 'geography', 'constellation', 'points'];
const VIEWPORTS = [
  { name: 'desktop', width: 1658, height: 1150 },
  { name: 'mobile', width: 390, height: 844 },
];
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--enable-webgl'],
});
const report = { generated: new Date().toISOString(), base: BASE, captures: [] };

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const buttons = await page.$$('.globe-list button');
    for (const button of buttons) {
      if ((await button.evaluate((node) => node.textContent || '')).includes('France')) {
        await button.click();
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (const view of VIEWS) {
      await page.evaluate((target) => window.VATLAS.goView(target), view);
      await new Promise((resolve) => setTimeout(resolve, 450));
      const metrics = await page.evaluate(() => ({
        view: window.VATLAS.getState().view,
        nodes: document.querySelectorAll('*').length,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        emptyContainers: [...document.querySelectorAll('.help-sheet, .detail-sheet, .shell-stage, .points-matrix')]
          .filter((node) => !node.textContent.trim()).length,
        live: document.querySelectorAll('[aria-live],[role="status"]').length,
      }));
      const name = `${view}-${viewport.name}.png`;
      await page.screenshot({ path: path.join(OUT, name), fullPage: false });
      report.captures.push({ name, viewport: viewport.name, ...metrics });
      console.log(`${name} — ${metrics.nodes} nœuds, live ${metrics.live}`);
    }
    report.captures.push({ viewport: viewport.name, errors: errors.slice(0, 10) });
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.captures.length} entrées dans screenshots/v2/report.json`);
