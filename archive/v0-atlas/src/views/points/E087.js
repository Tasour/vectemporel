import { register } from './registry.js';

/* Lentille POINTS E087 — Qualité & validation : preuves traçables (domaine I).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E087.md — chantiers E087-01 à E087-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité
 * (points.js, registry.js, index.js, store.js et styles.css sont intacts).
 *
 * Contrat exploité : viewId, stage, layout, css(id,rules), el(tag,cls,text),
 * reducedMotion (fournis par points/registry.js:28-44). Aucune dépendance vers
 * store.js, keyboard.js ou une autre lentille : chaque preuve est relue dans le
 * DOM rendu par points.js et renvoie à une ligne réelle de CE module.
 *
 * Chaque chantier pose sur sa cible deux attributs complémentaires :
 *   data-e087-chantier = identifiant du chantier (E087-01 … E087-10) ;
 *   data-e087-line    = numéro de ligne consultable de E087.js où son
 *                       marquage et sa preuve sont définis.
 * L'index local rend ces dix lignes visibles et vérifiables d'un coup d'œil.
 *
 * Invariants :
 * - un seul CSS, un seul panneau, un seul bouton, une seule région live ;
 * - aucun raccourci global, aucun import du store, aucune écriture d'état ;
 * - non destructif : aucun nœud de points.js n'est retiré ni réécrit, seuls
 *   des attributs data et une classe sont ajoutés ;
 * - idempotent : restampage stable, nœuds retrouvés par identifiant ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro timer, zéro rAF,
 *   zéro innerHTML, aucune donnée historique inventée.
 */

const CSS_ID = 'points-e087';
const SCOPE = 'points-e087';
const PANEL_ID = 'points-e087-panel';
const BUTTON_ID = 'points-e087-button';
const TITLE_ID = 'points-e087-title';
const LIST_ID = 'points-e087-list';
const METRICS_ID = 'points-e087-metrics';
const LIVE_ID = 'points-e087-live';

/* Feuille unique, injectée par ctx.css (cssOnce, registry.js:13-19). Tout est
 * soit sous .points-layout.points-e087, soit préfixé points-e087- : aucune fuite
 * hors de la vue. Cibles ≥ 36 px, focus visible, mouvement réduit, couleurs
 * forcées et repli 620 px (390×844) sans aucune animation propre. */
const CSS = `
.points-layout.points-e087 .points-e087-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#${BUTTON_ID}{min-height:36px;padding:0 10px;border:1px solid var(--line-strong,#5b5b5b);border-radius:8px;background:rgba(230,185,111,.08);color:var(--gold-bright,#e9c98f);font-size:12px;cursor:pointer}
#${BUTTON_ID}:hover{border-color:var(--gold-bright,#e9c98f)}
#${PANEL_ID}{margin:12px 0 0;padding:12px 14px;border:1px solid var(--line-strong,#5b5b5b);border-left:3px solid var(--gold,#e6b96f);border-radius:10px;background:rgba(8,11,16,.94);color:var(--ink-soft,#d8d8d8);font-size:12px;line-height:1.5}
#${PANEL_ID}[hidden]{display:none}
#${PANEL_ID}:focus-visible,#${PANEL_ID} button:focus-visible,#${BUTTON_ID}:focus-visible{outline:2px solid var(--gold-bright,#e9c98f);outline-offset:3px}
#${PANEL_ID} h2{margin:0 0 6px;font-family:var(--serif,serif);font-size:16px;color:var(--gold-bright,#e9c98f)}
#${PANEL_ID} p{margin:0 0 8px}
.points-e087-intro{color:var(--muted-2,#8a8a8a);font-size:11px}
.points-e087-list{margin:0 0 10px;padding:0;list-style:none}
.points-e087-item{margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(230,185,111,.12)}
.points-e087-item:last-child{border-bottom:0}
.points-e087-item-title{display:block;color:var(--ink,#eee)}
.points-e087-target{color:var(--muted,#9a9a9a);font-size:10px}
.points-e087-line{display:inline-block;margin-left:6px;padding:0 5px;border:1px solid rgba(230,185,111,.35);border-radius:4px;color:var(--gold-bright,#e9c98f);font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.points-e087-close{min-height:36px;margin:4px 0 6px;padding:0 10px;border:1px solid var(--line-strong,#5b5b5b);border-radius:8px;background:rgba(230,185,111,.06);color:var(--gold-bright,#e9c98f);font:inherit;font-size:11px;cursor:pointer}
.points-e087-close:hover{border-color:var(--gold-bright,#e9c98f)}
.points-e087-metrics{margin:0;color:var(--muted,#9a9a9a);font-size:10px;font-variant-numeric:tabular-nums}
@media (max-width:620px){#${PANEL_ID}{padding:10px;font-size:11px}#${BUTTON_ID}{width:100%}}
@media (prefers-reduced-motion:reduce){#${PANEL_ID} *,#${BUTTON_ID}{transition:none!important;animation:none!important}}
@media (forced-colors:active){#${PANEL_ID}{border-color:CanvasText;color:CanvasText}.points-e087-line{border-color:CanvasText;color:CanvasText}}
`;

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel neutralise la
 * lentille sans jamais propager d'exception. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function count(root, selector) {
  return root && typeof root.querySelectorAll === 'function' ? root.querySelectorAll(selector).length : 0;
}

