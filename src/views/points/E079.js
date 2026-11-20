import { register } from './registry.js';

/* Lentille E079 — Responsive & mobile : écran étroit sans débordement horizontal
 * (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E079.md — chantiers E079-01 à E079-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E079 ajoute une portée CSS et une
 * seule note de lecture, et s'appuie sur le DOM déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Aucune dépendance vers le store, les filtres, le
 * détail ni les autres lentilles : la mise en page reste sûre avec un ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, une seule note, un seul ResizeObserver ;
 * - aucune écriture de taille, aucun timer, aucun rAF, aucun écouteur global ;
 * - zéro réseau, zéro aléa, aucune réinterprétation de balisage, aucune
 *   journalisation, aucune donnée historique inventée.
 */

const CSS_ID = 'points-e079';
const SCOPE = 'points-e079';
const NOTE_ID = 'points-e079-note';
const NOTE_CLASS = 'points-e079-note';
const NARROW_QUERY = '(max-width: 700px)';
const NARROW_PX = 700;

/* Note statique, écrite dans le DOM par ctx.el : elle reste lisible et
 * indexable même si le JavaScript de mesure échoue. Le suffixe de diagnostic
 * ajouté plus bas ne fait que compléter cette phrase de base. */
const NOTE_BASE = 'Affichage adaptatif : sous 700 px, matrice et détail s’empilent, '
  + 'les cellules et les filtres se resserrent, et la grille défile dans son cadre — '
  + 'la page ne doit pas déborder horizontalement.';

/* Toutes les règles sont préfixées par `.points-e079`, classe posée sur
 * `.points-layout` : aucune fuite hors de la vue Points. Les sélecteurs ciblent
 * le DOM réel de points.js (`.points-matrix`, `.points-title`, `.points-grid`,
 * `.points-grid-row`, `.points-filters`, `.points-detail`, `.points-nav`).
 * `overflow-x: clip` (E079-02) est volontaire : contrairement à `hidden`, il ne
 * crée pas de conteneur de défilement et préserve les en-têtes épinglés de E001. */
const CSS = `
/* E079-01 : portée unique, ancrée sur .points-layout. */
.points-e079,
.points-e079 *,
.points-e079 *::before,
.points-e079 *::after { box-sizing: border-box; }
.points-e079 {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* E079-02 : barrière anti-débordement ; le défilement interne de .points-grid
   * (overflow-x:auto de la vue) reste intact et utilisable au doigt. */
  overflow-x: clip;
}
@supports not (overflow-x: clip) {
  .points-e079 { overflow-x: hidden; }
}
.points-e079 > * { min-width: 0; max-width: 100%; }

/* E079-03 : colonne unique et hauteur adaptative sur écran étroit. */
@media (max-width: 700px) {
  .points-e079 {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    height: auto;
    min-height: 100%;
  }
  .points-e079 .points-matrix { padding: 14px 12px 20px; overflow-x: hidden; }
  .points-e079 .points-detail {
    padding: 16px 12px 20px;
    border-left: 0;
    border-top: 1px solid var(--line, #5b5b5b);
    overflow-x: hidden;
  }
}

/* E079-04 : la grille défile dans son cadre, jamais la page. */
.points-e079 .points-grid {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
@media (max-width: 700px) {
  .points-e079 .points-grid-row {
    min-width: 0;
    grid-template-columns: minmax(88px, 1.2fr) repeat(auto-fit, minmax(42px, 1fr));
  }
}

/* E079-05 : cibles tactiles >= 44 px et gestes propres sur écran étroit. */
@media (max-width: 700px) {
  .points-e079 .points-grid-row > span,
  .points-e079 .points-grid-row > button,
  .points-e079 .points-filters select,
  .points-e079 .points-filters button,
  .points-e079 .points-nav button {
    min-height: 44px;
    touch-action: manipulation;
  }
  .points-e079 .points-grid-row > span,
  .points-e079 .points-grid-row > button { padding: 6px 4px; }
}

/* E079-06 : filtres fluides — aucun select ne force la largeur du conteneur. */
.points-e079 .points-filters { min-width: 0; max-width: 100%; }
.points-e079 .points-filters select,
.points-e079 .points-filters button { min-width: 0; max-width: 100%; }
@media (max-width: 700px) {
  .points-e079 .points-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .points-e079 .points-filters button { grid-column: 1 / -1; }
}

/* E079-07 : textes longs et pastilles du détail retournés à la ligne. */
.points-e079 .points-point-title,
.points-e079 .points-point-text,
.points-e079 .points-sources,
.points-e079 .points-justification { overflow-wrap: anywhere; word-break: break-word; }
.points-e079 .points-meta,
.points-e079 .points-families { min-width: 0; flex-wrap: wrap; }
.points-e079 .points-meta span,
.points-e079 .points-families span { max-width: 100%; overflow-wrap: anywhere; }

/* E079-08 : titre adaptatif et note de lecture statique, hors région live. */
.points-e079 .points-title {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: clamp(20px, 5vw, 28px);
}
.points-e079-note {
  margin: 0 0 12px;
  color: var(--muted-2, #9a9a9a);
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

/* E079-09 : mouvement réduit couplé JS (attribut) ET media query ; aucun rAF. */
.points-e079[data-points-e079-motion="reduce"] .points-grid { scroll-behavior: auto; }
@media (prefers-reduced-motion: reduce) {
  .points-e079, .points-e079 * {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
`;

