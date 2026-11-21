import { register } from './registry.js';

/* Lentille POINTS V2 E033 — Navigation & clavier (seconde passe) :
 * repère de focus, voie d'activation et microlecture de la matrice.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E033.md — chantiers E033-01 à E033-10.
 * Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E033.js), aucun rapport de passe 1 et aucun fichier
 * partagé (vue points.js, coque shell.js, styles.css, registry.js,
 * index.js) n'est modifié. La V2 s'ajoute au DOM déjà produit par points.js.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) tandis que la passe
 * 1 est appelée à :127 avec 'points'. Le filtre porte donc prioritairement sur
 * 'pointsv2' ('points' et l'absence de viewId sont tolérés par robustesse).
 * Toutes les ancres, classes, feuilles et signaux sont préfixés
 * points-v2-e033 / data-points-v2-e033-* : ils n'écrasent ni les IDs, ni les
 * attributs, ni les compteurs de la passe 1 (points-e033-*).
 *
 * Contrat exploité intégralement :
 * - ctx.viewId  → filtre de vue et marqueur non destructif ;
 * - ctx.stage   → racine de repli pour retrouver le layout neuf ;
 * - ctx.layout  → racine de requête et classe de portée .points-v2-e033 ;
 * - ctx.css('points-v2-e033', CSS) → UNE seule feuille, toute préfixée ;
 * - ctx.el(tag, cls, text) → tout le DOM statique, jamais d'écriture de balisage brut ;
 * - ctx.reducedMotion() → couplage JS défensif du mouvement réduit.
 *
 * La passe 1 E033 possède l'activation clavier (keydown qui synthétise le
 * click d'une cellule non native). La V2 ne réimplémente AUCUNE activation :
 * son écouteur keydown est PUREMENT OBSERVATIONNEL (aucun preventDefault,
 * aucun stopPropagation, aucun click synthétique). Elle ajoute quatre lectures
 * complémentaires : le repère de focus, la voie d'activation (clavier vs
 * pointeur), la dernière case activée et des compteurs auditables. Zéro
 * réseau, zéro aléa, zéro minuteur, zéro rAF, zéro écouteur global, aucun
 * appel à la console, aucune réinterprétation de balisage, aucune donnée
 * historique inventée.
 */

const CSS_ID = 'points-v2-e033';
const SCOPE = 'points-v2-e033';
const VIEW_IDS = ['pointsv2', 'points'];

const ID = {
  hint: 'points-v2-e033-hint',
  focus: 'points-v2-e033-focus',
  status: 'points-v2-e033-status',
  metrics: 'points-v2-e033-metrics',
};

const CLASS = {
  hint: 'points-v2-e033-hint',
  focus: 'points-v2-e033-focus',
  status: 'points-v2-e033-status',
  metrics: 'points-v2-e033-metrics',
  key: 'points-v2-e033-key',
};

const CELL_SELECTOR = '.points-cell, .points-era';
const ENTER = 'Enter';
const SPACE = ' ';
const SPACE_LEGACY = 'Spacebar';

/* Feuille unique. Chaque sélecteur COMMENCE par `.points-v2-e033`, y compris
 * à l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points
 * V2. Les attributs de donnée sont distincts de la passe 1
 * (data-points-e033-*) pour ne pas écraser ses marqueurs. Aucune animation
 * propre à la lentille : le mouvement réduit est respecté par construction,
 * avec un couplage JS explicite en complément des media queries. */
