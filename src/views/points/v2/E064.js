import { register } from './registry.js';

/* Lentille POINTS E064 — passe 2 (V2) — Performance & rendu :
 * plafonnement du DPR à 2, garde canvas dormante et Diagnostic lisible.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E064.md — chantiers E064-01 à
 * E064-10 (version V2). Fichier possédé : ce module V2 uniquement. Aucun
 * fichier de la passe 1 (`src/views/points/E064.js`), aucun fichier partagé
 * (`points.js`, `registry.js`, `index.js`, `v2/index.js`, `styles.css`) et
 * aucune lentille voisine n'est édité.
 *
 * La vue `points.js:128` appelle `runEnhancementsV2({ viewId: 'pointsv2',
 * stage, layout })` après la passe 1 (`points.js:127`). Ce greffon est donc
 * INDÉPENDANT et COEXISTANT : il filtre sur `viewId`, lit le DOM déjà rendu,
 * ajoute un panneau de diagnostic statique et des attributs additifs, sans
 * déplacer ni réécrire aucun nœud de la vue. Espace de noms distinct —
 * identifiants préfixés `points-v2-e064-`, attributs `data-v2-e064-`,
 * feuille injectée sous l'id `points-v2-e064`.
 *
 * Fait fondateur (identique à la passe 1) : la vue Points est exclusivement
 * DOM/CSS — aucun <canvas> n'est créé par `points.js:17-129`. Le plafond
 * DPR ≤ 2 est donc une GARDE DÉFENSIVE DORMANTE : on constate l'inventaire
 * réel (0 canvas), on publie le plafond codé en dur, et on plafonne tout
 * canvas injecté par une autre lentille, sans jamais en créer un soi-même.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Toute valeur affichée est dérivée du DOM rendu et du réglage de densité
 * courant (lu, validé, jamais écrit dans le contenu sous forme matérielle non
 * bornée). Aucune région live n'est ajoutée : le panneau est du texte statique.
 *
 * Invariants V2 : un seul enregistrement, une seule feuille, un seul panneau
 * par rendu ; tous les ids préfixés et dédupliqués ; tout DOM statique bâti
 * avec ctx.el (jamais de balisage par chaîne ni innerHTML) ; zéro réseau,
 * zéro aléa, zéro minuteur, zéro boucle d'animation, zéro console.* ; une
 * seule veille matchMedia ré-armée (ni timer ni rAF) ; chaque état porte un
 * signe ET un mot, jamais la couleur seule ; une structure inattendue
 * neutralise la lentille sans exception.
 */

const CSS_ID = 'points-v2-e064';
const SCOPE = 'points-v2-e064';
const VIEW_IDS = ['pointsv2', 'points'];
const DPR_CAP = 2; /* E064-02 : plafond unique, codé en dur, jamais deviné. */

const ID = {
  panel: 'points-v2-e064-panel',
  title: 'points-v2-e064-title',
  brut: 'points-v2-e064-brut',
  effectif: 'points-v2-e064-effectif',
  facteur: 'points-v2-e064-facteur',
  plafond: 'points-v2-e064-plafond',
  canvas: 'points-v2-e064-canvas',
  appliques: 'points-v2-e064-appliques',
  crees: 'points-v2-e064-crees',
  reevals: 'points-v2-e064-reevals',
  reduit: 'points-v2-e064-reduit',
  contraste: 'points-v2-e064-contraste',
  liste: 'points-v2-e064-liste',
};

/* Feuille unique, intégralement préfixée par `.points-v2-e064` (classe posée
 * sur `.points-matrix`, ancêtre du panneau). Aucune règle ne vise la structure
 * d'origine, aucune ressource externe, pas d'animation déclarée (la règle
 * `transition:none` ne fait que neutraliser), libellés portés par le texte. */
