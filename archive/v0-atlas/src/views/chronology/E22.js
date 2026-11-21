import { register } from './registry.js';

/* Lentille E22 — hiérarchie visuelle de la vue Chronologie (domaine : lisibilité).
 *
 * Fichier possédé : src/views/chronology/E22.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E22.md (E22-01 à E22-10).
 *
 * La lentille ne crée aucun panneau et ne déplace aucun nœud existant : elle
 * rééquilibre l'échelle typographique des éléments déjà produits par
 * chronology.js et ajoute deux marqueurs de forme (ère courante, repère courant)
 * pour que l'état ne dépende pas de la seule couleur. Tout est piloté par une
 * feuille unique injectée via ctx.css('chronology-e22', …) et par deux insertions
 * de <span> gardées et idempotentes. Aucune donnée inventée, zéro réseau, zéro
 * console, zéro Math.random, zéro minuteur, zéro canvas, zéro boucle rAF.
 *
 * Les sélecteurs de test (event-card, event-btn-*, era-*, point-*, aside-title,
 * #atlas-chrono-*) ne sont ni renommés ni retirés. Les identifiants créés
 * (e22-mark, e22-current) sont des classes, jamais des ids : ils échappent ainsi
 * au marquage « diagnostic » de _diagnostics.js (/^(e\d\d|.*-e\d\d)/).
 */

const STYLE_ID = 'chronology-e22';
const GLOBAL_KEY = 'VECTEMPOREL_E22';
const VERSION = '1.0.0';

/* E22-01 à E22-09 : une seule feuille, injectée une seule fois par cssOnce.
   Toutes les règles sont portées par `.chronology-layout.e22` (spécificité
   stable 0-2-0) et, pour les nœuds à ID, par `#id` (1-0-0) : elles restent
   dominantes quel que soit l'ordre d'injection des autres lentilles. */
const CSS = `
.chronology-layout.e22 #atlas-chrono-main .atlas-chrono-h1{
  text-transform:none;letter-spacing:-.02em;color:var(--ink);
  font-size:clamp(24px,1.9vw,28px);font-weight:600;line-height:1.15;
  overflow-wrap:anywhere;
}
.chronology-layout.e22 #atlas-chrono-aside .aside-title{
  font-size:clamp(20px,1.5vw,23px);font-weight:600;letter-spacing:-.01em;
  overflow-wrap:anywhere;
}
.chronology-layout.e22 #atlas-chrono-aside .atlas-chrono-section-title{
  font-size:15px;font-weight:600;color:var(--ink-soft);
}
.chronology-layout.e22 #atlas-chrono-events .event-year{
  align-self:flex-start;margin:0 0 0 8px;padding:2px 8px;
  font-size:12px;font-weight:700;line-height:1.3;color:var(--gold-bright);
  background:rgba(230,185,111,.12);border-radius:5px;
  font-variant-numeric:tabular-nums;
}
.chronology-layout.e22 #atlas-chrono-events .event-card strong{
  font-size:18px;font-weight:600;line-height:1.15;
}
.chronology-layout.e22 #atlas-chrono-events .event-subtitle{font-size:10px}

/* E22-04 : plancher de 10 px pour tout texte porteur d'information. */
.chronology-layout.e22 .atlas-chrono-hint,
.chronology-layout.e22 .atlas-chrono-status,
.chronology-layout.e22 .atlas-chrono-count,
.chronology-layout.e22 .atlas-chrono-card-era,
.chronology-layout.e22 .atlas-chrono-era-range,
.chronology-layout.e22 .atlas-chrono-tags,
.chronology-layout.e22 .atlas-chrono-tag,
.chronology-layout.e22 .nav-c2-here,
.chronology-layout.e22 .nav-c2-progress,
.chronology-layout.e22 .nav-c2-point-rank,
.chronology-layout.e22 .aside-credit,
.chronology-layout.e22 .aside-actions button,
.chronology-layout.e22 .atlas-chrono-empty button,
.chronology-layout.e22 .point-kind,
.chronology-layout.e22 .confidence,
.chronology-layout.e22 .e22-mark,
.chronology-layout.e22 .e22-current{font-size:10px}
.chronology-layout.e22 .atlas-chrono-tags .atlas-chrono-tag{font-size:10px}

/* E22-05 : marqueur de forme sur l'ère courante (l'aria-current existant reste
   le vecteur sémantique). Le chevron est aria-hidden : le nom accessible de la
   bande ne change pas. */
.chronology-layout.e22 .e22-mark{
  display:inline-block;margin-right:5px;font-weight:700;line-height:1;
  color:var(--gold-bright);
}
.chronology-layout.e22 .atlas-chrono-band[aria-current="true"] .e22-name{
  font-weight:700;color:var(--ink);
}

/* E22-06 : barre latérale + pastille pour la carte sélectionnée ; le survol
   passe en bordure pointillée, canal distinct de la couleur or. */
.chronology-layout.e22 #atlas-chrono-events .event-card[aria-current="true"]{
  border-left:3px solid var(--gold);
}
.chronology-layout.e22 #atlas-chrono-events .event-card:hover{border-style:dashed}
.chronology-layout.e22 .e22-current{
  align-self:flex-start;margin:2px 8px 0;padding:1px 7px;
  font-weight:700;letter-spacing:.06em;color:var(--gold-bright);
  background:rgba(230,185,111,.14);border-radius:4px;
}

/* E22-07 : la fiche remet le contenu vérifié en avant des étiquettes. */
.chronology-layout.e22 #atlas-chrono-aside .aside-summary{
  font-size:15px;line-height:1.6;
}
.chronology-layout.e22 #atlas-chrono-aside .aside-year{font-size:12px}
.chronology-layout.e22 #atlas-chrono-aside > .aside-kicker{
  font-size:10px;letter-spacing:.08em;
}
.chronology-layout.e22 #atlas-chrono-aside > .aside-kicker:first-of-type{
  color:var(--gold-bright);font-weight:700;
}

/* E22-08 : la phrase du point reprend le premier plan sur ses badges. */
.chronology-layout.e22 #atlas-chrono-aside .point p{
  font-size:12.5px;line-height:1.55;
}
.chronology-layout.e22 #atlas-chrono-aside .point-kind,
.chronology-layout.e22 #atlas-chrono-aside .confidence{
  background:rgba(255,255,255,.05);
}

/* E22-09 : l'ordre h1 > h2 > h3 est tenu au seuil où la grille s'empile. */
@media (max-width:620px){
  .chronology-layout.e22 #atlas-chrono-main .atlas-chrono-h1{font-size:24px}
  .chronology-layout.e22 #atlas-chrono-aside .aside-title{font-size:20px}
  .chronology-layout.e22 #atlas-chrono-aside .atlas-chrono-section-title{font-size:14px}
  .chronology-layout.e22 #atlas-chrono-events .event-card strong{font-size:16px}
}
@media (prefers-reduced-motion:reduce){
  .chronology-layout.e22 .e22-mark,
  .chronology-layout.e22 .e22-current{transition:none}
}
@media (forced-colors:active){
  .chronology-layout.e22 .e22-mark,
  .chronology-layout.e22 .e22-current{
    border:1px solid CanvasText;color:CanvasText;background:Canvas;
  }
}
`;

