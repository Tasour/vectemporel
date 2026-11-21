import { register } from './registry.js';

/* Lentille E075 — Points de rupture documentés (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E075.md — chantiers E075-01 à E075-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les lentilles voisines (E001, E071…E074, E076…E080) ne sont ni
 * édités ni doublés : E075 ajoute UNE feuille préfixée, UNE légende statique et
 * UN signal de segment courant, et s'appuie sur le DOM déjà produit par points.js.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js:28-44). Aucune dépendance vers le store, le
 * routeur, les filtres ou une autre lentille : la légende reste lisible avec un
 * ctx minimal.
 *
 * Invariants : une seule source de vérité pour les ruptures (BP), un seul CSS
 * (cssOnce par ID), une seule portée, une seule légende, un seul greffon ;
 * zéro nœud supprimé ou réécrit, zéro écouteur global, zéro timer, zéro rAF,
 * zéro réseau, zéro aléa, aucune réinterprétation de balisage, aucun appel à la
 * console, aucune région live concurrente (E041 reste seul maître des annonces).
 */

const CSS_ID = 'points-e075';
const SCOPE = 'points-e075';
const DOC_ID = 'points-e075-doc';
const DOC_TITLE_ID = 'points-e075-doc-title';
const CURRENT_ID = 'points-e075-current';
const MOTION_ATTR = 'data-points-e075-motion';

/* E075-01 — ÉCHELLE UNIQUE. Ces quatre nombres alimentent à la fois les media
 * queries du CSS (généré ci-dessous), les requêtes matchMedia de détection et le
 * texte de la légende : aucune valeur de rupture n'est recopiée ailleurs.
 * Les valeurs sont celles déjà utilisées par les lentilles voisines et par
 * styles.css:377 (1000), E077/E079/E080 (700), E071/E072/E074/E076 (620),
 * E071/E074/E080 (520 de hauteur) : la cohérence est donc vérifiable. */
const BP = Object.freeze({
  wide: 1000,   // tablette / paysage large : matrice et détail empilés
  narrow: 700,  // écran étroit : aucun contenu ne doit déborder horizontalement
  mobile: 620,  // téléphone : colonne unique fluide, cibles tactiles élargies
  short: 520,   // HAUTEUR : paysage court, le contenu défile dans son cadre
});

/* E075-05 — chaque rupture porte son libellé français et son intention : un
 * lecteur d'écran comme un lecteur occasionnel sait ce que le chiffre commande. */
const SCALE = Object.freeze([
  {
    key: 'wide',
    rule: `≤ ${BP.wide} px de large`,
    label: 'Tablette / paysage',
    detail: 'La matrice et le détail passent en colonne unique ; les cellules restent lisibles.',
  },
  {
    key: 'narrow',
    rule: `≤ ${BP.narrow} px de large`,
    label: 'Écran étroit',
    detail: 'Aucun panneau ne dépasse la largeur du viewport ; les filtres se répartissent en grille.',
  },
  {
    key: 'mobile',
    rule: `≤ ${BP.mobile} px de large`,
    label: 'Téléphone',
    detail: 'Grille fluide en 390×844, légende en une colonne, cibles tactiles portées à 44 px.',
  },
  {
    key: 'short',
    rule: `≤ ${BP.short} px de haut`,
    label: 'Paysage court',
    detail: 'Critère de hauteur, indépendant de la largeur : la légende défile dans son propre cadre.',
  },
]);

const SCALE_TEXT = SCALE.map((item) => `${item.label} ${item.rule}`).join(' · ');

/* E075-01/03/04 — le CSS est construit depuis BP : changer une rupture dans
 * l'échelle ci-dessus met automatiquement la feuille, la détection et le texte
 * d'accord. Toutes les règles sont préfixées par `.points-e075`, classe posée
 * sur `.points-layout` : aucune fuite hors de la vue Points. */