const CSS = `
  .points-v2-e033 .${CLASS.hint},
  .points-v2-e033 .${CLASS.focus},
  .points-v2-e033 .${CLASS.status},
  .points-v2-e033 .${CLASS.metrics} {
    margin: 4px 2px 0; padding: 5px 8px;
    border-left: 2px solid var(--gold, #e6b96f);
    color: var(--muted, #9a9a9a); font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e033 .${CLASS.focus} { border-left-style: dashed; }
  .points-v2-e033 .${CLASS.status} { border-left-width: 3px; }
  .points-v2-e033 .${CLASS.hint} .${CLASS.key} {
    display: inline-block; min-width: 18px; padding: 0 4px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 3px;
    color: var(--ink-soft, #d7d7d7); font: inherit; font-size: 10px;
    text-align: center;
  }
  .points-v2-e033 .points-grid :is(.points-cell, .points-era):focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
  }
  .points-v2-e033[data-points-v2-e033-focused="1"] .points-grid
    :is(.points-cell, .points-era)[data-points-v2-e033-focused="1"] {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .points-v2-e033 .${CLASS.hint},
    .points-v2-e033 .${CLASS.focus},
    .points-v2-e033 .${CLASS.status},
    .points-v2-e033 .${CLASS.metrics} { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e033 .points-grid :is(.points-cell, .points-era) { transition: none !important; }
  }
  .points-v2-e033[data-points-v2-e033-motion="reduced"] .points-grid
    :is(.points-cell, .points-era) { transition: none !important; }
  @media (forced-colors: active) {
    .points-v2-e033 .${CLASS.hint},
    .points-v2-e033 .${CLASS.focus},
    .points-v2-e033 .${CLASS.status},
    .points-v2-e033 .${CLASS.metrics} {
      border-left-color: CanvasText; color: CanvasText; background: Canvas;
    }
    .points-v2-e033 .${CLASS.hint} .${CLASS.key} { border-color: CanvasText; color: CanvasText; }
  }
`;

/* État du module. Les compteurs survivent au remplacement du stage par la
 * coque ; un rendu neuf ne remet pas les lectures à zéro, mais détache et
 * réattache les écouteurs à la nouvelle grille (E033-10). */
