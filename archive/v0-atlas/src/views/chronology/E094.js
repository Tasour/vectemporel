import { register } from './registry.js';

/*
 * Lentille E094 — cohérence des identifiants, absence de doublons et
 * robustesse aux re-renders (rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E094.md).
 *
 * Dix chantiers (E094-01 … E094-10) implémentés dans CE seul module : aucun
 * fichier partagé n'est modifié. register() est appelé une seule fois au
 * chargement (index.js:95) mais apply() est rejoué à chaque rendu par
 * runEnhancements() (registry.js:39-42) : tous les nœuds sont donc créés par
 * ensureNode() avec garde d'existence, tous les IDs sont préfixés `e094-`,
 * et les écouteurs sont posés une fois par nœud (bindOnce), jamais par rendu.
 *
 * CSS unique : ctx.css('chronology-e094', …), injecté dans <head> (qui survit
 * au innerHTML de la coque) contrairement au style de chronology.js:32-93 qui
 * vit dans le stage reconstruit. Zéro journalisation, zéro réseau, zéro aléa,
 * aucune boucle d'animation ni aucun timer propre à la lentille.
 */

const CSS_ID = 'chronology-e094';

/* Cibles ARIA citées dans chronology.js. Le drapeau `true` marque une cible
   conditionnelle : absente quand aucun repère n'est sélectionné (chronology.js:416-535). */
const ARIA_TARGETS = [
  ['atlas-chrono-title', false],       // chronology.js:220 → :228
  ['atlas-chrono-events', false],      // chronology.js:291, :318, :335 → :349
  ['atlas-chrono-aside', false],       // chronology.js:389, :511-512 → :222
  ['atlas-chrono-event-title', true],  // chronology.js:419 → :424
  ['atlas-chrono-points-title', true], // chronology.js:467 → :463
  ['nav-c2a-live', false],             // chronology.js:11, :123-131
];

/* Préfixes des IDs qui servent de cible à applyFocusIntent() (chronology.js:199-205). */
const FOCUS_PREFIXES = ['event-btn-', 'era-', 'tag-btn-', 'aside-tag-', 'point-'];

const RULES = `
.e094-audit {
  position: absolute; right: 10px; bottom: 10px; z-index: 9;
  max-width: min(380px, calc(100vw - 20px));
  padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-2); color: var(--ink);
  font-size: 10px; line-height: 1.4;
}
.e094-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.e094-btn {
  min-height: 36px; min-width: 36px; padding: 4px 10px;
  border: 1px solid var(--line-strong); border-radius: 7px;
  background: transparent; color: var(--gold-bright);
  font: inherit; font-size: 10px; cursor: pointer;
}
.e094-btn:hover { border-color: var(--gold); }
.e094-btn:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.e094-readout {
  flex: 1 1 190px; margin: 0; color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.e094-details {
  margin: 6px 0 0; padding: 6px 0 0; border-top: 1px solid var(--line);
}
.e094-audit:not([data-open="1"]) .e094-details { display: none; }
.e094-rows p { margin: 0 0 3px; color: var(--muted-2); font-size: 9px; }
@media (max-width: 620px) {
  .e094-audit { right: 6px; bottom: 6px; max-width: calc(100vw - 12px); }
  .e094-btn { min-height: 44px; min-width: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .e094-audit, .e094-audit * { transition: none !important; animation: none !important; }
}`;

let latest = null;
let verifyCount = 0;

/* E094-01 — garde d'existence : réutilise un nœud déjà dans le parent courant,
   déplace un nœud survivant d'un ancien stage, sinon en crée un. */
function ensureNode(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node || node.id !== id) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* E094-06 — un écouteur par nœud et par rôle, même si apply() est rejoué.
   Le drapeau vit sur le nœud (donc suit le nœud déplacé), pas dans un global. */
function bindOnce(node, role, type, handler) {
  if (!node || node.dataset[`e094Bind${role}`] === '1') return;
  node.addEventListener(type, handler);
  node.dataset[`e094Bind${role}`] = '1';
}

/* E094-07 — clé d'ID dérivée de données, sans caractère hasardeux. */
function safeKey(value) {
  return String(value).trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'vide';
}