const CSS = `
/* E075-01 — plancher anti-débordement, cohérent avec E071 et E079. */
.points-e075 { min-width: 0; max-width: 100%; }
.points-e075 .points-matrix,
.points-e075 .points-grid,
.points-e075 .points-detail,
.points-e075 .points-filters,
.points-e075 .points-nav { min-width: 0; max-width: 100%; }

/* E075-02 — légende statique, indexable dans <dt>/<dd>/<p>, hors région live. */
.points-e075-doc {
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--line, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f);
  border-radius: 8px;
  background: rgba(230, 185, 111, .05);
  color: var(--ink-soft, #c9ced6);
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.points-e075-doc-title {
  margin: 0 0 6px;
  font-family: var(--serif, Georgia, serif);
  font-size: 13px;
  color: var(--gold-bright, #f0d49a);
}
.points-e075-doc-intro,
.points-e075-current { margin: 0 0 6px; }
.points-e075-doc-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 4px 12px;
  margin: 0 0 8px;
}
.points-e075-doc-list dt { color: var(--gold, #e6b96f); font-weight: 600; }
.points-e075-doc-list dd { margin: 0 0 4px; }
.points-e075-current {
  padding-top: 6px;
  border-top: 1px dashed var(--line, #5b5b5b);
}
.points-e075-current strong { color: var(--gold-bright, #f0d49a); }

/* E075-07 — l'état court est aussi dit par le texte ; le liseret ne fait que
 * redoubler l'information, jamais la porter seul. */
.points-e075[data-points-e075-short="1"] .points-e075-current {
  border-left: 3px solid var(--gold, #e6b96f);
  padding-left: 8px;
}

/* E075-03 — tablette / paysage : la légende passe sur deux colonnes. */
@media (max-width: ${BP.wide}px) {
  .points-e075-doc-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
/* E075-03 — écran étroit : une seule colonne souple, aucun débordement. */
@media (max-width: ${BP.narrow}px) {
  .points-e075-doc { padding: 8px 10px; }
  .points-e075-doc-list { grid-template-columns: minmax(0, 1fr); }
}
/* E075-03 — téléphone : aucune piste fixe, cibles tactiles ≥ 44 px. */
@media (max-width: ${BP.mobile}px) {
  .points-e075-doc { max-width: 100%; padding: 8px; }
  .points-e075-doc-list dt,
  .points-e075-doc-list dd { overflow-wrap: anywhere; }
  .points-e075 .points-grid-row { min-width: 0; }
  .points-e075 .points-filters select,
  .points-e075 .points-filters button,
  .points-e075 .points-nav button,
  .points-e075 .points-grid-row > button { min-height: 44px; }
}
/* E075-04 — rupture de HAUTEUR : la légende défile en interne, jamais la page. */
@media (max-height: ${BP.short}px) {
  .points-e075-doc { max-height: 34vh; overflow-y: auto; }
}
/* E075-09 — plancher de cible et focus visible, même hors mobile. */
.points-e075 .points-filters select,
.points-e075 .points-filters button,
.points-e075 .points-nav button,
.points-e075 .points-grid-row > button { min-height: 36px; }
.points-e075 .points-filters select:focus-visible,
.points-e075 .points-filters button:focus-visible,
.points-e075 .points-nav button:focus-visible,
.points-e075 .points-grid-row > button:focus-visible {
  outline: 2px solid var(--gold-bright, #f0d49a);
  outline-offset: 2px;
}
/* E075-09 — mouvement réduit : couplage JS (attribut) ET media query. */
.points-e075[data-points-e075-motion="reduce"] .points-e075-doc { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-e075 .points-e075-doc { transition: none; }
}
/* E075-09 — couleurs forcées : bordures et texte explicites, rien que par couleur. */
@media (forced-colors: active) {
  .points-e075-doc { border: 1px solid CanvasText; color: CanvasText; background: Canvas; }
  .points-e075-doc-list dt,
  .points-e075-doc-title,
  .points-e075-current strong { color: CanvasText; }
  .points-e075[data-points-e075-short="1"] .points-e075-current { border-left-color: Highlight; }
}
`;

