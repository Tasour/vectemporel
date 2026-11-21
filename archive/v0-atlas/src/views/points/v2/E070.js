import { register } from './registry.js';

/* Lentille E070 — passe V2, domaine G : performance & rendu.
 * Thème : « latence de survol plafonnée et mesurée » (POINTS/themes.json:77).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E070.md — chantiers E070-01 à E070-10.
 * Fichier possédé : src/views/points/v2/E070.js uniquement. Lectures seules :
 * la passe 1 (src/views/points/E070.js, UNIFIED_AUDIT/POINTS/views/E070.md),
 * le modèle de domaine G (src/views/chronology/v2/E070.js,
 * UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E070.md), points.js, points/v2/registry.js
 * et POINTS/themes.json. Ne sont ni édités ni doublés : la passe 1, points.js,
 * registry.js, index.js, styles.css, ni aucune autre lentille.
 *
 * Contrat exploité : viewId ('pointsv2', points.js:128), stage, layout, et les
 * helpers ctx.css, ctx.el, ctx.reducedMotion fournis par
 * points/v2/registry.js:28-44. La lentille est un greffon de mesure en lecture
 * seule : elle n'ajoute aucune région live, n'écrit aucune région existante et
 * publie son état en texte visible, dédupliqué, dans un bloc en flux greffé sur
 * .points-matrix. Tous les identifiants et classes sont préfixés
 * points-v2-e070- / points-v2-e070, distincts des points-e070-* de la passe 1.
 *
 * Invariants : un seul register('E070', ctx => { … }), un seul
 * ctx.css('points-v2-e070', CSS), un seul écouteur pointerover passif délégué
 * (réattaché au layout courant à chaque rendu), aucune boucle rAF, aucun timer,
 * zéro réseau, zéro aléa, zéro console.*, zéro innerHTML, zéro canvas, aucune
 * donnée inventée : faute d'échantillon, l'attente est écrite explicitement.
 */

const CSS_ID = 'points-v2-e070';
const SCOPE = 'points-v2-e070';
const HOST_CLASS = 'points-v2-e070-host';
const DATA_PREFIX = 'pointsV2E070';

/* E070-01 à E070-10 : identifiants DOM, tous préfixés et uniques. */
const PANEL_ID = 'points-v2-e070-panel';
const TITLE_ID = 'points-v2-e070-title';
const LEDE_ID = 'points-v2-e070-lede';
const BUDGET_ID = 'points-v2-e070-budget';
const SAMPLES_ID = 'points-v2-e070-samples';
const P50_ID = 'points-v2-e070-p50';
const P95_ID = 'points-v2-e070-p95';
const MAX_ID = 'points-v2-e070-max';
const VERDICT_ID = 'points-v2-e070-verdict';
const DISCARDED_ID = 'points-v2-e070-discarded';
const LISTENER_ID = 'points-v2-e070-listener';
const DEDUP_ID = 'points-v2-e070-dedup';
const CAP_ID = 'points-v2-e070-cap';
const CONTAIN_ID = 'points-v2-e070-contain';
const REDUCED_ID = 'points-v2-e070-reduced';
const NOCOLOR_ID = 'points-v2-e070-nocolor';
const KEYBOARD_ID = 'points-v2-e070-keyboard';
const RENDERS_ID = 'points-v2-e070-renders';
const BILAN_ID = 'points-v2-e070-bilan';

/* Contrôles réels products par points.js:34-93 : lignes, cellules, ères,
 * filtres et navigation. Jamais le document entier, jamais le panneau lui-même. */
const HOVER_SELECTORS =
  '.points-cell, .points-era, .points-filters button, .points-filters select, .points-nav button';

/* E070-01 : budget de latence perçue. 100 ms est le seuil usuel au-delà duquel
 * un retour de survol cesse de paraître instantané. E070-02 le compare aux
 * percentiles observés ; le verdict est calculé, jamais décidé à l'avance. */
const BUDGET_MS = 100;
const SAMPLE_LIMIT = 60;

/* E070-05, E070-08, E070-09 : feuille unique, intégralement préfixée
 * .points-v2-e070. Le plafond de transition et le délai nul sont des variables,
 * relues depuis la chaîne CSS plus bas : aucun chiffre n'est dupliqué entre le
 * CSS et les libellés. Les variables sont portées par le layout hôte, pas par
 * :root, pour qu'aucune règle ne s'échappe du préfixe. */