/* E094-07 — allocatrice : aucun ID produit ne peut écraser un ID déjà au DOM. */
function uniqueId(base, used) {
  let id = base;
  let suffix = 2;
  while (used.has(id) || document.getElementById(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

/* E094-03 — comptage des IDs dupliqués dans le seul layout de la vue. */
function scanDuplicates(root) {
  const counts = new Map();
  root.querySelectorAll('[id]').forEach((node) => {
    if (node.id) counts.set(node.id, (counts.get(node.id) || 0) + 1);
  });
  const duplicates = [];
  counts.forEach((count, id) => {
    if (count > 1) duplicates.push({ id, count });
  });
  return duplicates;
}

function countWithId(root, id) {
  let count = 0;
  root.querySelectorAll('[id]').forEach((node) => {
    if (node.id === id) count += 1;
  });
  return count;
}

/* E094-04 — références ARIA absentes ou répétées. nav-c2a-live vit dans
   document.body (chronology.js:130), hors du layout : il est compté là. */
function ariaState(ctx) {
  const missing = [];
  const repeated = [];
  const selected = Boolean(ctx.layout.querySelector('.chronology-aside .aside-title'));
  ARIA_TARGETS.forEach(([id, conditional]) => {
    const root = id === 'nav-c2a-live' ? document : ctx.layout;
    const count = countWithId(root, id);
    if (count === 0) {
      if (!(conditional && !selected)) missing.push(id);
    } else if (count > 1) {
      repeated.push(id);
    }
  });
  return { missing, repeated };
}

/* E094-03 + E094-08 — une duplication sur une cible de focus est grave :
   applyFocusIntent() (chronology.js:199-205) pourrait focaliser le mauvais nœud. */
function focusIsSafe(duplicates) {
  return !duplicates.some((item) => FOCUS_PREFIXES.some((prefix) => item.id.startsWith(prefix)));
}

function buildSummary(duplicates, aria, safe) {
  const examples = duplicates.slice(0, 3).map((item) => item.id).join(', ');
  const more = duplicates.length > 3 ? ', …' : '';
  return `Doublons d’identifiants : ${duplicates.length}${examples ? ` (${examples}${more})` : ''}. `
    + `Cibles ARIA absentes : ${aria.missing.length}${aria.repeated.length ? ` · répétées : ${aria.repeated.length}` : ''}. `
    + `Focus unique : ${safe ? 'oui' : 'non'}. Vérifications : ${verifyCount}.`;
}

/* E094-07 — lignes de détail recréées à chaque mesure, avec IDs alloués. */
function renderRows(ctx, holder, duplicates) {
  holder.querySelectorAll('.e094-row').forEach((node) => node.remove());
  const used = new Set();
  duplicates.slice(0, 3).forEach((item) => {
    const row = ctx.el('p', 'e094-row');
    row.id = uniqueId(`e094-row-${safeKey(item.id)}`, used);
    row.textContent = `${item.id} — ${item.count} exemplaires.`;
    holder.appendChild(row);
  });
  if (duplicates.length > 3) {
    const more = ctx.el('p', 'e094-row');
    more.id = uniqueId('e094-row-plus', used);
    more.textContent = `… et ${duplicates.length - 3} autre(s) identifiant(s).`;
    holder.appendChild(more);
  }
}

/* E094-10 — toute anomalie est écrite dans le DOM (readout + data-*),
   jamais dans la console, jamais sur le réseau. */
function refresh(ctx) {
  if (!ctx || !ctx.layout) return;
  const duplicates = scanDuplicates(ctx.layout);
  const aria = ariaState(ctx);
  const safe = focusIsSafe(duplicates);
  const nodes = ctx.stage ? ctx.stage.querySelectorAll('[id^="e094-"]').length : 0;

  ctx.layout.dataset.e094Duplicates = String(duplicates.length);
  ctx.layout.dataset.e094Orphans = String(aria.missing.length);
  ctx.layout.dataset.e094Repeated = String(aria.repeated.length);
  ctx.layout.dataset.e094FocusSafe = safe ? '1' : '0';
  ctx.layout.dataset.e094Nodes = String(nodes);
  ctx.layout.dataset.e094Verify = String(verifyCount);

  const readout = document.getElementById('e094-readout');
  if (readout) readout.textContent = buildSummary(duplicates, aria, safe);
  const holder = document.getElementById('e094-rows');
  if (holder) renderRows(ctx, holder, duplicates);
}

register('E094', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;

  /* E094-02 — une seule feuille, dans <head> via cssOnce (registry.js:13-19). */
  ctx.css(CSS_ID, RULES);

  latest = ctx;
  if (!ctx.layout.dataset.open) ctx.layout.dataset.open = '0';

  /* E094-01 / E094-05 / E094-08 — panneau unique, déplacé dans le stage courant. */
  const panel = ensureNode(ctx, 'e094-audit', 'section', 'e094-audit', ctx.stage);
  if (!panel.dataset.open) panel.dataset.open = '0';
  panel.setAttribute('aria-label', 'Diagnostic d’unicité des identifiants de la chronologie');

  const bar = ensureNode(ctx, 'e094-bar', 'div', 'e094-bar', panel);
  const toggle = ensureNode(ctx, 'e094-toggle', 'button', 'e094-btn', bar);
  toggle.type = 'button';
  toggle.textContent = 'Diagnostic des identifiants';
  toggle.setAttribute('aria-controls', 'e094-details');
  if (!toggle.hasAttribute('aria-pressed')) {
    toggle.setAttribute('aria-pressed', panel.dataset.open === '1' ? 'true' : 'false');
  }
  bindOnce(toggle, 'Toggle', 'click', () => {
    const open = panel.dataset.open !== '1';
    panel.dataset.open = open ? '1' : '0';
    toggle.setAttribute('aria-pressed', open ? 'true' : 'false');
  });

  const verify = ensureNode(ctx, 'e094-verify', 'button', 'e094-btn', bar);
  verify.type = 'button';
  verify.textContent = 'Revérifier';
  verify.setAttribute('aria-controls', 'e094-readout');
  bindOnce(verify, 'Verify', 'click', () => {
    verifyCount += 1;
    refresh(latest);
  });

  const readout = ensureNode(ctx, 'e094-readout', 'p', 'e094-readout', bar);
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  const details = ensureNode(ctx, 'e094-details', 'div', 'e094-details', panel);
  ensureNode(ctx, 'e094-rows', 'div', 'e094-rows', details);

  /* E094-09 — état de la préférence lu sur le contexte, sans requête média propre. */
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  ctx.layout.dataset.e094Reduced = reduced ? '1' : '0';
  panel.dataset.e094Reduced = reduced ? '1' : '0';
  ctx.layout.dataset.e094 = 'on';
  if (ctx.layout.dataset.countryId) ctx.layout.dataset.e094Country = ctx.layout.dataset.countryId;

  refresh(ctx);
});