const CSS = `
.points-v2-e064 .points-v2-e064-panel{margin:10px 0 0;padding:10px 12px;border:1px solid var(--line,#2f2f2f);border-radius:6px;background:var(--panel,#141414);font-size:11px;line-height:1.55}
.points-v2-e064 .points-v2-e064-title{margin:0 0 4px;font-size:12px;color:var(--gold,#d4af37);font-weight:700}
.points-v2-e064 .points-v2-e064-intro{margin:0 0 8px;color:var(--muted,#9aa0a6)}
.points-v2-e064 .points-v2-e064-dl{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px 10px;font-variant-numeric:tabular-nums}
.points-v2-e064 .points-v2-e064-term{margin:0;color:var(--muted,#9aa0a6);font-weight:600}
.points-v2-e064 .points-v2-e064-def{margin:0;color:var(--text,#e8e8e8)}
.points-v2-e064 .points-v2-e064-note{margin:8px 0 2px;color:var(--muted,#9aa0a6)}
.points-v2-e064 .points-v2-e064-list{margin:0;padding-left:18px;color:var(--text,#e8e8e8)}
.points-v2-e064 .points-v2-e064-item{margin:0 0 2px}
@media (max-width:620px){
  .points-v2-e064 .points-v2-e064-dl{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion: reduce){
  .points-v2-e064 .points-v2-e064-panel{transition:none}
}
@media (forced-colors: active){
  .points-v2-e064 .points-v2-e064-panel{border-color:CanvasText;background:Canvas}
  .points-v2-e064 .points-v2-e064-title,
  .points-v2-e064 .points-v2-e064-term,
  .points-v2-e064 .points-v2-e064-def,
  .points-v2-e064 .points-v2-e064-note,
  .points-v2-e064 .points-v2-e064-list{color:CanvasText}
}
@media print{
  .points-v2-e064 .points-v2-e064-panel{border-color:#777;background:#fff}
  .points-v2-e064 .points-v2-e064-title,
  .points-v2-e064 .points-v2-e064-term,
  .points-v2-e064 .points-v2-e064-def,
  .points-v2-e064 .points-v2-e064-note,
  .points-v2-e064 .points-v2-e064-list{color:#222}
}
`;

/* État module : compteurs scalaires et une seule veille ré-armée. Aucun nœud
 * n'est conservé d'un rendu à l'autre sous forme de référence périmée : les
 * références de panneau sont réassignées à chaque installation (E064-10). */
let installs = 0;
let reevals = 0;
let watch = null;
let active = null;
let builtPanel = null;
let builtRefs = null;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root)) return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, name, value) {
  setAttr(node, 'data-v2-e064-' + name, String(value));
}

/* E064-10 : réutilise un nœud par identifiant et le déplace dans le parent
 * courant au lieu de le cloner ; garantit l'absence de doublon après un
 * aller-retour de navigation. */
function place(ctx, id, tag, className, parent) {
  let node = typeof document === 'undefined' || typeof document.getElementById !== 'function'
    ? null : document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) node.remove(); });
  return keep || nodesById(id)[0] || null;
}

/* E064-01 : lecture validée de la densité appareil. Valeur absente, non finie
 * ou non positive → repli déterministe 1. Aucune écriture matérielle. */
function readDpr() {
  let raw = 1;
  try {
    if (typeof window !== 'undefined' && window.devicePixelRatio != null) {
      const value = Number(window.devicePixelRatio);
      if (Number.isFinite(value) && value > 0) raw = value;
    }
  } catch { raw = 1; }
  return raw;
}

/* E064-04 : taille CSS d'un canvas, jamais sa taille physique déjà multipliée.
 * getComputedStyle d'abord, replis géométriques ensuite. */
function cssSize(canvas) {
  let width = 0;
  let height = 0;
  try {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const cs = window.getComputedStyle(canvas);
      width = parseFloat(cs.width) || 0;
      height = parseFloat(cs.height) || 0;
    }
  } catch { width = 0; height = 0; }
  if (!width || !height) {
    const rect = typeof canvas.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect() : null;
    if (rect) { width = rect.width || 0; height = rect.height || 0; }
  }
  if (!width) width = canvas.clientWidth || 0;
  if (!height) height = canvas.clientHeight || 0;
  return { width, height };
}

function labelOf(canvas, index) {
  if (canvas.id) return '#' + canvas.id;
  const cls = txt(canvas.className).split(/\s+/).filter(Boolean)[0];
  if (cls) return '.' + cls;
  return 'canvas n°' + (index + 1);
}

