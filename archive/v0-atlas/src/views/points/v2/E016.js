import { register } from './registry.js';

/* Lentille POINTS E016 — passe 2 (V2) : Filtres & périmètre — état vide
 * explicite quand zéro point (domaine B). Dix chantiers V2, E016-01 à E016-10,
 * décrits dans UNIFIED_AUDIT/POINTS/V2/views/E016.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est donc un
 * greffon INDÉPENDANT et COEXISTANT : tout identifiant, toute classe, tout
 * attribut de données et l'id de feuille sont préfixés `points-v2-e016` /
 * `data-points-v2-e016`, pour ne jamais entrer en collision avec la note
 * `points-e016-empty` déjà montée dans la même `.points-detail`.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Aucune écriture destructive : kicker, détail, filtres et bouton natif sont
 * lus ; seul `aria-describedby` du bouton est complété (jamais écrasé).
 *
 * Invariants V2 : un seul enregistrement, une seule feuille, une seule note par
 * rendu ; ids préfixés et dédupliqués ; DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur
 * global, zéro console.* ; aucun MutationObserver (la vue est recréée à chaque
 * rendu : la lecture au rendu suffit et évite toute boucle d'écriture).
 */

const CSS_ID = 'points-v2-e016';
const SCOPE = 'points-v2-e016';
const BLOCK_ID = 'points-v2-e016-empty';
const TITLE_ID = 'points-v2-e016-title';
const MESSAGE_ID = 'points-v2-e016-message';
const METRICS_ID = 'points-v2-e016-metrics';
const REDUCED_ATTR = 'data-points-v2-e016-reduced';
const DATA_STATE = 'data-points-v2-e016';
const VIEW_IDS = ['pointsv2', 'points'];

/* Feuille unique. Chaque sélecteur COMMENCE par `.points-v2-e016`, y compris
 * à l'intérieur des blocs @media : aucune règle ne peut fuir hors de la vue
 * Points V2. Les attributs de données sont distincts de ceux de la passe 1
 * (data-points-e016, data-points-e016-motion) pour ne pas écraser ses signaux. */
const CSS = `
  .points-v2-e016 .points-v2-e016-empty {
    box-sizing: border-box;
    margin: 10px 0 4px; padding: 12px 14px;
    border: 1px solid var(--line-strong, rgba(230, 185, 111, .24));
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(230, 185, 111, .05); color: var(--ink-soft, #d7d1c6);
    font-size: 12px; line-height: 1.55;
  }
  .points-v2-e016 .points-v2-e016-empty[hidden] { display: none !important; }
  .points-v2-e016 .points-v2-e016-title {
    margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
    font-size: 14px; color: var(--gold-bright, #f4d69e);
  }
  .points-v2-e016 .points-v2-e016-message { margin: 0 0 6px; }
  .points-v2-e016 .points-v2-e016-message:last-child { margin-bottom: 0; }
  .points-v2-e016 .points-v2-e016-metrics {
    margin: 0; color: var(--muted-2, #8c8d91); font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e016 .points-detail[` + DATA_STATE + `="empty"] > .view-kicker {
    color: var(--gold-bright, #f4d69e);
  }
  @media (max-width: 700px) {
    .points-v2-e016 .points-v2-e016-empty { padding: 10px; font-size: 11px; }
  }
  .points-v2-e016[` + REDUCED_ATTR + `="1"] .points-v2-e016-empty { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e016 .points-v2-e016-empty { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e016 .points-v2-e016-empty {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
  @media print {
    .points-v2-e016 .points-v2-e016-empty { background: transparent; border-left-color: #666; }
  }
`;

