import { register } from './registry.js';

/* Lentille E051 — Sémantique & données : chiffres dérivés du DOM (domaine F).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E051.md — chantiers E051-01 à E051-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store
 * (src/domain/store.js) et styles.css ne sont ni édités ni doublés : E051 lit le
 * DOM déjà produit et ajoute un seul récapitulatif, non destructif et idempotent.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, l'état des filtres internes ni le jeu de données
 * source : tout ce qui est affiché est relu dans les nœuds rendus par la vue.
 *
 * Invariants :
 * - aucun total, aucun millésime, aucune valeur de données codée en dur ; seules
 *   des constantes arithmétiques ou structurelles (0, 1, base du pourcentage)
 *   apparaissent, jamais une grandeur historique ;
 * - un seul CSS (points-e051), un seul récapitulatif (points-e051-summary) ;
 * - zéro timer, zéro rAF, zéro MutationObserver, zéro écouteur global ;
 * - zéro réseau, zéro aléa, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e051';
const SCOPE = 'points-e051';
const SUMMARY_ID = 'points-e051-summary';
const REDUCED_ATTR = 'data-e051-reduced';

/* Toutes les règles sont préfixées par la classe de portée posée sur
 * `.points-layout` (ou par l'ID préfixé du récapitulatif) : aucune fuite hors de
 * cette vue. Le récapitulatif est du texte, jamais une couleur porteuse d'info. */
const CSS = `
.points-e051 #${SUMMARY_ID} {
  margin: 10px 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-left: 3px solid var(--gold);
  border-radius: 8px;
  background: rgba(230, 185, 111, .04);
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.points-e051 #${SUMMARY_ID}[hidden] { display: none; }
.points-e051 .points-e051-heading {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-size: 14px;
  color: var(--gold-bright);
}
.points-e051 .points-e051-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.points-e051 .points-e051-item {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
  padding: 2px 0;
  border-bottom: 1px dotted var(--line-strong);
}
.points-e051 .points-e051-key { color: var(--muted-2); }
.points-e051 .points-e051-value {
  color: var(--ink-soft);
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}
.points-e051 .points-e051-note { margin: 8px 0 0; color: var(--muted-2); font-size: 11px; }
.points-e051[${REDUCED_ATTR}="1"] .points-e051-item { transition: none; }
@media (max-width: 620px) {
  .points-e051 .points-e051-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-e051 #${SUMMARY_ID} {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e051 .points-e051-value,
  .points-e051 .points-e051-key { color: CanvasText; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e051 .points-e051-item { transition: none; }
}
`;

let renderedSignature = '';

/* --- lecture brute : aucune grandeur n'est inventée, tout vient du DOM --- */