/* E064-03 / E064-04 : inventaire des canvas présents sous la racine et
 * plafonnement de leur backing store. Aucun canvas n'est créé (E064-05). La
 * garde de densité (> plafond + 0,01) rend l'action idempotente et limite la
 * réinitialisation du contexte 2D aux seuls canvas réellement sur-denses. */
function capCanvases(root, effectif) {
  const list = nodes(root, 'canvas');
  const items = [];
  let adjustments = 0;
  list.forEach((canvas, index) => {
    const size = cssSize(canvas);
    setAttr(canvas, 'data-v2-e064-dpr-plafond', effectif.toFixed(2));
    if (size.width > 0 && size.height > 0) {
      const density = Number(canvas.width) / size.width;
      if (Number.isFinite(density) && density > effectif + 0.01) {
        canvas.width = Math.max(1, Math.round(size.width * effectif));
        canvas.height = Math.max(1, Math.round(size.height * effectif));
        adjustments += 1;
      }
    }
    items.push(labelOf(canvas, index) + ' — densité plafonnée à ' + effectif.toFixed(2));
  });
  return { count: list.length, adjustments, items };
}

function compute(root, reduced) {
  const brut = readDpr();
  const effectif = Math.min(brut, DPR_CAP);
  const facteur = brut > 0 ? effectif / brut : 1;
  const canvases = capCanvases(root, effectif);
  return {
    brut,
    effectif,
    facteur,
    canvases,
    reevals,
    reduced,
  };
}

/* E064-07 : panneau statique en flux normal, construit une seule fois avec
 * ctx.el (jamais de balisage par chaîne). Aucun élément focusable ajouté :
 * le nombre d'arrêts Tab de la vue reste inchangé. */
function buildPanel(ctx, panel) {
  const refs = {};
  const title = ctx.el('h3', 'points-v2-e064-title', 'Moniteur de densité — DPR ≤ 2');
  title.id = ID.title;
  const intro = ctx.el('p', 'points-v2-e064-intro',
    'Contrôle de densité des canvas. Aucun canvas n’est créé par la lentille ; toutes les valeurs sont dérivées du DOM rendu et du réglage courant.');
  const dl = ctx.el('dl', 'points-v2-e064-dl');
  const rows = [
    ['brut', 'DPR brut (appareil)'],
    ['effectif', 'DPR effectif (plafonné à 2)'],
    ['facteur', 'Facteur d’échelle'],
    ['plafond', 'Plafond déclaré'],
    ['canvas', 'Canvas présents dans la vue'],
    ['appliques', 'Canvas ajustés au plafond'],
    ['crees', 'Canvas créés par la lentille'],
    ['reevals', 'Réévaluations après changement de densité'],
    ['reduit', 'Mouvement réduit'],
    ['contraste', 'Lisibilité'],
  ];
  rows.forEach(([key, label]) => {
    const dt = ctx.el('dt', 'points-v2-e064-term', label);
    const dd = ctx.el('dd', 'points-v2-e064-def', '');
    dd.id = ID[key];
    dl.append(dt, dd);
    refs[key] = dd;
  });
  const note = ctx.el('p', 'points-v2-e064-note',
    'Inventaire des canvas (identifiant, classe ou index) :');
  const list = ctx.el('ul', 'points-v2-e064-list');
  list.id = ID.liste;
  panel.replaceChildren(title, intro, dl, note, list);
  refs.title = title;
  refs.list = list;
  return refs;
}

function ensurePanel(ctx, panel) {
  if (builtPanel === panel && builtRefs) return builtRefs;
  builtRefs = buildPanel(ctx, panel);
  builtPanel = panel;
  return builtRefs;
}

/* E064-09 : chaque valeur est portée par un libellé <dt> et un texte <dd> ;
 * la mention « plafonné » est écrite en toutes lettres, jamais en couleur.
 * E064-08 : le mouvement réduit est documenté en texte, sans animation. */
