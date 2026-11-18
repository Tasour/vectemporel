import { register } from './registry.js';

/* Lentille E059 — Échelle (local → global) représentée (domaine F : sémantique & données).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E059.md — chantiers E059-01 à E059-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * les autres lentilles et styles.css ne sont ni édités ni doublés : E059 ajoute
 * une règle d'échelle LOCALE dans le panneau `.points-detail`, à partir du seul
 * DOM déjà rendu (le span d'échelle de `.points-meta`).
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js). Aucune dépendance vers le dataset, le store,
 * le routeur ou une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants :
 * - un seul CSS, un seul conteneur de règle, une seule observation, une seule
 *   signature d'écriture par rendu ;
 * - non destructif : aucun nœud existant n'est retiré ni réécrit, seul un signal
 *   `detail.dataset.pointsE059Scale` est posé ;
 * - aucun chiffre de jeu de données, aucun millésime, aucune échelle codée en
 *   dur dans le texte : tout le libellé courant vient du DOM ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e059';
const RULER_ID = 'points-e059-ruler';
const TITLE_ID = 'points-e059-title';
const READING_ID = 'points-e059-reading';
const LADDER_ID = 'points-e059-ladder';
const NOTE_ID = 'points-e059-note';
const METRICS_ID = 'points-e059-metrics';

/* Échelle sémantique ordonnée du local au global, d'après POINT_METHODOLOGY.md §1.5
 * (E = échelle). Le jeu de données écrit `transnational` pour le cran global :
 * les deux vocables partagent le même niveau, étiqueté « transnational / global ». */
const LADDER = Object.freeze([
  Object.freeze({ key: 'local', label: 'Local', gloss: 'une commune, un site, un quartier : un espace d’interaction directe.' }),
  Object.freeze({ key: 'regional', label: 'Régional', gloss: 'une province, une région, un ensemble infra-national.' }),
  Object.freeze({ key: 'national', label: 'National', gloss: 'l’ensemble du pays, ses institutions et sa population.' }),
  Object.freeze({ key: 'imperial', label: 'Impérial', gloss: 'un empire ou un domaine colonial réunissant plusieurs territoires.' }),
  Object.freeze({ key: 'global', label: 'Transnational / global', gloss: 'des réseaux et des flux qui franchissent les frontières, à portée planétaire.' }),
]);

/* Équivalence exacte (pas de sous-chaîne) : « Circulations transnationales »,
 * un domaine, ne peut pas être pris pour une échelle. */
const ALIASES = Object.freeze({
  local: 'local',
  regional: 'regional', régional: 'regional',
  national: 'national',
  imperial: 'imperial', impérial: 'imperial',
  global: 'global', transnational: 'global', transnationale: 'global', transnationales: 'global',
});

/* Toutes les règles sont préfixées par un ID ou une classe points-e059 : aucune
 * fuite hors du panneau de détail. Les cinq crans restent lisibles sans couleur
 * (numéro, libellé et marqueur « ← ce point »). */
const CSS = `
  #${RULER_ID} {
    margin: 12px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .04); color: var(--ink-soft, #d8d8d8);
    font-size: 12px; line-height: 1.45;
  }
  #${TITLE_ID} {
    margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
    font-size: 13px; color: var(--gold-bright, #f0d49a);
  }
  #${READING_ID} { margin: 0 0 8px; }
  #${LADDER_ID} {
    display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px; margin: 0 0 8px; padding: 0; list-style: none;
  }
  .points-e059-step {
    display: flex; flex-direction: column; gap: 3px;
    min-height: 44px; padding: 5px 4px;
    border: 1px solid var(--line, #444); border-radius: 6px;
    background: rgba(255, 255, 255, .02);
  }
  .points-e059-step.is-current {
    border-color: var(--gold-bright, #f0d49a);
    box-shadow: inset 0 0 0 1px var(--gold-bright, #f0d49a);
  }
  .points-e059-index {
    color: var(--muted-2, #999); font-size: 10px; font-variant-numeric: tabular-nums;
  }
  .points-e059-name { font-size: 11px; line-height: 1.2; }
  .points-e059-step.is-current .points-e059-name {
    color: var(--gold-bright, #f0d49a); font-weight: 600;
  }
  .points-e059-marker { color: var(--gold-bright, #f0d49a); font-size: 10px; }
  #${NOTE_ID} { margin: 0 0 6px; color: var(--muted-2, #999); font-size: 11px; }
  #${METRICS_ID} { margin: 0; color: var(--muted-2, #999); font-size: 10px; font-variant-numeric: tabular-nums; }
  @media (max-width: 700px) {
    #${LADDER_ID} { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (prefers-reduced-motion: reduce) {
    #${RULER_ID}, .points-e059-step { transition: none; }
  }
`;

let ruler = null;           // conteneur de la règle, réutilisé d'un rendu à l'autre
let reading = null;         // phrase de lecture dérivée du DOM
let ladder = null;          // liste ordonnée des crans
let metrics = null;         // compteurs auditables, hors région live
let observer = null;        // unique observateur, ciblé sur .points-meta
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let lastSignature = '';     // signature anti-écriture redondante

function metaOf(ctx) {
  return ctx && ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout.querySelector('.points-detail .points-meta') : null;
}

/* E059-02 : le seul chiffre/vocable importé est l'échelle LUE dans le DOM.
 * points.js:100-107 écrit domaine, échelle, temps, certitude dans quatre spans ;
 * la position 1 est contractuelle, le balayage exact sert de repli. */