const CSS = `
  .${HOST_CLASS} {
    --points-v2-e070-hover-max: 90ms;
    --points-v2-e070-hover-delay: 0s;
  }
  .${SCOPE} {
    contain: layout style paint;
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .${SCOPE} .points-v2-e070-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .${SCOPE} .points-v2-e070-lede { margin: 0 0 8px; color: var(--muted); }
  .${SCOPE} .points-v2-e070-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
    gap: 6px; margin: 0;
  }
  .${SCOPE} .points-v2-e070-cell {
    margin: 0; padding: 4px 6px;
    border: 1px solid var(--line); border-radius: 6px;
  }
  .${SCOPE} .points-v2-e070-key { display: block; color: var(--muted); font-size: 10px; }
  .${SCOPE} .points-v2-e070-val { display: block; color: var(--gold-bright); font-size: 12px; }
  .${SCOPE} .points-v2-e070-verdict { color: var(--gold-bright); }
  .${SCOPE} .points-v2-e070-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }

  /* E070-04, E070-08, E070-09 : le retour de survol des contrôles de la matrice
     et de la navigation est borné (durée maximale, délai nul) et partagé avec
     :focus-visible. Le sens est porté par un contour et un soulignement, jamais
     par la seule teinte. */
  .${HOST_CLASS} :is(${HOVER_SELECTORS}) {
    outline: 2px solid transparent; outline-offset: 2px;
    transition-property: outline-color, box-shadow;
    transition-duration: var(--points-v2-e070-hover-max);
    transition-delay: var(--points-v2-e070-hover-delay);
  }
  .${HOST_CLASS} :is(${HOVER_SELECTORS}):is(:hover, :focus-visible) {
    outline-color: var(--gold-bright);
    box-shadow: 0 0 0 3px rgba(255, 215, 128, .18);
    text-decoration: underline;
  }

  /* E070-07 : en mouvement réduit, la transition est supprimée : le retour
     devient immédiat, donc sans latence de transition résiduelle. */
  @media (prefers-reduced-motion: reduce) {
    .${SCOPE}, .${SCOPE} *, .${HOST_CLASS} :is(${HOVER_SELECTORS}) { transition: none !important; }
  }
  /* E070-08 : en couleurs forcées, le contour et le soulignement subsistent. */
  @media (forced-colors: active) {
    .${SCOPE} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    .${SCOPE} .points-v2-e070-title,
    .${SCOPE} .points-v2-e070-key,
    .${SCOPE} .points-v2-e070-val,
    .${SCOPE} .points-v2-e070-bilan { color: CanvasText; }
    .${HOST_CLASS} :is(${HOVER_SELECTORS}):is(:hover, :focus-visible) {
      outline-color: CanvasText; box-shadow: none; text-decoration: underline;
    }
  }
  @media (max-width: 620px) {
    .${SCOPE} .points-v2-e070-grid { grid-template-columns: 1fr 1fr; }
  }
`;

function capture(pattern) {
  const found = CSS.match(pattern);
  return found ? found[1] : '';
}

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E070-05 : valeurs relues depuis la feuille, jamais recopiées dans un libellé. */
const CSS_AUDIT = Object.freeze({
  capMs: Number(capture(/--points-v2-e070-hover-max:\s*(\d+)ms/)) || 0,
  delay: capture(/--points-v2-e070-hover-delay:\s*([\d.]+)s/),
  containment: occurrences(/contain\s*:\s*layout style paint/g),
  sharedRules: occurrences(/:is\(:hover,\s*:focus-visible\)/g),
  reducedBlocks: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
  forcedBlocks: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
});

let installs = 0;
let boundHost = null;
let currentHost = null;
let duplicates = 0;
let discarded = 0;
let lastTarget = null;
const samples = [];
let refs = {
  panel: null, budget: null, count: null, p50: null, p95: null,
  max: null, verdict: null, discarded: null, listener: null, dedup: null,
  cap: null, contain: null, reduced: null, nocolor: null,
  keyboard: null, renders: null, bilan: null, reducedPref: false,
};

/* E070-10 : garde d'existence. La coque reconstruisant le stage, un nœud du
 * rendu précédent est détaché : on le réutilise et on le déplace dans le parent
 * courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* Marqueurs data-points-v2-e070-* : distincts de ceux de la passe 1. */
function setData(node, key, value) {
  if (!node) return;
  const prop = DATA_PREFIX + key;
  if (node.dataset[prop] !== value) node.dataset[prop] = value;
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1));
  return sorted[rank];
}

