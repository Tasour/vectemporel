import { register } from './registry.js';

/* Lentille E089 — I. Qualité & validation : tableau de vérification
 * auto-généré en fin de rapport et miroir DOM en lecture seule.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E089.md — chantiers E089-01 à E089-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, le store, la coque et styles.css ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js:28-44). Aucune dépendance vers le store, le
 * routeur, ctx.say() ou une autre lentille : le tableau ne fait que LIRE le
 * DOM déjà produit et n'écrit que dans son propre sous-arbre.
 *
 * Invariants :
 * - une seule feuille CSS, une seule section de vérification, un seul
 *   observateur ciblé, un seul miroir, pour un rendu donné ;
 * - le miroir est en lecture seule : aucune écriture hors de sa propre
 *   section, aucun id posé sur un nœud de points.js ;
 * - aucune donnée historique codée en dur : chaque valeur est dérivée du DOM ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro
 *   innerHTML / outerHTML / insertion HTML.
 */

const CSS_ID = 'points-e089';
const SECTION_CLASS = 'points-e089-verify';
const CAPTION_ID = 'points-e089-caption';
const NOTE_ID = 'points-e089-note';
const METRICS_ID = 'points-e089-metrics';
const BODY_CLASS = 'points-e089-body';
const STATUS_OK = 'Conforme';
const STATUS_KO = 'À revoir';

/* E089-09 : toute la feuille est préfixée (classe de portée ou id local),
 * donc sans effet hors de la vue Points. Pas une seule animation : le miroir
 * ne doit jamais introduire de mouvement, même réduit. */
const CSS = `
  .points-layout .${SECTION_CLASS} {
    margin: 14px 0 0; padding: 12px 14px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(8, 11, 16, .94);
    color: var(--ink-soft, #d8d8d8); font-size: 12px; line-height: 1.45;
  }
  .points-layout .${SECTION_CLASS}:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  .points-layout .${SECTION_CLASS} table {
    width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums;
  }
  .points-layout .${SECTION_CLASS} caption {
    margin: 0 0 8px; text-align: left; font-family: var(--serif, serif);
    font-size: 15px; color: var(--gold-bright, #e9c98f);
  }
  .points-layout .${SECTION_CLASS} th,
  .points-layout .${SECTION_CLASS} td {
    padding: 6px 8px; border-bottom: 1px solid var(--line-strong, #6b6b6b);
    text-align: left; vertical-align: top; overflow-wrap: anywhere;
  }
  .points-layout .${SECTION_CLASS} thead th {
    font-size: 10px; letter-spacing: .04em; color: var(--gold, #e6b96f);
    border-bottom-width: 2px;
  }
  .points-layout .${SECTION_CLASS} tbody th { font-weight: 600; width: 34%; }
  .points-layout .${SECTION_CLASS} tbody tr:last-child th,
  .points-layout .${SECTION_CLASS} tbody tr:last-child td { border-bottom: 0; }
  .points-layout .${SECTION_CLASS} .points-e089-status { white-space: nowrap; font-weight: 600; }
  .points-layout #${NOTE_ID},
  .points-layout #${METRICS_ID} {
    margin: 8px 0 0; color: var(--muted-2, #9a9a9a); font-size: 10px;
  }
  @media (max-width: 620px) {
    .points-layout .${SECTION_CLASS} { padding: 10px; font-size: 11px; }
    .points-layout .${SECTION_CLASS} th,
    .points-layout .${SECTION_CLASS} td { padding: 5px 6px; }
    .points-layout .${SECTION_CLASS} tbody th { width: 42%; }
  }
  @media (forced-colors: active) {
    .points-layout .${SECTION_CLASS},
    .points-layout .${SECTION_CLASS} th,
    .points-layout .${SECTION_CLASS} td {
      border-color: CanvasText; color: CanvasText; background: Canvas;
    }
    .points-layout .${SECTION_CLASS} .points-e089-status { color: CanvasText; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-layout .${SECTION_CLASS} * { transition: none !important; animation: none !important; }
  }
`;

let latest = null;          // dernier ctx reçu, relu à chaque passage
let section = null;         // unique section de vérification du rendu courant
let tbody = null;           // corps du tableau, seul sous-arbre réécrit
let metricsNode = null;     // compteurs auditables, hors toute région live
let observer = null;        // unique MutationObserver, ciblé sur les sources
let signature = '';         // signature anti-écriture redondante (E089-05)
let readCount = 0;          // passes de lecture effectuées
let refreshCount = 0;       // écritures réelles dans le miroir

