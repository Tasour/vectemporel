import { register, viewDiagnostics } from './registry.js';
import {
  getSnapshot, getDiagnostics, getBounds, currentCountry, parseDeepLink,
} from '../../domain/store.js';

/* Lentille E36 — erreurs et signaux de défaillance de la vue Chronologie.
 *
 * Greffon méta : il ne modifie ni le rendu des repères, ni le store, ni une
 * feuille partagée. Il lit dix signaux d'erreur déjà présents dans le système
 * (registre des lentilles, porte d'écriture du store, bornes, liens profonds,
 * sources, images, états vides, focus, identifiants) et les expose dans un
 * panneau unique, relu à chaque rendu de la vue.
 *
 * Zéro réseau, zéro aléa, zéro écriture de journal. Le panneau est marqué
 * automatiquement par _diagnostics.js (id `e36-panel`) : il reste masqué hors
 * du tiroir « Diagnostics · 100 ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E36.md (E36-01 à E36-10).
 */

const PANEL_ID = 'e36-panel';
const TITLE_ID = 'e36-title';
const TOGGLE_ID = 'e36-toggle';
const STATUS_ID = 'e36-status';
const REFRESH_ID = 'e36-refresh';
const BODY_ID = 'e36-body';
const LIST_ID = 'e36-list';
const NOTE_ID = 'e36-note';

const LABELS = [
  'Erreurs de greffons',
  'Écritures refusées',
  'Invariants du store',
  'Indices hors bornes',
  'Liens profonds',
  'Sources non résolues',
  'Images du repère',
  'États vides et annonce',
  'Focus après rendu',
  'Identifiants dupliqués',
];

/* E36-05 : batterie figée, sans aléa ni horodatage. Chaque cas attend un
 * résultat binaire de parseDeepLink (objet = valide, null = invalide). */
const LINK_CASES = [
  ['', false],
  ['#', false],
  ['#v=chronology', true],
  ['#v=inconnu', false],
  ['#e=-1', false],
  ['#p=abc', false],
  ['#s=peninsula', false],
  ['#v=chronology&c=france', true],
];

const EMPTY_IDS = [
  'nav-c2a-empty-filter',
  'nav-c2a-empty-era',
  'nav-c2a-empty-points',
  'nav-c2a-empty-event',
];

const CSS = `
.e36-panel{position:absolute;left:10px;bottom:10px;z-index:12;width:min(320px,52vw);
  box-sizing:border-box;padding:8px 10px;border-radius:10px;color:#f5e9d0;
  background:rgba(8,11,18,.92);border:1px solid rgba(230,185,111,.35);
  box-shadow:0 6px 20px rgba(0,0,0,.45);font:12px/1.45 system-ui,sans-serif}
.e36-title{margin:0 0 6px;color:#e6b96f;font-family:var(--serif,Georgia,serif);
  font-size:14px;font-weight:450}
.e36-toggle,.e36-refresh{display:block;width:100%;min-height:36px;min-width:36px;
  margin:0 0 6px;padding:6px 8px;border:1px solid rgba(230,185,111,.45);
  border-radius:6px;background:transparent;color:inherit;font:inherit;
  text-align:left;cursor:pointer}
.e36-toggle:hover,.e36-refresh:hover{background:rgba(230,185,111,.12)}
.e36-panel :focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.e36-status{margin:6px 0;min-height:2.9em;color:#e6d3ad;overflow-wrap:anywhere}
.e36-body{margin-top:6px}
.e36-body[hidden]{display:none}
.e36-list{margin:0;padding:0;list-style:none}
.e36-list li{display:grid;grid-template-columns:56px 1fr;gap:2px 8px;padding:5px 0;
  border-top:1px solid rgba(230,185,111,.14)}
.e36-code{color:var(--gold,#e6b96f);font-size:10px;font-weight:600;
  font-variant-numeric:tabular-nums}
.e36-label{color:#cbb68d;font-size:11px}
.e36-value{grid-column:2;color:#f5e9d0;font-size:11px;overflow-wrap:anywhere;
  font-variant-numeric:tabular-nums}
.e36-note{margin:8px 0 0;color:var(--muted-2,#9c9382);font-size:10px;line-height:1.4}
@media (max-width:620px){.e36-panel{width:min(320px,86vw)}}
@media (prefers-reduced-motion:reduce){.e36-panel *{transition:none}}
`;

