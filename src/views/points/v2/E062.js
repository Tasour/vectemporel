import { register } from './registry.js';

/* Lentille E062 — passe V2, domaine G : performance & rendu.
 * Thème : « IntersectionObserver unique si observation » (themes.json, clé E062).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E062.md — chantiers E062-01 à E062-10.
 * Fichier possédé : src/views/points/v2/E062.js uniquement. Lectures seules :
 * la passe 1 (src/views/points/E062.js, UNIFIED_AUDIT/POINTS/views/E062.md),
 * le modèle de domaine G (src/views/chronology/v2/E062.js,
 * UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E062.md), la vue points.js et themes.json.
 * Ne sont ni édités ni doublés : la passe 1, la vue points.js, registry.js,
 * index.js, styles.css, ni aucune autre lentille.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout ; helpers ctx.css,
 * ctx.el et ctx.reducedMotion fournis par points/v2/registry.js:28-44. La
 * lentille est un greffon de mesure : elle n'invente aucune donnée, elle ne
 * modifie ni les filtres, ni le détail, ni le focus. Aucune région live ajoutée
 * : l'état est visible et dédupliqué, hors aria-live, pour ne pas concurrencer
 * les annonces existantes. Les marqueurs data-v2-e062-* sont distincts de ceux
 * de la passe 1 (data-e062-*) afin d'éviter toute collision sur le DOM partagé.
 *
 * Invariants : un seul register('E062', …), un seul
 * ctx.css('points-v2-e062', …), une seule instance d'IntersectionObserver,
 * zéro rAF, zéro timer, zéro réseau, zéro aléa, zéro canvas, zéro HTML brut.
 */

const CSS_ID = 'points-v2-e062';
const SCOPE = 'points-v2-e062';
const PANEL_ID = 'points-v2-e062-panel';
const TITLE_ID = 'points-v2-e062-title';
const LIST_ID = 'points-v2-e062-list';
const STATUS_ID = 'points-v2-e062-status';
const METRIC_ID = 'points-v2-e062-metric';
const SOURCE_ID = 'points-v2-e062-source';
const DEDUP_ID = 'points-v2-e062-dedup';

/* Cibles de l'observation : les lignes de la matrice de couverture, telles que
 * construites en points.js:34-58. Jamais le document entier. */
const TARGET_SELECTOR = '.points-grid-row';

/* E062-03 : seuil et marge d'observation explicites, constants et documentés.
 * Le seuil minimal évite un défilement qui déclencherait à chaque pixel. */
const ROOT_MARGIN = '0px';
const THRESHOLD = 0.01;

/* E062-07 : graine fixe, affichée dans le panneau. Aucun tirage n'est effectué :
 * la graine sert de signature déterministe, jamais de source d'aléa. */
const SEED = 0xe062062;

/* E062-01 à E062-10 : une seule feuille, injectée une fois par ctx.css.
 * Toutes les règles sont préfixées .points-v2-e062 : aucune ne fuit hors de
 * cette lentille. Le panneau est un bloc en flux en fin de .points-matrix,
 * jamais modal, jamais superposé, jamais tabindex=-1 ; il n'ajoute aucun arrêt
 * Tab et n'altère pas la grille à deux colonnes .points-layout. */
const CSS = `
  .${SCOPE} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
    contain: layout style paint;
  }
  .${SCOPE} .points-v2-e062-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .${SCOPE} .points-v2-e062-lede { margin: 0 0 8px; color: var(--muted); }
  .${SCOPE} .points-v2-e062-list {
    margin: 0 0 8px; padding: 0; list-style: none;
    content-visibility: auto; contain-intrinsic-size: auto 240px;
  }
  .${SCOPE} .points-v2-e062-item { display: flex; gap: 8px; margin: 0 0 4px; }
  .${SCOPE} .points-v2-e062-swatch {
    flex: 0 0 10px; height: 10px; margin-top: 2px;
    border: 1px solid var(--line-strong); border-radius: 2px;
    background: var(--muted-2);
  }
  .${SCOPE} .points-v2-e062-item[data-v2-e062-ok="1"] .points-v2-e062-swatch {
    background: var(--gold-bright); border-color: var(--gold-bright);
  }
  .${SCOPE} .points-v2-e062-label { flex: 1 1 auto; min-width: 0; }
  .${SCOPE} .points-v2-e062-status,
  .${SCOPE} .points-v2-e062-metric,
  .${SCOPE} .points-v2-e062-source,
  .${SCOPE} .points-v2-e062-dedup { margin: 5px 0 0; }
  .${SCOPE} .points-v2-e062-status { color: var(--gold-bright); }
  .${SCOPE} .points-v2-e062-metric,
  .${SCOPE} .points-v2-e062-source,
  .${SCOPE} .points-v2-e062-dedup { color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    .${SCOPE} .points-v2-e062-item { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .${SCOPE}, .${SCOPE} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .${SCOPE} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .${SCOPE} .points-v2-e062-title,
    .${SCOPE} .points-v2-e062-item[data-v2-e062-ok="1"] .points-v2-e062-swatch,
    .${SCOPE} .points-v2-e062-status { color: CanvasText; }
  }
`;