function text(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* Normalise un entier écrit dans le DOM, y compris avec espaces de millier. */
function numberFrom(value) {
  const cleaned = String(value == null ? '' : value).replace(/[\s\u00a0\u202f]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/* Premier entier d'une phrase du DOM (ex. « 42 points isolés »). */
function leadingNumber(value) {
  const match = String(value == null ? '' : value).match(/(\d[\d\s\u00a0\u202f]*)/);
  return match ? numberFrom(match[1]) : null;
}

/* Entier immédiatement avant le mot « point(s) », pour un libellé de cellule. */
function countBeforePoint(value) {
  const match = String(value == null ? '' : value).match(/(\d[\d\s\u00a0\u202f]*)\s+points?\b/i);
  return match ? numberFrom(match[1]) : null;
}

function readTitle(layout) {
  const title = layout.querySelector('.points-title');
  const source = text(title);
  return { value: leadingNumber(source), source };
}

function readShape(layout) {
  const grid = layout.querySelector('.points-grid');
  if (!grid) return { eras: null, domains: null };
  const head = grid.querySelector('.points-grid-row.is-head');
  const rows = grid.querySelectorAll('.points-grid-row:not(.is-head)');
  const headCells = head ? head.children.length : 0;
  /* La première colonne de l'en-tête est « Ère » : elle n'est pas un domaine. */
  return { eras: rows.length, domains: headCells > 0 ? headCells - 1 : null };
}

function readCells(layout) {
  const grid = layout.querySelector('.points-grid');
  if (!grid) return { covered: null, empty: null, sum: null, total: null };
  const cells = grid.querySelectorAll('.points-cell');
  let covered = 0;
  let sum = 0;
  cells.forEach((cell) => {
    if (!cell.classList.contains('has-points')) return;
    covered += 1;
    const direct = numberFrom(text(cell));
    const fromTitle = countBeforePoint(cell.getAttribute('title'));
    const value = direct === null ? fromTitle : direct;
    if (value !== null) sum += value;
  });
  return {
    covered,
    empty: cells.length - covered,
    sum,
    total: cells.length,
  };
}

function optionLabel(select) {
  if (!select) return null;
  const chosen = (select.selectedOptions && select.selectedOptions[0])
    || (select.options && select.options[select.selectedIndex]);
  return chosen ? text(chosen) || null : null;
}

function optionValue(select) {
  return select ? String(select.value == null ? '' : select.value) : null;
}

function readScope(layout) {
  const filters = layout.querySelector('.points-filters');
  if (!filters) return { domain: null, family: null, domainValue: null, familyValue: null };
  const selects = filters.querySelectorAll('select');
  return {
    domain: optionLabel(selects[0]),
    family: optionLabel(selects[1]),
    domainValue: optionValue(selects[0]),
    familyValue: optionValue(selects[1]),
  };
}

function readVisible(layout) {
  const detail = layout.querySelector('.points-detail');
  if (!detail) return { count: null, source: '' };
  const kicker = detail.querySelector('.view-kicker');
  const source = text(kicker);
  return { count: leadingNumber(source), source };
}

function readAnchor(layout) {
  const meta = layout.querySelector('.points-detail .points-meta');
  if (!meta) return { time: null, confidence: null, marker: null };
  const confidence = meta.querySelector('.confidence');
  if (!confidence) {
    const spans = meta.querySelectorAll('span');
    return {
      time: spans.length > 2 ? text(spans[2]) || null : null,
      confidence: null,
      marker: null,
    };
  }
  const markerClass = Array.prototype.find.call(confidence.classList, (name) => /^is-/.test(name));
  const previous = confidence.previousElementSibling;
  return {
    time: previous ? text(previous) || null : null,
    confidence: text(confidence) || null,
    marker: markerClass ? markerClass.slice(3) : null,
  };
}

/* Le taux est un rapport lu dans le DOM, jamais une valeur écrite à la main.
 * Le repli n'utilise que la base du pourcentage (échelle, pas une donnée). */
function percentOf(covered, total) {
  if (!Number.isFinite(covered) || !Number.isFinite(total) || total <= 0) return null;
  const ratio = covered / total;
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)} %`;
  }
}

function countLabel(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'non disponible';
  try { return new Intl.NumberFormat('fr-FR').format(value); }
  catch { return String(value); }
}

function textLabel(value, fallback) {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

/* Toutes les grandeurs affichées sont rassemblées ici, puis dérivées une seule
 * fois. La signature permet de ne réécrire le récapitulatif que si une valeur
 * observée change réellement. */
function collect(layout) {
  const title = readTitle(layout);
  const shape = readShape(layout);
  const cells = readCells(layout);
  const scope = readScope(layout);
  const visible = readVisible(layout);
  const anchor = readAnchor(layout);

  const derived = {
    total: title.value,
    eras: shape.eras,
    domains: shape.domains,
    covered: cells.covered,
    empty: cells.empty,
    cellTotal: cells.total,
    cellSum: cells.sum,
    coverage: percentOf(cells.covered, cells.total),
    coherent: (title.value === null || cells.sum === null) ? null : title.value === cells.sum,
    scopeDomain: scope.domain,
    scopeFamily: scope.family,
    scopeDomainValue: scope.domainValue,
    scopeFamilyValue: scope.familyValue,
    visible: visible.count,
    time: anchor.time,
    confidence: anchor.confidence || anchor.marker,
  };
  const keys = Object.keys(derived);
  derived.signature = keys.map((key) => `${key}=${derived[key]}`).join(' | ');
  derived.source = { title: title.source, visible: visible.source };
  return derived;
}

function linesOf(data) {
  return [
    ['Points isolés (titre)', countLabel(data.total)],
    ['Ères relevées', countLabel(data.eras)],
    ['Domaines relevés', countLabel(data.domains)],
    ['Cellules documentées', `${countLabel(data.covered)} / ${countLabel(data.cellTotal)}`],
    ['Cellules sans point', countLabel(data.empty)],
    ['Points comptés dans la matrice', countLabel(data.cellSum)],
    ['Titre ↔ matrice', data.coherent === null ? 'non vérifiable'
      : data.coherent ? 'cohérent' : 'écart détecté'],
    ['Taux de couverture', textLabel(data.coverage, 'non calculable')],
    ['Périmètre actif', `${textLabel(data.scopeDomain, 'domaine inconnu')} · ${textLabel(data.scopeFamily, 'famille inconnue')}`],
    ['Points dans le périmètre', countLabel(data.visible)],
    ['Ancre temporelle du point', textLabel(data.time, 'point non daté')],
    ['Degré de certitude', textLabel(data.confidence, 'non renseigné')],
  ];
}

/* Écriture sans innerHTML : tous les nœuds viennent de ctx.el et le contenu
 * changeant est remplacé d'un seul coup par replaceChildren. */
function renderSummary(ctx, layout, data) {
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;

  let summary = document.getElementById(SUMMARY_ID);
  if (summary && !layout.contains(summary)) {
    if (summary.isConnected) summary.remove();
    summary = null;
  }
  const fresh = !summary;
  if (!summary) {
    summary = ctx.el('section', 'points-e051-summary');
    summary.id = SUMMARY_ID;
    summary.setAttribute('role', 'group');
    summary.setAttribute('aria-label', 'Chiffres relevés dans la vue Points');
    summary.tabIndex = -1;
  }
  if (fresh || data.signature !== renderedSignature) {
    renderedSignature = data.signature;
    const heading = ctx.el('h3', 'points-e051-heading', 'Chiffres relevés dans la vue');
    const list = ctx.el('ul', 'points-e051-list');
    linesOf(data).forEach(([label, value]) => {
      const item = ctx.el('li', 'points-e051-item');
      item.appendChild(ctx.el('span', 'points-e051-key', label));
      item.appendChild(ctx.el('span', 'points-e051-value', value));
      list.appendChild(item);
    });
    const note = ctx.el('p', 'points-e051-note',
      'Ces nombres sont lus dans la matrice, les filtres et la fiche : aucun total ni millésime n’est écrit dans la lentille.');
    summary.replaceChildren(heading, list, note);
  }

  const title = matrix.querySelector('.points-title');
  if (summary.parentElement !== matrix) {
    if (title && title.nextSibling) matrix.insertBefore(summary, title.nextSibling);
    else matrix.appendChild(summary);
  }
}

register('E051', (ctx) => {
  const { viewId, layout, css } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function'
      || typeof ctx.el !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  const data = collect(layout);

  /* Signaux de dataset auditables : les chiffres exposés sont ceux qui viennent
   * d'être relus, jamais des valeurs de référence codées à la main. */
  layout.dataset.e051 = '1';
  layout.dataset.e051Total = data.total === null ? '' : String(data.total);
  layout.dataset.e051Covered = data.covered === null ? '' : String(data.covered);
  layout.dataset.e051Coverage = data.coverage || '';
  layout.dataset.e051Visible = data.visible === null ? '' : String(data.visible);

  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  renderSummary(ctx, layout, data);
});
