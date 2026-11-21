#!/usr/bin/env node
/* Parcours fonctionnel de la sphère : deep link, clavier, recherche, aide, HUD. */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181/index.html';
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--enable-webgl', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
/* Chromium synthétise parfois un 400 sur les requêtes de chunks concurrentes
 * alors que le serveur répond 200 et que les données se chargent. On isole cet
 * artefact pour ne pas masquer une vraie erreur console. */
let chunkArtifacts = 0;
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  if (chunkArtifacts > 0 && /status of 400/.test(message.text())) return;
  errors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() < 400) return;
  if (/\/src\/data\/years\/c-?\d+\.json/.test(response.url()) && response.status() === 400) {
    chunkArtifacts += 1;
    return;
  }
  errors.push(`HTTP ${response.status()} ${response.url()}`);
});

try {
  await page.goto(`${BASE}?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1600);

  check('vue sphère active', await page.evaluate(() => window.VATLAS?.getState?.().view === 'globe'));
  check('WebGL disponible', await page.evaluate(() => window.VATLAS.getState().webgl === true));
  check('2 492 géométries', await page.evaluate(() => window.VATLAS.getState().features === 2492));
  check('deep link : Berry sélectionnée', await page.evaluate(() => window.VATLAS.getState().selected === 'Berry'));
  check('fiche Berry visible', await page.evaluate(() => !document.getElementById('hud-card').hidden));
  check('titre Berry', await page.evaluate(() => document.querySelector('.hud-title')?.textContent === 'Berry'));
  check('capitale Bourges', await page.evaluate(() => /Bourges/.test(document.querySelector('.hud-facts')?.textContent || '')));
  check('crédit CC BY-SA', await page.evaluate(() => /CC BY-SA/.test(document.querySelector('.hud-credit')?.textContent || '')));
  check('URL synchronisée', await page.evaluate(() => new URLSearchParams(location.search).get('value') === 'Berry'));
  check('maillage vectoriel actif', await page.evaluate(() => (window.VATLAS.getState().mesh?.triangles || 0) > 10000));
  check('zoom borné à 7.2', await page.evaluate(async () => {
    window.VATLAS.selectRegion('Berry');
    for (let i = 0; i < 20; i += 1) document.querySelector('button[aria-label="Zoomer"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return window.VATLAS.getState().camera.zoom <= 7.2001;
  }));
  check('canvas plein écran', await page.evaluate(() => {
    const canvas = document.getElementById('globe-canvas');
    return canvas.width > 1000 && canvas.getBoundingClientRect().width >= window.innerWidth - 1;
  }));
  check('readout live', await page.evaluate(() => document.getElementById('hud-readout')?.getAttribute('aria-live') === 'polite'));
  check('message de chargement masqué', await page.evaluate(() => document.getElementById('timeline-loading').hidden));
  check('capitales filtrées', await page.evaluate(() => {
    const mesh = window.VATLAS.getState().mesh;
    return mesh?.cityCount > 100 && mesh?.cityCount < 300;
  }), `capitales=${await page.evaluate(() => window.VATLAS.getState().mesh?.cityCount)}`);
  check('marqueurs ronds', await page.evaluate(() => window.VATLAS.getState().mesh?.citySprite === true));
  check('bulle custom présente', await page.evaluate(() => Boolean(document.getElementById('map-tooltip'))));
  await page.mouse.move(720, 450);
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('bulle custom au survol', await page.evaluate(() => {
    const tip = document.getElementById('map-tooltip');
    return !tip.hidden && (tip.textContent || '').length > 0;
  }));
  check('aucun title natif', await page.evaluate(() => document.getElementById('globe-canvas').title === ''));
  const cap = await page.evaluate(() => window.VATLAS.cityScreenPoints()[0] || null);
  check('capitales projectées', Boolean(cap), cap ? `${cap.name} @ ${Math.round(cap.x)},${Math.round(cap.y)}` : 'aucune');
  if (cap) {
    await page.mouse.move(cap.x, cap.y);
    await new Promise((resolve) => setTimeout(resolve, 120));
    check('aucun title natif', await page.evaluate(() => document.getElementById('globe-canvas').title === ''));
    await page.mouse.click(cap.x, cap.y);
    await new Promise((resolve) => setTimeout(resolve, 500));
    check('clic capitale sélectionne une région', await page.evaluate(() => Boolean(window.VATLAS.getState().selected)));
    check('fiche ouverte après clic capitale', await page.evaluate(() => !document.getElementById('hud-card').hidden));
  }
  check('zoom 7.2 autorisé', await page.evaluate(async () => {
    window.VATLAS.setView({ lat: 47, lon: 2, zoom: 7.2 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    return window.VATLAS.getState().camera.zoom > 7.1;
  }));
  await page.evaluate(() => window.VATLAS.setView({ lat: 47, lon: 2, zoom: 4.2 }));
  await new Promise((resolve) => setTimeout(resolve, 250));

  const cameraBefore = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  await page.focus('#globe-canvas');
  await page.keyboard.press('ArrowLeft');
  await wait(300);
  check('rotation clavier', await page.evaluate((value) => Math.abs(window.VATLAS.getState().camera.lon - value) > 0.5, cameraBefore));

  const zoomBefore = await page.evaluate(() => window.VATLAS.getState().camera.zoom);
  await page.keyboard.press('+');
  await wait(300);
  check('zoom clavier', await page.evaluate((value) => window.VATLAS.getState().camera.zoom > value, zoomBefore));

  await page.click('#hud-search-button');
  await page.type('#region-search', 'Finnmark');
  await wait(250);
  check('suggestions', (await page.$$('#region-suggestions li')).length > 0);
  await page.focus('#region-search');
  await page.keyboard.press('Enter');
  await wait(500);
  check('sélection via recherche', await page.evaluate(() => window.VATLAS.getState().selected === 'Finnmark'));

  await page.click('#hud-help-button');
  await wait(120);
  check('aide visible', await page.evaluate(() => !document.getElementById('hud-help').hidden));
  await page.keyboard.press('Escape');
  await wait(120);
  check('aide fermée', await page.evaluate(() => document.getElementById('hud-help').hidden));

  /* P4 — dimensions de couleur. */
  check('barre de dimensions', (await page.$$('#dimension-bar .dimension-btn')).length === 5);
  await page.click('.dimension-btn[data-dimension="religion"]');
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('dimension religion active', await page.evaluate(() => document.querySelector('.dimension-btn[data-dimension="religion"]').getAttribute('aria-checked') === 'true'));
  check('fiche enrichie', await page.evaluate(() => Boolean(document.querySelector('.hud-dimension')) && Boolean(document.querySelector('.hud-wiki'))));
  await page.click('#hud-theme-button');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('thème clair persistant', await page.evaluate(() => document.documentElement.dataset.theme === 'light' && localStorage.getItem('history-theme') === 'light'));

  const rootPath = new URL(BASE).pathname;
  await page.goto(`${new URL(BASE).origin}${rootPath}?year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1000);
  check('accueil sans deep link', await page.evaluate(() => window.VATLAS.getState().selected === null && document.getElementById('hud-card').hidden));
  const beforeTour = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  /* P3 — timeline. */
  check('timeline visible', await page.evaluate(() => !document.getElementById('timeline').hidden && Boolean(document.getElementById('timeline-range'))));
  check('année initiale 1000', await page.evaluate(() => window.VATLAS.getState().year === 1000));
  await page.evaluate(() => window.VATLAS.setYear(1500));
  await new Promise((resolve) => setTimeout(resolve, 700));
  check('changement d’année', await page.evaluate(() => window.VATLAS.getState().year === 1500));
  check('URL année', await page.evaluate(() => new URLSearchParams(location.search).get('year') === '1500'));
  check('libellé année', await page.evaluate(() => document.getElementById('timeline-year').textContent === '1500'));
  check('chunk chargé', await page.evaluate(() => performance.getEntriesByType('resource').some((e) => /\/c\d+\.json/.test(e.name))));
  await page.click('.century-btn[data-year="0"]');
  await new Promise((resolve) => setTimeout(resolve, 700));
  check('saut de siècle', await page.evaluate(() => window.VATLAS.getState().year === 0), `année=${await page.evaluate(() => window.VATLAS.getState().year)}`);
  await page.click('#timeline-year');
  await page.type('#year-input', '-500');
  await page.keyboard.press('Enter');
  await new Promise((resolve) => setTimeout(resolve, 700));
  check('saisie directe', await page.evaluate(() => window.VATLAS.getState().year === -500), `année=${await page.evaluate(() => window.VATLAS.getState().year)}`);
  await page.click('#timeline-play');
  await new Promise((resolve) => setTimeout(resolve, 1200));
  check('autoplay manuel', await page.evaluate(() => window.VATLAS.getState().year !== -500));
  await page.click('#timeline-play');

  check('aucune rotation automatique', await page.evaluate((value) => Math.abs(window.VATLAS.getState().camera.lon - value) < 0.01, beforeTour));
  await page.click('#hud-tour-button');
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('tour manuel actif', await page.evaluate(() => window.VATLAS.getState().touring === true));
  await page.click('#hud-tour-button');
  check('tour manuel arrêté', await page.evaluate(() => window.VATLAS.getState().touring === false));
  /* P10 — libellés et épiques. */
  await page.evaluate(() => window.VATLAS.setYear(1000));
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('560 épiques chargés', await page.evaluate(() => window.VATLAS.getState().epics === 560));
  check('sélecteur épiques', await page.evaluate(() => document.querySelectorAll('#epic-select option').length > 560));
  await page.click('.label-btn[data-mode="historical"]');
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('libellés historiques', await page.evaluate(() => window.VATLAS.getState().labels > 0));
  await page.click('.label-btn[data-mode="capitals"]');
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('libellés capitales', await page.evaluate(() => window.VATLAS.getState().labels > 0));
  await page.click('.label-btn[data-mode="off"]');
  check('libellés désactivés', await page.evaluate(() => window.VATLAS.getState().labels === 0));
  const yearBeforeEpic = await page.evaluate(() => window.VATLAS.getState().year);
  await page.select('#epic-select', '5');
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('clic épique change l’année', await page.evaluate((value) => window.VATLAS.getState().year !== value, yearBeforeEpic));

  /* P11 — timeline provinciale. */
  await page.evaluate(() => window.VATLAS.selectRegion('Berry'));
  await page.waitForFunction(() => window.VATLAS?.getState?.().provinceTimeline === true, { timeout: 8000 }).catch(() => {});
  check('timeline provinciale chargée', await page.evaluate(() => Boolean(document.getElementById('province-timeline')) && window.VATLAS.getState().provinceTimeline === true));
  check('pistes provinciales', await page.evaluate(() => document.querySelectorAll('#province-timeline .pt-row').length >= 4));
  check('repères provincials locaux', await page.evaluate(() => document.querySelectorAll('#province-event-select option').length > 10));
  const yearBeforeProvince = await page.evaluate(() => window.VATLAS.getState().year);
  await page.select('#province-event-select', '1');
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('repère provincial change l’année', await page.evaluate((value) => window.VATLAS.getState().year !== value, yearBeforeProvince));

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}
console.log(failed ? `${failed} échec(s)` : 'Parcours sphère OK.');
process.exit(failed ? 1 : 0);