let trackedGrid = null;
let renderCount = 0;
let focusVisits = 0;
let keyPresses = 0;
let activations = 0;
let writes = 0;
let modality = 'indéterminée';       // 'clavier' | 'pointeur' | 'indéterminée'
let focusedCell = null;
let lastActivation = null;           // { era, domain, filled, countLabel, modality }
const signatures = { focus: '', status: '', metrics: '' };

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function txt(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E033-02 : ciblage par nearest, jamais l'élément brut : un focus ou un clic
 * sur un nœud enfant remonte toujours à la cellule ou au bouton d'ère. */
function cellOf(node) {
  return node && typeof node.closest === 'function' ? node.closest(CELL_SELECTOR) : null;
}

function isActivationKey(key) {
  return key === ENTER || key === SPACE || key === SPACE_LEGACY;
}

function isEra(cell) {
  return !!(cell && cell.classList && cell.classList.contains('points-era'));
}

/* E033-03 : domaines lus dans l'en-tête réel (points.js:35-38), pas codés en
 * dur. La première cellule de l'en-tête est « Ère », donc on décale d'un. */
function headDomains(grid) {
  const head = q(grid, '.points-grid-row.is-head');
  return head ? qa(head, 'span').slice(1).map(txt) : [];
}

/* Coordonnées entièrement dérivées du DOM rendu : ère (libellé du bouton),
 * domaine (index de la cellule parmi les .points-cell de la ligne), état
 * (classe has-points) et compte (texte de la cellule). Aucune valeur inventée. */
function coordsOf(cell, grid) {
  const row = cell && typeof cell.closest === 'function' ? cell.closest('.points-grid-row') : null;
  const era = row ? (txt(q(row, '.points-era')) || txt(row.children[0])) : '';
  const domains = headDomains(grid);
  const cells = row ? qa(row, '.points-cell') : [];
  const index = cells.indexOf(cell);
  const domain = index >= 0 ? (domains[index] || '') : '';
  const filled = !!(cell && cell.classList && cell.classList.contains('has-points'));
  const raw = txt(cell);
  const count = /^\d+$/.test(raw) ? Number(raw) : (filled ? 1 : 0);
  return { era, domain, filled, countLabel: filled ? `${count} point${count > 1 ? 's' : ''}` : 'aucun point' };
}

function where(coords) {
  const era = coords.era ? `ère « ${coords.era} »` : 'ère inconnue';
  const domain = coords.domain ? `domaine « ${coords.domain} »` : 'domaine inconnu';
  return `${era}, ${domain}`;
}

function focusText(cell, grid) {
  if (!cell) return 'Repère de focus : aucune cellule de la matrice n’est focalisée.';
  const coords = coordsOf(cell, grid);
  if (isEra(cell)) {
    return `Repère de focus : bouton d’ère — ${where(coords)}.`;
  }
  return `Repère de focus : ${where(coords)}, ${coords.countLabel}.`;
}

function statusText() {
  if (!lastActivation) return 'Dernière activation : aucune activation enregistrée dans cette matrice.';
  const mode = lastActivation.modality === 'clavier' ? 'clavier'
    : (lastActivation.modality === 'pointeur' ? 'pointeur' : 'voie non déterminée');
  return `Dernière activation : ${where(lastActivation)}, ${lastActivation.countLabel}, voie ${mode}.`;
}

function metricsText() {
  return `Visites de focus : ${focusVisits} · Pressions clavier : ${keyPresses} · `
    + `Activations : ${activations} · Voie : ${modality} · Écritures : ${writes}.`;
}

/* Écriture conditionnelle : on ne touche au DOM que si le texte change
 * réellement, ce qui borne les écritures et rend le compteur auditable. */
function setText(node, key, text) {
  if (!node) return;
  if (signatures[key] === text && node.textContent === text) return;
  signatures[key] = text;
  node.textContent = text;
  writes += 1;
}

/* E033-08 : signaux préfixés data-points-v2-e033-*, distincts de la passe 1. */
function writeSignals(layout, grid, reduced) {
  if (layout && layout.dataset) {
    layout.dataset.pointsV2E033 = 'ready';
    layout.dataset.pointsV2E033Renders = String(renderCount);
    layout.dataset.pointsV2E033Writes = String(writes);
    layout.dataset.pointsV2E033Motion = reduced ? 'reduced' : 'full';
    layout.dataset.pointsV2E033Activations = String(activations);
    layout.dataset.pointsV2E033Focused = focusedCell ? '1' : '0';
  }
  if (grid && grid.dataset) {
    grid.dataset.pointsV2E033 = 'ready';
    grid.dataset.pointsV2E033FocusVisits = String(focusVisits);
    grid.dataset.pointsV2E033KeyPresses = String(keyPresses);
    grid.dataset.pointsV2E033Activations = String(activations);
    grid.dataset.pointsV2E033Modality = modality;
    grid.dataset.pointsV2E033Focused = focusedCell ? '1' : '0';
  }
}

/* E033-06 / E033-07 : rafraîchissements appelés à la fois par install() et
 * par les écouteurs, pour que lectures et signaux restent synchrones. */
function refreshFocus(grid) {
  put(grid, 'data-points-v2-e033-focused-internal', focusedCell ? '1' : '0');
  if (focusedCell) put(focusedCell, 'data-points-v2-e033-focused', '1');
}

function refreshAll(layout, grid, nodes, reduced) {
  setText(nodes.focus, 'focus', focusText(focusedCell, grid));
  setText(nodes.status, 'status', statusText());
  setText(nodes.metrics, 'metrics', metricsText());
  writeSignals(layout, grid, reduced);
}

/* E033-02 : unique jeu d'écouteurs LOCAUX, délégué sur la grille (jamais un
 * par cellule, jamais sur document). La phase capture du keydown garantit que
 * la voie est enregistrée AVANT l'activation de la passe 1 — sans l'influencer. */
function onFocusIn(event) {
  const grid = trackedGrid;
  if (!grid || !grid.isConnected) return;
  const cell = cellOf(event.target);
  if (!cell || !grid.contains(cell)) return;
  if (focusedCell && focusedCell !== cell && typeof focusedCell.removeAttribute === 'function') {
    focusedCell.removeAttribute('data-points-v2-e033-focused');
  }
  if (focusedCell !== cell) focusVisits += 1;
  focusedCell = cell;
  put(cell, 'data-points-v2-e033-focused', '1');
  refreshFocus(grid);
  const layout = grid.closest ? grid.closest('.points-layout') : null;
  refreshAll(layout, grid, activeNodes, activeReduced);
}

function onFocusOut(event) {
  const grid = trackedGrid;
  if (!grid || !grid.isConnected) return;
  if (event.relatedTarget && grid.contains(event.relatedTarget)) return;
  if (focusedCell && typeof focusedCell.removeAttribute === 'function') {
    focusedCell.removeAttribute('data-points-v2-e033-focused');
  }
  focusedCell = null;
  refreshFocus(grid);
  const layout = grid.closest ? grid.closest('.points-layout') : null;
  refreshAll(layout, grid, activeNodes, activeReduced);
}

/* keydown PUREMENT OBSERVATIONNEL : aucun preventDefault, aucun click
 * synthétique, aucune interruption de propagation. La passe 1 E033 reste
 * seule maître de l'activation ; la V2 ne fait que qualifier la voie. */
function onKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!isActivationKey(event.key)) return;
  const grid = trackedGrid;
  if (!grid || !grid.isConnected) return;
  const cell = cellOf(event.target);
  if (!cell || !grid.contains(cell)) return;
  modality = 'clavier';
  keyPresses += 1;
  const layout = grid.closest ? grid.closest('.points-layout') : null;
  refreshAll(layout, grid, activeNodes, activeReduced);
}

