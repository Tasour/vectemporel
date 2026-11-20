import { register } from './registry.js';

/* Lentille POINTS E030 — passe 2 (V2) : ancre locale de retour à la matrice,
 * contextualisée, auditable et non bavarde (domaine C : détail & fiche).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E030.md — chantiers E030-01 à E030-10.
 * Fichier possédé : src/views/points/v2/E030.js uniquement. Ni la passe 1
 * (src/views/points/E030.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés. La lentille s'appuie sur le DOM déjà rendu.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e030 / pointsV2E030 pour ne pas écraser ceux de la passe
 * 1 (points-e030, data-points-e030*, pointsE030*). Les deux ancres coexistent
 * sans conflit : la V2 ne retire ni ne réétiquette aucun nœud de la passe 1.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au store ni au routeur : le retour est
 * purement navigationnel et local (aucun filtre, ère ou index modifié).
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e030),
 * une seule ancre, un seul marqueur, un seul compteur, une seule région live,
 * un seul observateur ciblé, un seul écouteur de clic ( gardé par dataset ).
 * Zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
 * console.*, aucun écouteur global.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e030';
const SCOPE = 'points-v2-e030';
const ANCHOR_ID = 'points-v2-e030-back';
const MARKER_ID = 'points-v2-e030-matrix-anchor';
const METRICS_ID = 'points-v2-e030-metrics';
const LIVE_ID = 'points-v2-e030-live';

const DATA_SCOPE = 'pointsV2E030';
const DATA_STATE = 'pointsV2E030State';
const DATA_COUNT = 'pointsV2E030Count';
const DATA_ANNOUNCED = 'pointsV2E030Announced';
const DATA_BOUND = 'pointsV2E030Bound';
const REDUCED_ATTR = 'data-points-v2-e030-reduced';

let detail = null;         // .points-detail courant (panneau de fiche)
let matrix = null;         // .points-matrix courant (cible du retour)
let anchor = null;         // ancre V2, réutilisée d'un rendu à l'autre
let metricsNode = null;    // compteur auditable, hors toute région live
let liveNode = null;       // région live locale, persistante sur body
let observer = null;       // unique observateur, ciblé sur le titre du point
let currentRoot = null;    // dernière racine reçue, pour l'observateur
let backCount = 0;         // nombre d'activations de l'ancre V2
let announceCount = 0;     // nombre réel d'annonces écrites dans la live
let renderedLabel = '';    // signature anti-écriture du libellé accessible

/* E030-01 : feuille unique. Chaque sélecteur commence littéralement par
 * `.points-v2-e030`, y compris dans les @media, donc aucune règle ne peut fuir
 * hors de la vue Points ni écraser la feuille points-e030 de la passe 1. */
const CSS = `
  .points-v2-e030 .points-v2-e030-back {
    display: inline-flex; align-items: center; gap: 7px;
    min-height: 44px; margin: 0 0 10px; padding: 8px 12px;
    border: 1px solid var(--line-strong, #3a4252); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
    font: inherit; font-size: 13px; line-height: 1.3; text-decoration: none;
    cursor: pointer;
  }
  .points-v2-e030 .points-v2-e030-back:hover { border-color: var(--gold-bright, #e9c98f); }
  .points-v2-e030 .points-v2-e030-back:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  .points-v2-e030 .points-v2-e030-arrow { font-size: 15px; line-height: 1; }
  .points-v2-e030 .points-v2-e030-metrics {
    margin: 0 0 12px; color: var(--muted-2, #9aa4b2);
    font-size: 11px; font-variant-numeric: tabular-nums;
  }
  .points-v2-e030 .points-v2-e030-marker {
    display: block; position: relative; top: -8px;
    width: 0; height: 0; overflow: hidden;
  }
  /* E030-08 : région live sr-only, créée avant la première écriture. */
  .points-v2-e030-live {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  /* E030-04 : point de rupture mobile — ancre pleine largeur sous 700 px. */
  @media (max-width: 700px) {
    .points-v2-e030 .points-v2-e030-back { display: flex; justify-content: center; width: 100%; }
  }
  /* E030-06 : mouvement réduit, couplage JS (attribut) et media query. */
  .points-v2-e030[data-points-v2-e030-reduced="1"] .points-v2-e030-back { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e030 .points-v2-e030-back { transition: none !important; animation: none !important; }
  }
  /* E030-04 : contraste forcé — le libellé textuel reste porteur de l'info. */
  @media (forced-colors: active) {
    .points-v2-e030 .points-v2-e030-back { border-color: CanvasText; color: CanvasText; }
    .points-v2-e030 .points-v2-e030-metrics { color: CanvasText; }
  }
  /* E030-04 : la région live n'a pas sa place sur papier. */
  @media print {
    .points-v2-e030-live { display: none; }
    .points-v2-e030 .points-v2-e030-back { border: none; padding: 0; }
  }
`;