/* E087-01..09 : le geste commun. Un chantier ne modifie ni le texte ni la
 * structure d'un nœud de points.js : il ajoute l'identifiant du chantier et le
 * numéro de ligne consultable, tous deux préfixés et réversibles. */
function stamp(node, entry) {
  if (!node || !node.dataset) return false;
  node.dataset.e087Chantier = entry.id;
  node.dataset.e087Line = entry.line;
  node.classList.add('points-e087-marked');
  return true;
}

function stampAll(nodes, entry) {
  let placed = 0;
  nodes.forEach((node) => { if (stamp(node, entry)) placed += 1; });
  return placed;
}

/* E087-01 — Ancrage racine : le marqueur est posé sur .points-layout, la portée
 * commune à toutes les lentilles de la vue. */
function markRoot(layout, entry) { return stamp(layout, entry); }

/* E087-02 — Compte de points : lu sur .points-title (points.js:32). */
function markTitle(layout, entry) { return stamp(q(layout, '.points-title'), entry); }

/* E087-03 — Structure ère × domaine : .points-grid (points.js:33). */
function markGrid(layout, entry) { return stamp(q(layout, '.points-grid'), entry); }

/* E087-04 — En-tête des domaines : .points-grid-row.is-head (points.js:34). */
function markHead(layout, entry) { return stamp(q(layout, '.points-grid-row.is-head'), entry); }

/* E087-05 — Boutons d'ère : .points-era (points.js:40). */
function markEras(layout, entry) { return stampAll(qa(layout, '.points-era'), entry); }

/* E087-06 — Cellules et compteurs : .points-cell (points.js:46). */
function markCells(layout, entry) { return stampAll(qa(layout, '.points-cell'), entry); }

/* E087-07 — Filtres domaine / famille : .points-filters (points.js:60). */
function markFilters(layout, entry) { return stamp(q(layout, '.points-filters'), entry); }

/* E087-08 — Fiche du point : .points-detail (points.js:95). */
function markDetail(layout, entry) { return stamp(q(layout, '.points-detail'), entry); }

/* E087-09 — Navigation entre points : .points-nav (points.js:115). */
function markNav(layout, entry) { return stamp(q(layout, '.points-nav'), entry); }

/* E087-10 — Index des preuves : le panneau lui-même porte le dernier marqueur. */
function markIndex(node, entry) { return stamp(node, entry); }

/* Lignes réelles de ce module, recalculées et vérifiées à la livraison. Chaque
 * entrée associe un chantier, sa cible DOM et la ligne E087.js où sa preuve est
 * définie (reportée dans data-e087-line et dans l'index visible). */