function readScale(ctx) {
  const meta = metaOf(ctx);
  if (!meta) return null;
  const spans = Array.from(meta.querySelectorAll('span'));
  const ordered = spans.length > 1 ? [spans[1], ...spans] : spans;
  const seen = new Set();
  for (const span of ordered) {
    if (!span || seen.has(span)) continue;
    seen.add(span);
    const raw = String(span.textContent || '').trim();
    const key = ALIASES[raw.toLowerCase()];
    if (key) return { key, raw };
  }
  return null;
}

function levelOf(key) {
  return LADDER.find((entry) => entry.key === key) || null;
}

function readingText(scale, level) {
  if (!scale || !level) {
    return 'Échelle non renseignée dans le détail : le champ E du point est absent ou illisible.';
  }
  return `Ce point se situe à l’échelle « ${scale.raw} » : ${level.gloss}`;
}

/* E059-03/04 : cinq crans dans l'ordre montant, le courant étant étiqueté
 * par aria-current ET par un marqueur textuel (jamais la couleur seule). */
function renderLadder(ctx, level) {
  if (!ladder) return;
  const steps = LADDER.map((entry, index) => {
    const current = !!level && entry.key === level.key;
    const li = ctx.el('li', `points-e059-step${current ? ' is-current' : ''}`);
    if (current) li.setAttribute('aria-current', 'true');
    const number = ctx.el('span', 'points-e059-index', String(index + 1));
    number.setAttribute('aria-hidden', 'true');
    li.append(number, ctx.el('span', 'points-e059-name', entry.label));
    if (current) li.appendChild(ctx.el('span', 'points-e059-marker', '← ce point'));
    return li;
  });
  ladder.replaceChildren(...steps);
}

/* E059-07 : compteurs dérivés de la règle et du DOM, jamais du dataset. */
function writeMetrics(level) {
  if (!metrics) return;
  const rank = level ? LADDER.findIndex((entry) => entry.key === level.key) + 1 : 0;
  metrics.textContent = `Échelle lue : ${level ? level.label : 'non renseignée'} · Cran ${rank}/${LADDER.length} · Niveaux de la règle : ${LADDER.length}.`;
}

function render(ctx) {
  if (!ruler || !ruler.isConnected) return;
  const scale = readScale(ctx);
  const level = scale ? levelOf(scale.key) : null;
  const signature = scale ? `${scale.key}|${scale.raw}` : 'none';
  if (signature === lastSignature) return;
  lastSignature = signature;
  if (reading) reading.textContent = readingText(scale, level);
  renderLadder(ctx, level);
  writeMetrics(level);
  const detail = ctx && ctx.layout ? ctx.layout.querySelector('.points-detail') : null;
  if (detail && detail.dataset) detail.dataset.pointsE059Scale = scale ? scale.key : 'unknown';
}

/* E059-05/06 : contenu statique, construit par ctx.el (jamais innerHTML). */
function buildBody(ctx) {
  const title = ctx.el('h4', '', 'Échelle du point — du local au global');
  title.id = TITLE_ID;

  const readingNode = ctx.el('p', '', '');
  readingNode.id = READING_ID;

  const ladderNode = ctx.el('ol', 'points-e059-ladder');
  ladderNode.id = LADDER_ID;

  const note = ctx.el('p', '',
    'L’échelle est le « E » de P = (S, R, O, T, E, D, Src, C) : un champ du point, pas une déduction de sa date.');
  note.id = NOTE_ID;

  const metricsNode = ctx.el('p', '', '');
  metricsNode.id = METRICS_ID;

  return { title, reading: readingNode, ladder: ladderNode, note, metrics: metricsNode };
}

/* E059-08 : un seul observateur, déconnecté puis reconnecté, ciblé sur
 * .points-meta (la zone LUE), jamais sur la règle que E059 écrit. */
function observeMeta(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  const meta = metaOf(ctx);
  if (!meta) return;
  observer = new MutationObserver(() => {
    if (currentCtx) render(currentCtx);
  });
  observer.observe(meta, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
  if (!layout) return;
  const detail = layout.querySelector('.points-detail');
  if (!detail) return;

  /* Un rendu neuf recrée le panneau : un conteneur déconnecté le signale. */
  const fresh = !ruler || !ruler.isConnected;
  if (fresh) lastSignature = '';

  /* E059-10 : un seul conteneur, relogé sans doublon, réutilisé sinon. */
  let found = document.getElementById(RULER_ID);
  if (found && found.parentElement !== detail) found.remove();
  ruler = document.getElementById(RULER_ID);
  if (!ruler) {
    ruler = ctx.el('section', 'points-e059-ruler');
    ruler.id = RULER_ID;
    ruler.setAttribute('role', 'group');
    ruler.setAttribute('aria-labelledby', TITLE_ID);
  }
  if (ruler.parentElement !== detail) detail.appendChild(ruler);

  if (fresh) {
    const body = buildBody(ctx);
    reading = body.reading;
    ladder = body.ladder;
    metrics = body.metrics;
    ruler.replaceChildren(body.title, body.reading, body.ladder, body.note, body.metrics);
  }

  render(ctx);
  observeMeta(ctx);
  if (detail.dataset) detail.dataset.pointsE059Ready = 'true';
}

register('E059', install);
