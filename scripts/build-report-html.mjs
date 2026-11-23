#!/usr/bin/env node
/* Génère le HTML statique d'un rapport à partir de ses jalons sourcés.
 * Usage : node scripts/build-report-html.mjs [dauphine|catholicisme]
 * Le runtime est un module local chargé par l'app : aucun script inline. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const id = process.argv[2] || 'dauphine';
const report = JSON.parse(fs.readFileSync(path.join(ROOT, `src/data/reports/${id}.json`), 'utf8'));
const meta = report.meta;
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const years = report.jalons.map((item) => item.year);
const min = Math.min(...years);
const max = Math.max(...years);
const x = (year) => 40 + ((year - min) / Math.max(1, max - min)) * 720;
const points = report.jalons.map((item) => [x(item.year), item.metricValue ?? item.population ?? 0]);
const maxValue = Math.max(...points.map((pair) => pair[1]), 1);
const y = (value) => 230 - (value / maxValue) * 180;
const pathD = points.map(([px, value], index) => `${index ? 'L' : 'M'}${px.toFixed(1)},${y(value).toFixed(1)}`).join(' ');
const title = meta.title;
const description = `${meta.item} : ${meta.count} jalons de ${min} à ${max}, sourcés Wikipédia, Grokipedia et Chronas. Récit au défilement autonome et hors ligne, figure épinglée, progression annoncée et navigation clavier pour explorer la lignée complète.`;
const chartLabel = `${meta.metricLabel} de ${meta.item} de ${min} à ${max}`;

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
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<title>${esc(title)}</title>
</head>
<body>
<main class="report-main">
<header><h1>${esc(title)}</h1>
<p>Des débuts à la fin de l'histoire connue de l'item : ${meta.count} jalons, de ${min} à ${max}. Données © Chronas CC BY-SA 4.0, Wikipédia FR et Grokipedia. Aucun paragraphe n'est reproduit : la prose est originale et les divergences sont documentées.</p>
<div class="scrolly-progress" role="presentation"><i></i></div>
<p class="scrolly-readout" role="status" aria-live="polite">Chargement du récit…</p>
</header>
<div class="scrolly-wrap" tabindex="0">
  <div class="scrolly-steps">${steps}</div>
  <figure class="scrolly-figure">
    <svg viewBox="0 0 800 280" role="img" aria-label="${esc(chartLabel)}">
      <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="2" opacity="0.55"/>
      <line class="scrolly-marker" x1="40" x2="40" y1="20" y2="240" stroke="currentColor" stroke-dasharray="4 3"/>
      <text x="40" y="262" font-size="11">${min}</text><text x="760" y="262" font-size="11">${max}</text>
    </svg>
    <figcaption><p class="scrolly-year">${min < 0 ? `−${-min}` : min}</p><p class="scrolly-caption">${esc(meta.metricLabel)} (${esc(meta.metricUnit)}), relevé Chronas. La ligne verticale suit l'étape active.</p></figcaption>
  </figure>
</div>
<footer><p class="scrolly-source">Fiche de convergence : ${esc(meta.convergence)} · empreinte ${meta.sha256.slice(0, 12)}</p></footer>
</main>
</body>
</html>
`;
const out = path.join(ROOT, 'public/reports');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `${id}.html`), html);
console.log(`rapport HTML ${id} : ${html.length} octets, ${report.jalons.length} étapes`);
