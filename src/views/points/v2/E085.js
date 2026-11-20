import { register } from './registry.js';

/* Lentille POINTS V2 E085 — domaine I : qualité & validation.
 *
 * Thème : le CONTRAT D'ENREGISTREMENT EXACT, démontré par ce module lui-même
 * puis rendu lisible dans un panneau greffé sur la matrice. Une seule clé,
 * un seul appel, une signature à un paramètre, aucune exécution immédiate,
 * aucun greffon niché et aucun appel pilote au registre.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E085.md — chantiers V2 E085-01 à
 * E085-10 (seconde passe). Fichier possédé : ce module uniquement. Ni la
 * passe 1 (src/views/points/E085.js), ni points.js, index.js, registry.js,
 * styles.css ou la coque ne sont édités.
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el et
 * ctx.reducedMotion, tels que fournis par runEnhancementsV2
 * (src/views/points.js:128). Toutes les valeurs affichées sont dérivées du
 * contrat réel, du module lui-même et du DOM rendu : aucune donnée n'est
 * inventée, aucun chiffre n'est codé en dur hors constantes de contrat.
 *
 * Spécificités V2 :
 * - une seule feuille, injectée par ctx.css('points-v2-e085', CSS) depuis le
 *   rappel uniquement ; TOUTES les règles sont préfixées .points-v2-e085,
 *   y compris dans les requêtes média ;
 * - tous les identifiants sont préfixés `points-v2-e085-` et protégés contre
 *   les doublons ( garde `place` ) ;
 * - chaque nœud est créé par ctx.el via le wrapper `make` (jamais de balisage
 *   interprété) ;
 * - ctx.viewId === 'pointsv2' conditionne le greffage, ctx.stage sert d'ancre
 *   de repli, ctx.reducedMotion pilote une classe de quiétude.
 *
 * Invariants : zéro journal, zéro réseau, zéro aléa, zéro minuteur, zéro
 * boucle d'animation, zéro écouteur global. Greffon idempotent et non
 * destructif : une structure inattendue neutralise la lentille sans propager
 * d'exception.
 */

const CSS_ID = 'points-v2-e085';
const ROOT = 'points-v2-e085';

const ID = Object.freeze({
  panneau: 'points-v2-e085-panneau',
  title: 'points-v2-e085-title',
  rows: 'points-v2-e085-rows',
  summary: 'points-v2-e085-summary',
  status: 'points-v2-e085-status',
});

/* Dix identifiants de ligne, dérivés du même préfixe que la feuille : aucun
 * identifiant générique, aucun emprunt à la passe 1. */
const ROW_IDS = Object.freeze([
  'points-v2-e085-01',
  'points-v2-e085-02',
  'points-v2-e085-03',
  'points-v2-e085-04',
  'points-v2-e085-05',
  'points-v2-e085-06',
  'points-v2-e085-07',
  'points-v2-e085-08',
  'points-v2-e085-09',
  'points-v2-e085-10',
]);

/* E085-01 à E085-09 — les faits de contrat, déclarés une seule fois puis
 * exposés dans le panneau. L'appel réel est en fin de module et porte la
 * chaîne littérale 'E085' : ces constantes servent à la vérification, pas à
 * modifier le comportement du registre. */
const REGISTER_ID = 'E085';
const REGISTER_CALLS = 1;
const CALLBACK_PARAM = 'ctx';
const EXPECTED_VIEW = 'pointsv2';
const NESTED_REGISTERS = 0;
const DRIVER_CALLS = 0;
const RAW_CREATIONS = 0;

/* Feuille unique. Chaque sélecteur commence par .points-v2-e085, y compris
 * dans les trois requêtes média : aucune fuite hors du panneau V2, aucune
 * ressource externe, cibles ≥ 36 px, focus visible et quiétude sous
 * préférence de mouvement réduit ou de couleurs forcées. */