function fill(ctx, refs, data) {
  write(refs.brut, data.brut.toFixed(2));
  write(refs.effectif, data.effectif.toFixed(2) + (data.brut > DPR_CAP ? ' (plafonné)' : ''));
  write(refs.facteur, Math.round(data.facteur * 100) + ' %');
  write(refs.plafond, String(DPR_CAP) + ' — jamais deviné, codé en dur');
  write(refs.canvas, String(data.canvases.count)
    + (data.canvases.count ? '' : ' — aucun canvas dans la vue Points'));
  write(refs.appliques, String(data.canvases.adjustments));
  write(refs.crees, '0 — aucune surface de dessin créée');
  write(refs.reevals, String(data.reevals));
  write(refs.reduit, (data.reduced ? 'oui' : 'non') + ' — aucune animation déclarée');
  write(refs.contraste,
    'Valeurs chiffrées en texte : aucune information portée par la seule couleur.');

  const items = data.canvases.items.length
    ? data.canvases.items
    : ['Aucun canvas : le plafond reste une garde dormante.'];
  refs.list.replaceChildren.apply(refs.list,
    items.map((item) => ctx.el('li', 'points-v2-e064-item', item)));
}

/* E064-10 : toutes les écritures sont dédupliquées par valeur (write, setData)
 * et la signature de l'état est publiée pour audabilité. Le rafraîchissement
 * complet est réutilisé par la veille de densité (E064-06). */
function refresh(state) {
  const data = compute(state.root, state.reduced);
  fill(state.ctx, state.refs, data);
  setData(state.panel, 'installs', installs);
  setData(state.panel, 'dpr-brut', data.brut.toFixed(2));
  setData(state.panel, 'dpr-effectif', data.effectif.toFixed(2));
  setData(state.panel, 'facteur', Math.round(data.facteur * 100) + ' %');
  setData(state.panel, 'plafond', DPR_CAP);
  setData(state.panel, 'canvas-total', data.canvases.count);
  setData(state.panel, 'canvas-ajustes', data.canvases.adjustments);
  setData(state.panel, 'canvas-crees', 0);
  setData(state.panel, 'reevals', data.reevals);
  setData(state.panel, 'reduced', data.reduced ? 1 : 0);
  setData(state.panel, 'signature', [
    data.brut.toFixed(2),
    data.effectif.toFixed(2),
    data.canvases.count,
    data.canvases.adjustments,
    data.reevals,
    data.reduced ? 1 : 0,
    data.canvases.items.join('/'),
  ].join('|'));
}

/* E064-06 : veille de densité via matchMedia, jamais de timer ni de rAF.
 * L'ancien écouteur est retiré avant tout ré-armement ; un changement
 * déclenche une réévaluation puis un ré-armement sur la nouvelle densité. */
function disarmWatch() {
  if (watch && watch.mq && typeof watch.mq.removeEventListener === 'function') {
    try { watch.mq.removeEventListener('change', watch.handler); }
    catch { /* repli silencieux */ }
  }
  watch = null;
}

function armWatch() {
  const win = typeof window !== 'undefined' ? window : null;
  if (!win || typeof win.matchMedia !== 'function') return null;
  let mq;
  try { mq = win.matchMedia('(resolution: ' + readDpr() + 'dppx)'); }
  catch { return null; }
  if (!mq || typeof mq.addEventListener !== 'function') return null;
  const handler = () => {
    disarmWatch();
    reevals += 1;
    if (active) refresh(active);
    armWatch();
  };
  try { mq.addEventListener('change', handler); }
  catch { return null; }
  return { mq, handler };
}

/* E064-01 / E064-07 / E064-10 : point d'entrée unique, gardes de type et de
 * structure, feuille unique, portée unique, ids dédupliqués et repli muet. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(root) || !query(root, '.points-grid')) return;

  ctx.css(CSS_ID, CSS);
  const host = query(root, '.points-matrix') || root;
  host.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }

  const panel = place(ctx, ID.panel, 'section', 'points-v2-e064-panel', host);
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', ID.title);
  const refs = ensurePanel(ctx, panel);
  Object.keys(ID).forEach((key) => {
    const keep = key === 'panel' ? panel : (key === 'liste' ? refs.list : refs[key]);
    enforceUnique(ID[key], keep);
  });

  installs += 1;
  active = { ctx, root, panel, refs, reduced };
  refresh(active);

  disarmWatch();
  watch = armWatch();
}

register('E064', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
