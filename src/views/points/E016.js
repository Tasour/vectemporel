import { register } from './registry.js';

/* Lentille E016 — B. Filtres & périmètre — état vide explicite quand zéro point.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E016.md — chantiers E016-01 à E016-10.
 * Fichier possédé : ce module uniquement. La vue `src/views/points.js`, le
 * magasin `src/domain/store.js`, le registre, la coque et styles.css sont lus
 * mais jamais modifiés : E016 ajoute une note locale dans `.points-detail`
 * quand le périmètre affiché ne contient aucun point.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune import de store, aucune écriture dans state, aucun
 * chiffre codé en dur : le décompte vient du kicker rendu par points.js:96 et
 * le repli vient du paragraphe de points.js:113.
 *
 * Invariants :
 * - un seul greffon, un seul CSS, une seule note par rendu ;
 * - aucune région live ajoutée : E013/E015/E019 gardent la charge des annonces ;
 * - aucun bouton dupliqué : la réinitialisation reste celle de points.js:85 ;
 * - observation ciblée, sans sous-arbre sur la note écrite ;
 * - zéro réseau, zéro aléa, zéro minuteur, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e016';
const BLOCK_ID = 'points-e016-empty';
const TITLE_ID = 'points-e016-title';
const MESSAGE_ID = 'points-e016-message';
const METRICS_ID = 'points-e016-metrics';

const CSS = `
  #${BLOCK_ID} {
    margin: 10px 0 4px; padding: 12px 14px;
    border: 1px solid var(--line-strong, rgba(230, 185, 111, .24));
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(230, 185, 111, .05); color: var(--ink-soft, #d7d1c6);
    font-size: 12px; line-height: 1.55;
  }
  #${BLOCK_ID}[hidden] { display: none !important; }
  #${BLOCK_ID} h3 {
    margin: 0 0 6px; font-family: var(--serif, Georgia, serif);
    font-size: 14px; color: var(--gold-bright, #f4d69e);
  }
  #${BLOCK_ID} p { margin: 0 0 6px; }
  #${BLOCK_ID} p:last-child { margin-bottom: 0; }
  #${METRICS_ID} {
    color: var(--muted-2, #8c8d91); font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
  .points-detail[data-points-e016="empty"] > .view-kicker {
    color: var(--gold-bright, #f4d69e);
  }
  @media (max-width: 700px) {
    #${BLOCK_ID} { padding: 10px; font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BLOCK_ID} { transition: none; }
  }
  @media (forced-colors: active) {
    #${BLOCK_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  }
`;

let layout = null;          // .points-layout du rendu courant
let detail = null;          // .points-detail du rendu courant
let filters = null;         // .points-filters du rendu courant
let kickerNode = null;      // .view-kicker du détail, source du décompte
let block = null;           // note locale, conservée masquée quand non vide
let messageNode = null;     // phrase explicite, aussi référencée en aria-describedby
let metricsNode = null;     // compteur auditable, hors région live
let resetButton = null;     // bouton natif de points.js:85, jamais dupliqué
let observer = null;        // MutationObserver unique, déconnecté puis reconnecté
let lastSignature = '';     // signature anti-écriture redondante
let emptyCount = 0;         // transitions réelles vers l'état vide
let wasEmpty = false;       // état précédent, conservé entre rendus
let writing = false;        // garde anti-boucle pendant nos propres écritures

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

/* E016-01 : points.js:96 écrit `${visible.length} point(s) dans ce périmètre`.
 * Le nombre est relu, jamais codé en dur ni demandé au store. */
function countFromKicker(root) {
  const match = /(\d+)\s+point/i.exec(textOf(q(root, '.points-detail .view-kicker')));
  return match ? Number(match[1]) : null;
}

function hasPointTitle(root) {
  return !!q(root, '.points-detail .points-point-title');
}

/* E016-07 : repli sur le texte déjà écrit par points.js:113, sans inventer
 * de chiffre quand le kicker est absent ou illisible. */
function hasFallbackText(root) {
  return qa(root, '.points-detail p').some((node) => /aucun point valid/i.test(textOf(node)));
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
  qa(root, '.points-filters select').forEach((select) => {
    const value = select && typeof select.value === 'string' ? select.value : '';
    if (!value || value === '*') return;
    const key = textOf(select.getAttribute('aria-label')) || 'Filtre';
    const options = select.options ? Array.from(select.options) : [];
    const chosen = options.find((option) => option.value === value);
    parts.push(`${key} : ${(chosen && textOf(chosen)) || value}`);
  });
  return parts;
}

function activeEra(root) {
  return textOf(q(root, '.points-grid-row.is-active .points-era')) || 'l’ère affichée';
}

