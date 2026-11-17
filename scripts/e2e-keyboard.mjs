#!/usr/bin/env node
/* Parcours intégral au clavier — Vectemporel P4.
 * prerequisite : le serveur tourne sur http://127.0.0.1:4173
 * usage : npm run test:e2e
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/index.html';
const CHROME = process.env.CHROME_PATH || '/usr/bin/chromium';
const errors = [];
const results = [];
let failed = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failed += 1;
  results.push(`| ${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail} |`);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function wait(page, ms = 350) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickFrance(page) {
  await page.focus('#globe-search');
  await page.type('#globe-search', 'France');
  await page.keyboard.press('Enter');
  await wait(page, 900);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(BASE, { waitUntil: 'networkidle0' });
await wait(page, 900);

check('Accueil = globe 3D', await page.evaluate(() => !document.getElementById('globe-overlay').hidden));
await pickFrance(page);
check('Globe → Système', await page.evaluate(() => window.VECTEMPOREL_SOLAR?.state().open));

await page.keyboard.press('ArrowRight');
await wait(page);
await page.keyboard.press('ArrowDown');
await wait(page);
const beforeArticle = await page.evaluate(() => window.VECTEMPOREL_SOLAR.state().planetIndex);
check('Flèches = période puis événement', beforeArticle >= 0, `planète ${beforeArticle + 1}`);

await page.keyboard.press('Enter');
await wait(page, 650);
check('Entrée ouvre le lecteur', await page.evaluate(() => document.getElementById('reader-overlay').classList.contains('is-open')));
await page.keyboard.press('Escape');
await wait(page, 450);
check('Échap referme le lecteur sans quitter le Système', await page.evaluate(() => window.VECTEMPOREL_SOLAR.state().open));
await page.keyboard.press('Escape');
await wait(page, 550);
check('Échap ramène au globe', await page.evaluate(() => !document.getElementById('globe-overlay').hidden));

await pickFrance(page);
await page.keyboard.press('r');
await wait(page, 800);
check('R ouvre le Récit', await page.evaluate(() => window.VECTEMPOREL_STORY.state().open));

await page.keyboard.down('Shift');
await page.keyboard.press('Digit3');
await page.keyboard.up('Shift');
await wait(page, 700);
check('Maj+3 ouvre les lieux', await page.evaluate(() => window.VECTEMPOREL_STORY.state().mode === 'places'));
await page.keyboard.press('ArrowRight');
await wait(page, 400);
check('Flèche droite change de lieu', await page.evaluate(() => window.VECTEMPOREL_STORY.state().place > 0));
await page.keyboard.press('?');
await wait(page, 250);
check('? ouvre l’aide', await page.evaluate(() => !document.getElementById('story-help').hidden));
await page.keyboard.press('Escape');
await wait(page, 250);
check('Échap ferme l’aide', await page.evaluate(() => document.getElementById('story-help').hidden));

await page.keyboard.down('Shift');
await page.keyboard.press('Digit4');
await page.keyboard.up('Shift');
await wait(page, 850);
check('Maj+4 retourne au Système', await page.evaluate(() => window.VECTEMPOREL_SOLAR.state().open && !window.VECTEMPOREL_STORY.state().open));
check('La sélection est conservée', await page.evaluate(() => window.VECTEMPOREL_SOLAR.state().planetIndex >= 0));

check('Aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();

const report = `# Rapport E2E — parcours clavier

> Généré par \`npm run test:e2e\`. ${new Date().toISOString().slice(0, 10)}.

${results.length - failed}/${results.length} contrôles réussis.

| Résultat | Contrôle | Détail |
| --- | --- | --- |
${results.join('\n')}

${errors.length ? `## Erreurs\n\n${errors.map((error) => `- ${error}`).join('\n')}\n` : ''}
## Protocole P4

Le test couvre le parcours : globe → recherche pays → système solaire →
événement → lecteur → retour → Récit → lieux → aide → retour système.
Il ne utilise que le clavier, validant ainsi l'exigence de navigation exclusive.

Une évaluation utilisateur (20 participants, tâches « trouver / raconter / situer »)
reste nécessaire : ce test automatique vérifie la mécanique, pas la compréhension.
`;
fs.writeFileSync(path.join(ROOT, 'E2E_REPORT.md'), report, 'utf8');
console.log(`\n${results.length - failed}/${results.length} contrôles réussis. E2E_REPORT.md généré.`);
process.exit(failed ? 1 : 0);