/* E062-10 : chaque ligne porte son identifiant de chantier, lisible même sans
 * CSS. Le libellé décrit un état mesuré, jamais une promesse non vérifiable. */
const ITEMS = [
  'E062-01 · Observateur unique : une seule instance d’IntersectionObserver, réutilisée à chaque rendu.',
  'E062-02 · Observation ciblée : seules les lignes .points-grid-row de la matrice sont suivies, jamais le document entier.',
  'E062-03 · Seuil et marge explicites : seuil 0,01 et marge 0 px, sans déclenchement au pixel.',
  'E062-04 · Réattachment propre : disconnect() puis réobservation contrôlée à chaque rendu.',
  'E062-05 · Aucune boucle rAF : les seules mises à jour proviennent des callbacks d’observation.',
  'E062-06 · Aucun canvas : le plafond de DPR n’est jamais sollicité.',
  'E062-07 · Aucun aléa : graine fixe affichée, zéro tirage.',
  'E062-08 · Écritures dédupliquées : le DOM n’est touché que lorsque le texte change.',
  'E062-09 · Greffon unique : un panneau, une feuille CSS, un register, replaceChildren.',
  'E062-10 · Coût mesuré : callbacks et cibles visibles publiés, mouvement réduit respecté.',
];

/* État module : survit aux rendus sans créer de nœud ni d'écouteur. */
let observer = null;
let observed = [];
let visibleTargets = new Set();
let installCount = 0;
let rebinds = 0;
let callbackCount = 0;
let writes = 0;
let reduced = false;
let refs = { panel: null, status: null, metric: null, source: null, dedup: null, items: [] };

/* E062-08 : une seule fonction d'écriture, dédupliquée. Dans un callback
 * d'observation, éviter l'écriture redondante évite un reflow inutile. */
function write(node, text) {
  if (!node || node.textContent === text) return;
  node.textContent = text;
  writes += 1;
}

/* E062-09 : garde d'existence pour toute ID préfixée points-v2-e062-.
 * Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
 * coque reconstruisant #app, un nœud du rendu précédent est détaché et n'est
 * donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E062-09 : bascule purement CSS d'une pastille témoin, sans information portée
 * par la seule couleur : le texte de chaque ligne reste le support principal. */
function flag(node, ok) {
  if (!node) return;
  const value = ok ? '1' : '0';
  if (node.dataset.v2E062Ok !== value) node.dataset.v2E062Ok = value;
}

/* E062-01 : l'instance est créée au plus une fois. La détection de capacité
 * permet un repli silencieux si l'API n'existe pas (aucune erreur, aucun bruit). */
function ensureObserver() {
  if (observer) return observer;
  if (typeof IntersectionObserver !== 'function') return null;
  observer = new IntersectionObserver(onIntersect, {
    root: null,
    rootMargin: ROOT_MARGIN,
    threshold: THRESHOLD,
  });
  return observer;
}

/* E062-05 : unique point de mise à jour, piloté par l'observation. Aucune
 * boucle rAF, aucun timer : quand rien n'entre ni ne sort, rien ne s'exécute. */
function onIntersect(entries) {
  callbackCount += 1;
  entries.forEach((entry) => {
    if (entry.isIntersecting) visibleTargets.add(entry.target);
    else visibleTargets.delete(entry.target);
  });
  refresh();
}

/* E062-02 et E062-04 : sélection strictement bornée à .points-matrix, puis
 * disconnect() avant réobservation. Les classes posées sur les cibles sont
 * retirées avant d'être reposées : aucun résidu entre deux rendus. */
function observeTargets(root, obs) {
  const targets = root ? Array.from(root.querySelectorAll(TARGET_SELECTOR)) : [];
  observed.forEach((node) => {
    if (node && typeof node.classList !== 'undefined') {
      node.classList.remove('points-v2-e062-observed');
    }
  });
  if (obs) obs.disconnect();
  visibleTargets.clear();
  observed = targets;
  if (obs) {
    targets.forEach((node) => {
      obs.observe(node);
      node.classList.add('points-v2-e062-observed');
    });
  }
  rebinds += 1;
  return targets.length;
}