let ctxRef = null;
let panelRef = null;
let titleNode = null;
let toggleNode = null;
let statusNode = null;
let refreshNode = null;
let bodyNode = null;
let listNode = null;
let noteNode = null;
let rowNodes = [];
let renders = 0;
let seq = 0;
let lastRejected = null;
let lastFocusId = '';
let lastLostFocusId = '';
let focusBound = false;
let latest = null;

function el(tag, className, text) {
  const node = ctxRef && typeof ctxRef.el === 'function'
    ? ctxRef.el(tag, className, text)
    : document.createElement(tag);
  if (!ctxRef || typeof ctxRef.el !== 'function') {
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
  }
  return node;
}

function byId(id) {
  return typeof document === 'undefined' ? null : document.getElementById(id);
}

/* E36-01 : le registre neutralise silencieusement une lentille qui lève et
 * pousse { id, message } dans un tableau consultable. Aucun journal touché. */
function readPluginErrors() {
  let list = [];
  try {
    const report = viewDiagnostics();
    list = report && Array.isArray(report.diagnostics) ? report.diagnostics : [];
  } catch {
    list = [];
  }
  const ids = list.map((item) => String((item && item.id) || '?')).sort();
  return { total: ids.length, e36: ids.filter((id) => id === 'E36').length, ids: ids.slice(0, 8) };
}

/* E36-02 : set() refuse les clés inconnues et incrémente rejectedWrites.
 * Le delta est calculé ici, une seule fois par relecture, jamais dans snapshot(). */
function readRejectedWrites() {
  let total = 0;
  try {
    const snapshot = getSnapshot();
    total = Number(snapshot && snapshot.rejectedWrites) || 0;
  } catch {
    total = 0;
  }
  const delta = lastRejected === null ? 0 : Math.max(0, total - lastRejected);
  lastRejected = total;
  return { total, delta };
}

/* E36-03 : getDiagnostics() expose des invariants booléens. On ne garde que
 * les noms des contrôles en échec, jamais un message libre. */
function readCoherence() {
  let report = null;
  try { report = getDiagnostics(); } catch { report = null; }
  if (!report) return { all: false, failed: ['diagnostic indisponible'] };
  const failed = Object.keys(report)
    .filter((key) => key !== 'allCoherent' && report[key] === false)
    .sort();
  return { all: Boolean(report.allCoherent), failed };
}

/* E36-04 : getBounds() donne index/total pour quatre collections. Un indice
 * supérieur au dernier élément est une erreur de sélection, même si set()
 * borne normalement les écritures. */
function readBounds() {
  const bad = [];
  try {
    const bounds = getBounds() || {};
    ['era', 'event', 'point', 'place'].forEach((key) => {
      const entry = bounds[key];
      if (!entry) return;
      const total = Number(entry.total) || 0;
      const index = Number(entry.index) || 0;
      if (total > 0 && (index < 0 || index > total - 1)) {
        bad.push(key + ':' + index + '/' + total);
      }
    });
  } catch {
    bad.push('bornes indisponibles');
  }
  return { bad };
}

/* E36-05 : l'état réel de l'URL est complété par une batterie déterministe
 * qui prouve que parseDeepLink refuse bien vue, époque et périmètre inconnus. */
function readLinks() {
  let failures = 0;
  LINK_CASES.forEach(([hash, expected]) => {
    let parsed = null;
    try { parsed = parseDeepLink(hash); } catch { parsed = null; }
    if (Boolean(parsed) !== expected) failures += 1;
  });
  let current = 'absent';
  try {
    const hash = typeof window !== 'undefined' && window.location
      ? String(window.location.hash || '') : '';
    if (!hash || hash === '#') {
      current = 'absent';
    } else {
      let parsed = null;
      try { parsed = parseDeepLink(hash); } catch { parsed = null; }
      current = parsed ? 'valide' : 'invalide';
    }
  } catch {
    current = 'invalide';
  }
  return { tested: LINK_CASES.length, failures, current };
}

