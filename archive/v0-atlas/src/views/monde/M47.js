import { register } from './registry.js';

/* Lentille M47 — Diagnostics et instrumentation (domaine D : outillage).
 *
 * Dix chantiers M47-01 … M47-10, tous implémentés ici, dans ce seul fichier.
 * Lentille méta : elle n'ajoute ni rendu WebGL, ni masque, ni canvas. Elle
 * instrumente le registre (registry.js) et expose un snapshot lisible sur
 * window.VATLAS.mondeDiagnostics, sans modifier app.js ni registry.js et sans
 * jamais écrire dans un journal.
 *
 * Contraintes : zéro réseau, zéro aléa, zéro journal, un seul fichier. */

const CSS_ID = 'monde-m47';
const HUD_ID = 'monde-m47-hud';
const WRAP_FLAG = '__m47Wrapped';
const SNAPSHOT_VERSION = 'm47.1';

/* État de module : survit aux re-renders de la coque (globe.js l. 442). */
let latest = null;          // ctx le plus récent (références fraîches)
let seq = 0;                // séquence monotone des observations (M47-04/09)
let renderCount = 0;        // nombre d'appels du greffon (M47-04)
let readyCount = 0;         // payloads onReady reçus (M47-05)
let engineReady = false;    // vrai après le premier onReady valide
let wrapped = false;        // garde d'augmentation de l'API publique (M47-01)
let baseDiagnostics = null; // fonction d'origine, mémorisée avant le pont
let hud = null;             // nœud de lecture réutilisé (M47-06)
let countrySummary = null;  // résumé du jeu de pays (M47-07)

/* M47-10 : HUD compact, aria-hidden, hors régions live (déjà portées par
   #globe-live et M07), pointer-events:none, placement en haut à gauche pour ne
   pas chevaucher M07 (bas droite), M14 (pointeur) ni M17 (bas droite). */
const CSS = `
  #${HUD_ID}{
    position:fixed;left:10px;top:10px;z-index:59;pointer-events:none;
    max-width:min(330px,72vw);padding:6px 9px;border-radius:8px;
    border:1px solid var(--line);background:rgba(8,11,16,.78);
    color:var(--muted);font:11px/1.45 system-ui,sans-serif;
    font-variant-numeric:tabular-nums;
    box-shadow:0 6px 18px rgba(0,0,0,.3)
  }
  #${HUD_ID} b{color:var(--gold);font-weight:700}
  @media (prefers-reduced-motion:reduce){
    #${HUD_ID}{box-shadow:none;transition:none}
  }
`;

function isArray(value) {
  return Array.isArray(value);
}

function countOccurrences(list, id) {
  if (!isArray(list)) return 0;
  let total = 0;
  for (const item of list) {
    if (item === id || (item && item.id === id)) total += 1;
  }
  return total;
}

/* M47-02 : IDs dupliqués, triés pour rester déterministes d'un appel à l'autre. */
function duplicateIds(list) {
  if (!isArray(list)) return Object.freeze([]);
  const seen = Object.create(null);
  const duplicates = [];
  for (const item of list) {
    const id = typeof item === 'string' ? item : (item && item.id);
    if (typeof id !== 'string') continue;
    if (seen[id]) {
      if (duplicates.indexOf(id) < 0) duplicates.push(id);
    } else {
      seen[id] = true;
    }
  }
  return Object.freeze(duplicates.sort());
}

/* M47-07 : lecture défensive du seul jeu de pays fourni par le contexte. Les
   points sont comptés dans leurs repères ; aucune donnée n'est inventée. */
function summarizeCountries(list) {
  if (!isArray(list)) {
    return Object.freeze({ count: 0, codes: Object.freeze([]), eras: 0, events: 0, points: 0 });
  }
  const codes = [];
  let eras = 0;
  let events = 0;
  let points = 0;
  for (const country of list) {
    if (!country || typeof country !== 'object') continue;
    if (typeof country.code === 'string' && codes.indexOf(country.code) < 0) {
      codes.push(country.code);
    }
    if (isArray(country.eras)) eras += country.eras.length;
    if (isArray(country.events)) {
      events += country.events.length;
      for (const event of country.events) {
        if (!event) continue;
        if (isArray(event.points)) points += event.points.length;
        else if (typeof event.points === 'number') points += event.points;
      }
    }
  }
  return Object.freeze({
    count: list.length,
    codes: Object.freeze(codes),
    eras,
    events,
    points,
  });
}

/* M47-08 : aucune écriture, aucune création de canvas ; on mesure l'empreinte
   réelle du document au moment de la lecture. */
function readDom() {
  if (typeof document === 'undefined') {
    return Object.freeze({ canvasCount: 0, hudCount: 0, stylePresent: false });
  }
  let canvasCount = 0;
  let hudCount = 0;
  let stylePresent = false;
  try {
    canvasCount = document.querySelectorAll('canvas').length;
    hudCount = document.querySelectorAll(`#${HUD_ID}`).length;
    stylePresent = !!document.getElementById(CSS_ID);
  } catch (_) {
    /* document indisponible : on renvoie des zéros plutôt que de propager. */
  }
  return Object.freeze({ canvasCount, hudCount, stylePresent });
}