function onPointerDown(event) {
  const grid = trackedGrid;
  if (!grid || !grid.isConnected) return;
  const cell = cellOf(event.target);
  if (!cell || !grid.contains(cell)) return;
  modality = 'pointeur';
}

function onClick(event) {
  const grid = trackedGrid;
  if (!grid || !grid.isConnected) return;
  const cell = cellOf(event.target);
  if (!cell || !grid.contains(cell)) return;
  activations += 1;
  lastActivation = Object.assign(coordsOf(cell, grid), { modality });
  const layout = grid.closest ? grid.closest('.points-layout') : null;
  refreshAll(layout, grid, activeNodes, activeReduced);
}

/* Références courantes utilisées par les écouteurs ; remplacées à chaque rendu
 * neuf pour ne jamais retenir un nœud détaché. */
let activeNodes = { focus: null, status: null, metrics: null };
let activeReduced = false;

function detach(grid) {
  if (!grid || typeof grid.removeEventListener !== 'function') return;
  grid.removeEventListener('focusin', onFocusIn, true);
  grid.removeEventListener('focusout', onFocusOut, true);
  grid.removeEventListener('keydown', onKeyDown, true);
  grid.removeEventListener('pointerdown', onPointerDown, true);
  grid.removeEventListener('click', onClick, false);
}

function attach(grid) {
  if (!grid || typeof grid.addEventListener !== 'function') return;
  grid.addEventListener('focusin', onFocusIn, true);
  grid.addEventListener('focusout', onFocusOut, true);
  grid.addEventListener('keydown', onKeyDown, true);
  grid.addEventListener('pointerdown', onPointerDown, true);
  grid.addEventListener('click', onClick, false);
}

/* E033-04 : ancre unique réutilisée d'un rendu à l'autre, créée par ctx.el
 * (jamais d'écriture de balisage brut). Un nœud périmé portant le même id ailleurs dans la
 * racine est retiré avant réinsertion, ce qui interdit tout doublon. */
function ensureAnchor(doc, root, id, className, matrix, before, ctx) {
  const found = qa(matrix, '#' + id);
  found.slice(1).forEach((node) => node.remove());
  let node = found[0] || null;
  if (!node) {
    const stale = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
    if (stale && !matrix.contains(stale) && typeof stale.remove === 'function') stale.remove();
    node = ctx.el('p', className, '');
    node.id = id;
  }
  if (node.parentNode !== matrix || (before && node.nextSibling !== before)) {
    matrix.insertBefore(node, before || null);
  }
  return node;
}

function buildHint(ctx) {
  const hint = ctx.el('p', CLASS.hint, '');
  hint.id = ID.hint;
  hint.appendChild(ctx.el('span', '', 'Navigation clavier : '));
  hint.appendChild(ctx.el('kbd', CLASS.key, 'Tab'));
  hint.appendChild(ctx.el('span', '', ' pour parcourir la matrice, '));
  hint.appendChild(ctx.el('kbd', CLASS.key, 'Entrée'));
  hint.appendChild(ctx.el('span', '', ' ou '));
  hint.appendChild(ctx.el('kbd', CLASS.key, 'Espace'));
  hint.appendChild(ctx.el('span', '', ' pour activer la case focalisée.'));
  return hint;
}

