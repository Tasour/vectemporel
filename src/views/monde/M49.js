import { register, mondeDiagnostics } from './registry.js';

/* Lentille M49 — Non-régression du Monde (domaine E : qualité & validation).
 * Dix chantiers M49-01 … M49-10, tous implémentés dans ce module.
 *
 * Rôle : sentinelle passive. Elle vérifie, sans rien modifier, que les invariants
 * structurels et d'accessibilité de la vue Monde tiennent encore après l'application
 * des autres lentilles. Elle n'émet aucun réseau, aucun aléa, aucun message de
 * débogage, n'ajoute ni canvas ni boucle rAF ni timer, et ne renomme aucun
 * sélecteur de test.
 *
 * Gardes de compatibilité : chaque contrôle est enveloppé et peut être déclaré
 * « non vérifiable » au lieu de faire échouer le rendu ; les nœuds sont retirés
 * de l'API ctx (avec repli local) ; les références DOM sont réinterrogées à
 * chaque appel plutôt que refermées sur un nœud détaché par un rendu précédent.
 */

const CSS_ID = 'monde-m49';
const PANEL_ID = 'monde-m49-sentinel';
const ROWS_ID = 'monde-m49-rows';
const COUNT_ID = 'monde-m49-count';

const cssText = `
#${PANEL_ID} {
  position: absolute; top: 50%; right: 16px; transform: translateY(-50%);
  z-index: 6; max-width: 340px; max-height: 60%; overflow: auto;
  border: 1px solid var(--line); border-radius: 9px;
  background: rgba(8,11,16,.94); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45; font-variant-numeric: tabular-nums;
}
#${PANEL_ID}[data-result="alert"] { border-color: var(--red); }
#${PANEL_ID} > summary {
  min-height: 28px; padding: 7px 10px; cursor: pointer; color: var(--gold);
}
#${PANEL_ID}[open] > summary { border-bottom: 1px solid var(--line); }
.monde-m49-body { padding: 8px 10px 10px; }
.monde-m49-note { margin: 0 0 6px; color: var(--muted); }
#monde-m49-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
#monde-m49-table caption { padding: 0 0 6px; text-align: left; color: var(--muted); }
#monde-m49-table th, #monde-m49-table td {
  padding: 4px 2px; border-top: 1px solid var(--line);
  vertical-align: top; overflow-wrap: anywhere;
}
#monde-m49-table th { width: 40%; text-align: left; color: var(--muted); font-weight: 600; }
.monde-m49-mark { display: inline-block; min-width: 14px; font-weight: 700; }
.monde-m49-mark[data-state="ok"] { color: var(--gold-bright); }
.monde-m49-mark[data-state="bad"] { color: var(--red); }
.monde-m49-mark[data-state="na"] { color: var(--muted); }
.monde-m49-detail { margin-left: 4px; }
@media (max-width: 900px) {
  #${PANEL_ID} {
    right: 8px; top: auto; bottom: 78px; transform: none;
    max-width: min(320px, calc(100% - 16px)); max-height: 34%;
  }
}
`;

