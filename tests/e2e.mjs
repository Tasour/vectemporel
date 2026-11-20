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
check('diagnostics absent en production', await page.evaluate(() => document.querySelectorAll('[id$="-diagnostics-toggle"]').length === 0));
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
check('un h1 dans la vue', await page.evaluate(() => document.querySelectorAll('main h1').length === 1));
check('au plus 2 régions live', await page.evaluate(() => document.querySelectorAll('[aria-live],[role="status"]').length <= 2));
check('cibles tactiles >= 44px', await page.evaluate(() => [...document.querySelectorAll('button.atlas-chrono-tag, button.nav-c2-back, .points-grid-row > button')].every((node) => node.getBoundingClientRect().height >= 44)));
await page.keyboard.press('ArrowRight');
await new Promise((resolve) => setTimeout(resolve, 250));
check('flèche change de repère', await page.evaluate(() => window.VATLAS.getState().eventIndex === 1));
await page.keyboard.press('Enter');
await new Promise((resolve) => setTimeout(resolve, 250));
check('Entrée ouvre le détail', (await page.$$('.detail-sheet')).length === 1);
check('badge audit non signé', await page.evaluate(() => /Audit non signé/.test(document.querySelector('.detail-audit-state')?.textContent || '')));
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
check('h1 géographie', await page.evaluate(() => document.querySelectorAll('main h1').length === 1));
await page.keyboard.press('5');
await new Promise((resolve) => setTimeout(resolve, 300));
check('5 = constellation', await page.evaluate(() => window.VATLAS.getState().view === 'constellation'));
check('h1 constellation', await page.evaluate(() => document.querySelectorAll('main h1').length === 1));
await page.keyboard.press('6');
await new Promise((resolve) => setTimeout(resolve, 300));
check('6 = points', await page.evaluate(() => window.VATLAS.getState().view === 'points'));
check('h1 points', await page.evaluate(() => document.querySelectorAll('main h1').length === 1));
check('orbites figées', await page.evaluate(() => !document.querySelector('.constellation-field')?.querySelector('[style*="animation"]')));
await page.keyboard.press('1');
await new Promise((resolve) => setTimeout(resolve, 300));
check('1 = globe', await page.evaluate(() => window.VATLAS.getState().view === 'globe'));
check('taxonomie alignée', await page.evaluate(() => window.VECTEMPOREL_KEYS?.taxonomyAligned?.() === true));
check('zéro collision de raccourcis', await page.evaluate(() => (window.VECTEMPOREL_KEYS?.conflicts?.() || ['non exposé']).length === 0));
check('6 vues déclarées', await page.evaluate(() => (window.VATLAS?.taxonomy?.length || 0) === 6));
check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `${failed} échec(s)` : 'Tous les tests E2E passent.');
process.exit(failed ? 1 : 0);