/* E016-02 : message intégralement dérivé du DOM ; deux variantes seulement,
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

function buildBlock(ctx) {
  block.replaceChildren();
  block.setAttribute('role', 'note');
  block.setAttribute('aria-labelledby', TITLE_ID);
  const title = ctx.el('h3', 'points-e016-title', 'État vide — aucun point affiché');
  title.id = TITLE_ID;
  block.appendChild(title);
  messageNode = ctx.el('p', 'points-e016-message', '');
  messageNode.id = MESSAGE_ID;
  block.appendChild(messageNode);
  metricsNode = ctx.el('p', 'points-e016-metrics', '');
  metricsNode.id = METRICS_ID;
  block.appendChild(metricsNode);
}

/* E016-05 : relier le message au bouton NATIF, sans créer de second contrôle
 * ni de live region. L'ajout est réversible et dédupliqué. */
function setDescription(reset, empty) {
  if (!reset || typeof reset.getAttribute !== 'function') return;
  const ids = textOf(reset.getAttribute('aria-describedby')).split(/\s+/)
    .filter((id) => id && id !== MESSAGE_ID);
  if (empty) ids.push(MESSAGE_ID);
  if (ids.length) reset.setAttribute('aria-describedby', ids.join(' '));
  else reset.removeAttribute('aria-describedby');
}

function refresh(force) {
  if (writing || !block || !block.isConnected) return;
  const empty = isEmptyState(layout);
  const filters = activeFilters(layout);
  const signature = JSON.stringify([empty, filters, activeEra(layout)]);
  if (!force && signature === lastSignature) return;
  lastSignature = signature;
  if (empty && !wasEmpty) emptyCount += 1;
  wasEmpty = empty;

  writing = true;
  try {
    block.hidden = !empty;
    block.setAttribute('data-points-e016', empty ? 'empty' : 'points');
    if (detail && detail.dataset) detail.dataset.pointsE016 = empty ? 'empty' : 'points';
    if (messageNode) messageNode.textContent = empty ? messageText(layout, filters) : '';
    if (metricsNode) {
      metricsNode.textContent = `États vides détectés : ${emptyCount}.`;
    }
    setDescription(resetButton, empty);
  } finally {
    writing = false;
  }
}

/* E016-08 : cibles réduites au kicker (caractères), au détail (ajout/retrait
 * d'enfants seulement) et à la barre de filtres. La note et son message ne
 * sont jamais observés : leurs écritures ne peuvent pas déclencher de boucle. */
function observe() {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => refresh(false));
  if (kickerNode && kickerNode.isConnected) {
    observer.observe(kickerNode, { childList: true, characterData: true, subtree: true });
  }
  if (detail && detail.isConnected) observer.observe(detail, { childList: true });
  if (filters && filters.isConnected) {
    observer.observe(filters, { childList: true, attributes: true, attributeFilter: ['value'] });
  }
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctx.css(CSS_ID, CSS);

  const stage = ctx.stage;
  const root = ctx.layout && ctx.layout.isConnected
    ? ctx.layout
    : (stage && typeof stage.querySelector === 'function'
      ? q(stage, '.points-layout') : null);
  if (!root) return;
  const currentDetail = q(root, '.points-detail');
  const currentFilters = q(root, '.points-filters');
  if (!currentDetail || !currentFilters) return;

  /* E016-10 : un rendu neuf recrée le layout ; les références périmées sont
   * abandonnées et d'éventuelles notes en doublon sont résorbées. */
  const found = document.getElementById(BLOCK_ID);
  const fresh = !(found && found.isConnected);
  qa(document, `[id="${BLOCK_ID}"]`).forEach((node, index) => {
    if (index > 0) node.remove();
  });

  layout = root;
  detail = currentDetail;
  filters = currentFilters;
  resetButton = q(filters, 'button');
  kickerNode = q(detail, '.view-kicker');

  block = document.getElementById(BLOCK_ID);
  if (!block) {
    block = ctx.el('section', 'points-e016-empty');
    block.id = BLOCK_ID;
  }
  if (!q(block, '.points-e016-message')) buildBlock(ctx);
  else {
    messageNode = q(block, '.points-e016-message');
    metricsNode = q(block, '.points-e016-metrics');
  }
  if (block.parentElement !== detail) {
    if (kickerNode && kickerNode.parentElement === detail) {
      detail.insertBefore(block, kickerNode.nextSibling);
    } else {
      detail.appendChild(block);
    }
  }

  /* E016-09 : mouvement réduit signalé sans animation propre à la lentille. */
  let reduced = false;
  try { reduced = !!(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reduced = false; }
  if (detail.dataset) detail.dataset.pointsE016Motion = reduced ? 'reduce' : 'full';

  observe();
  if (fresh) lastSignature = '';
  refresh(true);
}

register('E016', install);