const CHANTIERS = Object.freeze([
  Object.freeze({ id: 'E087-01', label: 'Ancrage racine de la traçabilité', selector: '.points-layout', line: '107', mark: markRoot }),
  Object.freeze({ id: 'E087-02', label: 'Compte de points du titre', selector: '.points-title', line: '110', mark: markTitle }),
  Object.freeze({ id: 'E087-03', label: 'Grille ère × domaine', selector: '.points-grid', line: '113', mark: markGrid }),
  Object.freeze({ id: 'E087-04', label: 'En-tête des domaines', selector: '.points-grid-row.is-head', line: '116', mark: markHead }),
  Object.freeze({ id: 'E087-05', label: 'Boutons d’ère', selector: '.points-era', line: '119', mark: markEras }),
  Object.freeze({ id: 'E087-06', label: 'Cellules et compteurs', selector: '.points-cell', line: '122', mark: markCells }),
  Object.freeze({ id: 'E087-07', label: 'Filtres domaine / famille', selector: '.points-filters', line: '125', mark: markFilters }),
  Object.freeze({ id: 'E087-08', label: 'Fiche du point', selector: '.points-detail', line: '128', mark: markDetail }),
  Object.freeze({ id: 'E087-09', label: 'Navigation entre points', selector: '.points-nav', line: '131', mark: markNav }),
  Object.freeze({ id: 'E087-10', label: 'Index des preuves', selector: '#points-e087-panel', line: '134', mark: markIndex }),
]);

/* La closure module survit aux rendus (registry.js:39-43) : le ctx courant est
 * relu à chaque passage, aucun nœud d'un rendu précédent n'est conservé. */
let latest = null;
let open = false;
let openCount = 0;
let renderCount = 0;
let lastAnnouncement = '';
let renderedSignature = '';

/* E087-10 : une seule région live LOCALE, dédupliquée, hors panneau (donc
 * jamais masquée par panel.hidden). Aucune écriture dans la live de la coque. */
function announce(text) {
  if (!text || text === lastAnnouncement) return;
  const live = document.getElementById(LIVE_ID);
  if (!live || !live.isConnected) return;
  lastAnnouncement = text;
  live.textContent = text;
}

function ensureLive(ctx, layout) {
  let live = document.getElementById(LIVE_ID);
  if (live && live.parentElement && live.parentElement !== layout) live.remove();
  live = document.getElementById(LIVE_ID);
  if (!live) {
    live = ctx.el('p', 'points-e087-live');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
  }
  if (live.parentElement !== layout) layout.appendChild(live);
  return live;
}

/* Compteurs auditables, entièrement relus dans le DOM. */
function writeMetrics() {
  const node = document.getElementById(METRICS_ID);
  if (!node || !node.isConnected) return;
  const layout = latest && latest.layout;
  const marks = count(layout, '[data-e087-chantier]');
  node.textContent = `Chantiers : ${CHANTIERS.length} · Marqueurs : ${marks} · Ouvertures : ${openCount} · Rendus : ${renderCount}.`;
}

function setOpen(next, restoreFocus) {
  open = !!next;
  const panel = document.getElementById(PANEL_ID);
  const button = document.getElementById(BUTTON_ID);
  if (panel) panel.hidden = !open;
  if (button) button.setAttribute('aria-expanded', String(open));
  if (latest && latest.layout) latest.layout.dataset.pointsE087Open = open ? '1' : '0';
  if (open) {
    openCount += 1;
    announce('Index des preuves traçables ouvert.');
    if (panel) panel.focus({ preventScroll: true });
  } else {
    if (restoreFocus && button && button.isConnected) button.focus({ preventScroll: true });
    announce('Index des preuves traçables fermé.');
  }
  writeMetrics();
}

/* Échap local : traité uniquement quand le panneau porte le focus. Le routeur
 * (keyboard.js) reste maître d'Échap partout ailleurs. */
function onEscape(event) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  setOpen(false, true);
}

/* Panneau statique construit par ctx.el, sans innerHTML. Rôle=region non modal :
 * aucun role=dialog, aucun aria-modal, aucun piège de focus. */