/* E030-01 : la racine est le layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E030-05 : double source de vérité avec repli sûr, exactement comme la
 * passe 1 : ctx.reducedMotion() d'abord, matchMedia ensuite, repli false. */
function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E030-07 : le titre est lu dans le DOM rendu, jamais codé en dur. */
function currentTitle(root) {
  const node = root ? root.querySelector('.points-detail .points-point-title') : null;
  return node ? String(node.textContent || '').trim() : '';
}

/* E030-07 : contexte d'ère lu dans la ligne active de la matrice. Aucun
 * millésime ni total n'est inventé : le libellé vient de l' bouton .points-era
 * tel qu'écrit par points.js:41. */
function activeEraLabel(root) {
  const row = root ? root.querySelector('.points-matrix .points-grid-row.is-active') : null;
  const button = row ? row.querySelector('.points-era') : null;
  return button ? String(button.textContent || '').trim() : '';
}

/* E030-07 : libellé dérivé du DOM. Le contexte d'ère est ajouté quand il est
 * lisible, sans remplacer le titre du point. */
function desiredLabel(root) {
  const title = currentTitle(root);
  if (!title) return 'Retour à la matrice';
  const era = activeEraLabel(root);
  return era ? `Retour à la matrice — ${era} — ${title}`
             : `Retour à la matrice — ${title}`;
}

/* E030-07 / E030-09 : la signature évite les écritures redondantes déclenchées
 * par l'observateur. Muter le compteur ne touche jamais cette signature. */
function renderLabel(root) {
  const label = desiredLabel(root);
  if (label === renderedLabel) return;
  renderedLabel = label;
  if (!anchor) return;
  anchor.setAttribute('aria-label', label);
  anchor.title = label;
}

/* E030-08 : compteur auditable, écrit par textContent, hors région live. */
function writeMetrics() {
  if (!metricsNode) return;
  metricsNode.textContent = `Retours vers la matrice : ${backCount}.`;
  if (metricsNode.dataset) {
    metricsNode.dataset[DATA_COUNT] = String(backCount);
    metricsNode.dataset[DATA_ANNOUNCED] = String(announceCount);
  }
}

/* E030-08 : région live unique et CRÉÉE AVANT la première écriture. Persistante
 * sur document.body : le re-render de points.js remplace le layout, pas elle.
 * Construite par ctx.el, jamais par innerHTML. */
function ensureLive(ctx) {
  if (typeof document === 'undefined' || !document.body) return null;
  let live = document.getElementById(LIVE_ID);
  if (live && live.isConnected) {
    liveNode = live;
    return live;
  }
  if (live && typeof live.remove === 'function') live.remove();
  live = ctx.el('p', 'points-v2-e030-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  liveNode = live;
  return live;
}

/* E030-08 : une seule annonce par activation réelle, jamais au montage ni
 * au rendu. Le message est court et composé depuis des faits observables. */
function announceBack() {
  const live = liveNode && liveNode.isConnected ? liveNode : null;
  if (!live) return;
  live.textContent = `Retour vers la matrice effectué (${backCount}).`;
  announceCount += 1;
}

/* E030-05 : retour programmatique. L'ancre native href="#…" assure le repli
 * sans JS. Le focus est posé sur l'ère courante, sinon sur la matrice. */
function onBack(event) {
  if (!matrix || !matrix.isConnected) return;
  event.preventDefault();
  backCount += 1;
  writeMetrics();
  const behavior = reducedMotion(currentCtx) ? 'auto' : 'smooth';
  if (typeof matrix.scrollIntoView === 'function') {
    matrix.scrollIntoView({ behavior, block: 'start' });
  }
  const activeRow = matrix.querySelector('.points-grid-row.is-active');
  const eraButton = activeRow ? activeRow.querySelector('.points-era') : null;
  const target = eraButton || matrix;
  if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  if (detail && detail.dataset) detail.dataset[DATA_STATE] = 'used';
  announceBack();
}

/* currentCtx conservé pour l'observateur (besoin de reducedMotion au clic). */
let currentCtx = null;

/* E030-10 : un seul écouteur de clic, gardé par dataset distinct de la passe 1
 * (data-points-v2-e030-bound), donc jamais lié deux fois sur un même nœud. */
function bindClick(ctx) {
  if (!anchor || typeof anchor.addEventListener !== 'function') return;
  if (anchor.dataset && anchor.dataset[DATA_BOUND] === '1') return;
  anchor.addEventListener('click', onBack);
  if (anchor.dataset) anchor.dataset[DATA_BOUND] = '1';
  if (ctx) currentCtx = ctx;
}

/* E030-09 : observateur unique, jamais sur l'ancre ni le compteur que E030
 * réécrit. Cible en lecture seule : E030 n'écrit jamais dans le titre. */
function observeTitle(root) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined' || !root) return;
  const title = root.querySelector('.points-detail .points-point-title');
  if (!title) return;
  observer = new MutationObserver(() => renderLabel(currentRoot));
  observer.observe(title, { childList: true, characterData: true, subtree: true });
}

