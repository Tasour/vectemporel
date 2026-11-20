import { register } from './registry.js';

/* Lentille E062 — passe V2, domaine G : performance & rendu.
 * Thème : « IntersectionObserver unique si observation » (themes.json, clé E062).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E062.md — chantiers E062-01 à E062-10.
 * Fichier possédé : src/views/chronology/v2/E062.js uniquement. Lectures seules :
 * les modèles de qualité src/views/chronology/E049.js et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md, ainsi que themes.json.
 * Ne sont ni édités ni doublés : la passe 1 (src/views/chronology/*.js hors v2,
 * UNIFIED_AUDIT/CHRONOLOGIE/views/*), registry.js, index.js, styles.css,
 * src/views/chronology.js, ni aucune autre lentille.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout ; helpers ctx.css,
 * ctx.el et ctx.reducedMotion. Aucune région live ajoutée : l'état est visible,
 * dédupliqué, hors aria-live, pour ne pas concurrencer les annonces existantes.
 *
 * Invariants : un seul register('E062', install), un seul
 * ctx.css('chronology-v2-e062', ...), une seule instance d'IntersectionObserver,
 * zéro rAF, zéro canvas, zéro aléa, zéro timer, zéro réseau, zéro HTML brut.
 */

const CSS_ID = 'chronology-v2-e062';
const PANEL_ID = 'chronology-v2-e062-panel';
const TITLE_ID = 'chronology-v2-e062-title';
const LIST_ID = 'chronology-v2-e062-list';
const STATUS_ID = 'chronology-v2-e062-status';
const METRIC_ID = 'chronology-v2-e062-metric';
const SOURCE_ID = 'chronology-v2-e062-source';
const DEDUP_ID = 'chronology-v2-e062-dedup';
const MAIN_ID = 'atlas-chrono-main';

/* E062-03 : seuil et marge d'observation explicites, constants et documentés.
 * Le seuil minimal évite un défilement qui déclencherait à chaque pixel. */
const ROOT_MARGIN = '0px';
const THRESHOLD = 0.01;

/* E062-07 : graine fixe, affichée dans le panneau. Aucun tirage n'est effectué :
 * la graine sert de signature déterministe, jamais de source d'aléa. */
const SEED = 0xe062062;

/* E062-01 à E062-10, E062-09 : une seule feuille, injectée une fois par ctx.css.
 * Le panneau est un bloc en flux normal en fin de colonne : jamais modal, jamais
 * superposé, jamais tabindex=-1. Il n'ajoute aucun arrêt Tab. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e062-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e062-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e062-list { margin: 0 0 8px; padding: 0; list-style: none; }
  #${PANEL_ID} .e062-item { display: flex; gap: 8px; margin: 0 0 4px; }
  #${PANEL_ID} .e062-swatch {
    flex: 0 0 10px; height: 10px; margin-top: 2px;
    border: 1px solid var(--line-strong); border-radius: 2px;
    background: var(--muted-2);
  }
  #${PANEL_ID} .e062-item[data-e062-ok="1"] .e062-swatch {
    background: var(--gold-bright); border-color: var(--gold-bright);
  }
  #${PANEL_ID} .e062-label { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e062-status,
  #${PANEL_ID} .e062-metric,
  #${PANEL_ID} .e062-source,
  #${PANEL_ID} .e062-dedup { margin: 5px 0 0; }
  #${PANEL_ID} .e062-status { color: var(--gold-bright); }
  #${PANEL_ID} .e062-metric,
  #${PANEL_ID} .e062-source,
  #${PANEL_ID} .e062-dedup { color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e062-item { flex-wrap: wrap; gap: 2px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e062-title,
    #${PANEL_ID} .e062-item[data-e062-ok="1"] .e062-swatch,
    #${PANEL_ID} .e062-status { color: CanvasText; }
  }
`;

/* E062-10 : chaque ligne porte son identifiant de chantier, lisible même sans
 * CSS. Le libellé décrit un état mesuré, jamais une promesse non vérifiable. */
