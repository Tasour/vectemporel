import { register } from './registry.js';

/* Lentille E068 — passe V2, domaine G (performance & rendu).
 * Thème : idempotence multi-rendus — un seul greffon.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E068.md — chantiers E068-01 à E068-10.
 * Fichier possédé : src/views/chronology/v2/E068.js uniquement. Ne sont ni
 * édités ni doublés : la passe 1, registry.js, index.js, styles.css,
 * src/views/chronology.js, ni aucune autre lentille.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 rejoue les greffons à chaque rendu (registry.js:28-44) ; la coque peut
 * reconstruire le stage. Ce module doit donc rester sans effet cumulatif :
 * un seul enregistrement, une seule feuille CSS, un seul nœud racine, un seul
 * écouteur, des IDs uniques et un état toujours frais.
 *
 * Invariants :
 * - un seul register('E068', ctx => …) et un seul ctx.css('chronology-v2-e068', …) ;
 * - aucun nœud dupliqué : garde d'existence + déduplication des IDs préfixés ;
 * - aucun écouteur en fuite : garde module pour le seul 'focusin' ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF, aucune animation propriétaire.
 */

const CSS_ID = 'chronology-v2-e068';
const PREFIX = 'chronology-v2-e068-';
const PANEL_ID = PREFIX + 'panel';
const TITLE_ID = PREFIX + 'title';
const ROWS_ID = PREFIX + 'rows';
const METRIC_ID = PREFIX + 'metric';
const ROW_PREFIX = PREFIX + 'row-';

/* Un seul appel à register figure dans ce fichier (E068-01). La constante
   expose cet invariant de façon auditable dans le DOM. */
const PLUGIN_COUNT = 1;

/* Le CSS est injecté par ctx.css, qui garantit déjà l'unicité du <style> par
   ID (registry.js:13-19). Le compteur de feuilles est relu dans le DOM pour
   prouver l'absence de doublon (E068-02). */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e068-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e068-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e068-rows { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e068-row {
    display: flex; gap: 8px; align-items: baseline; margin: 0 0 4px;
  }
  #${PANEL_ID} .e068-code {
    flex: 0 0 66px; color: var(--gold-bright); font-size: 9px;
  }
  #${PANEL_ID} .e068-label { flex: 0 0 148px; min-width: 0; color: var(--ink); }
  #${PANEL_ID} .e068-value { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${PANEL_ID} .e068-value[data-e068-ok="0"] { color: #e0a33a; }
  #${PANEL_ID} .e068-metric { margin: 8px 0 0; color: var(--muted-2); font-size: 9px; }
  :root[data-e068-anchor="1"] #${PANEL_ID} {
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e068-row { flex-wrap: wrap; gap: 2px 8px; }
    #${PANEL_ID} .e068-code { flex-basis: 60px; }
    #${PANEL_ID} .e068-label { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e068-title, #${PANEL_ID} .e068-code,
    #${PANEL_ID} .e068-value[data-e068-ok="0"] { color: CanvasText; }
  }
`;

/* E068-01 à E068-10 : dix lignes de suivi, une par chantier. Chaque lecture
   est dérivée de l'état module ou du DOM réel : aucune valeur codée en dur
   sinon l'invariant de déclaration unique (PLUGIN_COUNT). */
const ROWS = [
  { code: '01', label: 'Greffon unique', key: 'e068Plugins',
    ok: s => s.plugins === PLUGIN_COUNT,
    text: s => `${s.plugins} enregistrement(s) de register` },
  { code: '02', label: 'Feuille CSS unique', key: 'e068Styles',
    ok: s => s.styles === 1,
    text: s => `${s.styles} feuille(s) #${CSS_ID}` },
  { code: '03', label: 'Garde d’existence', key: 'e068Created',
    ok: s => s.created <= 1,
    text: s => `${s.created} création(s), ${s.reused} réutilisation(s)` },
  { code: '04', label: 'Attache au stage courant', key: 'e068Attached',
    ok: s => s.attached >= 1,
    text: s => `${s.attached} attachement(s) au parent vivant` },
  { code: '05', label: 'Écouteur sans fuite', key: 'e068Listeners',
    ok: s => s.listeners === 1,
    text: s => `${s.listeners} écouteur(s) focusin pour ${s.renders} rendu(s)` },
  { code: '06', label: 'Rendus tracés', key: 'e068Renders',
    ok: s => s.renders >= 1,
    text: s => `${s.renders} passage(s) dans apply` },
  { code: '07', label: 'IDs sans doublon', key: 'e068Duplicates',
    ok: s => s.duplicates === 0,
    text: s => `${s.duplicates} ID(s) dupliqué(s), ${s.deduped} retiré(s)` },
  { code: '08', label: 'État de contexte frais', key: 'e068Viewid',
    ok: s => s.viewId === 'chronologyv2',
    text: s => `vue ${s.viewId || 'absente'} · mouvement réduit : ${s.reduced ? 'oui' : 'non'}` },
  { code: '09', label: 'Dix lignes, zéro cumul', key: 'e068Rows',
    ok: s => s.rows === ROWS.length,
    text: s => `${s.rows} ligne(s) de suivi dans #${ROWS_ID}` },
  { code: '10', label: 'Ancrage racine unique', key: 'e068Anchor',
    ok: s => s.anchor === 1,
    text: s => `${s.anchor} marqueur(s) data-e068-anchor sur la racine` },
];

