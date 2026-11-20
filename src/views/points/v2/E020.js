import { register } from './registry.js';

/* Lentille E020 — passe 2 (module POINTS/V2 E020). Filtres & périmètre :
 * panneau de lecture du périmètre actif.
 *
 * Dix chantiers V2, E020-V2-01 à E020-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E020.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E020.js) garde
 * la main sur les équivalents clavier (Alt+D/F/R, Alt+Maj+D/F) ; la passe 2
 * ne pilote rien, elle REND LIISIBLE l'état courant du périmètre. Tout
 * identifiant, classe, attribut de données et id de feuille est préfixé
 * `points-v2-e020` / `v2-e020`, pour ne jamais entrer en collision avec le
 * panneau d'aide `points-e020` déjà monté dans .points-filters.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global : les signaux sont lus dans le DOM réellement produit par points.js
 * (les deux <select>, .points-title, .points-detail .view-kicker, la matrice)
 * et réaffichés. Aucune donnée historique n'est inventée, aucun total codé en
 * dur. Le seul ajout à un nœud existant est un aria-describedby complété
 * (jamais écrasé) sur les deux <select>.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * chaque état porte un glyphe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e020';
const SCOPE = 'points-v2-e020';
const SUMMARY_ID = 'points-v2-e020-summary';
const TITLE_ID = 'points-v2-e020-title';
const REDUCED_ATTR = 'data-v2-e020-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E020-V2-03 / E020-V2-06 : vocabulaire d'état. Chaque distinction est codée
 * trois fois : glyphe, mot et couleur redondante (jamais la couleur seule). */
const SCOPE_STATES = {
  global: { mark: '◫', word: 'global' },
  restreint: { mark: '▦', word: 'restreint' },
};

/* E020-V2-01 : feuille unique, entièrement préfixée par .points-v2-e020,
 * classe posée sur .points-layout : aucune fuite hors de cette vue. */