function formatMs(value) {
  return `${Math.round(value * 10) / 10} ms`;
}

/* E070-02 : enregistrement d'une latence réellement observée. Les horodatages
 * incohérents (temps non fini, écart négatif ou déraisonnable) sont écartés et
 * comptés : aucune valeur n'est fabriquée pour combler un trou de mesure. */
function record(latency) {
  if (!Number.isFinite(latency) || latency < 0 || latency > 5000) {
    discarded += 1;
    return;
  }
  samples.push(latency);
  if (samples.length > SAMPLE_LIMIT) samples.shift();
}

/* E070-01, E070-02, E070-04 : l'état est affiché en texte visible ordinaire,
 * sans région live et sans écriture redondante. Le verdict compare le p95 au
 * budget ; sans échantillon, il dit explicitement que la mesure est en attente. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  const sorted = samples.slice().sort((a, b) => a - b);
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const peak = sorted.length ? sorted[sorted.length - 1] : 0;
  const withinBudget = sorted.length > 0 && p95 <= BUDGET_MS;

  write(r.budget, `${BUDGET_MS} ms (p95)`);
  write(r.count, `${samples.length} échantillon${samples.length > 1 ? 's' : ''}`);
  write(r.p50, sorted.length ? formatMs(p50) : 'en attente de survol');
  write(r.p95, sorted.length ? formatMs(p95) : 'en attente de survol');
  write(r.max, sorted.length ? formatMs(peak) : 'en attente de survol');
  write(r.verdict, !sorted.length
    ? 'Mesure en attente : survolez une cellule, une ère, un filtre ou un bouton.'
    : (withinBudget ? 'Dans le budget : latence plafonnée.' : 'Au-dessus du budget : latence à surveiller.'));
  write(r.discarded, `${discarded} horodatage${discarded > 1 ? 's' : ''} écarté${discarded > 1 ? 's' : ''}`);
  write(r.listener, '1 écouteur · pointerover · passif · délégué');
  write(r.dedup, `${duplicates} survol${duplicates > 1 ? 's' : ''} redondant${duplicates > 1 ? 's' : ''} ignoré${duplicates > 1 ? 's' : ''}, sans minuteur`);
  write(r.cap, `transition ${CSS_AUDIT.capMs} ms · délai ${CSS_AUDIT.delay} s`);
  write(r.contain, `${CSS_AUDIT.containment} zone isolée (contain)`);
  write(r.reduced, r.reducedPref
    ? 'Mouvement réduit : transition supprimée, retour immédiat.'
    : 'Mouvement réduit inactif : plafond CSS appliqué.');
  write(r.nocolor, 'Contour + soulignement : la teinte seule ne porte rien.');
  write(r.keyboard, `${CSS_AUDIT.sharedRules} règle(s) partagée(s) avec :focus-visible.`);
  write(r.renders, `${installs} rendu${installs > 1 ? 's' : ''} du greffon`);
  write(r.bilan, `Bilan survol : plafond CSS ${CSS_AUDIT.capMs} ms, délai ${CSS_AUDIT.delay} s, budget ${BUDGET_MS} ms, ${samples.length} mesure${samples.length > 1 ? 's' : ''} sur ${SAMPLE_LIMIT} conservées au plus, ${discarded} écartée${discarded > 1 ? 's' : ''}. Un seul écouteur passif, zéro minuteur, zéro aléa.`);

  setData(r.panel, 'Budget', String(BUDGET_MS));
  setData(r.panel, 'Samples', String(samples.length));
  setData(r.panel, 'P50', sorted.length ? String(Math.round(p50 * 10) / 10) : '');
  setData(r.panel, 'P95', sorted.length ? String(Math.round(p95 * 10) / 10) : '');
  setData(r.panel, 'Max', sorted.length ? String(Math.round(peak * 10) / 10) : '');
  setData(r.panel, 'Verdict', !sorted.length ? 'pending' : (withinBudget ? 'within' : 'over'));
  setData(r.panel, 'Discarded', String(discarded));
  setData(r.panel, 'Listeners', '1');
  setData(r.panel, 'Passive', '1');
  setData(r.panel, 'Timers', '0');
  setData(r.panel, 'Dedup', String(duplicates));
  setData(r.panel, 'CssCap', String(CSS_AUDIT.capMs));
  setData(r.panel, 'CssDelay', CSS_AUDIT.delay);
  setData(r.panel, 'Contain', String(CSS_AUDIT.containment));
  setData(r.panel, 'Reduced', r.reducedPref ? '1' : '0');
  setData(r.panel, 'Nocolor', '1');
  setData(r.panel, 'Keyboard', String(CSS_AUDIT.sharedRules));
  setData(r.panel, 'Renders', String(installs));
}

/* E070-03 et E070-04 : écouteur unique, passif, délégué. La comparaison avec
 * la cible précédente écarte les pointerover successifs dus aux descendants
 * d'un même contrôle : aucun minuteur, aucune file d'attente, aucune annulation.
 * La cible doit appartenir au layout courant (la coque en reconstruit un neuf
 * à chaque rendu). */