let currentCtx = null;   // dernier ctx reçu, pour les écouteurs de rupture
let currentNode = null;  // #points-e075-current du rendu courant
let mediaLists = [];     // paires { list, handler } des écouteurs matchMedia
let checkCount = 0;      // compteur auditable de détections réelles
let lastSignature = '';  // signature anti-écriture redondante

/* E075-06 — requête sûre : matchMedia peut manquer ou lever en contexte de test. */
function mq(query) {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query) : null;
  } catch {
    return null;
  }
}

function viewportWidth() {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  return root && typeof root.clientWidth === 'number' ? root.clientWidth : 0;
}

function viewportHeight() {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  return root && typeof root.clientHeight === 'number' ? root.clientHeight : Number.POSITIVE_INFINITY;
}

/* E075-06 — chaque média est évalué par matchMedia, avec repli déterministe sur
 * les dimensions du document ; aucun timer, aucun rAF, aucune mesure écrite. */
function matches(query, fallback) {
  const list = mq(query);
  return list ? !!list.matches : !!fallback();
}

function setAttr(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E075-06/07 — détection du segment courant. La priorité va du plus étroit au
 * plus large ; la hauteur est un drapeau indépendant qui se combine au libellé. */
function detect() {
  const isMobile = matches(`(max-width: ${BP.mobile}px)`, () => viewportWidth() <= BP.mobile);
  const isNarrow = matches(`(max-width: ${BP.narrow}px)`, () => viewportWidth() <= BP.narrow);
  const isWide = matches(`(max-width: ${BP.wide}px)`, () => viewportWidth() <= BP.wide);
  const isShort = matches(`(max-height: ${BP.short}px)`, () => viewportHeight() <= BP.short);
  const key = isMobile ? 'mobile' : isNarrow ? 'narrow' : isWide ? 'wide' : 'desktop';
  const item = SCALE.find((entry) => entry.key === key);
  const label = item ? item.label : 'Grand écran';
  return { key, label, isShort };
}

function refresh() {
  const layout = currentCtx && currentCtx.layout;
  if (!layout || !layout.isConnected) return;

  checkCount += 1;
  const state = detect();
  const signature = `${state.key}|${state.isShort ? '1' : '0'}`;
  if (signature === lastSignature) {
    setAttr(layout, 'data-points-e075-checks', String(checkCount));
    return;
  }
  lastSignature = signature;

  /* E075-07 — signaux auditables, hors de toute région live (E041). */
  setAttr(layout, 'data-points-e075-segment', state.key);
  setAttr(layout, 'data-points-e075-short', state.isShort ? '1' : '0');
  setAttr(layout, 'data-points-e075-checks', String(checkCount));

  if (currentNode && currentNode.isConnected) {
    const item = SCALE.find((entry) => entry.key === state.key);
    const shownLabel = state.isShort ? `${state.label} · paysage court` : state.label;
    const rule = item ? ` (${item.rule})` : '';
    const tail = state.isShort
      ? ` : la légende défile dans son cadre (≤ ${BP.short} px de haut).`
      : ' : hauteur normale, aucun repli de paysage court.';
    const text = `Segment courant : ${shownLabel}${rule}${tail}`;
    if (currentNode.textContent !== text) {
      const strong = currentCtx.el('strong', '', shownLabel);
      currentNode.replaceChildren(strong, document.createTextNode(`${rule}${tail}`));
    }
  }
}

/* E075-06 — écouteurs event-driven, un seul jeu à la fois : on retire les
 * précédents avant d'en installer de nouveaux (aucune fuite entre rendus). */
function detach() {
  mediaLists.forEach(({ list, handler }) => {
    try {
      if (typeof list.removeEventListener === 'function') list.removeEventListener('change', handler);
      else if (typeof list.removeListener === 'function') list.removeListener(handler);
    } catch {
      /* repli : le prochain install() repart d'une liste vide */
    }
  });
  mediaLists = [];
}

function attach() {
  detach();
  const queries = [
    `(max-width: ${BP.wide}px)`,
    `(max-width: ${BP.narrow}px)`,
    `(max-width: ${BP.mobile}px)`,
    `(max-height: ${BP.short}px)`,
  ];
  queries.forEach((query) => {
    const list = mq(query);
    if (!list) return;
    const handler = () => refresh();
    try {
      if (typeof list.addEventListener === 'function') list.addEventListener('change', handler);
      else if (typeof list.addListener === 'function') list.addListener(handler);
      else return;
      mediaLists.push({ list, handler });
    } catch {
      /* la détection ponctuelle de install() reste disponible */
    }
  });
}

/* E075-02/08 — légende construite une seule fois par rendu, insérée après le
 * titre dans .points-matrix. Aucun nœud existant n'est retiré ni réécrit. */
function ensureDoc(ctx) {
  const layout = ctx.layout;
  const stale = document.getElementById(DOC_ID);
  if (stale && !layout.contains(stale)) stale.remove();

  const existing = layout.querySelector('#' + DOC_ID);
  if (existing && existing.isConnected) {
    currentNode = existing.querySelector('#' + CURRENT_ID);
    return;
  }
  if (existing) existing.remove();

  const doc = ctx.el('section', 'points-e075-doc');
  doc.id = DOC_ID;
  doc.setAttribute('aria-labelledby', DOC_TITLE_ID);

  const title = ctx.el('h3', 'points-e075-doc-title', 'Points de rupture documentés');
  title.id = DOC_TITLE_ID;
  doc.appendChild(title);

  doc.appendChild(ctx.el('p', 'points-e075-doc-intro',
    'Une seule échelle de points de rupture commande la feuille de style, la détection et cette légende : '
    + SCALE_TEXT + '. Les quatre seuils sont exprimés en pixels CSS, indépendants du zoom système.'
  ));

  const list = ctx.el('dl', 'points-e075-doc-list');
  SCALE.forEach((item) => {
    list.appendChild(ctx.el('dt', '', `${item.label} · ${item.rule}`));
    list.appendChild(ctx.el('dd', '', item.detail));
  });
  doc.appendChild(list);

  currentNode = ctx.el('p', 'points-e075-current', 'Segment courant : détection en cours.');
  currentNode.id = CURRENT_ID;
  doc.appendChild(currentNode);

  const matrix = layout.querySelector('.points-matrix');
  const titleNode = matrix ? matrix.querySelector('.points-title') : null;
  if (titleNode && titleNode.parentElement === matrix) matrix.insertBefore(doc, titleNode.nextSibling);
  else if (matrix) matrix.appendChild(doc);
  else layout.appendChild(doc);
}

/* E075-10 — installation idempotente : CSS unique, portée unique, légende
 * unique, un seul jeu d'écouteurs et un seul register pour la lentille. */
register('E075', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout
    || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  currentCtx = ctx;
  const layout = ctx.layout;

  ctx.css(CSS_ID, CSS);
  if (!layout.classList.contains(SCOPE)) layout.classList.add(SCOPE);

  setAttr(layout, 'data-points-e075', '1');
  setAttr(layout, 'data-points-e075-css', CSS_ID);
  setAttr(layout, 'data-points-e075-scope', SCOPE);
  setAttr(layout, 'data-points-e075-scale', SCALE_TEXT);
  setAttr(layout, MOTION_ATTR,
    typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? 'reduce' : 'normal');

  ensureDoc(ctx);

  /* E075-08 — miroirs d'état sur les nœuds réels, sans les remplacer. */
  const grid = layout.querySelector('.points-grid');
  if (grid) setAttr(grid, 'data-points-e075-grid', '1');
  const filters = layout.querySelector('.points-filters');
  if (filters) setAttr(filters, 'data-points-e075-fluid', '1');
  const detail = layout.querySelector('.points-detail');
  if (detail) setAttr(detail, 'data-points-e075-stack', '1');
  const nav = layout.querySelector('.points-nav');
  if (nav) setAttr(nav, 'data-points-e075-fit', '1');

  lastSignature = '';
  refresh();
  attach();
});