/* E36-06 : la vue affiche l'identifiant brut d'une source absente du registre
 * (chronology.js : repli explicite). On mesure ce repli sans rien inventer. */
function readSources(stage) {
  const country = typeof currentCountry === 'function' ? currentCountry() : null;
  const known = new Set();
  if (country && Array.isArray(country.sources)) {
    country.sources.forEach((source) => {
      if (source && source.id) known.add(source.id);
    });
  }
  let scanned = 0;
  const unresolved = [];
  if (stage && typeof stage.querySelectorAll === 'function') {
    stage.querySelectorAll('[data-source-id]').forEach((item) => {
      scanned += 1;
      const id = item.getAttribute('data-source-id') || '';
      if (!known.has(id) && unresolved.indexOf(id) < 0) unresolved.push(id);
    });
  }
  return { scanned, unresolved: unresolved.slice(0, 8) };
}

/* E36-07 : deux défauts d'image observables — absence d'alternative texte et
 * chargement terminé sans pixels. Aucune requête supplémentaire n'est faite. */
function readImages(stage) {
  let scanned = 0;
  let noAlt = 0;
  let broken = 0;
  if (stage && typeof stage.querySelectorAll === 'function') {
    stage.querySelectorAll('img').forEach((image) => {
      scanned += 1;
      const alt = image.getAttribute('alt');
      if (alt === null || !alt.trim()) noAlt += 1;
      if (image.complete && image.naturalWidth === 0) broken += 1;
    });
  }
  return { scanned, noAlt, broken };
}

/* E36-08 : la vue distingue quatre états vides par des identifiants stables ;
 * la région live est créée dans <body>, donc cherchée au document. */
function readEmpty(stage) {
  const states = EMPTY_IDS.filter((id) => Boolean(stage && stage.querySelector
    && stage.querySelector('#' + id)));
  const live = byId('nav-c2a-live');
  const liveOk = Boolean(live && live.getAttribute('role') === 'status'
    && live.getAttribute('aria-live') === 'polite');
  return { states, liveOk };
}

/* E36-09 : un seul écouteur de document, installé une fois. On ne mesure que
 * la disparition de la dernière cible focalisée après un rendu complet. */
function bindFocus() {
  if (focusBound || typeof document === 'undefined' || !document.addEventListener) return;
  focusBound = true;
  document.addEventListener('focusin', (event) => {
    const target = event && event.target;
    lastFocusId = target && target.id ? String(target.id) : '';
    if (lastFocusId && byId(lastFocusId)) lastLostFocusId = '';
  });
}

function readFocus() {
  let lost = false;
  if (lastFocusId && !byId(lastFocusId) && lastLostFocusId !== lastFocusId) {
    lastLostFocusId = lastFocusId;
    lost = true;
  }
  return { lastId: lastFocusId || 'aucun', lost };
}

/* E36-10 : le contrat d'unicité des identifiants est vérifié sur le stage,
 * y compris les nœuds injectés par les quatre-vingt-dix-neuf autres lentilles. */
function readIds(stage) {
  const seen = new Map();
  const duplicates = [];
  if (stage && typeof stage.querySelectorAll === 'function') {
    stage.querySelectorAll('[id]').forEach((item) => {
      const id = item.getAttribute('id') || '';
      const count = (seen.get(id) || 0) + 1;
      seen.set(id, count);
      if (count === 2) duplicates.push(id);
    });
  }
  duplicates.sort();
  return { scanned: seen.size, duplicates: duplicates.slice(0, 8) };
}