function onPointerOver(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest(HOVER_SELECTORS);
  if (!control || !control.isConnected || control.closest(`#${PANEL_ID}`)) return;
  if (!currentHost || !currentHost.contains(control)) return;
  if (control === lastTarget) {
    duplicates += 1;
    return;
  }
  lastTarget = control;
  const arrived = now();
  const stamp = typeof event.timeStamp === 'number' ? event.timeStamp : arrived;
  record(arrived - stamp);
  paint();
}

function addCell(list, make, label, id) {
  const cell = make('div', 'points-v2-e070-cell');
  const key = make('span', 'points-v2-e070-key', label);
  const value = make('span', 'points-v2-e070-val');
  value.id = id;
  cell.append(key, value);
  list.appendChild(cell);
  return value;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  if (ctx.viewId && ctx.viewId !== 'pointsv2') return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  currentHost = host;
  host.classList.add(HOST_CLASS);

  const matrix = host.querySelector('.points-matrix');
  const panelHost = matrix || host;
  const panel = ensureNode(make, PANEL_ID, 'section', SCOPE, panelHost);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'points-v2-e070-title', 'Latence de survol — plafonnée et mesurée');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e070-lede', 'Ce panneau mesure le délai entre l’horodatage d’un survol et sa prise en compte, et montre le plafond de transition appliqué au retour visuel des contrôles. Il n’ajoute ni minuteur ni animation : faute d’échantillon, il l’écrit explicitement.');
  lede.id = LEDE_ID;

  const grid = make('dl', 'points-v2-e070-grid');
  const budget = addCell(grid, make, 'Budget (p95)', BUDGET_ID);
  const count = addCell(grid, make, 'Échantillons', SAMPLES_ID);
  const p50 = addCell(grid, make, 'Médiane', P50_ID);
  const p95 = addCell(grid, make, 'P95', P95_ID);
  const max = addCell(grid, make, 'Maximum', MAX_ID);
  const verdict = addCell(grid, make, 'Verdict', VERDICT_ID);
  verdict.classList.add('points-v2-e070-verdict');
  const discardedCell = addCell(grid, make, 'Horodatages écartés', DISCARDED_ID);
  const listener = addCell(grid, make, 'Écouteur de survol', LISTENER_ID);
  const dedup = addCell(grid, make, 'Anti-rebond sans timer', DEDUP_ID);
  const cap = addCell(grid, make, 'Plafond CSS', CAP_ID);
  const contain = addCell(grid, make, 'Isolation', CONTAIN_ID);
  const reduced = addCell(grid, make, 'Mouvement réduit', REDUCED_ID);
  const nocolor = addCell(grid, make, 'Indice non coloré', NOCOLOR_ID);
  const keyboard = addCell(grid, make, 'Équivalent clavier', KEYBOARD_ID);
  const renders = addCell(grid, make, 'Rendus du greffon', RENDERS_ID);

  const bilan = make('p', 'points-v2-e070-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : aucun ID en doublon ne subsiste. */
  panel.replaceChildren(title, lede, grid, bilan);

  refs = {
    panel, budget, count, p50, p95, max, verdict,
    discarded: discardedCell, listener, dedup, cap, contain,
    reduced, nocolor, keyboard, renders, bilan,
    reducedPref: typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false,
  };
  paint();

  /* E070-03 / E070-10 : un seul écouteur pour toute la session, réattaché au
   * layout courant parce que la coque détruit le stage à chaque rendu. */
  if (boundHost !== host) {
    if (boundHost) boundHost.removeEventListener('pointerover', onPointerOver, true);
    host.addEventListener('pointerover', onPointerOver, { passive: true, capture: true });
    boundHost = host;
  }
  paint();
}

register('E070', ctx => {
  install(ctx);
});