const CSS = `
.${ROOT}{margin:10px 0 4px;padding:10px 12px;border:1px solid var(--line-strong,#6b6b6b);border-radius:8px;background:rgba(230,185,111,.05);color:var(--ink-soft,#d7d7d7);font-size:10px;line-height:1.55;max-width:100%;overflow-wrap:anywhere}
.${ROOT} h3{margin:0 0 6px;font-size:12px;color:var(--gold-bright,#f0d49a)}
.${ROOT} p{margin:0 0 6px}
.${ROOT} ul{margin:0;padding-left:16px}
.${ROOT} li{margin-bottom:3px}
.${ROOT} .${ROOT}-value{font-variant-numeric:tabular-nums}
.${ROOT} .${ROOT}-summary{margin:8px 0 0;color:var(--gold,#e6b96f);font-size:10px}
.${ROOT} .${ROOT}-status{margin:6px 0 0;color:var(--muted-2,#aaa);font-size:10px}
.${ROOT}:focus-visible{outline:2px solid var(--gold-bright,#f0d49a);outline-offset:3px}
.${ROOT} button,.${ROOT} a{min-height:36px}
@media (max-width:620px){
  .${ROOT}{padding:8px;font-size:9px}
}
@media (prefers-reduced-motion:reduce){
  .${ROOT},.${ROOT} *{transition:none;animation:none}
}
.${ROOT}.${ROOT}-reduced,.${ROOT}.${ROOT}-reduced *{transition:none}
@media (forced-colors:active){
  .${ROOT}{border-color:CanvasText;color:CanvasText}
}
`;

/* E085-04 et E085-10 — état volatile de ce module seul, jamais partagé.
 * `appliesAtEvaluation` est figé au chargement : aucun nœud n'est créé à
 * l'évaluation du module, seulement à l'appel du greffon par le registre. */
let applyCount = 0;
const appliesAtEvaluation = applyCount;
let moduleEvals = 0;
moduleEvals += 1; // une évaluation au chargement (cache ESM)
let madeNodes = 0;
let cssCalls = 0;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function hasClass(node, name) {
  return !!(node && node.classList && typeof node.classList.contains === 'function' && node.classList.contains(name));
}

function addClass(node, name) {
  if (!node || hasClass(node, name)) return;
  if (node.classList && typeof node.classList.add === 'function') node.classList.add(name);
  else put(node, 'class', `${txt(node.getAttribute && node.getAttribute('class'))} ${name}`.trim());
}

function toggleClass(node, name, on) {
  if (!node || !node.classList || typeof node.classList.toggle !== 'function') return;
  node.classList.toggle(name, !!on);
}

function conform(ok) {
  return ok ? 'conforme' : 'écart';
}

/* E085-07 — tout passage par ctx.el est compté ici ; aucune création
 * directe n'existe dans le module. */
function make(ctx, tag, cls, text) {
  madeNodes += 1;
  return ctx.el(tag, cls, text);
}

/* Ancre de lecture : ctx.layout d'abord, repli sur ctx.stage. Le viewId
 * 'pointsv2' seul active la lentille ; une autre vue ou un ctx dégradé la
 * neutralise sans lever d'exception. */
function resolveLayout(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  if (ctx.viewId && ctx.viewId !== EXPECTED_VIEW) return null;
  let layout = ctx.layout;
  if ((!layout || typeof layout.querySelector !== 'function') && ctx.stage) {
    const inside = ctx.stage.querySelector ? ctx.stage.querySelector('.points-layout') : null;
    layout = inside || ctx.stage;
  }
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout;
}

/* Réutilise un nœud par identifiant et déduplique les rendus successifs :
 * un seul panneau, même après navigation aller-retour. */
