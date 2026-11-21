import { register } from './registry.js';

/* Lentille E011 — Filtres & périmètre : filtrage par domaine avec état visible.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E011.md — chantiers E011-01 à E011-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js` et le
 * magasin `src/domain/store.js` sont lus mais JAMAIS modifiés : E011 ajoute une
 * couche locale de lisibilité du filtre de domaine (état visible), par-dessus
 * le DOM déjà produit, sans toucher aux contrôles existants ni au store.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune import de store, aucune écriture dans state, aucune
 * dépendance vers set()/selectEra() : tout est dérivé du DOM rendu.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, un seul jeu de nœuds locaux par rendu ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro animation, aucun journal ;
 * - aucune réinterprétation de balisage : seulement des nœuds créés par ctx.el ;
 * - les nœuds existants ne sont jamais retirés : seuls des ajouts et des
 *   attributs de classe / data sont posés, tous réversibles par E011 ;
 * - les compteurs changent de l'état courant, jamais de valeurs codées en dur.
 */

const CSS_ID = 'points-e011';
const STATUS_ID = 'points-e011-status';
const HELP_ID = 'points-e011-filter-help';
const SUMMARY_ID = 'points-e011-summary';
const METRICS_ID = 'points-e011-metrics';

const HELP_TEXT = 'Les deux listes ci-dessus filtrent la matrice et le détail. '
  + 'Le domaine retenu est signalé dans la grille ; « Réinitialiser les filtres » '
  + 'restaure le périmètre complet.';

const CSS = `
  #${HELP_ID} {
    margin: 6px 0 2px; font-size: 11px; line-height: 1.45; color: var(--muted-2);
  }
  #${STATUS_ID} {
    margin: 2px 0; padding: 6px 9px; min-height: 24px;
    border-left: 3px solid var(--gold); border-radius: 4px;
    background: rgba(230, 185, 111, .06); color: var(--ink-soft);
    font-size: 12px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  #${METRICS_ID} {
    margin: 2px 0 0; font-size: 10px; color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  #${SUMMARY_ID} {
    margin: 6px 0 10px; padding: 6px 9px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    color: var(--gold-bright); font-size: 12px; line-height: 1.45;
    font-variant-numeric: tabular-nums;
  }
  .points-e011-col-active {
    background: rgba(230, 185, 111, .14);
    box-shadow: inset 0 0 0 1px rgba(230, 185, 111, .35);
    transition: background .15s ease;
  }
  .points-e011-active-head { outline: 2px solid var(--gold-bright); outline-offset: 1px; }
  #${STATUS_ID}:focus-visible, .points-e011-col-active:focus-visible,
  .points-e011-active-head:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 720px) {
    #${STATUS_ID}, #${SUMMARY_ID} { font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e011-col-active { transition: none; }
  }
`;

let layout = null;          // .points-layout du rendu courant
let selectDomain = null;    // première <select> de .points-filters
let selectFamily = null;    // deuxième <select> de .points-filters
let resetButton = null;     // bouton « Réinitialiser les filtres »
let statusNode = null;      // #points-e011-status (région live locale)
let helpNode = null;        // #points-e011-filter-help
let summaryNode = null;     // #points-e011-summary
let metricsNode = null;     // #points-e011-metrics
let marked = [];            // nœuds marqués par E011, pour un nettoyage réversible
let lastSignature = '';     // signature de l'état affiché, pour éviter les réécritures
let updateCount = 0;        // compteur auditable d'actualisations réelles

/* Sélecteurs défensifs : un ctx minimal ou un DOM partiel ne doit jamais
 * faire lever une exception dans la lentille. */
function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function valueOf(select, fallback) {
  return select && typeof select.value === 'string' ? select.value : fallback;
}

function labelOf(select, value) {
  const option = qa(select, 'option').find((item) => item.value === value);
  return (option && textOf(option)) || value;
}

/* Le périmètre affiché est porté par le kicker du détail : aucune valeur
 * historique n'est codée en dur, le nombre est relu depuis le DOM. */
function countFromKicker() {
  const kicker = q(layout, '.points-detail .view-kicker');
  const match = /(\d+)\s+point/i.exec(textOf(kicker));
  return match ? Number(match[1]) : null;
}

function eraName() {
  return textOf(q(layout, '.points-grid-row.is-active .points-era'));
}

/* Lecture de l'état courant, uniquement depuis le DOM. */
function readState() {
  const domain = valueOf(selectDomain, '*');
  const family = valueOf(selectFamily, '*');
  return {
    domain,
    family,
    domainLabel: labelOf(selectDomain, domain),
    familyLabel: labelOf(selectFamily, family),
    eraLabel: eraName() || '—',
    count: countFromKicker(),
    isDefault: domain === '*' && family === '*',
  };
}

function statusText(state) {
  const parts = [`Domaine : ${state.domainLabel}`];
  if (state.family !== '*') parts.push(`Famille : ${state.familyLabel}`);
  parts.push(`Ère : ${state.eraLabel}`);
  if (state.count !== null) parts.push(`${state.count} point(s) affichés`);
  return `${parts.join(' · ')}.`;
}