let lastSignature = '';  // signature anti-écriture, conservée entre rendus
let emptyCount = 0;      // transitions réelles vers l'état vide
let wasEmpty = false;    // état précédent, conservé entre rendus

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function textOf(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function ownerDocument(...roots) {
  for (const root of roots) {
    if (root && root.ownerDocument) return root.ownerDocument;
  }
  return typeof document !== 'undefined' ? document : null;
}

/* E016-02 : points.js:96 écrit `${visible.length} point(s) dans ce périmètre`.
 * Le nombre est relu, jamais codé en dur ni demandé au store. */
function countFromKicker(root) {
  const match = /(\d+)\s+point/i.exec(textOf(query(root, '.points-detail .view-kicker')));
  return match ? Number(match[1]) : null;
}

function hasPointTitle(root) {
  return !!query(root, '.points-detail .points-point-title');
}

/* E016-08 : repli sur le texte déjà écrit par points.js:113, sans inventer
 * de chiffre quand le kicker est absent ou illisible. */
function hasFallbackText(root) {
  return queryAll(root, '.points-detail p').some((node) => /aucun point valid/i.test(textOf(node)));
}

function isEmptyState(root) {
  const count = countFromKicker(root);
  if (count !== null) return count === 0;
  return !hasPointTitle(root) && hasFallbackText(root);
}

/* E016-04 : libellés des options sélectionnées, lus dans les deux <select>
 * natifs ; les valeurs brutes servent de repli si une option manque. */
function activeFilters(root) {
  const parts = [];
  queryAll(root, '.points-filters select').forEach((select) => {
    const value = select && typeof select.value === 'string' ? select.value : '';
    if (!value || value === '*') return;
    const key = textOf(getAttr(select, 'aria-label')) || 'Filtre';
    const options = select.options ? Array.from(select.options) : [];
    const chosen = options.find((option) => option.value === value);
    parts.push(`${key} : ${(chosen && textOf(chosen)) || value}`);
  });
  return parts;
}

function activeEra(root) {
  return textOf(query(root, '.points-grid-row.is-active .points-era')) || 'l’ère affichée';
}

/* E016-04 : message intégralement dérivé du DOM ; deux variantes seulement,
 * selon que le vide vient de filtres actifs ou de la couverture elle-même. */
function messageText(root, filters) {
  const era = activeEra(root);
  if (filters.length) {
    return `Aucun point ne correspond au périmètre demandé (${filters.join(' · ')} ; ère ${era}). `
      + 'Réduisez la restriction ou utilisez « Réinitialiser les filtres » pour retrouver la couverture complète.';
  }
  return `Aucun point validé dans ce périmètre pour l’ère ${era}. `
    + 'Les agents par ère travaillent encore à la couverture : un silence de la matrice est une donnée, pas une erreur.';
}

/* E016-03 : structure statique construite une seule fois avec ctx.el, jamais
 * innerHTML. Seuls le message et le compteur sont réécrits ensuite. */
function buildBlock(ctx) {
  const block = ctx.el('section', 'points-v2-e016-empty');
  block.id = BLOCK_ID;
  setAttr(block, 'role', 'note');
  setAttr(block, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e016-title', 'État vide — aucun point affiché');
  title.id = TITLE_ID;
  block.appendChild(title);

  const message = ctx.el('p', 'points-v2-e016-message', '');
  message.id = MESSAGE_ID;
  block.appendChild(message);

  const metrics = ctx.el('p', 'points-v2-e016-metrics', '');
  metrics.id = METRICS_ID;
  block.appendChild(metrics);
  return block;
}

/* E016-06 : relier le message au bouton NATIF, sans créer de second contrôle
 * ni de live region. L'ajout est additif, dédupliqué et réversible. */
function setDescription(reset, empty) {
  if (!reset || typeof reset.getAttribute !== 'function') return;
  const ids = textOf(getAttr(reset, 'aria-describedby')).split(/\s+/)
    .filter((id) => id && id !== MESSAGE_ID);
  if (empty) ids.push(MESSAGE_ID);
  if (ids.length) setAttr(reset, 'aria-describedby', ids.join(' '));
  else if (typeof reset.removeAttribute === 'function') reset.removeAttribute('aria-describedby');
}

/* E016-01 / E016-10 : réconciliation par identifiant dans le détail courant.
 * La note déjà correctement montée est conservée ; tout doublon d'un rendu
 * antérieur est retiré. Aucune référence de nœud périmé n'est conservée. */
function reconcileBlock(doc, detail, ctx) {
  const candidates = doc && typeof doc.querySelectorAll === 'function'
    ? Array.prototype.slice.call(doc.querySelectorAll('[id="' + BLOCK_ID + '"]')) : [];
  let block = null;
  for (const candidate of candidates) {
    if (candidate.parentElement === detail) { block = candidate; break; }
  }
  candidates.forEach((node) => { if (node !== block) removeNode(node); });

  let created = false;
  if (!isElement(block)) {
    block = buildBlock(ctx);
    created = true;
  }
  const kicker = query(detail, '.view-kicker');
  if (block.parentElement !== detail) {
    if (kicker && kicker.parentElement === detail) detail.insertBefore(block, kicker.nextSibling);
    else detail.appendChild(block);
  }
  return { block, created };
}

function apply(ctx) {
  /* E016-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;
  const stage = isElement(ctx.stage) ? ctx.stage : null;
  const root = (isElement(ctx.layout) && ctx.layout.isConnected !== false)
    ? ctx.layout : (stage || layout);
  const detail = query(root, '.points-detail');
  const filtersBar = query(root, '.points-filters');
  if (!isElement(detail) || !isElement(filtersBar)) return;

  const doc = ownerDocument(layout, stage);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* E016-01 : injection unique (cssOnce déduplique par id) et ancrage de la
   * portée sur le layout. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  /* E016-09 : mouvement réduit couplé JS + media query, sans animation propre. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    if (typeof layout.removeAttribute === 'function') layout.removeAttribute(REDUCED_ATTR);
  }

  const resetButton = query(filtersBar, 'button');
  const { block, created } = reconcileBlock(doc, detail, ctx);
  if (created) lastSignature = '';  // un nœud neuf doit être rempli même à signature égale

  /* E016-07 : signature anti-écriture. Sans observateur, la lecture au rendu
   * suffit : le store recrée la vue à chaque changement de périmètre. */
  const empty = isEmptyState(root);
  const filters = activeFilters(root);
  const signature = JSON.stringify([empty, filters, activeEra(root)]);
  if (signature === lastSignature) return;
  lastSignature = signature;

  if (empty && !wasEmpty) emptyCount += 1;
  wasEmpty = empty;

  if (typeof block.hidden !== 'undefined') block.hidden = !empty;
  setAttr(block, DATA_STATE, empty ? 'empty' : 'points');
  setAttr(detail, DATA_STATE, empty ? 'empty' : 'points');

  const message = query(block, '.points-v2-e016-message');
  if (message) message.textContent = empty ? messageText(root, filters) : '';

  /* E016-07 : compteur auditable, hors de toute région live. */
  const metrics = query(block, '.points-v2-e016-metrics');
  if (metrics) metrics.textContent = `États vides détectés : ${emptyCount}.`;

  setDescription(resetButton, empty);
}

register('E016', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