function readSignals(stage) {
  const pluginErrors = readPluginErrors();
  const rejectedWrites = readRejectedWrites();
  const coherence = readCoherence();
  const bounds = readBounds();
  const links = readLinks();
  const sources = readSources(stage);
  const images = readImages(stage);
  const empty = readEmpty(stage);
  const focus = readFocus();
  const ids = readIds(stage);

  let anomalies = 0;
  if (pluginErrors.total) anomalies += 1;
  if (rejectedWrites.delta > 0) anomalies += 1;
  if (!coherence.all) anomalies += 1;
  if (bounds.bad.length) anomalies += 1;
  if (links.failures || links.current === 'invalide') anomalies += 1;
  if (sources.unresolved.length) anomalies += 1;
  if (images.noAlt || images.broken) anomalies += 1;
  if (empty.states.length || !empty.liveOk) anomalies += 1;
  if (focus.lost) anomalies += 1;
  if (ids.duplicates.length) anomalies += 1;

  seq += 1;
  latest = {
    version: 'e36.1',
    seq,
    renders,
    anomalies,
    status: anomalies ? anomalies + ' signal(aux)' : 'nominal',
    pluginErrors,
    rejectedWrites,
    coherence,
    bounds,
    links,
    sources,
    images,
    empty,
    focus,
    ids,
  };
  return latest;
}

function rowValues(s) {
  return [
    s.pluginErrors.total + ' erreur(s)' + (s.pluginErrors.e36 ? ' · E36 incluse' : ''),
    s.rejectedWrites.total + ' au total · +' + s.rejectedWrites.delta + ' depuis la lecture',
    s.coherence.all ? 'cohérent' : (s.coherence.failed.join(', ') || 'indisponible'),
    s.bounds.bad.length ? s.bounds.bad.join(', ') : 'dans les bornes',
    s.links.current + ' · ' + s.links.failures + '/' + s.links.tested + ' cas en échec',
    s.sources.unresolved.length
      ? s.sources.unresolved.join(', ') + ' (' + s.sources.scanned + ' lus)'
      : '0 non résolu (' + s.sources.scanned + ' lus)',
    s.images.broken + ' cassée(s) · ' + s.images.noAlt + ' sans alt (' + s.images.scanned + ' lus)',
    (s.empty.states.length ? s.empty.states.join(', ') : 'aucun vide')
      + (s.empty.liveOk ? ' · annonce ok' : ' · annonce absente'),
    s.focus.lost ? 'perdu après ' + s.focus.lastId : 'conservé (' + s.focus.lastId + ')',
    s.ids.duplicates.length
      ? s.ids.duplicates.join(', ') + ' (' + s.ids.scanned + ' ids)'
      : '0 doublon (' + s.ids.scanned + ' ids)',
  ];
}

function paint() {
  if (!latest) return;
  if (statusNode) {
    const text = 'E36 · ' + latest.status + ' · lecture ' + latest.seq;
    if (statusNode.textContent !== text) statusNode.textContent = text;
  }
  const values = rowValues(latest);
  rowNodes.forEach((node, index) => {
    if (node && node.textContent !== values[index]) node.textContent = values[index];
  });
}

function buildRows() {
  if (!listNode) return [];
  listNode.textContent = '';
  return LABELS.map((label, index) => {
    const li = el('li', 'e36-row');
    li.dataset.e36Row = String(index + 1);
    const code = el('span', 'e36-code', 'E36-' + String(index + 1).padStart(2, '0'));
    const name = el('span', 'e36-label', label);
    const value = el('span', 'e36-value', '—');
    li.append(code, name, value);
    listNode.appendChild(li);
    return value;
  });
}

function bindPanel() {
  if (!panelRef || panelRef.dataset.e36Bound === '1') return;
  panelRef.dataset.e36Bound = '1';
  toggleNode.addEventListener('click', () => {
    const open = toggleNode.getAttribute('aria-expanded') !== 'true';
    toggleNode.setAttribute('aria-expanded', String(open));
    bodyNode.hidden = !open;
  });
  refreshNode.addEventListener('click', () => {
    if (ctxRef && ctxRef.stage) readSignals(ctxRef.stage);
    paint();
  });
}