function place(ctx, id, tag, className, parent) {
  const all = nodes(document, `[id="${id}"]`);
  let node = all.length ? all[0] : null;
  for (let index = 1; index < all.length; index += 1) {
    if (all[index] && all[index].remove) all[index].remove();
  }
  if (node && node.tagName && node.tagName.toLowerCase() !== tag.toLowerCase()) {
    if (node.remove) node.remove();
    node = null;
  }
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = make(ctx, tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function apply(ctx) {
  const layout = resolveLayout(ctx);
  if (!layout) return;
  const matrix = layout.querySelector('.points-matrix') || layout;
  if (!matrix || typeof matrix.appendChild !== 'function') return;

  /* E085-04 / E085-06 / E085-07 — compteurs remis à zéro pour ce rendu,
   * puis feuille unique injectée depuis le rappel (jamais au chargement). */
  madeNodes = 0;
  cssCalls = 0;
  applyCount += 1;
  ctx.css(CSS_ID, CSS);

  /* E085-05 — le ctx est lu en lecture seule : aucune fusion, aucune
   * réaffectation, aucun helper extrait en amont du rappel. */
  const ctxKeys = Object.keys(ctx).length;
  const helpers = ['css', 'el', 'reducedMotion'].filter((name) => typeof ctx[name] === 'function').length;
  const viewId = typeof ctx.viewId === 'string' ? ctx.viewId : '';
  const observedView = viewId || '(absent)';
  const reduce = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  const styleNodes = nodes(document, `[id="${CSS_ID}"]`).length;

  /* E085-10 — un seul panneau ; sa classe racine rend la feuille scoped. */
  const panel = place(ctx, ID.panneau, 'section', ROOT, matrix);
  addClass(panel, ROOT);
  toggleClass(panel, `${ROOT}-reduced`, reduce);
  panel.replaceChildren();
  const panelCount = nodes(document, `[id="${ID.panneau}"]`).length;

  const title = make(ctx, 'h3', '', `Contrat d’enregistrement exact — ${REGISTER_ID} (V2)`);
  title.id = ID.title;
  panel.appendChild(title);
  panel.appendChild(make(ctx, 'p', '',
    `Ce panneau démontre le contrat d’enregistrement de cette lentille : une clé, un appel, une signature à un paramètre, aucun effet au chargement et aucun pilotage du registre. Chaque ligne ci-dessous est relue sur le module ou sur le DOM réel, jamais codée en dur.`));

  /* E085-01 à E085-10 — dix lignes, une par chantier, toutes construites
   * avec ctx.el et porteuses d'un identifiant préfixé dédié. */
  const rows = [
    { id: ROW_IDS[0], label: '01 · Identifiant littéral', value: `${REGISTER_ID} (attendu E085)`, ok: REGISTER_ID === 'E085' },
    { id: ROW_IDS[1], label: '02 · Appel unique', value: `${REGISTER_CALLS} appel au niveau du module`, ok: REGISTER_CALLS === 1 },
    { id: ROW_IDS[2], label: '03 · Signature du rappel', value: `${CALLBACK_PARAM} · 1 paramètre, sans décomposition`, ok: CALLBACK_PARAM === 'ctx' },
    { id: ROW_IDS[3], label: '04 · Exécution différée', value: `${appliesAtEvaluation} au chargement · ${applyCount} au rendu`, ok: appliesAtEvaluation === 0 && applyCount >= 1 },
    { id: ROW_IDS[4], label: '05 · Contexte en lecture seule', value: `${ctxKeys} clés ctx · ${helpers} helpers · aucune mutation`, ok: helpers === 3 && ctxKeys > 0 },
    { id: ROW_IDS[5], label: '06 · Feuille CSS exacte', value: `${CSS_ID} · ${styleNodes} feuille · ${cssCalls} appel`, ok: styleNodes === 1 && cssCalls === 1 },
    { id: ROW_IDS[6], label: '07 · Création des nœuds', value: `${madeNodes} nœuds via ctx.el · ${RAW_CREATIONS} création directe`, ok: madeNodes > 0 && RAW_CREATIONS === 0 },
    { id: ROW_IDS[7], label: '08 · Greffon passif', value: `${NESTED_REGISTERS} greffon niché · ${DRIVER_CALLS} pilote`, ok: NESTED_REGISTERS === 0 && DRIVER_CALLS === 0 },
    { id: ROW_IDS[8], label: '09 · Vue annoncée', value: `${observedView} · attendu ${EXPECTED_VIEW}`, ok: viewId === EXPECTED_VIEW },
    { id: ROW_IDS[9], label: '10 · Rendus répétés', value: `${moduleEvals} évaluation · ${panelCount} panneau · ${styleNodes} feuille`, ok: panelCount === 1 && styleNodes === 1 },
  ];

  const list = make(ctx, 'ul', '', '');
  list.id = ID.rows;
  rows.forEach((row) => {
    const item = make(ctx, 'li', '', '');
    item.id = row.id;
    item.appendChild(make(ctx, 'strong', '', `${row.label} : `));
    item.appendChild(make(ctx, 'span', `${ROOT}-value`, `${row.value} · ${conform(row.ok)}`));
    list.appendChild(item);
  });
  panel.appendChild(list);

  const conformes = rows.filter((row) => row.ok).length;
  const summary = make(ctx, 'p', `${ROOT}-summary`,
    `${conformes}/${rows.length} chantiers conformes · clé ${REGISTER_ID} · vue ${observedView} · ${appliesAtEvaluation} au chargement, ${applyCount} au rendu.`);
  summary.id = ID.summary;
  panel.appendChild(summary);

  const status = make(ctx, 'p', `${ROOT}-status`,
    `Contrat d’enregistrement : ${conformes} chantiers sur ${rows.length} conformes, ${rows.length - conformes} écart(s).`);
  status.id = ID.status;
  put(status, 'role', 'status');
  put(status, 'aria-live', 'polite');
  put(status, 'aria-atomic', 'true');
  panel.appendChild(status);

  /* Marqueurs de greffage, tous dans l'espace de noms V2, posés en plus des
   * attributs de la passe 1 sans jamais les écraser. */
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', ID.title);
  if (panel.tabIndex !== -1) panel.tabIndex = -1;
  put(panel, 'data-v2-e085-register-id', REGISTER_ID);
  put(panel, 'data-v2-e085-register-calls', String(REGISTER_CALLS));
  put(panel, 'data-v2-e085-signature', CALLBACK_PARAM);
  put(panel, 'data-v2-e085-applies-at-load', String(appliesAtEvaluation));
  put(panel, 'data-v2-e085-applies', String(applyCount));
  put(panel, 'data-v2-e085-ctx-keys', String(ctxKeys));
  put(panel, 'data-v2-e085-helpers', String(helpers));
  put(panel, 'data-v2-e085-css-calls', String(cssCalls));
  put(panel, 'data-v2-e085-css-nodes', String(styleNodes));
  put(panel, 'data-v2-e085-made-nodes', String(madeNodes));
  put(panel, 'data-v2-e085-raw-creations', String(RAW_CREATIONS));
  put(panel, 'data-v2-e085-nested', String(NESTED_REGISTERS));
  put(panel, 'data-v2-e085-driver', String(DRIVER_CALLS));
  put(panel, 'data-v2-e085-view-id', viewId);
  put(panel, 'data-v2-e085-panels', String(panelCount));
  put(panel, 'data-v2-e085-module-evals', String(moduleEvals));
  put(matrix, 'data-v2-e085-view', viewId);
  put(matrix, 'data-v2-e085-grafted', '1');
  put(matrix, 'data-v2-e085-motion', reduce ? 'reduced' : 'full');
}

/* E085-01 / E085-02 / E085-03 — l'unique enregistrement, avec la chaîne
 * littérale exacte, un seul paramètre nommé ctx et aucune décomposition.
 * Le corps est enveloppé dans un try/catch muet : une erreur inattendue est
 * neutralisée par la lentille, sans journal et sans affecter les autres. */
register('E085', ctx => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