let observer = null;   // unique ResizeObserver, déconnecté puis reconnecté
let checkCount = 0;    // compteur auditable de mesures réelles

function narrowNow(root) {
  try { return window.matchMedia(NARROW_QUERY).matches; }
  catch {
    const width = root && typeof root.clientWidth === 'number' ? root.clientWidth : 0;
    return width > 0 && width <= NARROW_PX;
  }
}

/* E079-10 : mesure réelle du débordement horizontal du document, sans écrire
 * de taille (donc sans boucle de mise en page). Le résultat est exposé en
 * attributs auditables et dans la note, jamais dans une région live. */
function measureOverflow(ctx) {
  const layout = ctx && ctx.layout;
  if (!layout || !layout.isConnected) return;
  const root = document.documentElement;
  const width = root && typeof root.clientWidth === 'number' ? root.clientWidth : 0;
  const scrollWidth = root && typeof root.scrollWidth === 'number' ? root.scrollWidth : 0;
  const overflowPx = width > 0 ? Math.max(0, scrollWidth - width) : 0;

  layout.setAttribute('data-points-e079-narrow', narrowNow(root) ? '1' : '0');
  layout.setAttribute('data-points-e079-overflow', overflowPx > 0 ? 'present' : 'none');
  layout.setAttribute('data-points-e079-overflow-px', String(overflowPx));
  checkCount += 1;
  layout.setAttribute('data-points-e079-checks', String(checkCount));

  const note = document.getElementById(NOTE_ID);
  if (note && note.isConnected) {
    const suffix = overflowPx > 0
      ? ` Diagnostic : débordement horizontal résiduel de ${overflowPx} px.`
      : ' Diagnostic : aucun débordement horizontal détecté.';
    note.textContent = `${NOTE_BASE} ${suffix}`;
  }
}

function observe(ctx) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  observer = null;
  if (typeof ResizeObserver === 'undefined' || !ctx.layout) return;
  try {
    observer = new ResizeObserver(() => measureOverflow(ctx));
    observer.observe(ctx.layout);
  } catch {
    observer = null; /* la mesure ponctuelle de install() reste disponible */
  }
}

function ensureNote(ctx) {
  const stale = document.getElementById(NOTE_ID);
  if (stale && !ctx.layout.contains(stale)) stale.remove();
  if (document.getElementById(NOTE_ID)) return;

  const note = ctx.el('p', NOTE_CLASS, NOTE_BASE);
  note.id = NOTE_ID;
  const title = ctx.layout.querySelector('.points-title');
  const matrix = ctx.layout.querySelector('.points-matrix');
  if (title && title.parentElement) title.parentElement.insertBefore(note, title.nextSibling);
  else if (matrix) matrix.appendChild(note);
  else ctx.layout.appendChild(note);
}

register('E079', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout
    || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;

  /* E079-01 : une feuille injectée une seule fois, une seule portée. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.setAttribute('data-points-e079', '1');
  layout.setAttribute('data-points-e079-css', CSS_ID);
  layout.setAttribute('data-points-e079-scope', SCOPE);

  /* E079-09 : couplage explicite à la préférence de mouvement réduit. */
  layout.setAttribute('data-points-e079-motion',
    typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? 'reduce' : 'normal');

  /* E079-08 : une seule note par rendu ; le garde anti-doublon supporte un
   * second passage sur le même DOM et un rendu neuf de la coque. */
  ensureNote(ctx);

  /* E079-04/06/07 : miroirs d'état sur les nœuds réels, sans les remplacer. */
  const grid = layout.querySelector('.points-grid');
  if (grid) grid.setAttribute('data-points-e079-scroll', '1');
  const filters = layout.querySelector('.points-filters');
  if (filters) filters.setAttribute('data-points-e079-fluid', '1');
  const detail = layout.querySelector('.points-detail');
  if (detail) detail.setAttribute('data-points-e079-wrap', '1');

  measureOverflow(ctx);
  observe(ctx);
});