function summaryText(state) {
  if (state.isDefault) {
    return 'Périmètre complet : aucun filtre de domaine ni de famille n’est appliqué.';
  }
  const scope = state.domainLabel
    + (state.family !== '*' ? ` + ${state.familyLabel}` : '');
  const count = state.count === null ? '' : `, ${state.count} point(s)`;
  return `Périmètre restreint : ${scope}, ère ${state.eraLabel}${count}.`;
}

/* Efface uniquement les marques posées par E011. */
function clearMarks() {
  marked.forEach((node) => {
    node.classList.remove('points-e011-col-active', 'points-e011-active-head');
    node.removeAttribute('data-points-e011-col');
  });
  marked = [];
}

/* La colonne du domaine actif est signalée dans l'en-tête et dans chaque
 * ligne : l'état du filtre devient visible dans la matrice elle-même. */
function markActiveColumn(state) {
  if (state.domain === '*') return;
  const header = q(layout, '.points-grid-row.is-head');
  if (!header) return;
  const spans = Array.from(header.children);
  const index = spans.findIndex((span) => textOf(span) === state.domainLabel);
  if (index < 0) return;
  const head = spans[index];
  head.classList.add('points-e011-active-head');
  head.setAttribute('data-points-e011-col', String(index));
  marked.push(head);
  qa(layout, '.points-grid-row:not(.is-head)').forEach((row) => {
    const cell = row.children[index];
    if (!cell) return;
    cell.classList.add('points-e011-col-active');
    cell.setAttribute('data-points-e011-col', String(index));
    marked.push(cell);
  });
}

function refresh(force) {
  const state = readState();
  const signature = JSON.stringify(state);
  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  updateCount += 1;
  if (statusNode) statusNode.textContent = statusText(state);
  if (summaryNode) summaryNode.textContent = summaryText(state);
  if (metricsNode) {
    metricsNode.textContent = `E011 · actualisations : ${updateCount}`
      + ` · domaine : ${state.domainLabel}`
      + ` · ${state.count === null ? '—' : `${state.count} point(s)`}`;
  }
  clearMarks();
  markActiveColumn(state);
  if (layout && layout.dataset) {
    layout.dataset.pointsE011 = state.isDefault ? 'full' : 'filtered';
  }
}

/* Un seul jeu de nœuds locaux par rendu : retire d'éventuels doublons
 * laissés par une invocation antérieure sur le même stage. */
function stripDuplicates(root) {
  qa(root, '[id^="points-e011-"]').forEach((node) => node.remove());
}

function describeSelect(select) {
  if (!select) return;
  const previous = select.getAttribute('aria-describedby') || '';
  const ids = previous.split(/\s+/).filter(Boolean);
  if (!ids.includes(HELP_ID)) ids.push(HELP_ID);
  select.setAttribute('aria-describedby', ids.join(' '));
}

/* Écouteurs locaux sur les contrôles existants : aucun contrôle n'est
 * retiré ni réécrit, aucun écouteur documentaire, aucune touche globale. */
function bindControls() {
  [[selectDomain, 'change'], [selectFamily, 'change'], [resetButton, 'click']]
    .forEach(([node, event]) => {
      if (!node || node.dataset.pointsE011Bound === '1') return;
      node.dataset.pointsE011Bound = '1';
      node.addEventListener(event, () => refresh(false));
    });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);
  const stage = ctx.stage;
  if (!stage || typeof stage.querySelector !== 'function') return;
  const currentLayout = ctx.layout && ctx.layout.isConnected ? ctx.layout : q(stage, '.points-layout');
  if (!currentLayout) return;
  const filters = q(currentLayout, '.points-filters');
  const detail = q(currentLayout, '.points-detail');
  if (!filters || !detail) return;

  /* Un rendu neuf recrée le layout : les références périmées sont abandonnées. */
  if (statusNode && !statusNode.isConnected) {
    statusNode = helpNode = summaryNode = metricsNode = null;
    selectDomain = selectFamily = resetButton = null;
    lastSignature = '';
  }
  stripDuplicates(currentLayout);
  clearMarks();
  layout = currentLayout;

  const selects = qa(filters, 'select');
  selectDomain = selects[0] || null;
  selectFamily = selects[1] || null;
  resetButton = q(filters, 'button');

  helpNode = ctx.el('p', 'points-e011-help', HELP_TEXT);
  helpNode.id = HELP_ID;
  filters.appendChild(helpNode);

  statusNode = ctx.el('p', 'points-e011-status', '');
  statusNode.id = STATUS_ID;
  statusNode.setAttribute('role', 'status');
  statusNode.setAttribute('aria-live', 'polite');
  filters.appendChild(statusNode);

  metricsNode = ctx.el('p', 'points-e011-metrics', '');
  metricsNode.id = METRICS_ID;
  filters.appendChild(metricsNode);

  describeSelect(selectDomain);
  describeSelect(selectFamily);

  summaryNode = ctx.el('p', 'points-e011-summary', '');
  summaryNode.id = SUMMARY_ID;
  const kicker = q(detail, '.view-kicker');
  if (kicker && kicker.nextSibling) detail.insertBefore(summaryNode, kicker.nextSibling);
  else detail.appendChild(summaryNode);

  let reduced = false;
  try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reduced = false; }
  if (layout.dataset) layout.dataset.pointsE011Motion = reduced ? 'reduced' : 'full';

  bindControls();
  refresh(true);
  if (layout.dataset) layout.dataset.pointsE011Ready = '1';
}

register('E011', install);
