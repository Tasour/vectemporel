import { register } from './registry.js';

/* Lentille E006 (passe V2) — séparateurs et respiration entre ères, domaine A.
 *
 * Périmètre : la frise et ses bandes d'ères. Dix chantiers uniques, E006-01 à
 * E006-10, tous observables dans le DOM ou le CSS injecté. Le module s'insère
 * entre les bandes existantes sans modifier la vue, le routeur ni la coque.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E006.md.
 * Fichier possédé : src/views/chronology/v2/E006.js uniquement.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * région live n'est ajoutée : le registre V2 ne fournit pas de say() et la vue
 * porte déjà ses annonces. L'état est affiché en texte visible, dédupliqué.
 *
 * Invariants :
 * - exactement un register('E006', ctx => { ... }) ;
 * - une seule feuille CSS, appelée sous la clé 'chronology-v2-e006' ;
 * - tous les IDs DOM sont préfixés chronology-v2-e006- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF, écouteur
 *   de touche, vol de focus ou annotation live.
 */

const PREFIX = 'chronology-v2-e006-';
const PANEL_ID = PREFIX + 'panel';
const TITLE_ID = PREFIX + 'title';
const LIST_ID = PREFIX + 'list';
const TRANSITIONS_ID = PREFIX + 'transitions';
const GAP_ID = PREFIX + 'gap';
const COMPACT_ID = PREFIX + 'compact';
const REDUCED_ID = PREFIX + 'reduced';
const CONTRAST_ID = PREFIX + 'contrast';
const MEASURE_ID = PREFIX + 'measure';
const COUNTS_ID = PREFIX + 'counts';
const METRIC_ID = PREFIX + 'metric';

const MAIN_ID = 'atlas-chrono-main';
const BAND_SELECTOR = '.era-band';
const BOUNDARY_CLASS = 'chronology-v2-e006-boundary';
const RULE_CLASS = 'chronology-v2-e006-rule';
const CAPTION_CLASS = 'chronology-v2-e006-caption';
const SPACED_CLASS = 'chronology-v2-e006-spaced';
const FIRST_CLASS = 'chronology-v2-e006-first';
const LAST_CLASS = 'chronology-v2-e006-last';
const SAFE_CLASS = 'chronology-v2-e006-contrast-safe';

/* E006-01 à E006-09 : une seule feuille CSS. La ligne porteuse du séparateur
   (role="separator") et le libellé textuel sont deux nœuds distincts : aucune
   information n'est confiée à la seule couleur. Aucune transition n'est créée,
   donc le repli reduced-motion n'a rien à éteindre, il est déclaré pour garantir
   l'avenir. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .chronology-v2-e006-title {
    margin: 0 0 6px; color: var(--gold-bright); font-family: var(--serif);
    font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .chronology-v2-e006-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .chronology-v2-e006-list { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .chronology-v2-e006-row { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .chronology-v2-e006-code {
    flex: 0 0 58px; color: var(--gold-bright); font-size: 9px;
  }
  #${PANEL_ID} .chronology-v2-e006-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .chronology-v2-e006-transitions { margin: 0 0 8px; padding-left: 16px; }
  #${PANEL_ID} .chronology-v2-e006-transition { margin: 0 0 3px; color: var(--muted); }
  #${PANEL_ID} .chronology-v2-e006-state { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E006-01 : le séparateur inséré entre deux ères. */
  .${BOUNDARY_CLASS} {
    box-sizing: border-box; display: flex; flex-wrap: wrap;
    align-items: center; gap: 3px 10px; margin: 14px 0; padding: 2px 0;
    color: var(--muted); font: inherit; font-size: 9px; line-height: 1.4;
  }
  .${RULE_CLASS} {
    flex: 1 1 100%; height: 1px; border-top: 1px dashed var(--line-strong);
  }
  .${CAPTION_CLASS} {
    flex: 0 0 auto; max-width: 68ch; color: var(--gold-bright);
    overflow-wrap: anywhere;
  }

  /* E006-02, E006-03 : respiration et délimitation des bords de la frise. */
  .${SPACED_CLASS} { margin-block-start: 14px; }
  .${FIRST_CLASS} { border-top: 1px solid var(--line-strong); padding-block-start: 6px; }
  .${LAST_CLASS} { border-bottom: 1px solid var(--line-strong); padding-block-end: 6px; }

  /* E006-05 : respiration conservée mais resserrée sur écran étroit. */
  @media (max-width: 620px) {
    .${BOUNDARY_CLASS} { margin-block: 8px; gap: 2px 8px; }
    .${SPACED_CLASS} { margin-block-start: 8px; }
    #${PANEL_ID} .chronology-v2-e006-code { flex-basis: 52px; }
    #${PANEL_ID} .chronology-v2-e006-row { flex-wrap: wrap; gap: 2px 8px; }
  }

  /* E006-06 : zéro mouvement propre. */
  @media (prefers-reduced-motion: reduce) {
    .${BOUNDARY_CLASS}, .${BOUNDARY_CLASS} *,
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }

  /* E006-07 : la ligne reste visible sans couleur. */
  @media (forced-colors: active) {
    .${BOUNDARY_CLASS}, .${RULE_CLASS} { border-top-color: CanvasText; color: CanvasText; }
    .${CAPTION_CLASS}, #${PANEL_ID} .chronology-v2-e006-code { color: CanvasText; }
    #${PANEL_ID} { border-color: CanvasText; background: Canvas; color: CanvasText; }
  }
  @media (prefers-contrast: more) {
    .${RULE_CLASS} { border-top-width: 2px; border-top-style: solid; }
    .${CAPTION_CLASS} { font-weight: 600; }
  }