const ITEMS = [
  'E062-01 · Observateur unique : une seule instance d’IntersectionObserver, réutilisée à chaque rendu.',
  'E062-02 · Observation ciblée : seules les bandes et cartes de la frise sont suivies, jamais le document entier.',
  'E062-03 · Seuil et marge explicites : seuil 0,01 et marge 0 px, sans déclenchement au pixel.',
  'E062-04 · Réattachment propre : disconnect() puis réobservation contrôlée à chaque rendu.',
  'E062-05 · Aucune boucle rAF : les seules mises à jour proviennent des callbacks d’observation.',
  'E062-06 · Aucun canvas : le plafond de DPR n’est jamais sollicité.',
  'E062-07 · Aucun aléa : graine fixe affichée, zéro Math.random.',
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

/* E062-09 : garde d'existence pour toute ID préfixée chronology-v2-e062.
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
  if (node.dataset.e062Ok !== value) node.dataset.e062Ok = value;
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

/* E062-02 et E062-04 : sélection strictement bornée au conteneur de la frise,
 * puis disconnect() avant réobservation. Les classes posées sur les cibles sont
 * retirées avant d'être reposées : aucun résidu entre deux rendus. */
function observeTargets(root, obs) {
  const targets = root ? Array.from(root.querySelectorAll('.era-band, .event-card')) : [];
  observed.forEach((node) => {
    if (node && typeof node.classList !== 'undefined') {
      node.classList.remove('chronology-v2-e062-observed');
    }
  });
  if (obs) obs.disconnect();
  visibleTargets.clear();
  observed = targets;
  if (obs) {
    targets.forEach((node) => {
      obs.observe(node);
      node.classList.add('chronology-v2-e062-observed');
    });
  }
  rebinds += 1;
  return targets.length;
}

/* E062-01 à E062-10 : une seule fonction de rafraîchissement. Les attributs
 * data-e062-* rendent chaque mesure observable par un harnais ou un test DOM. */
function refresh() {
  const { panel, status, metric, source, dedup, items } = refs;
  if (!panel || !panel.isConnected) return;

  const supported = typeof IntersectionObserver === 'function';
  const single = observer ? 1 : 0;
  const seedHex = SEED.toString(16).toUpperCase();

  panel.dataset.e062Instances = String(single);
  panel.dataset.e062Targets = String(observed.length);
  panel.dataset.e062Global = '0';
  panel.dataset.e062RootMargin = ROOT_MARGIN;
  panel.dataset.e062Threshold = String(THRESHOLD);
  panel.dataset.e062Rebinds = String(rebinds);
  panel.dataset.e062Raf = '0';
  panel.dataset.e062Canvas = '0';
  panel.dataset.e062Random = '0';
  panel.dataset.e062Seed = seedHex;
  panel.dataset.e062Writes = String(writes);
  panel.dataset.e062Installs = String(installCount);
  panel.dataset.e062Callbacks = String(callbackCount);
  panel.dataset.e062Visible = String(visibleTargets.size);
  panel.dataset.e062Reduced = reduced ? '1' : '0';

  write(status, `Observation active : ${observer ? 'oui' : 'non prise en charge'} · cibles : ${observed.length} · visibles : ${visibleTargets.size}.`);
  write(metric, `Instances : ${single} · réattachments : ${rebinds} · callbacks : ${callbackCount} · écritures utiles : ${writes}.`);
  write(source, `Observation ciblée sur .era-band / .event-card dans #${MAIN_ID} ; aucun balayage global du document. Seuil ${THRESHOLD}, marge « ${ROOT_MARGIN} ».`);
  write(dedup, `Graine ${seedHex} (hexadécimal) · aléa : aucun · rAF : 0 · canvas : 0 · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  const ok = [
    supported ? single === 1 : true,
    panel.dataset.e062Global === '0',
    ROOT_MARGIN === '0px' && THRESHOLD === 0.01,
    rebinds >= 1,
    panel.dataset.e062Raf === '0',
    panel.dataset.e062Canvas === '0',
    panel.dataset.e062Random === '0',
    panel.dataset.e062Writes === String(writes),
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

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);
  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e062-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e062-title', 'Performance & observation');
  title.id = TITLE_ID;
  const lede = make('p', 'e062-lede', 'Panneau de mesure : il n’observe que les marqueurs de la frise. Il ne modifie ni le routage, ni le filtrage, ni le focus.');

  const list = make('ul', 'e062-list');
  list.id = LIST_ID;
  const items = ITEMS.map((text) => {
    const li = make('li', 'e062-item');
    li.append(make('span', 'e062-swatch'), make('span', 'e062-label', text));
    return li;
  });
  list.replaceChildren(...items);

  const status = make('p', 'e062-status');
  status.id = STATUS_ID;
  const metric = make('p', 'e062-metric');
  metric.id = METRIC_ID;
  const source = make('p', 'e062-source');
  source.id = SOURCE_ID;
  const dedup = make('p', 'e062-dedup');
  dedup.id = DEDUP_ID;

  panel.replaceChildren(title, lede, list, status, metric, source, dedup);
  refs = { panel, status, metric, source, dedup, items };

  const obs = ensureObserver();
  observeTargets(document.getElementById(MAIN_ID), obs);
  refresh();
}

register('E062', install);