const CSS = `
.points-v2-e020 .points-v2-e020-summary {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e020 .points-v2-e020-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e020 .points-v2-e020-intro,
.points-v2-e020 .points-v2-e020-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e020 .points-v2-e020-block { margin: 0 0 10px; }
.points-v2-e020 .points-v2-e020-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e020 .points-v2-e020-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 4px 10px;
}
.points-v2-e020 .points-v2-e020-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e020 .points-v2-e020-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e020 .points-v2-e020-name { color: var(--ink-soft); }
.points-v2-e020 .points-v2-e020-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
}
.points-v2-e020 .points-v2-e020-item.is-restricted .points-v2-e020-glyph { color: var(--gold); }
.points-v2-e020 .points-v2-e020-item.is-global .points-v2-e020-glyph { color: var(--muted-2); }
.points-v2-e020 .points-v2-e020-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
}
.points-v2-e020 .points-v2-e020-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; color: var(--muted-2);
}
.points-v2-e020[` + REDUCED_ATTR + `="1"] .points-v2-e020-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e020 .points-v2-e020-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e020 .points-v2-e020-list { grid-template-columns: 1fr; }
}
@media (forced-colors: active) {
  .points-v2-e020 .points-v2-e020-summary { border-color: CanvasText; }
  .points-v2-e020 .points-v2-e020-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e020 .points-v2-e020-summary { border-color: #666; background: transparent; }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function hasClass(node, name) {
  return !!(node && node.classList && node.classList.contains(name));
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E020-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document (un nœud détaché d'un rendu
 * antérieur n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E020-V2-02 : l'état des filtres est lu dans les <select> réels (points.js:62
 * et :74), avec repli sur leur ordre dans .points-filters. Aucune valeur n'est
 * codée en dur : on relit l'option effectivement sélectionnée. */
function selectsOf(filters) {
  const list = nodes(filters, 'select');
  const result = { domain: list[0] || null, family: list[1] || null };
  list.forEach((select) => {
    const label = (getAttr(select, 'aria-label') || '').toLowerCase();
    if (label.indexOf('domaine') !== -1) result.domain = select;
    else if (label.indexOf('famille') !== -1) result.family = select;
  });
  return result;
}

function selectedOption(select) {
  if (!select) return { value: '', label: '' };
  const checked = query(select, 'option:checked');
  const option = checked || (select.options ? select.options[select.selectedIndex] : null);
  if (!option) return { value: txt(select.value), label: txt(select.value) };
  return { value: txt(option.value), label: txt(option.textContent) };
}

/* E020-V2-04 : compteurs lus dans le titre de la matrice (points.js:33) et
 * dans le kicker du détail (points.js:97). Le séparateur de milliers français
 * est toléré. Aucun chiffre n'est supposé. */
function parseCount(text) {
  const match = /(\d[\d\s\u00a0]*)/.exec(String(text || ''));
  if (!match) return null;
  const value = parseInt(match[1].replace(/[\s\u00a0]/g, ''), 10);
  return isFinite(value) ? value : null;
}

/* E020-V2-05 : couverture de la matrice : nombre d'ères, de cellules et de
 * cellules non vides, lus dans .points-grid (points.js:34-59). */
function readCoverage(layout) {
  const rows = nodes(layout, '.points-grid .points-grid-row')
    .filter((row) => !hasClass(row, 'is-head'));
  let cells = 0;
  let covered = 0;
  rows.forEach((row) => {
    nodes(row, '.points-cell').forEach((cell) => {
      cells += 1;
      if (hasClass(cell, 'has-points')) covered += 1;
    });
  });
  const active = query(layout, '.points-grid .points-grid-row.is-active .points-era');
  return { eras: rows.length, cells, covered, era: txt(active) };
}

function readSignals(layout) {
  const filters = query(layout, '.points-filters');
  const selects = selectsOf(filters);
  const total = parseCount(txt(query(layout, '.points-title')));
  const visible = parseCount(txt(query(layout, '.points-detail .view-kicker')));
  return {
    domainSelect: selects.domain,
    familySelect: selects.family,
    domain: selectedOption(selects.domain),
    family: selectedOption(selects.family),
    total,
    visible,
    coverage: readCoverage(layout),
  };
}

function scopeState(value) {
  return !value || value === '*' ? SCOPE_STATES.global : SCOPE_STATES.restreint;
}

function signatureOf(signals) {
  const c = signals.coverage;
  return [
    signals.domain.value, signals.family.value,
    signals.total, signals.visible,
    c.eras, c.cells, c.covered, c.era,
  ].join('|');
}

function listItem(ctx, name, glyph, state, kind) {
  const li = ctx.el('li', 'points-v2-e020-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e020-glyph', glyph),
    ctx.el('span', 'points-v2-e020-name', name),
    ctx.el('span', 'points-v2-e020-state', state)
  );
  return li;
}

/* E020-V2-07 : le lien avec les filtres est additif : les identifiants déjà
 * posés par la passe 1 (aria-keyshortcuts, title) ou par E041 sont conservés
 * et dédupliqués, jamais écrasés. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existing.concat(id).join(' '));
}

/* E020-V2-02 / E020-V2-03 : structure statique construite une seule fois par
 * rendu avec ctx.el (jamais innerHTML) ; seules les listes et les trois lignes
 * dynamiques sont remplacées ensuite par fill() via replaceChildren. */
function buildSummary(ctx) {
  const summary = ctx.el('section', 'points-v2-e020-summary');
  summary.id = SUMMARY_ID;
  setAttr(summary, 'role', 'region');
  setAttr(summary, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e020-title',
    'Périmètre actif — lecture des filtres');
  title.id = TITLE_ID;
  summary.appendChild(title);

  summary.appendChild(ctx.el('p', 'points-v2-e020-intro',
    'Ce panneau relit les deux filtres et la matrice tels que la vue les a rendus. Il n’applique aucun filtre et ne modifie ni les listes ni la fiche : les raccourcis clavier restent gérés par la passe 1.'));

  const blocks = [
    ['points-v2-e020-filters', 'Filtres courants', 'points-v2-e020-filter-list'],
    ['points-v2-e020-figures', 'Périmètre affiché', 'points-v2-e020-figure-list'],
  ];
  blocks.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e020-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e020-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e020-list ' + listClass));
    summary.appendChild(block);
  });

  summary.appendChild(ctx.el('p', 'points-v2-e020-current', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e020-metrics', ''));
  summary.appendChild(ctx.el('p', 'points-v2-e020-note',
    'Règle de lecture : le réglage « global » inclut tout ; un réglage « restreint » réduit le périmètre. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));
  return summary;
}

/* E020-V2-02 / E020-V2-03 / E020-V2-04 / E020-V2-05 / E020-V2-08 : tout le
 * contenu dynamique est écrit ici, à partir des signaux lus plus haut. */
function fill(ctx, summary, signals) {
  const domainState = scopeState(signals.domain.value);
  const familyState = scopeState(signals.family.value);
  const total = signals.total;
  const visible = signals.visible;
  const ratio = total && total > 0 && visible !== null
    ? Math.round((visible / total) * 100) : null;
  const c = signals.coverage;

  const filterList = query(summary, '.points-v2-e020-filter-list');
  if (filterList) {
    filterList.replaceChildren(
      listItem(ctx, 'Domaine : ' + (signals.domain.label || 'non lu'),
        domainState.mark, domainState.word,
        domainState === SCOPE_STATES.global ? 'global' : 'restricted'),
      listItem(ctx, 'Famille : ' + (signals.family.label || 'non lue'),
        familyState.mark, familyState.word,
        familyState === SCOPE_STATES.global ? 'global' : 'restricted')
    );
  }

  const figureList = query(summary, '.points-v2-e020-figure-list');
  if (figureList) {
    figureList.replaceChildren(
      listItem(ctx, 'Points affichés : '
        + (visible === null ? 'non lus' : visible) + ' sur '
        + (total === null ? 'total inconnu' : total),
        '◉', ratio === null ? 'ratio inconnu' : ratio + ' %', 'restricted'),
      listItem(ctx, 'Cellules de la matrice : ' + c.covered + ' couvertes sur ' + c.cells,
        c.covered > 0 ? '■' : '□', c.covered > 0 ? 'couvertes' : 'aucune',
        c.covered > 0 ? 'restricted' : 'global')
    );
  }

  const currentLine = query(summary, '.points-v2-e020-current');
  if (currentLine) {
    currentLine.textContent = 'Ère active : ' + (c.era || 'non lue')
      + ' · ' + c.eras + ' ère' + plural(c.eras, '', 's')
      + ' dans la matrice.';
  }

  const metrics = query(summary, '.points-v2-e020-metrics');
  if (metrics) {
    metrics.textContent = 'Périmètre : '
      + (domainState === SCOPE_STATES.global ? 'tous les domaines' : 'un domaine')
      + ' · '
      + (familyState === SCOPE_STATES.global ? 'toutes les familles' : 'une famille')
      + ' · '
      + (visible === null || total === null
        ? 'effectifs non lisibles dans le DOM'
        : visible + ' point' + plural(visible, '', 's') + ' sur ' + total);
  }

  setAttr(summary, 'data-v2-e020-domain', signals.domain.value);
  setAttr(summary, 'data-v2-e020-family', signals.family.value);
  setAttr(summary, 'data-v2-e020-visible', visible === null ? '' : String(visible));
  setAttr(summary, 'data-v2-e020-total', total === null ? '' : String(total));
  setAttr(summary, 'data-v2-e020-ratio', ratio === null ? '' : String(ratio));
}

/* E020-V2-01 / E020-V2-09 / E020-V2-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, ids dédupliqués, repli
 * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const filters = query(layout, '.points-filters');
  const detail = query(layout, '.points-detail');
  if (!isElement(filters) || !isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const signals = readSignals(layout);
  const sig = signatureOf(signals);

  /* E020-V2-10 : réconciliation par id. On conserve le panneau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre. */
  const candidates = nodesById(SUMMARY_ID);
  let summary = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      summary = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== summary) removeNode(node); });

  if (!isElement(summary)) {
    summary = buildSummary(ctx);
    detail.appendChild(summary);
  }
  enforceUnique(TITLE_ID, query(summary, '#' + TITLE_ID));

  if (getAttr(summary, 'data-v2-e020-signature') !== sig) {
    setAttr(summary, 'data-v2-e020-signature', sig);
    fill(ctx, summary, signals);
  }

  setAttr(summary, 'data-v2-e020', '1');
  augmentDescribedBy(signals.domainSelect, SUMMARY_ID);
  augmentDescribedBy(signals.familySelect, SUMMARY_ID);
}

register('E020', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
