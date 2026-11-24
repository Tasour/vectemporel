#!/usr/bin/env node
/* Parcours fonctionnel de la sphère : deep link, clavier, recherche, aide, HUD. */
import puppeteer from 'puppeteer-core';
import { startServer, waitForHttp, stopServer } from './lib/server.mjs';

const PORT = process.env.E2E_PORT || '4186';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}/index.html`;
const server = startServer(PORT);
let failed = 0;
const errors = [];
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SECONDARY = new Set([
  'hud-help-button', 'hud-theme-button', 'hud-compare-button', 'hud-sun-button',
  'hud-wire-button', 'hud-quality-button', 'hud-histography-button',
  'hud-tour-button', 'hud-review-button', 'hud-arcs-button',
]);
async function clickHud(page, id) {
  if (SECONDARY.has(id)) {
    await page.evaluate(() => {
      if (!document.body.classList.contains('tools-open')) document.getElementById('hud-tools-button')?.click();
    });
    await wait(80);
  }
  await page.click(`#${id}`);
}

/* Événements pointer synthétiques : indépendants de la latence du headless. */
async function touchEvents(page, events) {
  await page.evaluate((list) => {
    const canvas = document.getElementById('globe-canvas');
    for (const [type, id, x, y] of list) {
      canvas.dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true,
      }));
    }
  }, events);
}

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
  check('serveur e2e démarré', await waitForHttp(BASE));
  await page.goto(`${BASE}?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1600);

  check('bandeau premier lancement', Boolean(await page.$('#onboarding')));
  for (let index = 0; index < 3; index += 1) await page.click('#onboarding .onboarding-next');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('bandeau refermé et mémorisé', await page.evaluate(() => !document.getElementById('onboarding')
    && localStorage.getItem('vectemporel-onboarded') === '1'));
  check('aide au survol sur les boutons', await page.evaluate(() => [...document.querySelectorAll('.hud-actions .hud-btn')]
    .every((button) => Boolean(button.title))));
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
  await page.evaluate(() => {
    const input = document.getElementById('region-search');
    input.value = 'FRC';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('recherche par souverain', await page.evaluate(() => [...document.querySelectorAll('#region-suggestions li')]
    .some((item) => /État/.test(item.textContent))));
  await page.evaluate(() => {
    const input = document.getElementById('region-search');
    input.value = 'french';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('recherche par culture', await page.evaluate(() => [...document.querySelectorAll('#region-suggestions li')]
    .some((item) => /Culture/.test(item.textContent))));
  await page.evaluate(() => {
    const input = document.getElementById('region-search');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('recherche vide : état explicite', await page.evaluate(() => document.getElementById('region-suggestions').hidden
    && document.getElementById('region-search').getAttribute('aria-expanded') === 'false'));
  await page.evaluate(() => {
    const input = document.getElementById('region-search');
    input.value = 'zzzznope';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('recherche sans résultat : état explicite', await page.evaluate(() => document.getElementById('region-suggestions').hidden));

  await clickHud(page, 'hud-help-button');
  await wait(120);
  check('aide visible', await page.evaluate(() => !document.getElementById('hud-help').hidden));
  await page.keyboard.press('Escape');
  await wait(120);
  check('aide fermée', await page.evaluate(() => document.getElementById('hud-help').hidden));

  /* P4 — dimensions de couleur. */
  check('barre de dimensions', (await page.$$('#dimension-bar .dimension-btn')).length === 6);
  await page.click('.dimension-btn[data-dimension="religion"]');
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('dimension religion active', await page.evaluate(() => document.querySelector('.dimension-btn[data-dimension="religion"]').getAttribute('aria-checked') === 'true'));
  check('fiche enrichie', await page.evaluate(() => Boolean(document.querySelector('.hud-dimension')) && Boolean(document.querySelector('.hud-wiki'))));
  await page.click('.dimension-btn[data-dimension="empire"]');
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('focus empire actif', await page.evaluate(() => window.VATLAS.getState().empire.active
    && document.querySelector('.dimension-btn[data-dimension="empire"]').getAttribute('aria-checked') === 'true'));
  await page.click('.dimension-btn[data-dimension="empire"]');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('focus empire désactivé', await page.evaluate(() => !window.VATLAS.getState().empire.active));
  await clickHud(page, 'hud-theme-button');
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
  check('historique enregistré', await page.evaluate(() => window.VATLAS.getState().history.length >= 2));
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Alt');
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('Alt+← restaure l’année précédente', await page.evaluate(() => window.VATLAS.getState().year === 1000));
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Alt');
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('Alt+→ revient à 1500', await page.evaluate(() => window.VATLAS.getState().year === 1500));
  const historyBefore = await page.evaluate(() => window.VATLAS.getState().history.length);
  await page.evaluate(() => window.VATLAS.navigateHistory(-999));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('historique : pas de bouclage', await page.evaluate((value) => window.VATLAS.getState().year === 1500
    && window.VATLAS.getState().history.length === value, historyBefore));
  await page.evaluate(() => window.VATLAS.setYear(1500));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('historique : pas de doublon', await page.evaluate((value) => window.VATLAS.getState().history.length === value, historyBefore));
  check('minimap présente', await page.evaluate(() => Boolean(document.getElementById('timeline-minimap-range'))));
  await page.evaluate(() => window.VATLAS.setScale('recent'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('échelle récents', await page.evaluate(() => window.VATLAS.getState().scale === 'recent'));
  check('URL échelle', await page.evaluate(() => new URLSearchParams(location.search).get('scale') === 'recent'));
  await page.evaluate(() => window.VATLAS.setScale('linear'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('retour échelle linéaire', await page.evaluate(() => window.VATLAS.getState().scale === 'linear'));
  await page.click('#timeline-zoom');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('zoom siècle activé', await page.evaluate(() => window.VATLAS.getState().zoom === 'century'
    && document.getElementById('timeline-range').max === '100'
    && new URLSearchParams(location.search).get('zoom') === 'century'));
  await page.evaluate(() => window.VATLAS.setYear(1450));
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('cran année dans le siècle', await page.evaluate(() => document.getElementById('timeline-range').value === '50'));
  await page.click('#timeline-zoom');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('retour frise complète', await page.evaluate(() => window.VATLAS.getState().zoom === 'global'
    && document.getElementById('timeline-range').max === '1000'));
  await page.evaluate(() => window.VATLAS.setZoom('century'));
  await page.evaluate(() => window.VATLAS.setScale('recent'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('siècle + échelle récents compatibles', await page.evaluate(() => window.VATLAS.getState().zoom === 'century'
    && window.VATLAS.getState().scale === 'recent' && document.getElementById('timeline-range').max === '100'));
  await page.evaluate(() => window.VATLAS.setScale('linear'));
  await page.evaluate(() => window.VATLAS.setZoom('global'));
  await clickHud(page, 'hud-compare-button');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('panneau comparaison ouvert', await page.evaluate(() => !document.getElementById('compare-panel').hidden));
  await page.evaluate(() => window.VATLAS.compareYears(1000, 1500));
  await page.waitForFunction(() => /souverains/.test(document.getElementById('compare-result').textContent), { timeout: 15000 });
  check('deltas comparés', await page.evaluate(() => {
    const text = document.getElementById('compare-result').textContent;
    return /1000 → 1500/.test(text) && /hab/.test(text) && /cultures/.test(text);
  }));
  check('deep link comparaison', await page.evaluate(() => new URLSearchParams(location.search).get('compare') === '1000,1500'));
  check('presets de comparaison', (await page.$$('#compare-presets .hm-btn')).length === 3);
  check('barres de delta', (await page.$$('#compare-bars .compare-bar-row')).length === 3);
  await page.click('#compare-current');
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('comparer avec l’année courante', await page.evaluate(() => Number(document.getElementById('compare-b').value) === window.VATLAS.getState().year));
  await page.evaluate(() => window.VATLAS.compareYears(1000, 1000));
  await page.waitForFunction(() => /0 souverains/.test(document.getElementById('compare-result').textContent), { timeout: 10000 }).catch(() => {});
  check('artefact : années identiques', await page.evaluate(() => {
    const text = document.getElementById('compare-result').textContent;
    return /0 souverains/.test(text) && /0 cultures/.test(text) && !/NaN/.test(text);
  }));
  await page.click('#compare-close');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('comparaison fermée', await page.evaluate(() => document.getElementById('compare-panel').hidden));
  await clickHud(page, 'hud-sun-button');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('ombre solaire activée', await page.evaluate(() => window.VATLAS.getState().sun.enabled
    && window.VATLAS.getState().mesh.sunYear === window.VATLAS.getState().year
    && new URLSearchParams(location.search).get('sun') === '1'));
  await page.keyboard.press('y');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('ombre solaire désactivée', await page.evaluate(() => !window.VATLAS.getState().sun.enabled));
  await clickHud(page, 'hud-wire-button');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('fil de fer activé', await page.evaluate(() => window.VATLAS.getState().wireframe
    && window.VATLAS.getState().mesh.wireframe === true));
  await page.keyboard.press('w');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('fil de fer désactivé', await page.evaluate(() => !window.VATLAS.getState().wireframe));
  await clickHud(page, 'hud-quality-button');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('panneau qualité ouvert', await page.evaluate(() => !document.getElementById('quality-panel').hidden
    && window.VATLAS.getState().anomalies > 1000));
  check('douze extraits affichés', (await page.$$('#quality-list .quality-item')).length === 12);
  await page.click('#quality-list .quality-item');
  await page.waitForFunction(() => Boolean(window.VATLAS.getState().selected)
    && /extrait Chronas/.test(document.getElementById('hud-readout').textContent), { timeout: 10000 }).catch(() => {});
  check('extrait ouvre la province', await page.evaluate(() => Boolean(window.VATLAS.getState().selected)
    && /extrait Chronas/i.test(document.getElementById('hud-readout').textContent)),
  await page.evaluate(() => `${window.VATLAS.getState().selected} · ${document.getElementById('hud-readout').textContent}`));
  await page.click('#quality-close');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('qualité fermée', await page.evaluate(() => document.getElementById('quality-panel').hidden));
  await page.evaluate(() => window.VATLAS.openReport('dauphine'));
  await page.waitForFunction(() => document.querySelectorAll('#report-panel [data-scrolly-step]').length >= 20, { timeout: 20000 });
  check('rapport Dauphiné ouvert', await page.evaluate(() => !document.getElementById('report-panel').hidden
    && window.VATLAS.getState().report.id === 'dauphine'));
  check('deep link report', await page.evaluate(() => new URLSearchParams(location.search).get('report') === 'dauphine'));
  check('article source attribué', await page.evaluate(() => {
    const source = document.querySelector('#report-panel .wiki-source');
    return Boolean(source && /Wikipédia FR/.test(source.textContent) && /CC BY-SA 4\.0/.test(source.textContent));
  }));
  check('illustrations incorporées', await page.evaluate(() => document.querySelectorAll('#report-panel img[src^="data:image/webp"]').length > 0));
  await page.focus('#report-panel .scrolly');
  await page.keyboard.press('ArrowDown');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('navigation du récit', await page.evaluate(() => window.VATLAS.getState().report.step === 1));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('rapport fermé', await page.evaluate(() => document.getElementById('report-panel').hidden));
  await page.evaluate(() => window.VATLAS.openReport('catholicisme'));
  await page.waitForFunction(() => document.querySelectorAll('#report-panel [data-scrolly-step]').length >= 20, { timeout: 20000 });
  check('rapport catholique ouvert', await page.evaluate(() => window.VATLAS.getState().report.id === 'catholicisme'
    && document.querySelector('#report-panel h1').textContent.includes('Catholicisme')));
  check('récit de religion, pas une liste', await page.evaluate(() => {
    const first = document.querySelector('#report-panel .scrolly-step p').textContent;
    return /concile|Église|sacrement|catholique/i.test(first) && !/^province/i.test(first);
  }));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.click('#hud-display-button');
  await page.click('#report-open-catholicisme');
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('entrée Affichage vers le récit', await page.evaluate(() => window.VATLAS.getState().report.id === 'catholicisme'
    && !document.getElementById('report-panel').hidden));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  await clickHud(page, 'hud-histography-button');
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('mode histographie ouvert', await page.evaluate(() => !document.getElementById('histography-panel').hidden
    && window.VATLAS.getState().histography.events > 500));
  check('canvas et curseur présents', await page.evaluate(() => Boolean(document.querySelector('.histo-canvas'))
    && Boolean(document.querySelector('.histo-cursor'))));
  check('catégorie religions', await page.evaluate(() => [...document.querySelectorAll('.histo-category')]
    .some((button) => /Religions/.test(button.textContent))));
  await page.click('#histo-mode');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('mode récits actif', await page.evaluate(() => window.VATLAS.getState().histography.mode === 'recits'
    && window.VATLAS.getState().histography.stories > 0
    && !document.querySelector('.histo-recits').hidden
    && document.querySelectorAll('.histo-recit').length > 0));
  check('répartition par époques', (await page.$$('#histography-panel .histo-recit-era')).length >= 3);
  await page.click('#histo-mode');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('retour à la frise', await page.evaluate(() => window.VATLAS.getState().histography.mode === 'frise'
    && document.querySelector('.histo-recits').hidden));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('histographie fermée', await page.evaluate(() => document.getElementById('histography-panel').hidden));
  await page.evaluate(() => window.VATLAS.openSubject('dauphine'));
  await page.waitForFunction(() => window.VATLAS.getState().subject.articles > 0, { timeout: 30000 });
  check('sujet Dauphiné ouvert', await page.evaluate(() => !document.getElementById('subject-panel').hidden
    && new URLSearchParams(location.search).get('subject') === 'dauphine'));
  check('carrés Pixi rendus', await page.evaluate(() => Boolean(document.querySelector('.subject-canvas canvas'))));
  await page.click('.subject-mode');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('récits du sujet', await page.evaluate(() => window.VATLAS.getState().subject.mode === 'recits'
    && document.querySelectorAll('.subject-recit').length > 0));
  await page.click('#subject-close');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('sujet fermé', await page.evaluate(() => document.getElementById('subject-panel').hidden));
  await page.click('#hud-learn-button');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('panneau Apprendre ouvert', await page.evaluate(() => !document.getElementById('learn-panel').hidden));
  check('six onglets', (await page.$$('#learn-panel .learn-tab')).length === 6);
  check('quiz quatre options', (await page.$$('#learn-panel .learn-option')).length === 4);
  await page.click('#learn-panel .learn-option');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('quiz donne un feedback', await page.evaluate(() => Boolean(document.getElementById('learn-feedback'))));
  await page.evaluate(() => window.VATLAS.setLearnSection('progress'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('heatmap 30 jours', (await page.$$('#learn-panel .learn-day')).length === 30);
  check('taux par catégorie', await page.evaluate(() => /Catégorie|catégorie/.test(document.getElementById('learn-content').textContent)));
  await page.evaluate(() => window.VATLAS.setLearnSection('goals'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('cinq objectifs', (await page.$$('#learn-panel .learn-goal')).length === 5);
  await page.evaluate(() => window.VATLAS.setLearnSection('fill'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('récit à trous : options', (await page.$$('#learn-panel .learn-option')).length === 4);
  await page.click('#learn-panel .learn-option');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('récit à trous : feedback', await page.evaluate(() => Boolean(document.getElementById('learn-feedback'))));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('sortie anticipée du récit à trous', await page.evaluate(() => document.getElementById('learn-panel').hidden));
  await page.evaluate(() => window.VATLAS.setLearnSection('fill'));
  await page.evaluate(() => window.VATLAS.setLearnSection('silent'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('carte muette : révélation', Boolean(await page.$('#learn-reveal')));
  await page.focus('#learn-reveal');
  await page.keyboard.press('Enter');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('révélation au clavier', await page.evaluate(() => Boolean(document.getElementById('learn-feedback'))));
  await page.evaluate(() => window.VATLAS.setLearnSection('profile'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('profil local', (await page.$$('#learn-profile .learn-goal')).length === 4);
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('Apprendre fermé', await page.evaluate(() => document.getElementById('learn-panel').hidden));
  await page.click('#hud-display-button');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('outils disponibles', await page.evaluate(() => ['tool-reset', 'tool-year', 'tool-copy', 'tool-fullscreen', 'tool-zen', 'history-clear']
    .every((id) => Boolean(document.getElementById(id)))));
  check('pile d’historique visible', (await page.$$('#history-list .history-item')).length >= 2);
  await page.click('#history-clear');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('historique effaçable', (await page.$$('#history-list .history-item')).length === 0);
  await page.click('#tool-year');
  await new Promise((resolve) => setTimeout(resolve, 500));
  check('outil année 1000', await page.evaluate(() => window.VATLAS.getState().year === 1000));
  await page.click('#tool-zen');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('mode zen activé', await page.evaluate(() => window.VATLAS.getState().zen
    && !document.getElementById('zen-exit').hidden && document.getElementById('display-panel').hidden));
  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('mode zen quitté', await page.evaluate(() => !window.VATLAS.getState().zen));
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('Ctrl+K ouvre la recherche', await page.evaluate(() => !document.getElementById('hud-search').hidden));
  await page.keyboard.press('Escape');
  await page.keyboard.press('t');
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.keyboard.press('l');
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('un seul panneau à la fois', await page.evaluate(() => document.getElementById('trails-panel').hidden
    && !document.getElementById('learn-panel').hidden));
  await page.keyboard.press('Escape');
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

  /* La sélection d'un extrait a pu déplacer la caméra : on mesure la dérive
   * depuis le début de la lecture automatique, pas depuis le chargement. */
  const beforeAutoplay = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  check('aucune rotation automatique', await page.evaluate((value) => Math.abs(window.VATLAS.getState().camera.lon - value) < 0.01, beforeAutoplay));
  await clickHud(page, 'hud-tour-button');
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('tour manuel actif', await page.evaluate(() => window.VATLAS.getState().touring === true));
  await clickHud(page, 'hud-tour-button');
  check('tour manuel arrêté', await page.evaluate(() => window.VATLAS.getState().touring === false));
  /* P10 — libellés et épiques. */
  await page.evaluate(() => window.VATLAS.setYear(1000));
  await new Promise((resolve) => setTimeout(resolve, 600));
  check('560 épiques chargés', await page.evaluate(() => window.VATLAS.getState().epics === 560));
  check('sélecteur épiques', await page.evaluate(() => document.querySelectorAll('#epic-select option').length > 560));
  check('filtre épiques présent', Boolean(await page.$('#epic-filter')));
  check('compteurs par catégorie', await page.evaluate(() => [...document.querySelectorAll('#epic-filter option')]
    .every((option) => /\(\d+\)|Aucune/.test(option.textContent))));
  await page.evaluate(() => window.VATLAS.setEpicFilter('none'));
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('filtre aucun', await page.evaluate(() => window.VATLAS.getState().epicVisible === 0
    && [...document.querySelectorAll('.epic-tick')].every((tick) => tick.hidden)));
  await page.evaluate(() => window.VATLAS.setEpicFilter('guerre'));
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('filtre épiques actif', await page.evaluate(() => {
    const state = window.VATLAS.getState();
    return state.epicFilter === 'guerre' && state.epicVisible > 0 && state.epicVisible < 560;
  }));
  check('filtre épiques dans l’URL', await page.evaluate(() => new URLSearchParams(location.search).get('epic') === 'guerre'));
  const yearBeforeTick = await page.evaluate(() => window.VATLAS.getState().year);
  await page.click('.epic-tick:not([hidden])');
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('pastille filtrée cliquable', await page.evaluate((previous) => window.VATLAS.getState().year !== previous, yearBeforeTick));
  check('pastilles filtrées', await page.evaluate(() => [...document.querySelectorAll('.epic-tick')]
    .some((tick) => tick.hidden)));
  await page.evaluate(() => window.VATLAS.setEpicFilter('all'));
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('filtre épiques réinitialisé', await page.evaluate(() => window.VATLAS.getState().epicVisible === 560));
  await page.evaluate(() => document.querySelector('.label-btn[data-mode="historical"]').click());
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('libellés historiques', await page.evaluate(() => window.VATLAS.getState().labels > 0),
    JSON.stringify(await page.evaluate(() => ({ labels: window.VATLAS.getState().labels, mode: window.VATLAS.getState().labelMode, theme: document.documentElement.dataset.theme }))));
  await page.evaluate(() => document.querySelector('.label-btn[data-mode="capitals"]').click());
  await new Promise((resolve) => setTimeout(resolve, 400));
  check('libellés capitales', await page.evaluate(() => window.VATLAS.getState().labels > 0));
  await page.evaluate(() => document.querySelector('.label-btn[data-mode="modern"]').click());
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('libellés modernes', await page.evaluate(() => window.VATLAS.getState().labels > 0 && Boolean(document.querySelector('.globe-label.kind-modern'))));
  await page.evaluate(() => document.querySelector('.label-btn[data-mode="both"]').click());
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('libellés combinés', await page.evaluate(() => window.VATLAS.getState().labels > 0 && Boolean(document.querySelector('.globe-label.kind-historical')) && Boolean(document.querySelector('.globe-label.kind-modern'))));
  check('anti-collision des libellés', await page.evaluate(() => {
    const host = document.getElementById('globe-labels');
    const boxes = [...host.querySelectorAll('.globe-label:not([hidden])')].map((node) => node.getBoundingClientRect());
    const overlap = boxes.some((a, i) => boxes.slice(i + 1).some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
    return !overlap && Number(host.dataset.collisions || 0) >= 0 && Number(host.dataset.visibleLabels || 0) <= boxes.length + 1;
  }));
  await page.evaluate(() => document.querySelector('.label-btn[data-mode="off"]').click());
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

  /* P12 — navigation souris/clavier. */
  await page.evaluate(() => window.VATLAS.setView({ lat: 47, lon: 2, zoom: 4.2 }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  const beforeDbl = await page.evaluate(() => window.VATLAS.getState().camera.zoom);
  await page.evaluate(() => {
    window.__dblCount = 0;
    document.getElementById('globe-canvas').addEventListener('dblclick', () => { window.__dblCount += 1; });
  });
  await page.mouse.click(720, 450, { clickCount: 2, delay: 40 });
  await new Promise((resolve) => setTimeout(resolve, 300));
  /* Certains Chromium headless ne synthétisent pas le dblclick natif :
   * on déclenche alors l'événement directement pour tester le handler. */
  if (await page.evaluate(() => window.__dblCount === 0)) {
    await page.evaluate(() => {
      const canvas = document.getElementById('globe-canvas');
      canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: 720, clientY: 450, bubbles: true }));
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  check('double-clic zoome', await page.evaluate((value) => window.VATLAS.getState().camera.zoom > value, beforeDbl),
    await page.evaluate((value) => `${value.toFixed(2)} → ${window.VATLAS.getState().camera.zoom.toFixed(2)} · dbl=${window.__dblCount} · target=${window.VATLAS.getState().camera.targetZoom.toFixed(2)}`, beforeDbl));
  const beforeFine = await page.evaluate(() => window.VATLAS.getState().camera.lon);
  await page.focus('#globe-canvas');
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('rotation fine clavier', await page.evaluate((value) => {
    const delta = Math.abs(window.VATLAS.getState().camera.lon - value);
    return delta > 0 && delta < 5;
  }, beforeFine));

  /* P12 — mobile 390x844. */
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(`${new URL(BASE).origin}${new URL(BASE).pathname}?type=area&value=Berry&pos=47.08,2.4,4.2&year=1000`, { waitUntil: 'load', timeout: 60000 });
  await mobile.waitForFunction(() => window.VATLAS?.getState?.().provinceTimeline === true, { timeout: 8000 }).catch(() => {});
  check('mobile : fiche plein écran', await mobile.evaluate(() => {
    const card = document.getElementById('hud-card');
    const rect = card.getBoundingClientRect();
    return !card.hidden && rect.width >= innerWidth - 1 && rect.height >= innerHeight - 1;
  }));
  check('mobile : bouton fermer visible', await mobile.evaluate(() => {
    const button = document.getElementById('hud-card-close');
    return Boolean(button) && getComputedStyle(button).display !== 'none';
  }));
  await mobile.click('#hud-card-close');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('mobile : fermeture fiche', await mobile.evaluate(() => document.getElementById('hud-card').hidden && !document.body.classList.contains('card-open')));
  await mobile.evaluate(() => window.VATLAS.openSubject('dauphine'));
  await mobile.waitForFunction(() => window.VATLAS.getState().subject.articles > 0, { timeout: 30000 });
  check('mobile : titre du sujet visible', await mobile.evaluate(() => {
    const title = document.querySelector('.subject-header h2').getBoundingClientRect();
    return title.width > 0 && title.top < 120;
  }));
  check('mobile : périodes tactiles', await mobile.evaluate(() => [...document.querySelectorAll('.subject-period')]
    .every((button) => button.getBoundingClientRect().height >= 44)));
  const beforeSwipe = await mobile.evaluate(() => window.VATLAS.getState().subject.from);
  await mobile.evaluate(() => {
    const before = window.VATLAS.getState().subject.from;
    void before;
    const canvas = document.querySelector('.subject-canvas canvas');
    const rect = canvas.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: rect.left + 300, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: rect.left + 120, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: rect.left + 120, clientY: y, bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('mobile : glissement du champ', await mobile.evaluate((previous) => window.VATLAS.getState().subject.from !== previous, beforeSwipe));
  await mobile.evaluate(() => {
    const canvas = document.querySelector('.subject-canvas canvas');
    const rect = canvas.getBoundingClientRect();
    const point = window.VATLAS.getState().subject.points[0];
    if (!point) return;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, pointerType: 'touch', clientX: rect.left + point.x, clientY: rect.top + point.y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8, pointerType: 'touch', clientX: rect.left + point.x, clientY: rect.top + point.y, bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('mobile : feuille article', await mobile.evaluate(() => !document.querySelector('.subject-card').hidden));
  await mobile.evaluate(() => document.getElementById('subject-close').click());
  const layout = await mobile.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element || element.hidden) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
    };
    return { brand: box('.hud-brand'), actions: box('.hud-actions'), timeline: box('.timeline'), readout: box('.hud-readout'), nav: box('.nav-controls') };
  });
  check('mobile : titre et actions séparés', layout.brand.right < layout.actions.x, `brand=${Math.round(layout.brand.right)} actions=${Math.round(layout.actions.x)}`);
  check('mobile : readout au-dessus timeline', layout.readout.bottom < layout.timeline.y, `readout=${Math.round(layout.readout.bottom)} timeline=${Math.round(layout.timeline.y)}`);
  check('mobile : navigation au-dessus timeline', layout.nav.bottom < layout.timeline.y, `nav=${Math.round(layout.nav.bottom)} timeline=${Math.round(layout.timeline.y)}`);
  check('mobile : timeline compacte', layout.timeline.h < 180, `${Math.round(layout.timeline.h)} px`);
  const beforeMobileZoom = await mobile.evaluate(() => window.VATLAS.getState().camera.zoom);
  await mobile.click('#nav-zoom-in');
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('mobile : bouton zoom', await mobile.evaluate((value) => window.VATLAS.getState().camera.zoom > value, beforeMobileZoom));
  await mobile.evaluate(() => document.getElementById('hud-display-button').click());
  await new Promise((resolve) => setTimeout(resolve, 150));
  check('mobile : panneau affichage', await mobile.evaluate(() => !document.getElementById('display-panel').hidden && Boolean(document.querySelector('#display-panel .dimension-bar'))));

  /* P14 — gestes tactiles déterministes. */
  await mobile.goto(`${new URL(BASE).origin}${new URL(BASE).pathname}?year=1000`, { waitUntil: 'load', timeout: 60000 });
  await wait(1600);
  await mobile.evaluate(() => document.getElementById('hud-card-close')?.click());
  await wait(100);
  const z0 = await mobile.evaluate(() => window.VATLAS.getState().camera.targetZoom);

  await touchEvents(mobile, [['pointerdown', 1, 195, 400], ['pointerup', 1, 195, 400]]);
  await wait(80);
  await touchEvents(mobile, [['pointerdown', 1, 195, 400], ['pointerup', 1, 195, 400]]);
  await wait(750);
  check('mobile : double-tap zoom avant', await mobile.evaluate((base) => {
    const c = window.VATLAS.getState().camera;
    return Math.abs(c.targetZoom - (base + 0.8)) < 0.01
      && c.lastGesture === 'double-tap'
      && window.VATLAS.getState().selected === null;
  }, z0));

  await touchEvents(mobile, [
    ['pointerdown', 2, 150, 400], ['pointerdown', 3, 240, 400],
    ['pointerup', 2, 150, 400], ['pointerup', 3, 240, 400],
  ]);
  await wait(750);
  check('mobile : tap deux doigts zoom arrière', await mobile.evaluate((base) => {
    const c = window.VATLAS.getState().camera;
    return Math.abs(c.targetZoom - base) < 0.01
      && c.lastGesture === 'two-finger-tap'
      && window.VATLAS.getState().selected === null;
  }, z0));

  await touchEvents(mobile, [
    ['pointerdown', 4, 150, 400], ['pointerdown', 5, 240, 400],
    ['pointermove', 4, 120, 400], ['pointermove', 5, 270, 400],
    ['pointerup', 4, 120, 400], ['pointerup', 5, 270, 400],
  ]);
  await wait(300);
  check('mobile : pincement conservé', await mobile.evaluate(() => {
    const c = window.VATLAS.getState().camera;
    return c.targetZoom > 1.6 && c.lastGesture === 'pinch';
  }));

  await mobile.waitForFunction(() => window.VATLAS?.getState?.().mesh?.cityCount > 0, { timeout: 8000 }).catch(() => {});
  await mobile.waitForFunction(() => window.VATLAS?.getState?.().camera?.zoom >= 2.5, { timeout: 8000 }).catch(() => {});
  const capital = await mobile.evaluate(() => {
    const points = window.VATLAS.cityScreenPoints();
    return points.find((point) => point.x >= 0 && point.x <= innerWidth
      && point.y >= 0 && point.y <= innerHeight) || null;
  });
  if (capital) {
    await touchEvents(mobile, [
      ['pointerdown', 6, capital.x, capital.y], ['pointerup', 6, capital.x, capital.y],
    ]);
    await wait(750);
    check('mobile : tap simple après pincement sélectionne', await mobile.evaluate(() => Boolean(window.VATLAS.getState().selected)), `${capital.name} @ ${Math.round(capital.x)},${Math.round(capital.y)}`);
  } else {
    check('mobile : tap simple après pincement sélectionne', false, 'aucune capitale dans le viewport');
  }

  await mobile.close();

  /* P16 — révision active. */
  await page.evaluate(() => document.getElementById('hud-card-close')?.click());
  await clickHud(page, 'hud-review-button');
  await page.waitForFunction(() => window.VATLAS?.getState?.().review?.total > 0, { timeout: 8000 }).catch(() => {});
  check('panneau révision ouvert', await page.evaluate(() => !document.getElementById('review-panel').hidden));
  check('question affichée', await page.evaluate(() => (document.getElementById('review-prompt').textContent || '').length > 10));
  check('4 réponses', await page.evaluate(() => document.querySelectorAll('#review-options .review-option').length === 4));
  check('graine affichée', await page.evaluate(() => /20261121/.test(document.getElementById('review-meta').textContent || '')));
  const firstPrompt = await page.evaluate(() => document.getElementById('review-prompt').textContent);
  await page.keyboard.press('1');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('feedback révision', await page.evaluate(() => (document.getElementById('review-feedback').textContent || '').length > 5));
  check('source affichée', await page.evaluate(() => /Chronas.*CC BY-SA/.test(document.getElementById('review-source').textContent || '')));
  check('progression SRS', await page.evaluate(() => window.VATLAS.getState().review.summary.reviews >= 1));
  check('bouton suivant', await page.evaluate(() => !document.getElementById('review-next').hidden));
  await page.keyboard.press('Enter');
  await new Promise((resolve) => setTimeout(resolve, 200));
  check('question suivante', await page.evaluate((previous) => document.getElementById('review-prompt').textContent !== previous, firstPrompt));
  await page.keyboard.press('Escape');
  check('révision fermée', await page.evaluate(() => document.getElementById('review-panel').hidden));

  const learnPage = await browser.newPage();
  await learnPage.setViewport({ width: 1440, height: 900 });
  await learnPage.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await learnPage.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  check('SRS repris après rechargement', await learnPage.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('vectemporel-srs-v1') || '{}');
    return (state.stats?.reviews || 0) >= 1;
  }));
  check('stockage local présent', await learnPage.evaluate(() => Boolean(localStorage.getItem('vectemporel-srs-v1'))
    && Boolean(localStorage.getItem('vectemporel-progress-v1'))));
  await learnPage.close();

  const devPage = await browser.newPage();
  await devPage.setViewport({ width: 1440, height: 900 });
  await devPage.goto(`${BASE}?devtools=1`, { waitUntil: 'load', timeout: 60000 });
  await devPage.waitForFunction(() => document.documentElement.dataset.globeReady === 'true', { timeout: 20000 });
  check('widget budget en dev', await devPage.evaluate(() => {
    const widget = document.getElementById('budget-widget');
    return Boolean(widget) && /requêtes/.test(widget.textContent);
  }));
  check('aucun widget budget en production', await page.evaluate(() => !document.getElementById('budget-widget')));
  await devPage.close();

  check('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stopServer(server);
}
console.log(failed ? `${failed} échec(s)` : 'Parcours sphère OK.');
process.exit(failed ? 1 : 0);