/* E089-02 : chaque valeur lue vient du DOM courant. Aucun millésime, aucun
 * total littéral, aucune chaîne historique : les nombres sont comptés. */
function q(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? root.querySelectorAll(selector) : [];
}

function first(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function trimmed(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function count(root, selector) {
  return q(root, selector).length;
}

function sourceRoot(ctx) {
  return ctx && ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
}

/* E089-02 : la structure de base est comptée depuis la racine. Quand root est
 * .points-layout lui-même, querySelector ne le renvoie pas : on l'ajoute. */
function coreCount(ctx, root) {
  let n = root === ctx.layout ? 1 : (first(root, '.points-layout') ? 1 : 0);
  if (first(root, '.points-matrix')) n += 1;
  if (first(root, '.points-detail')) n += 1;
  return n;
}

function selectedLabel(select) {
  const option = select && select.selectedOptions && select.selectedOptions[0];
  return trimmed(option) || (select ? String(select.value || '') : '');
}

function shortText(text, limit) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

/* E089-02/03 : les dix contrôles du miroir. Chaque entrée porte un libellé,
 * une valeur OBSERVÉE (jamais supposée) et un état textuel dérivé de la
 * condition réelle. L'état n'est jamais porté par la couleur seule. */
function readChecks(ctx, root) {
  const checks = [];
  const cores = coreCount(ctx, root);
  checks.push({
    label: 'Structure de la vue',
    observed: `${cores}/3 régions (matrice, détail)`,
    ok: cores === 3,
  });

  const head = first(root, '.points-grid-row.is-head');
  const cells = q(root, '.points-cell');
  checks.push({
    label: 'En-tête de la matrice',
    observed: head ? 'présent' : 'absent',
    ok: Boolean(head),
  });

  let titled = 0;
  cells.forEach((cell) => { if (cell.getAttribute('title')) titled += 1; });
  checks.push({
    label: 'Cellules étiquetées',
    observed: titled ? `${titled}/${cells.length} avec intitulé` : 'aucune intitulée',
    ok: cells.length > 0 && titled === cells.length,
  });

  const activeRows = count(root, '.points-grid-row.is-active');
  checks.push({
    label: 'Ère active repérée',
    observed: `${activeRows} ligne(s) active(s)`,
    ok: activeRows === 1,
  });

  const selects = q(root, '.points-filters select');
  checks.push({
    label: 'Filtres disponibles',
    observed: `${selects.length} sélecteur(s)`,
    ok: selects.length === 2,
  });

  checks.push({
    label: 'Périmètre affiché',
    observed: `${selectedLabel(selects[0])} · ${selectedLabel(selects[1])}`,
    ok: Boolean(trimmed(selects[0]) && trimmed(selects[1])),
  });

  const title = trimmed(first(root, '.points-point-title'));
  const text = trimmed(first(root, '.points-point-text'));
  checks.push({
    label: 'Fiche du point',
    observed: title && text ? shortText(title, 48) : 'périmètre vide (message explicite)',
    ok: Boolean(title && text) || Boolean(first(root, '.points-detail p')),
  });

  const justification = trimmed(first(root, '.points-justification'));
  const sources = trimmed(first(root, '.points-sources'));
  checks.push({
    label: 'Justification / sources',
    observed: justification
      ? shortText(justification, 48)
      : (sources ? shortText(sources, 48) : 'non renseignées'),
    ok: Boolean(justification || sources),
  });

  const navButtons = count(root, '.points-nav button');
  checks.push({
    label: 'Navigation du détail',
    observed: `${navButtons} bouton(s)`,
    ok: navButtons === 2,
  });

  /* E089-03 : unicité des ID et unicité de notre propre feuille : deux
   * contrôles de qualité dérivés du DOM, sans aucune écriture dans la source. */
  const ids = [];
  q(root, '[id]').forEach((node) => ids.push(node.id));
  const duplicates = ids.length - new Set(ids).size;
  const sheets = document.querySelectorAll(`style[id="${CSS_ID}"]`).length;
  checks.push({
    label: 'IDs et feuille CSS',
    observed: `${ids.length} ID(s), ${duplicates} doublon(s), ${sheets} feuille`,
    ok: duplicates === 0 && sheets === 1,
  });

  return checks;
}

function writeMetrics() {
  if (!metricsNode) return;
  metricsNode.textContent = `Lectures : ${readCount} · Rafraîchissements : ${refreshCount}.`;
}

/* E089-05 : aucune réécriture si la signature est identique ; E089-07 : le
 * miroir est construit par replaceChildren, jamais par innerHTML. */
function render(ctx) {
  if (!tbody) return;
  const root = sourceRoot(ctx);
  if (!root) return;

  readCount += 1;
  const checks = readChecks(ctx, root);
  const next = checks.map((c) => `${c.label}=${c.observed}|${c.ok}`).join(' ;; ');
  if (next === signature) {
    writeMetrics();
    return;
  }
  signature = next;
  refreshCount += 1;

  const rows = checks.map((check) => {
    const tr = ctx.el('tr');
    const th = ctx.el('th', '', check.label);
    th.setAttribute('scope', 'row');
    const value = ctx.el('td', '', check.observed);
    const status = ctx.el('td', 'points-e089-status', check.ok ? STATUS_OK : STATUS_KO);
    tr.append(th, value, status);
    return tr;
  });
  tbody.replaceChildren(...rows);
  writeMetrics();
}

/* E089-06 : un seul observateur, déconnecté puis reconnecté ; il cible les
 * TROIS zones sources en lecture seule, jamais la section qu'E089 réécrit. */
function observeSources(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    if (latest) render(latest);
  });
  const root = sourceRoot(ctx);
  if (!root) return;
  const options = { childList: true, characterData: true, subtree: true };
  const matrix = first(root, '.points-matrix');
  const detail = first(root, '.points-detail');
  const filters = first(root, '.points-filters');
  if (matrix) observer.observe(matrix, options);
  if (detail) observer.observe(detail, options);
  if (filters) observer.observe(filters, options);
}

