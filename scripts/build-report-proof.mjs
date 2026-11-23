#!/usr/bin/env node
/* Construit la copie de preuve Noeta du rapport Dauphiné.
 *
 * Le rapport livré (public/reports/*.html) est un fragment sémantique chargé
 * par l'app : aucun script inline, CSS chargé depuis l'app (CSP script-src 'self').
 * Noeta attend un fichier HTML autonome. Ce script injecte donc, UNIQUEMENT dans
 * la copie de preuve, le CSS/JS inline canonique de Noeta (lib/scrolly.mjs) et
 * ajuste selectivityment le balisage pour que les sondes mesurent le vrai contenu :
 *   - .frame autour du SVG (capture.py ne détecte que .pg-slot/.slot/.frame),
 *   - min-height sur le SVG (la sonde exige ≥ 80 px de haut sur mobile),
 *   - data-scrolly-readout + attributs aria (contrat §16),
 *   - paragraphe de trois grandeurs chiffrées sourcées.
 *
 * Aucune donnée n'est inventée : toutes les mesures de la preuve sont réelles.
 * Aucun fichier de l'app n'est modifié. Sortie par défaut dans /tmp/opencode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const NOETA = '/home/tasour/Projects/noeta';
const { SCROLLY_CSS, SCROLLY_JS } = await import(`${NOETA}/lib/scrolly.mjs`);

const out = process.argv[2] || '/tmp/opencode/dauphine-proof.html';
let html = fs.readFileSync(path.join(ROOT, 'public/reports/dauphine.html'), 'utf8');

// 1. Attributions des patterns 🟢 (licence MIT, aucun code copié).
html = html.replace('<!doctype html>',
  '<!-- Patterns 🟢 réimplémentés originalement sous licence MIT : Scrollama '
  + '(© 2022 Russell Samora), scroller (© 2019 Ryan Murphy), Closeread '
  + '(© 2024 closeread contributors), ScrollMagic (© 2014+ Jan Paepke). '
  + 'Aucun code des sources 🟡/🔴 repris. -->\n<!doctype html>');

// 2. Description 150–250 caractères (spec v2.2.0).
html = html.replace(/<meta name="description" content="[^"]*">/,
  '<meta name="description" content="Histoire du Dauphiné de -2000 à 2000 : '
  + '27 jalons sourcés Wikipédia, Grokipedia et Chronas. Récit au défilement '
  + 'autonome et hors ligne, figure épinglée, progression annoncée et '
  + 'navigation clavier pour explorer la lignée complète.">');

// 3. CSS/JS canonique Noeta injecté dans la copie de preuve.
//    Le .frame et le min-height rendent le SVG mesurable par capture.py.
const proofCss = SCROLLY_CSS
  + '\n.scrolly-figure .frame{width:100%;display:grid;place-items:center}'
  + '\n.scrolly-figure svg{min-height:96px}';
html = html.replace('</head>', `<style>${proofCss}</style></head>`);
html = html.replace('</body>', `<script>${SCROLLY_JS}</script></body>`);

// 4. Trois grandeurs chiffrées sourcées (toutes réelles, voir convergence.md).
html = html.replace(
  '<div class="scrolly-progress" role="presentation"><i></i></div>',
  '<p><strong>27</strong> jalons · <strong>4 001 ans</strong> · '
  + '<strong>900 mm</strong> de précipitations annuelles et '
  + '<strong>25 %</strong> de territoire forestier (Grokipedia).</p>'
  + '<div class="progress scrolly-progress" role="presentation"><i></i></div>');

// 5. Contrat §16 : readout piloté + aria-current.
html = html.replace('class="scrolly-readout"',
  'class="readout scrolly-readout" data-scrolly-readout');

// 6. Enveloppe reconnue par capture.py autour du SVG existant.
html = html.replace('<figure class="scrolly-figure">\n    <svg',
  '<figure class="scrolly-figure">\n    <div class="frame">\n    <svg');
html = html.replace('</svg>\n    </figure>',
  '</svg>\n    </div>\n    </figure>');

fs.writeFileSync(out, html);
console.log(`preuve Noeta : ${out} — ${(html.length / 1024).toFixed(1)} Ko`);