function ensurePanel(host) {
  if (typeof getComputedStyle === 'function' && getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }
  panelRef = byId(PANEL_ID);
  const drawer = byId('chronology-diagnostics-drawer');
  if (panelRef) {
    if (!(drawer && drawer.contains(panelRef)) && panelRef.parentElement !== host) {
      host.appendChild(panelRef);
    }
    titleNode = byId(TITLE_ID);
    toggleNode = byId(TOGGLE_ID);
    statusNode = byId(STATUS_ID);
    refreshNode = byId(REFRESH_ID);
    bodyNode = byId(BODY_ID);
    listNode = byId(LIST_ID);
    noteNode = byId(NOTE_ID);
    if (listNode && !listNode.children.length) rowNodes = buildRows();
    else rowNodes = listNode ? [...listNode.querySelectorAll('.e36-value')] : [];
  } else {
    panelRef = el('section', 'e36-panel');
    panelRef.id = PANEL_ID;
    panelRef.setAttribute('aria-labelledby', TITLE_ID);

    titleNode = el('h2', 'e36-title', 'Erreurs · E36');
    titleNode.id = TITLE_ID;

    toggleNode = el('button', 'e36-toggle', 'Signaux d’erreur · E36');
    toggleNode.id = TOGGLE_ID;
    toggleNode.type = 'button';
    toggleNode.setAttribute('aria-expanded', 'false');
    toggleNode.setAttribute('aria-controls', BODY_ID);

    statusNode = el('p', 'e36-status', 'E36 · en attente de lecture');
    statusNode.id = STATUS_ID;
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.setAttribute('aria-atomic', 'true');

    bodyNode = el('div', 'e36-body');
    bodyNode.id = BODY_ID;
    bodyNode.hidden = true;

    listNode = el('ol', 'e36-list');
    listNode.id = LIST_ID;
    listNode.setAttribute('aria-label', 'Dix signaux d’erreur de la chronologie');
    rowNodes = buildRows();

    refreshNode = el('button', 'e36-refresh', 'Relire les signaux');
    refreshNode.id = REFRESH_ID;
    refreshNode.type = 'button';
    refreshNode.setAttribute('aria-controls', STATUS_ID);

    noteNode = el('p', 'e36-note',
      'Lecture locale à chaque rendu. Aucun appel réseau, aucune écriture dans un journal.');
    noteNode.id = NOTE_ID;

    bodyNode.append(listNode, refreshNode, noteNode);
    panelRef.append(titleNode, toggleNode, statusNode, bodyNode);
    host.appendChild(panelRef);
    bindPanel();
  }
  return panelRef;
}

function copySignal(signal) {
  if (!signal) return null;
  return {
    ...signal,
    pluginErrors: { ...signal.pluginErrors, ids: signal.pluginErrors.ids.slice() },
    coherence: { ...signal.coherence, failed: signal.coherence.failed.slice() },
    bounds: { ...signal.bounds, bad: signal.bounds.bad.slice() },
    links: { ...signal.links },
    sources: { ...signal.sources, unresolved: signal.sources.unresolved.slice() },
    images: { ...signal.images },
    empty: { ...signal.empty, states: signal.empty.states.slice() },
    focus: { ...signal.focus },
    ids: { ...signal.ids, duplicates: signal.ids.duplicates.slice() },
  };
}

const API = {
  version: 'e36.1',
  snapshot: () => copySignal(latest),
  refresh: () => {
    if (ctxRef && ctxRef.stage) readSignals(ctxRef.stage);
    paint();
    return copySignal(latest);
  },
};

register('E36', (ctx) => {
  ctxRef = ctx || {};
  ctx.css('chronology-e36', CSS);
  const stage = ctxRef.stage || null;
  if (!stage || typeof document === 'undefined') return;

  bindFocus();
  const active = document.activeElement;
  const activeId = active && /^e36-/.test(active.id || '') ? active.id : null;
  renders += 1;

  const host = ctxRef.layout || stage;
  ensurePanel(host);
  readSignals(stage);
  paint();

  if (activeId) {
    const target = byId(activeId);
    if (target && typeof target.focus === 'function') target.focus();
  }
  if (typeof window !== 'undefined' && !window.VECTEMPOREL_E36) window.VECTEMPOREL_E36 = API;
  if (ctxRef.host && !ctxRef.host.dataset.e36) {
    ctxRef.host.dataset.e36 = latest.anomalies ? 'alert' : 'ok';
  }
});
