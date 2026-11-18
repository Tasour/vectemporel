import { register } from './registry.js';

/* Lentille E068 — Performance & rendu : idempotence multi-rendus (domaine G).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E068.md — chantiers E068-01 à E068-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute un relevé LOCAL
 * dans .points-matrix et ne touche pas aux nœuds des autres lentilles.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le relevé reste lisible
 * même avec un ctx minimal.
 *
 * Invariants :
 * - une seule feuille CSS, un seul relevé par rendu, un seul câblage par nœud ;
 * - un rendu neuf se détecte par un nœud déconnecté (plus jamais de référence
 *   périmée conservée d'un rendu à l'autre) ;
 * - un seul MutationObserver, déconnecté puis reconnecté, jamais braqué sur le
 *   relevé lui-même (sinon boucle d'écriture) ;
 * - aucune écriture si la signature est inchangée ; zéro innerHTML ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e068';
const SCOPE = 'points-e068';
const PANEL_ID = 'points-e068-ledger';
const TITLE_ID = 'points-e068-ledger-title';
const BODY_ID = 'points-e068-ledger-body';
const REDUCED_ATTR = 'data-e068-reduced';

/* Toutes les règles sont préfixées par `.points-e068`, classe posée sur le
 * conteneur .points-layout : aucune fuite hors de cette vue. */
const CSS = `
.points-e068 .points-e068-ledger {
  margin: 10px 0 4px; padding: 10px 12px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(230, 185, 111, .04); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45;
}
.points-e068 .points-e068-ledger:focus-visible,
.points-e068 .points-e068-toggle:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-e068 .points-e068-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.points-e068 .points-e068-title {
  margin: 0; font-family: var(--serif);
  font-size: 13px; color: var(--gold-bright);
}
.points-e068 .points-e068-toggle {
  min-height: 36px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface); color: var(--gold-bright);
  font: inherit; font-size: 10px; cursor: pointer;
}
.points-e068 .points-e068-toggle:hover { border-color: var(--gold-bright); }
.points-e068 .points-e068-body { margin: 8px 0 0; }
.points-e068 .points-e068-body[hidden] { display: none; }
.points-e068 .points-e068-line {
  margin: 0 0 4px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-e068 .points-e068-signature { color: var(--gold); }
@media (max-width: 620px) {
  .points-e068 .points-e068-ledger { padding: 8px 10px; font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e068 .points-e068-ledger { transition: none; }
}
@media (forced-colors: active) {
  .points-e068 .points-e068-ledger {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e068 .points-e068-signature { color: Highlight; }
}
`;

let layout = null;          // dernier .points-layout vu, vivant ou périmé
let ledger = null;          // relevé de ce rendu
let body = null;            // corps repliable du relevé
let observer = null;        // unique MutationObserver de la lentille
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
const wired = new WeakSet(); // nœuds déjà câblés : jamais de second câblage
let renderCount = 0;        // rendus neufs détectés depuis le chargement
let installs = 0;           // installations sur le rendu courant
let duplicates = 0;         // doublons/orphelins retirés (cumulé)
let writes = 0;             // écritures réelles du relevé (cumulé)
let lastSignature = '';     // dernière signature effectivement écrite

/* E068-08 : lecture défensive — un sélecteur manquant ne doit jamais faire
 * échouer la lentille. */
function root(ctx) {
  const node = ctx && (ctx.layout || ctx.stage);
  return node && node.isConnected ? node : null;
}

function q(ctx, selector) {
  const node = root(ctx);
  return node && typeof node.querySelector === 'function'
    ? node.querySelector(selector) : null;
}

function qa(ctx, selector) {
  const node = root(ctx);
  return node && typeof node.querySelectorAll === 'function'
    ? node.querySelectorAll(selector) : [];
}