`;

/* E006-04 : les dix libellés sont affichés dans le panneau, un par chantier. */
const CHANTIERS = [
  ['E006-01', 'Séparateur explicite inséré entre deux ères consécutives.'],
  ['E006-02', 'Respiration verticale ajoutée entre les bandes d’ères.'],
  ['E006-03', 'Bords de frise délimités : première et dernière ère distinctes.'],
  ['E006-04', 'Transition écrite en toutes lettres dans chaque séparateur.'],
  ['E006-05', 'Respiration resserrée mais non nulle sur écran étroit.'],
  ['E006-06', 'Aucun mouvement propre, même si la vue en animate.'],
  ['E006-07', 'Séparateur encore lisible en forced-colors / contraste renforcé.'],
  ['E006-08', 'Mesure de lecture plafonnée sur le libellé de transition.'],
  ['E006-09', 'Comptage des ères et des séparateurs, sans intervalle oublié.'],
  ['E006-10', 'Un seul greffon, un seul CSS, aucun doublon après re-render.'],
];

let renderCount = 0;

/* E006-10 : une écriture n'a lieu que si le texte diffère. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E006-10 : garde d'existence. Un nœud retrouvé est réutilisé puis déplacé
   dans le parent courant, car la coque reconstruit #app entre deux rendus. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function labelOf(band) {
  const raw = (band.textContent || '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'ère sans titre';
  return raw.length > 36 ? raw.slice(0, 35) + '…' : raw;
}

/* E006-01, E006-04 : le séparateur est un <li> dans une liste, sinon un <div>.
   La ligne ARIA et la légende sont deux enfants distincts. */
function ensureBoundary(make, id, anchor, fromLabel, toLabel) {
  const parent = anchor.parentElement;
  if (!parent) return null;
  const isList = parent.tagName === 'UL' || parent.tagName === 'OL';
  let node = document.getElementById(id);
  if (!node) {
    node = make(isList ? 'li' : 'div', BOUNDARY_CLASS);
    node.id = id;
    const rule = make('span', RULE_CLASS);
    rule.setAttribute('role', 'separator');
    rule.setAttribute('aria-orientation', 'horizontal');
    node.append(rule, make('span', CAPTION_CLASS));
  }
  const caption = node.querySelector('.' + CAPTION_CLASS);
  write(caption, `Transition : ${fromLabel} → ${toLabel}.`);
  if (node.dataset.e006Boundary !== '1') node.dataset.e006Boundary = '1';
  if (node.previousElementSibling !== anchor || node.parentElement !== parent) {
    parent.insertBefore(node, anchor.nextSibling);
  }
  return node;
}

/* E006-10 : les séparateurs d'un rendu précédent devenus orphelins sont retirés. */
function pruneOrphans(needed) {
  const nodes = document.querySelectorAll('[id^="' + PREFIX + 'boundary-"]');
  nodes.forEach((node) => {
    if (!needed.has(node.id) && node.parentElement) node.remove();
  });
}

/* E006-04, E006-08 : le récapitulatif des transitions reste dans le panneau,
   lisible sans CSS et sans passage par une région live. */
function refreshTransitions(make, bands) {
  const list = document.getElementById(TRANSITIONS_ID);
  if (!list) return;
  const rows = [];
  for (let index = 0; index < bands.length - 1; index += 1) {
    rows.push(make('li', 'chronology-v2-e006-transition',
      `Ère ${index + 1} → ère ${index + 2} : ${labelOf(bands[index])} puis ${labelOf(bands[index + 1])}.`));
  }
  if (!rows.length) {
    rows.push(make('li', 'chronology-v2-e006-transition',
      'Une seule ère présente : aucun séparateur à insérer.'));
  }
  list.replaceChildren(...rows);
}

function buildPanel(make, host) {
  const panel = ensureNode(make, PANEL_ID, 'section', 'chronology-v2-e006-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.classList.add(SAFE_CLASS);

  const title = ensureNode(make, TITLE_ID, 'h2', 'chronology-v2-e006-title', panel);
  write(title, 'Respiration entre les ères');
  const lede = ensureNode(make, PREFIX + 'lede', 'p', 'chronology-v2-e006-lede', panel);
  write(lede, 'Ce panneau rend visibles les séparateurs insérés entre les bandes d’ères. Il n’ajoute ni donnée ni raccourci : une ligne et une légende textuelle, jamais une information portée par la seule couleur.');

  const list = ensureNode(make, LIST_ID, 'ul', 'chronology-v2-e006-list', panel);
  list.replaceChildren(...CHANTIERS.map(([code, text]) => {
    const row = make('li', 'chronology-v2-e006-row');
    row.append(make('span', 'chronology-v2-e006-code', code), make('span', 'chronology-v2-e006-label', text));
    return row;
  }));

  const transitions = ensureNode(make, TRANSITIONS_ID, 'ul', 'chronology-v2-e006-transitions', panel);
  const gap = ensureNode(make, GAP_ID, 'p', 'chronology-v2-e006-state', panel);
  const compact = ensureNode(make, COMPACT_ID, 'p', 'chronology-v2-e006-state', panel);
  const reduced = ensureNode(make, REDUCED_ID, 'p', 'chronology-v2-e006-state', panel);
  const contrast = ensureNode(make, CONTRAST_ID, 'p', 'chronology-v2-e006-state', panel);
  const measure = ensureNode(make, MEASURE_ID, 'p', 'chronology-v2-e006-state', panel);
  const counts = ensureNode(make, COUNTS_ID, 'p', 'chronology-v2-e006-state', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'chronology-v2-e006-state', panel);

  panel.replaceChildren(title, lede, list, transitions, gap, compact, reduced,
    contrast, measure, counts, metric);
  return panel;
}

register('E006', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  renderCount += 1;

  /* E006-10 : une seule feuille, une seule clé. */
  ctx.css('chronology-v2-e006', CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = buildPanel(make, host);

  /* E006-01 à E006-09 : lecture seule des bandes existantes. */
  const scope = document.getElementById(MAIN_ID) || ctx.layout;
  const inScope = Array.from(scope.querySelectorAll(BAND_SELECTOR));
  const bands = inScope.length ? inScope : Array.from(document.querySelectorAll(BAND_SELECTOR));

  const needed = new Set();
  bands.forEach((band, index) => {
    band.classList.add(SPACED_CLASS);
    if (index === 0) band.classList.add(FIRST_CLASS);
    if (index === bands.length - 1) {
      band.classList.add(LAST_CLASS);
    } else {
      const id = PREFIX + 'boundary-' + index;
      needed.add(id);
      ensureBoundary(make, id, band, labelOf(bands[index]), labelOf(bands[index + 1]));
    }
  });
  pruneOrphans(needed);
  refreshTransitions(make, bands);

  /* E006-05 et E006-06 : l'état de préférence est lu sans écouteur ajouté. */
  const compact = typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 620px)').matches;
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const present = document.querySelectorAll('.' + BOUNDARY_CLASS).length;
  const expected = Math.max(0, bands.length - 1);

  /* E006-01 à E006-10 : état observable, dédupliqué par write(). */
  panel.dataset.e006View = ctx.viewId || 'chronologyv2';
  panel.dataset.e006Renders = String(renderCount);
  panel.dataset.e006Gap = compact ? '8px' : '14px';
  panel.dataset.e006Compact = compact ? '1' : '0';
  panel.dataset.e006Reduced = reduced ? '1' : '0';
  panel.dataset.e006Contrast = 'safe';
  panel.dataset.e006Measure = '68ch';
  panel.dataset.e006Counts = bands.length + '/' + expected;
  panel.dataset.e006Boundaries = String(present);

  write(document.getElementById(GAP_ID),
    `Respiration entre ères : ${compact ? '8' : '14'} px. La mesure est portée par l’attribut data-e006-gap du panneau.`);
  write(document.getElementById(COMPACT_ID),
    `Écran étroit (≤ 620 px) : ${compact ? 'oui' : 'non'} — la respiration se resserre sans jamais supprimer le séparateur.`);
  write(document.getElementById(REDUCED_ID),
    `Mouvement réduit : ${reduced ? 'oui' : 'non'} — aucun transition ni animation propre aux séparateurs.`);
  write(document.getElementById(CONTRAST_ID),
    'Contraste : la ligne et le libellé sont deux nœuds distincts, encore lisibles en forced-colors et en contraste renforcé.');
  write(document.getElementById(MEASURE_ID),
    'Lecture : le libellé de transition est plafonné à 68 caractères par ligne.');
  write(document.getElementById(COUNTS_ID),
    `Ères relevées : ${bands.length} · séparateurs attendus : ${expected} · séparateurs présents : ${present}.`);
  write(document.getElementById(METRIC_ID),
    `Rendus du greffon : ${renderCount} · vue : ${panel.dataset.e006View} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
});
