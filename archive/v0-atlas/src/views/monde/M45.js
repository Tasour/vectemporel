import { register } from './registry.js';

/* Lentille M45 — Tests E2E du globe (domaine E : qualité & validation).
 * Miroir vivant, passif et silencieux du contrat défini par tests/e2e.mjs
 * (16 contrôles rejoués par Puppeteer) et scripts/verify.mjs (contrôles
 * statiques). Aucun test n'est modifié, aucun navigateur n'est piloté, aucune
 * touche ni clic n'est synthétisée : la lentille lit le DOM courant et l'état
 * public (window.VATLAS.getState) puis dépose le résultat dans un panneau
 * auditable (#monde-m45-contract) et sur les attributs data-m45-* du host.
 *
 * Zéro journalisation, zéro réseau, zéro aléa, zéro timer : une seule sonde
 * MutationObserver, un seul rAF coalescé, aucune écriture dans les sélecteurs
 * utilisés par les tests (.globe-list button, .event-card, .detail-sheet,
 * .recit-title, .geo-marker, .constellation-field, #globe-reveal, …).
 */

const CSS_ID = 'monde-m45';
const PANEL_ID = 'monde-m45-contract';
const TABLE_ID = 'monde-m45-table';
const OBSERVER_OPTIONS = { childList: true, subtree: true };

/* M45-01 : contrat figé, dans l'ordre exact de tests/e2e.mjs:23-62. */
const E2E = [
  ['accueil', 'accueil = globe'],
  ['pays', '10 pays listés'],
  ['chrono', 'pays → chronologie'],
  ['reperes', 'repères affichés'],
  ['fleche', 'flèche change de repère'],
  ['ouvrir', 'Entrée ouvre le détail'],
  ['fermer', 'Échap ferme le détail'],
  ['recit', '3 = récit'],
  ['point', 'un point affiché'],
  ['geo', '4 = géographie'],
  ['marqueurs', 'marqueurs présents'],
  ['constellation', '5 = constellation'],
  ['points', '6 = points'],
  ['orbites', 'orbites figées'],
  ['retour', '1 = globe'],
  ['console', 'aucune erreur console'],
];

/* M45-09 : miroir des contrôles statiques de scripts/verify.mjs:16-27. */
const STATIC = [
  ['pays10', '10 pays (verify)'],
  ['reperes229', '229 repères (verify)'],
  ['liens', 'aucun lien externe'],
  ['grokipedia', 'aucun Grokipedia'],
];

const LABEL = { ok: 'PASS', ko: 'FAIL', wait: 'EN ATTENTE' };

/* État module : une seule sonde, un seul jeu de résultats collants, un seul
 * compteur d'erreurs. Le registre réapplique le greffon à chaque rendu
 * (registry.js:45-56) : toutes les gardes ci-dessous sont module-level. */
let installed = false;
let observer = null;
let frame = 0;
let firstView = null;
let sawDetail = false;
let leftGlobe = false;
let errorCount = 0;
let results = Object.create(null);
let staticResults = Object.create(null);
let panel = null;
let host = null;
let stageRef = null;
let countriesRef = null;