function readReducedMotion() {
  try {
    return !!(latest && typeof latest.reducedMotion === 'function' && latest.reducedMotion());
  } catch (_) {
    return false;
  }
}

/* Délégation à la fonction publique d'origine (registry.js l. 70-72), jamais au
   wrapper installé ici : aucun risque de récursion. */
function readBase() {
  if (typeof baseDiagnostics !== 'function') return Object.freeze({});
  try {
    const out = baseDiagnostics();
    return out && typeof out === 'object' ? out : Object.freeze({});
  } catch (_) {
    return Object.freeze({});
  }
}

/* M47-09 : fonction de lecture pure — elle ne modifie aucun compteur. Deux
   appels sans interaction renvoient donc le même snapshot. */
function snapshot() {
  const base = readBase();
  const entries = isArray(base.entries) ? base.entries : [];
  const diagnostics = isArray(base.diagnostics) ? base.diagnostics : [];
  const byId = Object.create(null);
  for (const error of diagnostics) {
    const id = error && typeof error.id === 'string' ? error.id : 'inconnu';
    byId[id] = (byId[id] || 0) + 1;
  }
  const lenses = Object.freeze({
    registered: entries.length,
    m47: countOccurrences(entries, 'M47'),
    duplicates: duplicateIds(entries),
  });
  const errors = Object.freeze({
    total: diagnostics.length,
    m47: countOccurrences(diagnostics, 'M47'),
    byId: Object.freeze(byId),
    ids: Object.freeze(Object.keys(byId).sort()),
  });
  return Object.freeze({
    version: SNAPSHOT_VERSION,
    sequence: seq,
    renderCount,
    readyCount,
    engineReady,
    wrapped,
    lenses,
    errors,
    countries: countrySummary || summarizeCountries(null),
    dom: readDom(),
    reducedMotion: readReducedMotion(),
    signature: `${SNAPSHOT_VERSION}:${seq}:${renderCount}:${readyCount}`,
  });
}

/* M47-01 : augmentation de window.VATLAS.mondeDiagnostics sans toucher à
   app.js (l. 132-155) ni à registry.js. Le drapeau rend l'opération idempotente
   et permet de reprendre la main si un autre greffon remplace la propriété. */
function wrapDiagnostics() {
  if (typeof window === 'undefined' || !window.VATLAS) return;
  const current = window.VATLAS.mondeDiagnostics;
  if (typeof current !== 'function') return;
  if (current[WRAP_FLAG]) {
    wrapped = true;
    return;
  }
  baseDiagnostics = current;
  const wrapper = function mondeDiagnosticsInstrumented() {
    const base = readBase();
    let extra;
    try {
      extra = snapshot();
    } catch (_) {
      extra = Object.freeze({ version: SNAPSHOT_VERSION, unavailable: true });
    }
    return Object.assign({}, base, { m47: extra });
  };
  wrapper[WRAP_FLAG] = true;
  wrapper.m47 = snapshot; // collecteur direct, sans altérer la délégation
  window.VATLAS.mondeDiagnostics = wrapper;
  wrapped = true;
}

/* M47-06 : garde par ID (une seule feuille CSS, un seul HUD), création dans le
   body comme M14 afin que `position:fixed` ne dépende pas de la scène. */
function ensureHud(ctx) {
  if (typeof document === 'undefined') return null;
  if (hud && hud.isConnected) return hud;
  const existing = document.getElementById(HUD_ID);
  if (existing) {
    hud = existing;
    return hud;
  }
  if (!ctx || typeof ctx.el !== 'function') return null;
  hud = ctx.el('div', 'monde-m47-hud');
  hud.id = HUD_ID;
  hud.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hud);
  return hud;
}

function writeHud() {
  if (!hud || !hud.isConnected || typeof document === 'undefined') return;
  const data = snapshot();
  const title = document.createElement('b');
  title.textContent = 'M47 · instrumentation';
  const line = document.createElement('span');
  line.textContent = ` lentilles ${data.lenses.registered} · rendus ${data.renderCount} · erreurs ${data.errors.total} · pays ${data.countries.count} · canvas ${data.dom.canvasCount}`;
  hud.replaceChildren(title, line);
}

/* M47-03/04/05/06/07/08/10 : point d'entrée unique. Aucune écriture dans un
   journal, aucun appel réseau, aucun aléa, aucun canvas, aucun timer. */
register('M47', (ctx) => {
  latest = ctx || null;
  seq += 1;
  renderCount += 1;

  if (ctx && isArray(ctx.countries)) countrySummary = summarizeCountries(ctx.countries);
  if (ctx && typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  ensureHud(ctx);
  writeHud();

  /* Le premier apply peut précéder l'assignation de window.VATLAS dans app.js
     (l. 132) ; on réessaie donc ici et à chaque onReady. */
  wrapDiagnostics();

  /* Le registre purge readyCallbacks à chaque rendu (registry.js l. 48-50) :
     on réabonne donc à chaque apply, sans garde. Il n'y a pas de cumul, et le
     callback reste valable pour le flushMondeReady suivant. */
  if (ctx && typeof ctx.onReady === 'function') {
    ctx.onReady((payload) => {
      seq += 1;
      readyCount += 1;
      if (payload && typeof payload === 'object') engineReady = true;
      wrapDiagnostics();
      writeHud();
    });
  }
});
