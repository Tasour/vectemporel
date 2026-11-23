#!/usr/bin/env node
/* Génère le HTML statique du rapport Dauphiné à partir des jalons sourcés.
 * Le runtime est un module local chargé par l'app : aucun script inline. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/reports/dauphine.json'), 'utf8'));
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const years = report.jalons.map((item) => item.year);
const min = Math.min(...years);
const max = Math.max(...years);
const x = (year) => 40 + ((year - min) / (max - min)) * 720;
const points = report.jalons.map((item) => {
  const pop = item.population || 0;
  return [x(item.year), pop];
});
const maxPop = Math.max(...points.map((pair) => pair[1]), 1);
const y = (pop) => 230 - (pop / maxPop) * 180;
const pathD = points.map(([px, pop], index) => `${index ? 'L' : 'M'}${px.toFixed(1)},${y(pop).toFixed(1)}`).join(' ');

const steps = report.jalons.map((item, index) => `
  <section class="scrolly-step" data-scrolly-step data-year="${item.year}" data-title="${esc(item.title)}" tabindex="0">
    <h2>${esc(item.title)}</h2>
    <p>${esc(item.narrative)}</p>
    <dl class="scrolly-facts">
      ${item.facts.map((fact) => `<dt>Fait ${esc(item.kind)}</dt><dd>${esc(fact)}</dd>`).join('')}
    </dl>
    ${item.sources.length ? `<p class="scrolly-source">Sources : ${item.sources.map((url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(url).hostname)}</a>`).join(' · ')}</p>` : '<p class="scrolly-source">Source : Chronas CC BY-SA 4.0 (données locales).</p>'}
    <p class="scrolly-caption">Étape ${index + 1} sur ${report.jalons.length} · ${esc(item.kind)}</p>
  </section>`).join('');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="noeta:type" content="scrollytelling">
<meta name="description" content="Histoire du Dauphiné de -2000 à 2000 : 27 jalons sourcés Wikipédia, Grokipedia et Chronas, récit au défilement hors ligne.">
<meta property="og:title" content="Dauphiné — lignée d'une province">
<title>Dauphiné — lignée d'une province</title>
</head>
<body>
<main class="report-main">
<header><h1>Dauphiné — lignée d'une province</h1>
<p>Des débuts à la fin de l'histoire connue de l'item : ${report.meta.count} jalons, de ${min} à ${max}. Données © Chronas CC BY-SA 4.0, Wikipédia FR et Grokipedia. Aucun paragraphe n'est reproduit : la prose est originale et les divergences sont documentées.</p>
<div class="scrolly-progress" role="presentation"><i></i></div>
<p class="scrolly-readout" role="status" aria-live="polite">Chargement du récit…</p>
</header>
<div class="scrolly-wrap" tabindex="0">
  <div class="scrolly-steps">${steps}</div>
  <figure class="scrolly-figure">
    <svg viewBox="0 0 800 280" role="img" aria-label="Courbe de population estimée du Dauphiné de -2000 à 2000">
      <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="2" opacity="0.55"/>
      <line class="scrolly-marker" x1="40" x2="40" y1="20" y2="240" stroke="currentColor" stroke-dasharray="4 3"/>
      <text x="40" y="262" font-size="11">${min}</text><text x="760" y="262" font-size="11">${max}</text>
    </svg>
    <figcaption><p class="scrolly-year">−2000</p><p class="scrolly-caption">Population estimée par Chronas. La ligne verticale suit l'étape active.</p></figcaption>
  </figure>
</div>
<footer><p class="scrolly-source">Fiche de convergence : docs/sources/dauphine/convergence.md · empreinte ${report.meta.sha256.slice(0, 12)}</p></footer>
</main>
</body>
</html>
`;
const out = path.join(ROOT, 'public/reports');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'dauphine.html'), html);
console.log(`rapport HTML : ${html.length} octets, ${report.jalons.length} étapes`);