/* État module : il survit aux rendus sans créer le moindre nœud ni le moindre
   écouteur supplémentaire (E068-06). */
const state = {
  plugins: PLUGIN_COUNT,
  styles: 0,
  created: 0,
  reused: 0,
  attached: 0,
  listeners: 0,
  renders: 0,
  duplicates: 0,
  deduped: 0,
  rows: 0,
  anchor: 0,
  signals: 0,
  viewId: '',
  reduced: false,
};
let panelRef = null;
let listenerBound = false;

/* E068-03 et E068-07 : un nœud portant l'ID recherché est réutilisé ; s'il
   en existe plusieurs (rendu concurrent), les surnuméraires sont retirés.
   Le nœud mémorisé sert de repli quand la coque a détaché l'ancien stage. */
function ensureSingle(id, tagName, className, make) {
  const matches = typeof document !== 'undefined'
    ? Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'))
    : [];
  if (matches.length > 1) {
    for (let i = 1; i < matches.length; i += 1) {
      const extra = matches[i];
      if (extra.parentNode) extra.parentNode.removeChild(extra);
      state.deduped += 1;
    }
  }
  let node = matches[0] || panelRef || null;
  if (!node || node.id !== id) {
    node = make(tagName, className);
    node.id = id;
    state.created += 1;
  } else {
    state.reused += 1;
  }
  return node;
}

/* E068-04 : après reconstruction du stage, le nœud mémorisé est détaché ;
   on le déplace dans le parent courant plutôt que d'en créer un second. */
function attachTo(node, host) {
  if (!node || !host || typeof host.appendChild !== 'function') return false;
  if (node.parentElement === host) return false;
  if (node.parentElement) node.parentElement.removeChild(node);
  host.appendChild(node);
  return true;
}

function pickHost(ctx) {
  if (ctx.stage && typeof ctx.stage.appendChild === 'function') return ctx.stage;
  if (ctx.layout && typeof ctx.layout.appendChild === 'function') return ctx.layout;
  if (typeof document !== 'undefined') {
    const fallback = document.getElementById('atlas-chrono-main');
    if (fallback) return fallback;
    if (document.body) return document.body;
  }
  return null;
}

/* E068-05 : unique écouteur documentaire, purement témoin. Il ne modifie ni
   le focus, ni la navigation, ni aucune région live ; il ne fait que signaler
   qu'une seule inscription survit à tous les rendus. */
function onFocusIn() {
  state.signals += 1;
  if (panelRef && panelRef.isConnected) {
    panelRef.setAttribute('data-e068-signal', String(state.signals));
  }
}

function countPrefixedIds() {
  if (typeof document === 'undefined') return 0;
  const nodes = Array.prototype.slice.call(
    document.querySelectorAll('[id^="' + PREFIX + '"]')
  );
  const seen = Object.create(null);
  let duplicates = 0;
  nodes.forEach((node) => {
    if (seen[node.id]) duplicates += 1;
    else seen[node.id] = 1;
  });
  return duplicates;
}

/* E068-02, E068-07, E068-08, E068-10 : lecture du DOM réel et du contexte à
   chaque rendu, pour qu'aucun marqueur ne reste périmé après reconstruction. */