function makeNative(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function publicState() {
  try {
    const api = window.VATLAS;
    return api && typeof api.getState === 'function' ? api.getState() : null;
  } catch { return null; }
}

function publicMeta() {
  try {
    const api = window.VATLAS;
    return api && api.meta && typeof api.meta === 'object' ? api.meta : null;
  } catch { return null; }
}

function nodes(root, selector) {
  try {
    return root && typeof root.querySelectorAll === 'function'
      ? root.querySelectorAll(selector) : [];
  } catch { return []; }
}

function count(root, selector) {
  return nodes(root, selector).length;
}

function statusOf(map, key) {
  return map[key] === 'ok' || map[key] === 'ko' ? map[key] : 'wait';
}

/* M45-02 à M45-08, M45-15, M45-16 : évaluation de chaque contrôle dans son
 * contexte d'observation. Un contrôle non observable dans la vue courante
 * conserve son dernier résultat (collant), jamais un FAIL par défaut. */
function evaluate() {
  const s = publicState() || {};
  const view = typeof s.view === 'string' ? s.view : '';
  const stage = stageRef && stageRef.isConnected
    ? stageRef : document.getElementById('atlas-stage');

  if (firstView === null) {
    firstView = view || 'inconnu';
    results.accueil = firstView === 'globe' ? 'ok' : 'ko';
  }

  if (view && view !== 'globe') leftGlobe = true;

  if (view === 'globe') {
    const expected = Array.isArray(countriesRef) ? countriesRef.length : 10;
    results.pays = expected > 0 && count(stage, '.globe-list button') === expected ? 'ok' : 'ko';
  }

  if (view === 'chronology' && s.countryId) results.chrono = 'ok';
  if (view === 'chronology') {
    if (count(stage, '.event-card') > 0) results.reperes = 'ok';
    if (s.eventIndex === 1) results.fleche = 'ok';
  }

  const sheets = count(document, '.detail-sheet');
  if (sheets === 1) { sawDetail = true; results.ouvrir = 'ok'; }
  else if (sawDetail && sheets === 0) results.fermer = 'ok';

  if (view === 'recit') {
    results.recit = 'ok';
    if (count(stage, '.recit-title') === 1) results.point = 'ok';
  }
  if (view === 'geography') {
    results.geo = 'ok';
    if (count(stage, '.geo-marker') > 0) results.marqueurs = 'ok';
  }
  if (view === 'constellation') results.constellation = 'ok';
  if (view === 'points') results.points = 'ok';

  /* L'absence de champ vaut PASS, comme l'option chaining du test (e2e.mjs:58). */
  results.orbites = count(document, '.constellation-field [style*="animation"]') === 0 ? 'ok' : 'ko';

  if (view === 'globe' && leftGlobe) results.retour = 'ok';
  results.console = errorCount === 0 ? 'ok' : 'ko';

  const meta = publicMeta() || {};
  const total = Array.isArray(countriesRef) ? countriesRef.length : meta.countries;
  staticResults.pays10 = total === 10 ? 'ok' : 'ko';
  staticResults.reperes229 = meta.events === 229 ? 'ok' : 'ko';
  staticResults.liens = count(document, 'a[href^="http"], a[href^="//"]') === 0 ? 'ok' : 'ko';
  const text = document.documentElement && document.documentElement.textContent || '';
  staticResults.grokipedia = /grokipedia/i.test(text) ? 'ko' : 'ok';
}

function ensurePanel(ctx) {
  const scene = ctx.scene;
  let node = document.getElementById(PANEL_ID);
  if (node && node.isConnected && (!scene || node.parentElement === scene)) return node;

  const make = typeof ctx.el === 'function' ? ctx.el : makeNative;
  node = make('section', 'm45-panel');
  node.id = PANEL_ID;
  node.setAttribute('role', 'group');
  node.setAttribute('aria-label', 'Contrat E2E du globe — état des contrôles');

  const badge = make('p', 'm45-badge', 'Contrat E2E — EN ATTENTE');
  const table = make('table', 'm45-table');
  table.id = TABLE_ID;
  table.appendChild(make('caption', '', 'Miroir des contrôles tests/e2e.mjs et scripts/verify.mjs'));
  const body = make('tbody');
  const rows = Object.create(null);
  const add = (key, label) => {
    const tr = make('tr');
    const th = make('th', '', label);
    th.scope = 'row';
    const td = make('td', '', LABEL.wait);
    td.dataset.status = 'wait';
    tr.append(th, td);
    body.appendChild(tr);
    rows[key] = td;
  };
  E2E.forEach(([key, label]) => add(key, label));
  STATIC.forEach(([key, label]) => add(key, label));
  table.appendChild(body);
  node.append(badge, table);
  scene.appendChild(node);
  node.m45rows = rows;
  node.m45badge = badge;
  panel = node;
  return node;
}

/* Écriture : miroir lisible (data-m45-*) + badge visible + tableau détaillé
 * sr-only. Le tableau n'est jamais dans .globe-list et n'ajoute aucun bouton,
 * aucune class de test, aucun style inline animé. */
function write() {
  if (!host || !host.isConnected) host = document.getElementById('globe-canvas');
  const values = E2E.map(([key]) => statusOf(results, key));
  const passed = values.filter((v) => v === 'ok').length;
  const failed = values.filter((v) => v === 'ko').length;
  const pending = values.length - passed - failed;

  if (host && host.dataset) {
    host.dataset.m45Checks = String(values.length);
    host.dataset.m45Pass = String(passed);
    host.dataset.m45Fail = String(failed);
    host.dataset.m45Pending = String(pending);
    host.dataset.m45Accueil = firstView || '';
    host.dataset.m45Erreurs = String(errorCount);
    host.dataset.m45Static = STATIC
      .map(([key]) => statusOf(staticResults, key) === 'ok' ? '1'
        : statusOf(staticResults, key) === 'ko' ? '0' : '-').join('');
    host.dataset.m45Signature = `${passed}/${failed}/${pending}`;
  }

  if (panel && panel.isConnected && panel.m45rows) {
    E2E.concat(STATIC).forEach(([key]) => {
      const td = panel.m45rows[key];
      const map = key in results ? results : staticResults;
      const st = statusOf(map, key);
      if (td && td.dataset.status !== st) {
        td.dataset.status = st;
        td.textContent = LABEL[st];
      }
    });
    if (panel.m45badge) {
      panel.m45badge.textContent = `Contrat E2E — PASS ${passed}/${values.length} · FAIL ${failed} · EN ATTENTE ${pending}`;
    }
  }
}

/* Une seule boucle de rafraîchissement : coalescence par rAF, pas de timer,
 * pas de boucle continue. Les écritures du miroir sont protégées de la sonde
 * par disconnect/observe, donc aucune auto-réexcitation du MutationObserver. */
function refresh() {
  try { evaluate(); } catch { /* silence volontaire : aucune journalisation */ }
  if (observer) observer.disconnect();
  try { write(); } catch { /* silence volontaire : aucune journalisation */ }
  if (observer && typeof document !== 'undefined' && document.body) {
    try { observer.observe(document.body, OBSERVER_OPTIONS); } catch { /* silence */ }
  }
}

function schedule() {
  if (document.hidden || frame) return;
  frame = requestAnimationFrame(() => { frame = 0; refresh(); });
}

/* M45-16 : capture passive des erreurs, sans jamais de sortie journalisée.
 * Les écouteurs sont posés une seule fois et ne modifient aucun sélecteur. */
function onError() { errorCount += 1; }
function onRejection() { errorCount += 1; }
function onVisibility() { if (!document.hidden) schedule(); }

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', onRejection, true);
  document.addEventListener('visibilitychange', onVisibility);
  if ('MutationObserver' in window) {
    observer = new MutationObserver(schedule);
    observer.observe(document.body, OBSERVER_OPTIONS);
  }
}

register('M45', (ctx) => {
  if (!ctx || !ctx.scene) return;

  if (typeof ctx.css === 'function') {
    ctx.css(CSS_ID, `
      #${PANEL_ID}{position:absolute;top:10px;right:10px;z-index:5;
        max-width:min(300px,42%);pointer-events:none;font:inherit}
      #${PANEL_ID} .m45-badge{margin:0;padding:5px 8px;border:1px solid var(--line-strong);
        border-radius:7px;background:rgba(8,11,16,.9);color:var(--ink);
        font-size:10px;font-variant-numeric:tabular-nums;letter-spacing:.02em}
      #${PANEL_ID} .m45-table{position:absolute!important;width:1px;height:1px;
        padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);
        white-space:nowrap;border:0}
      @media (max-width:700px){#${PANEL_ID}{top:6px;right:6px;max-width:70%}}
      @media (prefers-reduced-motion:reduce){#${PANEL_ID} .m45-badge{box-shadow:none}}
    `);
  }

  host = ctx.host || document.getElementById('globe-canvas');
  stageRef = ctx.stage || document.getElementById('atlas-stage');
  if (Array.isArray(ctx.countries)) countriesRef = ctx.countries;

  panel = ensurePanel(ctx);
  install();
  refresh();
});