/* E089-01 : structure statique construite une seule fois, insérée en FIN de
 * .points-layout (fin du « rapport » affiché), sans toucher aux nœud de la
 * vue. Le miroir porte un attribut explicite et un libellé de non-interaction. */
function buildSection(ctx) {
  section.replaceChildren();
  section.setAttribute('role', 'region');
  section.setAttribute('aria-labelledby', CAPTION_ID);
  section.setAttribute('aria-describedby', NOTE_ID);
  section.dataset.pointsE089Mirror = 'read-only';
  section.tabIndex = 0;

  const table = ctx.el('table');
  const caption = ctx.el('caption', '', 'Tableau de vérification de la vue Points');
  caption.id = CAPTION_ID;
  table.appendChild(caption);

  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Contrôle', 'Valeur observée (miroir)', 'État'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  tbody = ctx.el('tbody', BODY_CLASS);
  table.appendChild(tbody);
  section.appendChild(table);

  const note = ctx.el('p', '',
    'Miroir en lecture seule : chaque valeur est lue dans la vue et recopiée ici. Ce tableau ne modifie ni les filtres, ni le détail, ni la matrice.');
  note.id = NOTE_ID;
  section.appendChild(note);

  metricsNode = ctx.el('p', '');
  metricsNode.id = METRICS_ID;
  section.appendChild(metricsNode);
}

/* E089-08 : installation idempotente. Repérage par classe (et non par id
 * direct sur le layout) pour échapper au marquage du mode diagnostic : aucun
 * id n'est posé sur un nœud parent de body / stage / layout. */
register('E089', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout || !ctx.layout.isConnected) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  const stale = document.querySelector(`.${SECTION_CLASS}`);
  if (stale && stale.parentElement !== layout) stale.remove();

  section = layout.querySelector(`.${SECTION_CLASS}`);
  const fresh = !(section && section.isConnected);
  if (!section) {
    section = ctx.el('section', SECTION_CLASS);
    buildSection(ctx);
  } else if (!section.querySelector(`.${BODY_CLASS}`) || !section.querySelector(`#${METRICS_ID}`)) {
    buildSection(ctx);
  } else {
    tbody = section.querySelector(`.${BODY_CLASS}`);
    metricsNode = section.querySelector(`#${METRICS_ID}`);
  }
  if (section.parentElement !== layout) layout.appendChild(section);

  if (fresh) signature = '';
  layout.dataset.pointsE089 = 'ready';
  observeSources(ctx);
  render(ctx);
});