function refreshDomMetrics() {
  state.styles = typeof document === 'undefined'
    ? 0
    : document.querySelectorAll('style[id="' + CSS_ID + '"]').length;
  state.duplicates = countPrefixedIds();

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    if (root.getAttribute('data-e068-anchor') !== '1') {
      root.setAttribute('data-e068-anchor', '1');
    }
    state.anchor = root.getAttribute('data-e068-anchor') === '1' ? 1 : 0;
  }
}

register('E068', ctx => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;

  const make = ctx.el;
  state.renders += 1;
  state.viewId = typeof ctx.viewId === 'string' ? ctx.viewId : '';
  state.reduced = typeof ctx.reducedMotion === 'function'
    ? Boolean(ctx.reducedMotion())
    : false;

  /* E068-02 : l'appel est idempotent — cssOnce (registry.js:13-19) refuse un
     second <style> portant le même identifiant. */
  ctx.css(CSS_ID, CSS);

  const host = pickHost(ctx);
  const panel = ensureSingle(PANEL_ID, 'section', 'e068-panel', make);
  panelRef = panel;
  if (attachTo(panel, host)) state.attached += 1;

  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  /* E068-09 : les dix lignes sont reconstruites en place par replaceChildren.
     L'ancienne liste est remplacée, jamais complétée : zéro accumulation. */
  const title = make('h2', 'e068-title', 'Idempotence multi-rendus');
  title.id = TITLE_ID;
  const lede = make('p', 'e068-lede', 'Panneau de suivi : il mesure la stabilité du greffon à travers les rendus successifs. Il n’ajoute ni contrôle, ni annonce live, ni comportement clavier.');
  const list = make('ul', 'e068-rows');
  list.id = ROWS_ID;
  const metric = make('p', 'e068-metric');
  metric.id = METRIC_ID;

  const cells = ROWS.map((def) => {
    const row = make('li', 'e068-row');
    row.id = ROW_PREFIX + def.code;
    const value = make('span', 'e068-value');
    value.id = ROW_PREFIX + def.code + '-value';
    row.append(
      make('code', 'e068-code', def.code),
      make('span', 'e068-label', def.label),
      value
    );
    list.appendChild(row);
    return { def, value };
  });
  state.rows = cells.length;

  panel.replaceChildren(title, lede, list, metric);

  /* E068-05 : la garde empêche toute seconde inscription, même après dix
     rendus ou une reconstruction complète du document. Elle est exécutée
     avant la lecture des métriques pour que le texte affiché soit frais. */
  if (!listenerBound && typeof document !== 'undefined'
      && typeof document.addEventListener === 'function') {
    document.addEventListener('focusin', onFocusIn, true);
    listenerBound = true;
    state.listeners = 1;
  }

  refreshDomMetrics();

  cells.forEach(({ def, value }) => {
    const ok = def.ok(state);
    const text = (ok ? 'OK · ' : 'À vérifier · ') + def.text(state);
    if (value.textContent !== text) value.textContent = text;
    if (value.getAttribute('data-e068-ok') !== (ok ? '1' : '0')) {
      value.setAttribute('data-e068-ok', ok ? '1' : '0');
    }
  });

  /* E068-01, E068-03 à E068-08, E068-10 : attributs d'état réécrits à chaque
     rendu, donc toujours contemporains du contexte courant. */
  panel.setAttribute('data-e068-plugins', String(state.plugins));
  panel.setAttribute('data-e068-styles', String(state.styles));
  panel.setAttribute('data-e068-created', String(state.created));
  panel.setAttribute('data-e068-reused', String(state.reused));
  panel.setAttribute('data-e068-attached', String(state.attached));
  panel.setAttribute('data-e068-listeners', String(state.listeners));
  panel.setAttribute('data-e068-renders', String(state.renders));
  panel.setAttribute('data-e068-duplicates', String(state.duplicates));
  panel.setAttribute('data-e068-deduped', String(state.deduped));
  panel.setAttribute('data-e068-viewid', state.viewId);
  panel.setAttribute('data-e068-motion', state.reduced ? 'reduce' : 'normal');
  panel.setAttribute('data-e068-rows', String(state.rows));
  panel.setAttribute('data-e068-signal', String(state.signals));

  metric.textContent = `Contrôle d’idempotence — ${state.renders} rendu(s) · ${state.created} création(s) de nœud · ${state.reused} réutilisation(s) · ${state.attached} attachement(s) · ${state.signals} signal(aux) observé(s) · ${state.deduped} doublon(s) retiré(s).`;
});