function buildPanel(ctx, panel) {
  panel.replaceChildren();
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const title = ctx.el('h2', '', 'Index des preuves traçables');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'points-e087-intro',
    'Dix chantiers, dix preuves. Chaque marqueur data-e087-chantier renvoie à une ligne consultable de E087.js, affichée ci-dessous et reportée dans le rapport UNIFIED_AUDIT/POINTS/views/E087.md.'));

  const list = ctx.el('ul', 'points-e087-list');
  list.id = LIST_ID;
  panel.appendChild(list);

  const close = ctx.el('button', 'points-e087-close', 'Fermer l’index');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l’index local des preuves traçables');
  close.addEventListener('click', () => setOpen(false, true));
  panel.appendChild(close);

  const metrics = ctx.el('p', 'points-e087-metrics', '');
  metrics.id = METRICS_ID;
  panel.appendChild(metrics);
}

/* Chaque entrée de l'index est elle-même marquée : l'identifiant et le numéro
 * de ligne sont visibles, auditables et cohérents avec la cible DOM. */
function buildListNodes(ctx) {
  return CHANTIERS.map((entry) => {
    const li = ctx.el('li', 'points-e087-item');
    li.dataset.e087Chantier = entry.id;
    li.dataset.e087Line = entry.line;
    li.appendChild(ctx.el('strong', 'points-e087-item-title', `${entry.id} — ${entry.label}`));
    li.appendChild(ctx.el('code', 'points-e087-target', entry.selector));
    li.appendChild(ctx.el('span', 'points-e087-line', `E087.js:${entry.line}`));
    return li;
  });
}

function refreshList(ctx) {
  const list = document.getElementById(LIST_ID);
  if (!list) return;
  const built = buildListNodes(ctx);
  const signature = built.map((node) => node.textContent).join(' | ');
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  list.replaceChildren(...built);
}

/* Installation idempotente. Un CSS, un panneau, un bouton, une région live :
 * les nœuds mal parentés sont déplacés ou retirés, jamais dupliqués. Un rendu
 * neuf remet l'état d'ouverture à zéro. Tous les marqueurs sont restampés à
 * chaque passage, donc stables et sans accumulation. */
function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;
  const layout = ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (ctx.stage && ctx.stage.isConnected ? q(ctx.stage, '.points-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;

  latest = ctx;
  lastAnnouncement = '';
  renderCount += 1;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.pointsE087 = '1';
  layout.dataset.pointsE087Render = String(renderCount);
  layout.dataset.pointsE087Motion = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
    ? 'reduce' : 'normal';

  const foundPanel = document.getElementById(PANEL_ID);
  const fresh = !(foundPanel && foundPanel.isConnected);
  if (fresh) {
    open = false;
    renderedSignature = '';
  }

  ensureLive(ctx, layout);

  /* Neuf marqueurs sur le DOM de points.js, le dixième sur le panneau. */
  CHANTIERS.slice(0, 9).forEach((entry) => entry.mark(layout, entry));

  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement !== layout) panel.remove();
  panel = document.getElementById(PANEL_ID);
  const createdPanel = !panel;
  if (!panel) {
    panel = ctx.el('section', 'points-e087-panel');
    panel.id = PANEL_ID;
  }
  buildPanel(ctx, panel);
  if (createdPanel) panel.addEventListener('keydown', onEscape);
  if (panel.parentElement !== layout) layout.appendChild(panel);
  CHANTIERS[9].mark(panel, CHANTIERS[9]);

  let button = document.getElementById(BUTTON_ID);
  const filters = q(layout, '.points-filters');
  const buttonParent = filters || layout;
  if (!button) {
    button = ctx.el('button', '', 'Preuves');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-controls', PANEL_ID);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Afficher l’index local des preuves traçables');
    button.title = 'Dix chantiers, chacun avec son numéro de ligne consultable';
    button.addEventListener('click', () => setOpen(!open, !open));
  }
  if (button.parentElement !== buttonParent) buttonParent.appendChild(button);

  refreshList(ctx);
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  layout.dataset.pointsE087Open = open ? '1' : '0';
  writeMetrics();
}

register('E087', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