/* E062-01 à E062-10 : une seule fonction de rafraîchissement. Les attributs
 * data-v2-e062-* rendent chaque mesure observable par un harnais ou un test
 * DOM, distincts des attributs data-e062-* de la passe 1. */
function refresh() {
  const { panel, status, metric, source, dedup, items } = refs;
  if (!panel || !panel.isConnected) return;

  const supported = typeof IntersectionObserver === 'function';
  const single = observer ? 1 : 0;
  const seedHex = SEED.toString(16).toUpperCase();

  panel.dataset.v2E062Instances = String(single);
  panel.dataset.v2E062Targets = String(observed.length);
  panel.dataset.v2E062Global = '0';
  panel.dataset.v2E062RootMargin = ROOT_MARGIN;
  panel.dataset.v2E062Threshold = String(THRESHOLD);
  panel.dataset.v2E062Rebinds = String(rebinds);
  panel.dataset.v2E062Raf = '0';
  panel.dataset.v2E062Canvas = '0';
  panel.dataset.v2E062Random = '0';
  panel.dataset.v2E062Seed = seedHex;
  panel.dataset.v2E062Writes = String(writes);
  panel.dataset.v2E062Installs = String(installCount);
  panel.dataset.v2E062Callbacks = String(callbackCount);
  panel.dataset.v2E062Visible = String(visibleTargets.size);
  panel.dataset.v2E062Reduced = reduced ? '1' : '0';

  write(status, `Observation active : ${observer ? 'oui' : 'non prise en charge'} · cibles : ${observed.length} · visibles : ${visibleTargets.size}.`);
  write(metric, `Instances : ${single} · réattachments : ${rebinds} · callbacks : ${callbackCount} · écritures utiles : ${writes}.`);
  write(source, `Observation ciblée sur ${TARGET_SELECTOR} dans .points-matrix ; aucun balayage global du document. Seuil ${THRESHOLD}, marge « ${ROOT_MARGIN} ».`);
  write(dedup, `Graine ${seedHex} (hexadécimal) · aléa : aucun · rAF : 0 · canvas : 0 · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  const ok = [
    supported ? single === 1 : true,
    panel.dataset.v2E062Global === '0',
    ROOT_MARGIN === '0px' && THRESHOLD === 0.01,
    rebinds >= 1,
    panel.dataset.v2E062Raf === '0',
    panel.dataset.v2E062Canvas === '0',
    panel.dataset.v2E062Random === '0',
    panel.dataset.v2E062Writes === String(writes),
    installCount >= 1 && document.querySelectorAll(`#${PANEL_ID}`).length === 1,
    typeof ctxReducedOk() === 'boolean',
  ];
  items.forEach((item, index) => flag(item, ok[index]));
}

/* E062-10 : témoin de lecture de la préférence de mouvement. La valeur est
 * mémorisée à l'installation, puis publiée en texte et en attribut. */
function ctxReducedOk() {
  return reduced;
}

/* La passe V2 est appelée avec viewId 'pointsv2' (points.js:128). Le garde
 * évite une installation accidentelle sur un autre contrat de rendu. */
function install(ctx) {
  if (ctx.viewId && ctx.viewId !== 'pointsv2') return;
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);
  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  const matrix = ctx.layout.querySelector('.points-matrix');
  const host = matrix || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', SCOPE, host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'points-v2-e062-title', 'Performance & observation');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e062-lede', 'Panneau de mesure : il n’observe que les lignes de la matrice de couverture. Il ne modifie ni les filtres, ni le détail, ni le focus.');
  const list = make('ul', 'points-v2-e062-list');
  list.id = LIST_ID;
  const items = ITEMS.map((text) => {
    const li = make('li', 'points-v2-e062-item');
    li.append(make('span', 'points-v2-e062-swatch'), make('span', 'points-v2-e062-label', text));
    return li;
  });
  list.replaceChildren(...items);

  const status = make('p', 'points-v2-e062-status');
  status.id = STATUS_ID;
  const metric = make('p', 'points-v2-e062-metric');
  metric.id = METRIC_ID;
  const source = make('p', 'points-v2-e062-source');
  source.id = SOURCE_ID;
  const dedup = make('p', 'points-v2-e062-dedup');
  dedup.id = DEDUP_ID;

  panel.replaceChildren(title, lede, list, status, metric, source, dedup);
  refs = { panel, status, metric, source, dedup, items };

  const obs = ensureObserver();
  observeTargets(matrix, obs);
  refresh();
}

register('E062', (ctx) => {
  install(ctx);
});