/* E030-02 / E030-03 / E030-08 : recherche par id puis réutilisation ou
 * relogage sans doublon. Les ids V2 sont distincts de ceux de la passe 1. */
function ensureMarker(ctx, root) {
  let marker = document.getElementById(MARKER_ID);
  if (marker && marker.parentElement !== matrix) marker.remove();
  marker = document.getElementById(MARKER_ID);
  if (!marker) {
    marker = ctx.el('span', 'points-v2-e030-marker');
    marker.id = MARKER_ID;
    marker.setAttribute('aria-hidden', 'true');
  }
  if (marker.parentElement !== matrix) matrix.prepend(marker);
  return marker;
}

function ensureAnchor(ctx, root) {
  let found = document.getElementById(ANCHOR_ID);
  if (found && found.parentElement !== detail) found.remove();
  anchor = document.getElementById(ANCHOR_ID);
  if (!anchor) {
    anchor = ctx.el('a', 'points-v2-e030-back');
    anchor.id = ANCHOR_ID;
    anchor.href = `#${MARKER_ID}`;
    const arrow = ctx.el('span', 'points-v2-e030-arrow', '↑');
    arrow.setAttribute('aria-hidden', 'true');
    anchor.append(arrow, ctx.el('span', 'points-v2-e030-text', 'Retour à la matrice'));
  }
  if (anchor.parentElement !== detail) detail.insertBefore(anchor, detail.firstChild);
}

function ensureMetrics(ctx) {
  let found = document.getElementById(METRICS_ID);
  if (found && found.parentElement !== detail) found.remove();
  metricsNode = document.getElementById(METRICS_ID);
  if (!metricsNode) {
    metricsNode = ctx.el('p', 'points-v2-e030-metrics');
    metricsNode.id = METRICS_ID;
    anchor.after(metricsNode);
  }
}

function apply(ctx) {
  /* E030-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E030-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);
  if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

  /* E030-06 : couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (reducedMotion(ctx)) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  const currentDetail = root.querySelector('.points-detail');
  const currentMatrix = root.querySelector('.points-matrix');
  if (!currentDetail || !currentMatrix) return;
  detail = currentDetail;
  matrix = currentMatrix;

  /* Un rendu neuf recrée le panneau : une ancre déconnectée le signale. */
  if (!anchor || !anchor.isConnected) renderedLabel = '';

  /* E030-03 : cible = marqueur ENFANT de la matrice, jamais un id sur la
   * matrice elle-même (sinon _diagnostics.js la marquerait et la déplacerait). */
  const marker = ensureMarker(ctx, root);
  if (matrix.tabIndex < 0) matrix.tabIndex = -1;
  if (!matrix.hasAttribute('aria-label')) {
    matrix.setAttribute('aria-label', 'Matrice de couverture — cible du retour local V2');
  }

  /* E030-02 : ancre additive en tête de la fiche, sans toucher au contenu natif
   * ni à l'ancre de la passe 1 (points-e030-back). */
  ensureAnchor(ctx, root);
  ensureMetrics(ctx);

  /* E030-08 : la région existe dès le premier rendu, mais reste vide : aucun
   * bavardage au montage, seule l'enregistre du live. */
  ensureLive(ctx);

  if (detail.dataset) detail.dataset[DATA_STATE] = 'ready';
  currentCtx = ctx;
  currentRoot = root;

  bindClick(ctx);
  writeMetrics();
  renderLabel(root);
  observeTitle(root);

  /* E030-03 : miroir auditable du marqueur cible, hors région live. */
  if (marker && marker.dataset) marker.dataset[DATA_SCOPE] = ANCHOR_ID;
}

/* E030-10 : enregistrement unique, isolé par un try/catch — une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E030', (ctx) => {
  try { apply(ctx); } catch { return; }
});
