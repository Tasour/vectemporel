#!/usr/bin/env node
/* Parcours des récits guidés : ouverture, jalons, navigation, deep link, mobile. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.TRAILS_PORT || '4189';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

check('serveur récits démarré', await waitForHttp(BASE));
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
  page.on('response', (response) => {
    if (response.status() >= 400 && !/\/src\/data\/years\/c-?\d+\.json/.test(response.url())) {
      errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await wait(800);

  check('bouton Récits visible', Boolean(await page.$('#hud-trails-button')));
  await page.click('#hud-trails-button');
  await wait(150);
  check('panneau ouvert', await page.evaluate(() => !document.getElementById('trails-panel').hidden));
  check('dix récits proposés', (await page.$$('#trails-list .trail-item')).length === 10);
  await page.select('#trail-difficulty', 'expert');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('filtre difficulté', await page.evaluate(() => document.getElementById('trails-list').dataset.visible === '1'));
  await page.select('#trail-tag', 'Commerce');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('filtre combiné', await page.evaluate(() => document.getElementById('trails-list').dataset.visible === '1'
    && [...document.querySelectorAll('#trails-list .trail-item')].filter((item) => !item.hidden)
      .every((item) => item.dataset.difficulty === 'expert' && item.dataset.tags.includes('Commerce'))));
  await page.select('#trail-difficulty', 'tous');
  await page.select('#trail-tag', 'tous');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('aria-expanded vrai', await page.evaluate(() => document.getElementById('hud-trails-button').getAttribute('aria-expanded') === 'true'));

  await page.click('.trail-item[data-trail="soie"]');
  await page.waitForFunction(() => window.VATLAS.getState().year === -138, { timeout: 10000 });
  check('premier jalon : année -138', await page.evaluate(() => window.VATLAS.getState().year === -138));
  check('premier jalon : Kachgar sélectionnée', await page.evaluate(() => window.VATLAS.getState().selected === 'Kashgar'));
  check('fiche fermée pendant le récit', await page.evaluate(() => document.getElementById('hud-card').hidden));
  check('texte du jalon affiché', await page.evaluate(() => /Zhang Qian/.test(document.getElementById('trails-step-text').textContent)));
  check('preuve affichée', await page.evaluate(() => /Chronas.*XIO.*-138/.test(document.getElementById('trails-evidence').textContent)));
  await page.waitForFunction(() => [...document.querySelectorAll('#trails-facts dd')][1]?.textContent === 'Tocharian', { timeout: 10000 });
  check('faits à l’année du jalon', await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#trails-facts dd')].map((node) => node.textContent);
    return cells[0] === 'Xiongnu' && cells[1] === 'Tocharian' && cells[2] === '—' && cells[3] === '1000 hab';
  }));
  check('deep link du jalon', await page.evaluate(() => {
    const params = new URLSearchParams(location.search);
    return params.get('trail') === 'soie' && params.get('step') === '0';
  }));
  check('bouton précédent désactivé', await page.evaluate(() => document.getElementById('trails-prev').disabled));

  await page.click('#trails-next');
  await page.waitForFunction(() => window.VATLAS.getState().year === 100, { timeout: 10000 });
  check('jalon suivant : année 100', await page.evaluate(() => window.VATLAS.getState().year === 100));
  check('jalon suivant : URL étape 1', await page.evaluate(() => new URLSearchParams(location.search).get('step') === '1'));
  check('précédent réactivé', await page.evaluate(() => !document.getElementById('trails-prev').disabled));
  await page.click('#trails-prev');
  await page.waitForFunction(() => window.VATLAS.getState().year === -138, { timeout: 10000 });
  check('retour au premier jalon', await page.evaluate(() => window.VATLAS.getState().trail.index === 0 && window.VATLAS.getState().year === -138));

  /* Clavier : la touche T bascule le panneau. */
  await page.keyboard.press('Escape');
  await wait(120);
  check('Échap quitte le récit', await page.evaluate(() => document.getElementById('trails-panel').hidden && !window.VATLAS.getState().trail.active));
  await page.keyboard.press('t');
  await wait(120);
  check('touche T rouvre la liste', await page.evaluate(() => !document.getElementById('trails-panel').hidden && !document.getElementById('trails-list').hidden));
  await page.keyboard.press('Escape');

  /* Reprise d'un récit après rechargement. */
  const restored = await browser.newPage();
  await restored.setViewport({ width: 1440, height: 900 });
  restored.on('pageerror', (error) => errors.push(error.message));
  await restored.goto(`${BASE}?trail=islam&step=2`, { waitUntil: 'load', timeout: 60000 });
  await restored.waitForFunction(() => window.VATLAS?.getState?.().trail?.active === true, { timeout: 15000 });
  check('deep link : récit repris', await restored.evaluate(() => window.VATLAS.getState().trail.id === 'islam' && window.VATLAS.getState().trail.index === 2));
  check('deep link : année 700', await restored.evaluate(() => window.VATLAS.getState().year === 700));
  check('deep link : Damas sélectionnée', await restored.evaluate(() => window.VATLAS.getState().selected === 'Damascus'));
  await restored.click('#trails-stop');
  await wait(120);
  check('quitter efface le deep link', await restored.evaluate(() => {
    const params = new URLSearchParams(location.search);
    return document.getElementById('trails-panel').hidden && !params.has('trail') && !window.VATLAS.getState().trail.active;
  }));
  await restored.close();

  /* Mobile : cibles tactiles et panneau dans le viewport. */
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await mobile.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  await wait(600);
  await mobile.click('#hud-trails-button');
  await wait(150);
  check('mobile : cinq cibles ≥ 44 px', await mobile.evaluate(() => [...document.querySelectorAll('.trail-item')]
    .every((item) => item.getBoundingClientRect().height >= 44)));
  await mobile.click('.trail-item[data-trail="savoir"]');
  await mobile.waitForFunction(() => window.VATLAS.getState().trail.id === 'savoir', { timeout: 10000 });
  check('mobile : panneau dans le viewport', await mobile.evaluate(() => {
    const box = document.getElementById('trails-panel').getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth + 1 && box.top >= 0 && box.bottom <= innerHeight + 1;
  }));
  check('mobile : boutons de navigation ≥ 44 px', await mobile.evaluate(() => [...document.querySelectorAll('.trails-btn')]
    .every((item) => item.getBoundingClientRect().height >= 44)));
  await mobile.close();

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}

console.log(failed ? `${failed} échec(s)` : 'Parcours récits OK.');
process.exit(failed ? 1 : 0);