function text(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E068-08 : aucun millésime, aucun total historique et aucun nom de domaine
 * codé en dur : la signature ne vient que du DOM déjà rendu par points.js. */
function renderSignature(ctx) {
  const era = q(ctx, '.points-grid-row.is-active .points-era');
  const selects = qa(ctx, '.points-filters select');
  const point = q(ctx, '.points-point-title');
  const filters = Array.prototype.map.call(selects, (node) => node.value).join(',');
  return [
    'ere=' + text(era),
    'filtres=' + filters,
    'point=' + text(point),
  ].join(' | ');
}

function shorten(value) {
  const str = String(value || '');
  return str.length > 88 ? `${str.slice(0, 85)}…` : str;
}

/* E068-07 : signature anti-écriture redondante. Le relevé n'est reconstruit
 * que si la signature diffère de la dernière réellement écrite. */
function writeLedger(ctx) {
  if (!body) return;
  const signature = renderSignature(ctx);
  if (signature === lastSignature) return;
  lastSignature = signature;
  writes += 1;
  const lines = [
    `Greffon unique : 1 relevé · doublons retirés : ${duplicates}.`,
    `Rendus détectés : ${renderCount} · installations sur ce rendu : ${installs}.`,
    `Nœud connecté : ${layout && layout.isConnected ? 'oui' : 'non'} · écritures : ${writes}.`,
  ];
  const signatureLine = ctx.el('p', 'points-e068-line points-e068-signature',
    `Signature du rendu : ${shorten(signature)}`);
  body.replaceChildren(
    ...lines.map((line) => ctx.el('p', 'points-e068-line', line)),
    signatureLine
  );
}

/* E068-10 : structure créée par ctx.el et textContent, jamais par innerHTML. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-e068-ledger');
  panel.id = PANEL_ID;

  const head = ctx.el('div', 'points-e068-head');
  const title = ctx.el('h3', 'points-e068-title', 'Journal de rendu');
  title.id = TITLE_ID;
  const button = ctx.el('button', 'points-e068-toggle', 'Replier / déplier');
  button.id = 'points-e068-toggle';
  head.append(title, button);

  const content = ctx.el('div', 'points-e068-body');
  content.id = BODY_ID;

  panel.append(head, content);
  return panel;
}

/* E068-04 : câblage une seule fois par nœud. Le WeakSet interdit d'attacher
 * deux fois les attributs ou l'écouteur, même si install() est rejoué. */
function wirePanel(panel, content, button) {
  if (!panel || wired.has(panel)) return;
  wired.add(panel);
  panel.setAttribute('role', 'region');        /* E068-09 */
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;
  if (!button) return;
  button.type = 'button';
  button.setAttribute('aria-controls', BODY_ID);
  button.setAttribute('aria-expanded', String(!content.hidden));
  button.addEventListener('click', () => {
    content.hidden = !content.hidden;
    button.setAttribute('aria-expanded', String(!content.hidden));
  });
}

/* E068-02 : un seul relevé dans le document. Tout nœud hors du rendu courant
 * (orphelin d'un rendu précédent) ou tout second exemplaire est retiré. */
function singlePanel(ctx) {
  const current = root(ctx);
  if (!current) return null;
  let kept = null;
  const found = document.querySelectorAll('#' + PANEL_ID);
  Array.prototype.forEach.call(found, (node) => {
    if (!current.contains(node) || kept) {
      node.remove();
      duplicates += 1;
    } else {
      kept = node;
    }
  });
  return kept;
}

/* E068-05 : un seul observateur, déconnecté puis reconnecté ; il braque sur
 * deux cibles en lecture seule et JAMAIS sur le relevé (sinon boucle). */
function observe(ctx) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (currentCtx) writeLedger(currentCtx);
  });
  const options = { childList: true, characterData: true, subtree: true };
  [q(ctx, '.points-grid'), q(ctx, '.points-detail')].forEach((target) => {
    if (target) observer.observe(target, options);
  });
}

/* E068-03 / E068-06 : l'installation est idempotente. Une vue reconstruite se
 * repère à son nœud déconnecté : l'état volatile est alors remis à zéro, puis
 * réinstallé une seule fois dans la nouvelle matrice. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const current = root(ctx);
  if (!current) return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);                   /* E068-01 : cssOnce */
  current.classList.add(SCOPE);
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    current.setAttribute(REDUCED_ATTR, '1');  /* E068-09 */
  } else {
    current.removeAttribute(REDUCED_ATTR);
  }

  const fresh = !layout || !layout.isConnected || layout !== current;
  layout = current;
  installs = fresh ? 1 : installs + 1;
  if (fresh) {
    renderCount += 1;                     /* E068-06 */
    lastSignature = '';
  }

  ledger = singlePanel(ctx);              /* E068-02 */
  if (!ledger) {
    ledger = buildPanel(ctx);
    const matrix = current.querySelector('.points-matrix') || current;
    matrix.appendChild(ledger);           /* E068-10 : non destructif */
  }
  body = ledger.querySelector('#' + BODY_ID);
  const button = ledger.querySelector('#points-e068-toggle');
  wirePanel(ledger, body, button);        /* E068-04 */
  body.hidden = fresh ? false : body.hidden;

  observe(ctx);                           /* E068-05 */
  writeLedger(ctx);                       /* E068-07 */
}

register('E068', (ctx) => { install(ctx); });