function ensureHint(doc, root, matrix, before, ctx) {
  const found = qa(matrix, '#' + ID.hint);
  found.slice(1).forEach((node) => node.remove());
  let hint = found[0] || null;
  if (!hint) {
    const stale = doc && typeof doc.getElementById === 'function' ? doc.getElementById(ID.hint) : null;
    if (stale && !matrix.contains(stale) && typeof stale.remove === 'function') stale.remove();
    hint = buildHint(ctx);
  }
  if (hint.parentNode !== matrix || (before && hint.nextSibling !== before)) {
    matrix.insertBefore(hint, before || null);
  }
  return hint;
}

/* Union additive de l'aria-describedby : les relations posées par la passe 1
 * ou par une autre lentille sont conservées, puis dédupliquées (E033-04). */
function describe(grid, doc) {
  if (!grid || !doc || typeof doc.getElementById !== 'function') return;
  if (!doc.getElementById(ID.hint)) return;
  const refs = String(grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (refs.indexOf(ID.hint) === -1) refs.push(ID.hint);
  put(grid, 'aria-describedby', refs.join(' '));
}

function install(ctx) {
  /* E033-01 / E033-10 : gardes de type sur un ctx minimal, filtre de vue et
   * récupération défensive de la racine (layout courant, sinon repli stage). */
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  let layout = ctx.layout && typeof ctx.layout.querySelector === 'function' ? ctx.layout : null;
  const stage = ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null;
  if ((!layout || layout.isConnected === false) && stage) {
    const fresh = q(stage, '.points-layout');
    if (fresh) layout = fresh;
  }
  if (!layout || typeof layout.querySelector !== 'function') return;

  const matrix = q(layout, '.points-matrix');
  const grid = q(layout, '.points-grid');
  if (!matrix || !grid || typeof matrix.insertBefore !== 'function') return;

  const doc = layout.ownerDocument
    || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* E033-09 : mouvement réduit couplé deux fois — ctx.reducedMotion() posant
   * un attribut V2 et la media query (aucune transition propre par ailleurs). */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  activeReduced = reduced;

  /* E033-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E033-04 / E033-06 / E033-07 : quatre lectures au plus, toutes créées par
   * ctx.el, placées avant la grille dans .points-matrix seulement. */
  ensureHint(doc, stage, matrix, grid, ctx);
  const focusNode = ensureAnchor(doc, stage, ID.focus, CLASS.focus, matrix, grid, ctx);
  const statusNode = ensureAnchor(doc, stage, ID.status, CLASS.status, matrix, grid, ctx);
  const metricsNode = ensureAnchor(doc, stage, ID.metrics, CLASS.metrics, matrix, grid, ctx);
  put(statusNode, 'role', 'status');
  put(statusNode, 'aria-live', 'polite');
  activeNodes = { focus: focusNode, status: statusNode, metrics: metricsNode };
  describe(grid, doc);

  /* E033-10 : un seul jeu d'écouteurs par grille. Un rendu neuf change de
   * nœud : l'ancien jeu est détaché, le nouveau attaché, les curseurs de focus
   * non connectés sont oubliés. Les compteurs, eux, sont conservés. */
  if (trackedGrid && trackedGrid !== grid) detach(trackedGrid);
  if (focusedCell && !grid.contains(focusedCell)) {
    if (typeof focusedCell.removeAttribute === 'function') {
      focusedCell.removeAttribute('data-points-v2-e033-focused');
    }
    focusedCell = null;
  }
  if (grid !== trackedGrid) {
    attach(grid);
    trackedGrid = grid;
    renderCount += 1;
  }

  refreshFocus(grid);
  refreshAll(layout, grid, activeNodes, reduced);
}

/* Un seul greffon. Le registre V2 neutralise déjà toute erreur résiduelle
 * (v2/registry.js:39-43) ; le try/catch local garantit en plus qu'une lentille
 * défaillante n'interrompt jamais le rendu. */
register('E033', (ctx) => {
  try {
    install(ctx);
  } catch {
    return;
  }
});
