#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181/index.html';
const errors = [];
let failed = 0;
function check(name, condition, detail = '') {
  if (!condition) failed += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await new Promise((resolve) => setTimeout(resolve, 1200));

check('accueil = globe', await page.evaluate(() => window.VATLAS.getState().view === 'globe'));
check('10 pays listés', (await page.$$('.globe-list button')).length === 10);
const buttons = await page.$$('.globe-list button');
let franceIndex = 0;
for (let i = 0; i < buttons.length; i += 1) {
  const text = await buttons[i].evaluate((node) => node.textContent || '');
  if (text.includes('France')) { franceIndex = i; break; }
}
await buttons[franceIndex].click();
await new Promise((resolve) => setTimeout(resolve, 600));
check('pays → chronologie', await page.evaluate(() => window.VATLAS.getState().view === 'chronology' && Boolean(window.VATLAS.getState().countryId)));
check('repères affichés', (await page.$$('.event-card')).length > 0);
await page.keyboard.press('ArrowRight');
await new Promise((resolve) => setTimeout(resolve, 250));
check('flèche change de repère', await page.evaluate(() => window.VATLAS.getState().eventIndex === 1));
await page.keyboard.press('Enter');
await new Promise((resolve) => setTimeout(resolve, 250));
check('Entrée ouvre le détail', (await page.$$('.detail-sheet')).length === 1);
await page.keyboard.press('Escape');
await new Promise((resolve) => setTimeout(resolve, 250));
check('Échap ferme le détail', (await page.$$('.detail-sheet')).length === 0);
await page.keyboard.press('3');
await new Promise((resolve) => setTimeout(resolve, 300));
check('3 = récit', await page.evaluate(() => window.VATLAS.getState().view === 'recit'));
check('un point affiché', (await page.$$('.recit-title')).length === 1);
await page.keyboard.press('4');
await new Promise((resolve) => setTimeout(resolve, 300));
check('4 = géographie', await page.evaluate(() => window.VATLAS.getState().view === 'geography'));
check('marqueurs présents', (await page.$$('.geo-marker')).length > 0);
await page.keyboard.press('5');
await new Promise((resolve) => setTimeout(resolve, 300));
check('5 = constellation', await page.evaluate(() => window.VATLAS.getState().view === 'constellation'));
await page.keyboard.press('6');
await new Promise((resolve) => setTimeout(resolve, 300));
check('6 = points', await page.evaluate(() => window.VATLAS.getState().view === 'points'));
check('orbites figées', await page.evaluate(() => !document.querySelector('.constellation-field')?.querySelector('[style*="animation"]')));
await page.keyboard.press('1');
await new Promise((resolve) => setTimeout(resolve, 300));
check('1 = globe', await page.evaluate(() => window.VATLAS.getState().view === 'globe'));
check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `${failed} échec(s)` : 'Tous les tests E2E passent.');
process.exit(failed ? 1 : 0);