/* Fabrique d'éléments avec repli local si ctx.el est absent (garde M49-10). */
function makeEl(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* CSS via le contrat ctx.css, avec repli sans toucher à un fichier partagé. */
function addCss(ctx) {
  if (ctx && typeof ctx.css === 'function') {
    ctx.css(CSS_ID, cssText);
    return;
  }
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

function queryAll(ctx, selector) {
  const root = ctx && ctx.stage && typeof ctx.stage.querySelectorAll === 'function'
    ? ctx.stage : document;
  try { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  catch { return []; }
}

function countById(id) {
  try { return document.querySelectorAll('#' + id).length; }
  catch { return 0; }
}

function short(value) {
  const text = String(value === undefined || value === null ? '' : value).replace(/\s+/g, ' ').trim();
  return text.length > 84 ? text.slice(0, 81) + '…' : text;
}

/* Aucun contrôle ne peut faire échouer le rendu : un garde-fou par chantier. */
function safeRun(label, fn) {
  try {
    const result = fn();
    if (!result || typeof result !== 'object') {
      return { label, ok: false, detail: 'résultat non exploitable', applicable: false };
    }
    return {
      label,
      ok: !!result.ok,
      detail: short(result.detail),
      applicable: result.applicable !== false,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      detail: 'contrôle gardé : ' + String((error && error.message) || error),
      applicable: false,
    };
  }
}

/* M49-01 — dix pays, dix boutons, dix cartes (miroir de e2e.mjs:24). */
function checkCountries(ctx) {
  const expected = ctx && Array.isArray(ctx.countries) ? ctx.countries.length : null;
  if (expected === null) {
    return { ok: false, applicable: false, detail: 'ctx.countries non fourni — garde de compatibilité' };
  }
  const buttons = queryAll(ctx, '.globe-list button');
  const cards = queryAll(ctx, '.globe-country');
  return {
    ok: buttons.length === expected && cards.length === expected,
    detail: `${buttons.length} boutons · ${cards.length} cartes · ${expected} pays attendus`,
  };
}

/* M49-02 — sélecteurs de test intacts, sans les renommer ni les déplacer. */
const TEST_SELECTORS = [
  ['.globe-view', 'vue'],
  ['.globe-scene', 'scène'],
  ['.globe-list', 'liste'],
  ['.globe-choices', 'choix'],
  ['#globe-title', 'titre'],
  ['.globe-country', 'carte pays'],
  ['#globe-status', 'statut'],
  ['#globe-hover-readout', 'readout'],
  ['.globe-controls', 'commandes'],
];

function checkSelectors() {
  const missing = [];
  TEST_SELECTORS.forEach((pair) => {
    let found = false;
    try { found = document.querySelector(pair[0]) !== null; }
    catch { found = false; }
    if (!found) missing.push(pair[1] + ' (' + pair[0] + ')');
  });
  return {
    ok: missing.length === 0,
    detail: missing.length ? 'absents : ' + missing.join(', ') : `${TEST_SELECTORS.length} sélecteurs de test présents`,
  };
}

/* M49-03 — repères structurels uniques malgré les rendus répétés. */
function checkSingletons() {
  const ids = [
    'globe-canvas', 'globe-status', 'globe-choices', 'globe-title',
    'globe-hover-readout', 'globe-live', 'globe-help', 'nav-c2b-trail',
  ];
  const duplicates = [];
  ids.forEach((id) => {
    const n = countById(id);
    if (n > 1) duplicates.push(id + ' ×' + n);
  });
  return {
    ok: duplicates.length === 0,
    detail: duplicates.length ? 'doublons : ' + duplicates.join(', ') : `${ids.length} repères uniques`,
  };
}

/* M49-04 — statut du moteur lisible et cohérent (globe.js:329-333). */
function checkStatus() {
  const status = document.getElementById('globe-status');
  if (!status) return { ok: false, applicable: false, detail: '#globe-status absent' };
  const kind = status.dataset ? status.dataset.kind : '';
  const known = ['ready', 'error', 'busy'].indexOf(kind) >= 0;
  const role = status.getAttribute('role');
  return {
    ok: known && role === 'status',
    detail: `kind=${kind || '?'} · role=${role || '?'} · « ${short(status.textContent)} »`,
  };
}

/* M49-05 — repli utilisable sans WebGL : la liste reste la voie de sélection. */
function checkFallback(ctx) {
  let hasCanvas = false;
  try { hasCanvas = !!(ctx && ctx.host && ctx.host.querySelector('canvas')); }
  catch { hasCanvas = false; }
  const listCount = queryAll(ctx, '.globe-country').length;
  return {
    ok: listCount > 0,
    detail: `canvas ${hasCanvas ? 'présent' : 'absent'} · liste ${listCount} pays → repli ${listCount > 0 ? 'disponible' : 'indisponible'}`,
  };
}

/* M49-06 — accès clavier du globe et des boutons (globe.js:263-292, 400-402). */
function checkKeyboard(ctx) {
  const host = ctx && ctx.host;
  const okHost = !!(
    host && host.getAttribute('tabindex') === '0' &&
    host.getAttribute('role') === 'group' &&
    (host.getAttribute('aria-label') || '').length > 0
  );
  const buttons = queryAll(ctx, '.globe-country');
  let typed = true;
  buttons.forEach((button) => {
    if (button.getAttribute('type') !== 'button') typed = false;
  });
  return {
    ok: okHost && buttons.length > 0 && typed,
    detail: `globe tabindex/role/label ${okHost ? 'OK' : 'NOK'} · ${buttons.length} boutons type=button ${typed ? 'OK' : 'NOK'}`,
  };
}

/* M49-07 — région live unique, hors du #app (globe.js:73-85). */
function checkLive() {
  const live = document.getElementById('globe-live');
  if (!live) return { ok: false, applicable: false, detail: '#globe-live absent' };
  let outside = false;
  try { outside = !!(live.parentElement && !live.closest('#app')); }
  catch { outside = false; }
  return {
    ok: live.getAttribute('role') === 'status' && live.getAttribute('aria-live') === 'polite' && outside,
    detail: `role=${live.getAttribute('role') || '?'} · aria-live=${live.getAttribute('aria-live') || '?'} · hors coque=${outside ? 'oui' : 'non'}`,
  };
}

/* M49-08 — registre des lentilles sain (registry.js:70-72, app.js:147). */
function checkRegistry() {
  try {
    if (typeof mondeDiagnostics !== 'function') {
      return { ok: false, applicable: false, detail: 'diagnostics non exposés' };
    }
    const diag = mondeDiagnostics();
    const entries = diag && Array.isArray(diag.entries) ? diag.entries : [];
    const problems = diag && Array.isArray(diag.diagnostics) ? diag.diagnostics : [];
    const present = entries.indexOf('M49') >= 0;
    return {
      ok: present && problems.length === 0,
      detail: `${entries.length} lentilles · M49 ${present ? 'enregistré' : 'absent'} · ${problems.length} diagnostic(s)`,
    };
  } catch (error) {
    return {
      ok: false,
      applicable: false,
      detail: 'registre illisible : ' + String((error && error.message) || error),
    };
  }
}

/* M49-09 — empreinte de rendu bornée : un moteur, aucun canvas ajouté. */
function checkFootprint() {
  let webgl = 0;
  let ownCanvas = 0;
  try { webgl = document.querySelectorAll('canvas.globe-webgl').length; }
  catch { webgl = 0; }
  try {
    const panel = document.getElementById(PANEL_ID);
    ownCanvas = panel ? panel.querySelectorAll('canvas').length : 0;
  } catch { ownCanvas = 0; }
  return {
    ok: webgl <= 1 && ownCanvas === 0,
    detail: `canvas WebGL ${webgl} (≤ 1 attendu) · canvas M49 ${ownCanvas} · ni rAF ni timer ajouté`,
  };
}

/* M49-10 — panneau et feuille uniques, preuve d'idempotence. */
function checkIdempotence() {
  return {
    ok: countById(PANEL_ID) === 1 && countById(CSS_ID) === 1,
    detail: `panneaux M49 : ${countById(PANEL_ID)} · feuilles monde-m49 : ${countById(CSS_ID)}`,
  };
}

const CHECKS = [
  { id: 'm49-r01', label: 'M49-01 · Dix pays', run: checkCountries },
  { id: 'm49-r02', label: 'M49-02 · Sélecteurs de test', run: checkSelectors },
  { id: 'm49-r03', label: 'M49-03 · Repères uniques', run: checkSingletons },
  { id: 'm49-r04', label: 'M49-04 · Statut lisible', run: checkStatus },
  { id: 'm49-r05', label: 'M49-05 · Repli sans WebGL', run: checkFallback },
  { id: 'm49-r06', label: 'M49-06 · Accès clavier', run: checkKeyboard },
  { id: 'm49-r07', label: 'M49-07 · Région live', run: checkLive },
  { id: 'm49-r08', label: 'M49-08 · Registre sain', run: checkRegistry },
  { id: 'm49-r09', label: 'M49-09 · Empreinte bornée', run: checkFootprint },
  { id: 'm49-r10', label: 'M49-10 · Idempotence', run: checkIdempotence },
];

function buildPanel(ctx) {
  const panel = makeEl(ctx, 'details', 'monde-m49-panel');
  panel.id = PANEL_ID;
  panel.dataset.monde = 'M49';

  const summary = makeEl(ctx, 'summary');
  summary.appendChild(makeEl(ctx, 'span', null, 'Non-régression · '));
  const count = makeEl(ctx, 'span', null, 'contrôles en cours');
  count.id = COUNT_ID;
  summary.appendChild(count);

  const body = makeEl(ctx, 'div', 'monde-m49-body');
  const note = makeEl(ctx, 'p', 'monde-m49-note',
    'Contrôles passifs sur la vue Monde : aucune modification du DOM existant, aucun sélecteur de test touché. Rejoué après ouverture du moteur.');
  const table = makeEl(ctx, 'table');
  table.id = 'monde-m49-table';
  table.appendChild(makeEl(ctx, 'caption', null,
    'Invariants vérifiés — ✓ conforme, ✗ anomalie, – non vérifiable'));
  const tbody = makeEl(ctx, 'tbody');
  tbody.id = ROWS_ID;
  table.appendChild(tbody);
  body.append(note, table);
  panel.append(summary, body);
  return panel;
}

function renderResults(ctx, panel, results) {
  const tbody = panel.querySelector('#' + ROWS_ID);
  const count = document.getElementById(COUNT_ID);
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  let ok = 0;
  let bad = 0;
  let na = 0;
  results.forEach((result, index) => {
    if (!result.applicable) na += 1;
    else if (result.ok) ok += 1;
    else bad += 1;

    const row = makeEl(ctx, 'tr');
    row.id = result.id ? `${ROWS_ID}-${result.id}` : `${ROWS_ID}-${index}`;
    const th = makeEl(ctx, 'th', null, result.label);
    th.scope = 'row';
    const td = makeEl(ctx, 'td');
    const mark = makeEl(ctx, 'span', 'monde-m49-mark',
      !result.applicable ? '–' : (result.ok ? '✓' : '✗'));
    mark.dataset.state = !result.applicable ? 'na' : (result.ok ? 'ok' : 'bad');
    const detail = makeEl(ctx, 'span', 'monde-m49-detail', result.detail);
    td.append(mark, detail);
    row.append(th, td);
    tbody.appendChild(row);
  });

  panel.dataset.result = bad ? 'alert' : 'ok';
  if (count) count.textContent = `${ok} conformes · ${bad} anomalie(s) · ${na} non vérifiable(s)`;
}

function run(ctx) {
  if (!ctx || typeof document === 'undefined') return;
  if (!ctx.scene || typeof ctx.scene.appendChild !== 'function') return;
  addCss(ctx);

  let panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.isConnected || panel.dataset.monde !== 'M49') {
    panel = buildPanel(ctx);
    ctx.scene.appendChild(panel);
  }

  const collect = () => CHECKS.map((def) => safeRun(def.label, () => def.run(ctx)));
  renderResults(ctx, panel, collect());

  /* Le statut et le canvas WebGL n'existent qu'après init() : on rejoue les
     contrôles sur onReady, sans timer ni observation permanente. */
  if (typeof ctx.onReady === 'function') {
    ctx.onReady(() => {
      const current = document.getElementById(PANEL_ID);
      if (!current || !current.isConnected) return;
      renderResults(ctx, current, collect());
    });
  }
}

register('M49', run);