let appliedCount = 0;

function makeEl(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function injectCss(ctx) {
  if (ctx && typeof ctx.css === 'function') {
    ctx.css(STYLE_ID, CSS);
    return;
  }
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* Le stage est reconstruit à chaque rendu : on retrouve toujours le main à
   partir du contexte courant, jamais depuis une référence mémorisée. */
function currentMain(ctx) {
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') {
    const found = ctx.stage.querySelector('#atlas-chrono-main');
    if (found) return found;
  }
  return document.getElementById('atlas-chrono-main');
}

/* E22-05 : une seule bande porte le marqueur, l'idempotence est assurée même
   si apply() est rejoué sur un DOM non reconstruit. */
function markBands(ctx) {
  const main = currentMain(ctx);
  if (!main) return;
  Array.from(main.querySelectorAll('.atlas-chrono-band')).forEach((band) => {
    const nameSpan = Array.from(band.children).find((node) => (
      node.tagName === 'SPAN'
      && !node.classList.contains('e22-mark')
      && !node.classList.contains('atlas-chrono-era-range')
    ));
    if (nameSpan) nameSpan.classList.add('e22-name');
    const mark = band.querySelector('.e22-mark');
    if (band.getAttribute('aria-current') === 'true') {
      if (!mark) band.insertBefore(makeEl(ctx, 'span', 'e22-mark', '▸'), band.firstChild);
    } else if (mark) {
      mark.remove();
    }
  });
}

/* E22-06 : même garde pour la carte du repère courant. */
function markCards(ctx) {
  const main = currentMain(ctx);
  if (!main) return;
  Array.from(main.querySelectorAll('#atlas-chrono-events .event-card')).forEach((card) => {
    const mark = card.querySelector('.e22-current');
    if (card.getAttribute('aria-current') === 'true') {
      if (!mark) card.insertBefore(makeEl(ctx, 'span', 'e22-current', 'en cours'), card.firstChild);
    } else if (mark) {
      mark.remove();
    }
  });
}

function fontOf(node) {
  if (!node || typeof window === 'undefined' || !window.getComputedStyle) return 0;
  const value = parseFloat(window.getComputedStyle(node).fontSize);
  return Number.isFinite(value) ? value : 0;
}

function styleOf(node) {
  if (!node || typeof window === 'undefined' || !window.getComputedStyle) return '';
  return window.getComputedStyle(node).textTransform || '';
}

/* E22-10 : observabilité en lecture seule. Tout est recalculé depuis le DOM
   courant : l'API ne mémorise aucun nœud et reste valide après chaque rendu. */
function audit() {
  const main = document.getElementById('atlas-chrono-main');
  const aside = document.getElementById('atlas-chrono-aside');
  const first = (root, selector) => (root ? root.querySelector(selector) : null);
  const count = (root, selector) => (root ? root.querySelectorAll(selector).length : 0);

  const h1 = first(main, '.atlas-chrono-h1');
  const h2 = first(aside, '.aside-title');
  const h3 = first(aside, '.atlas-chrono-section-title');
  const year = first(main, '#atlas-chrono-events .event-year');
  const cardTitle = first(main, '#atlas-chrono-events .event-card strong');
  const summary = first(aside, '.aside-summary');
  const pointText = first(aside, '.point p');
  const badge = first(aside, '.point-kind');

  const levels = {
    h1: fontOf(h1), h2: fontOf(h2), h3: fontOf(h3),
    year: fontOf(year), cardTitle: fontOf(cardTitle),
    summary: fontOf(summary), pointText: fontOf(pointText), badge: fontOf(badge),
    hint: fontOf(first(main, '.atlas-chrono-hint')),
    status: fontOf(first(main, '.atlas-chrono-status')),
    eraRange: fontOf(first(main, '.atlas-chrono-era-range')),
    credit: fontOf(first(aside, '.aside-credit')),
  };

  const floorSelectors = [
    '.atlas-chrono-hint', '.atlas-chrono-status', '.atlas-chrono-count',
    '.atlas-chrono-card-era', '.atlas-chrono-era-range', '.atlas-chrono-tag',
    '.nav-c2-here', '.nav-c2-progress', '.nav-c2-point-rank', '.aside-credit',
    '.aside-actions button', '.point-kind', '.confidence', '.e22-current',
  ];
  const floorSizes = floorSelectors
    .map((selector) => fontOf(first(main, selector)) || fontOf(first(aside, selector)))
    .filter((size) => size > 0);
  const minInformative = floorSizes.length ? Math.min(...floorSizes) : 0;

  const order = {
    chain: [levels.h1, levels.h2, levels.h3],
    strict: levels.h1 > 0 && levels.h2 > 0 && levels.h3 > 0
      && levels.h1 > levels.h2 && levels.h2 > levels.h3,
  };
  const markers = {
    bands: count(main, '.atlas-chrono-band .e22-mark'),
    cards: count(main, '.e22-current'),
  };
  const compact = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(max-width:620px)').matches
    : false;
  const textTransform = styleOf(h1);

  const checks = {
    'E22-01': textTransform === 'none',
    'E22-02': order.strict,
    'E22-03': levels.year >= 12 && levels.cardTitle >= 18 && levels.cardTitle > levels.year,
    'E22-04': minInformative >= 10,
    'E22-05': markers.bands === 1,
    'E22-06': markers.cards === 1,
    'E22-07': levels.summary >= 15 && levels.summary > levels.badge,
    'E22-08': levels.pointText >= 12 && levels.pointText > levels.badge,
    'E22-09': order.strict,
    'E22-10': Boolean(window[GLOBAL_KEY]) && window[GLOBAL_KEY].version === VERSION,
  };
  const passed = Object.values(checks).filter(Boolean).length;

  return {
    version: VERSION,
    styleId: STYLE_ID,
    applied: appliedCount,
    textTransform,
    levels,
    minInformative,
    order,
    markers,
    compact,
    checks,
    passed,
  };
}

function exposeApi() {
  if (typeof window === 'undefined') return;
  const current = window[GLOBAL_KEY];
  if (current && current.version === VERSION) return;
  window[GLOBAL_KEY] = Object.freeze({
    version: VERSION,
    styleId: STYLE_ID,
    audit,
    levels: () => audit().levels,
  });
}

register('E22', (ctx) => {
  if (!ctx || !ctx.stage) return;
  injectCss(ctx);
  const layout = ctx.layout || (typeof ctx.stage.querySelector === 'function'
    ? ctx.stage.querySelector('.chronology-layout')
    : null);
  if (!layout) return;
  layout.classList.add('e22');
  appliedCount += 1;
  markBands(ctx);
  markCards(ctx);
  exposeApi();
});
