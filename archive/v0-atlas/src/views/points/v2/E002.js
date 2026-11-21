import { register } from './registry.js';

/* Lentille POINTS V2 E002 — Cellules has-points vs vides (jamais la couleur seule).
 *
 * Seconde passe, fichier possédé : ce module uniquement. Aucun fichier de la
 * passe 1 ni aucun fichier partagé (vue, coque, styles.css, registry.js,
 * index.js) n'est édité.
 *
 * Contrat exploité intégralement :
 * - ctx.viewId  → identifiant de vue reporté sur les ancres et la coque ;
 * - ctx.stage   → racine de repli et marqueur non destructif ;
 * - ctx.layout  → racine de requête et classe de portée .points-v2-e002 ;
 * - ctx.reducedMotion() → classe défensive .points-v2-e002-still.
 * - ctx.css('points-v2-e002', CSS) → UNE seule feuille, toute préfixée ;
 * - ctx.el(...) → tout le DOM statique, jamais innerHTML.
 *
 * Invariants V2 :
 * - un seul greffon register('E002', …), une seule feuille CSS ;
 * - préfixe .points-v2-e002 sur TOUTES les règles, y compris dans les @media ;
 * - ids uniques points-v2-e002-* avec garde anti-doublon (getElementById) ;
 * - attributs et classes V2 distincts de la passe 1 (data-e002-v2-*) ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur global,
 *   zéro console.*, zéro innerHTML.
 * - la distinction remplie/vide repose sur la FORME (glyphe + bordure) et le
 *   TEXTE, jamais sur la couleur seule.
 */

const CSS_ID = 'points-v2-e002';
const SCOPE = 'points-v2-e002';

const ID = {
  legend: 'points-v2-e002-legend',
  coverage: 'points-v2-e002-coverage',
};

/* Feuille unique. Chaque sélecteur COMMENCE par .points-v2-e002, y compris à
 * l'intérieur des blocs @media. Le losange plein ◇ / vide ◆ et le trait plein
 * vs pointillé codent l'état SANS couleur : la teinte existante devient
 * redondante, jamais nécessaire. Le ::after évite toute collision avec le
 * ::before éventuel d'une autre lentille. */
const CSS = `
  .points-v2-e002 .points-cell[data-e002-v2-state="filled"]::after{content:"\\25C6\\00A0";font-style:normal}
  .points-v2-e002 .points-cell[data-e002-v2-state="empty"]::after{content:"\\25C7\\00A0";font-style:normal}
  .points-v2-e002 .points-cell[data-e002-v2-state="filled"]{border-style:solid !important}
  .points-v2-e002 .points-cell[data-e002-v2-state="empty"]{border-style:dashed !important}
  .points-v2-e002 .points-cell:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  .points-v2-e002 .points-v2-e002-legend{margin:6px 0 4px;color:var(--ink-soft);font-size:10px;line-height:1.5}
  .points-v2-e002 .points-v2-e002-legend .points-v2-e002-key{color:var(--gold-bright);font-weight:700}
  .points-v2-e002 .points-v2-e002-coverage{margin:0 0 10px;color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}
  .points-v2-e002.points-v2-e002-still .points-cell::after{transition:none}
  @media (forced-colors:active){
    .points-v2-e002 .points-cell[data-e002-v2-state="filled"]{border:2px solid CanvasText !important}
    .points-v2-e002 .points-cell[data-e002-v2-state="empty"]{border:1px dashed CanvasText !important}
  }
  @media (prefers-contrast:more){
    .points-v2-e002 .points-cell[data-e002-v2-state="filled"]{border-width:2px !important}
  }
  @media (prefers-reduced-motion:reduce){
    .points-v2-e002 .points-cell::after{transition:none}
  }
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function childrenOf(node) {
  return node && node.children ? Array.prototype.slice.call(node.children) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* Place un nœud dans la matrice juste avant la grille, sans le dupliquer. */
function place(matrix, node, before) {
  if (!matrix || typeof matrix.insertBefore !== 'function') return;
  if (node.parentNode !== matrix || (before && node.nextSibling !== before)) {
    matrix.insertBefore(node, before || null);
  }
}

/* Récupère ou crée une ancre unique, puis la (re)positionne. Garde anti-doublon. */
function ensureAnchor(doc, id, className, matrix, before, ctx) {
  let node = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
  if (!node) {
    node = ctx.el('p', className);
    node.id = id;
  }
  place(matrix, node, before);
  return node;
}

/* Étiquette accessible : l'état est énoncé en premier, le reste est dérivé. */
function ariaLabel(state, count, era, domain) {
  const where = `ère ${era || 'inconnue'}, domaine ${domain || 'inconnu'}`;
  if (state === 'filled') {
    const n = /^\d+$/.test(count) ? Number(count) : 1;
    return `Case remplie : ${count} point${plural(n, '', 's')} — ${where}.`;
  }
  return `Case vide : aucun point — ${where}.`;
}

function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = ctx.layout;
  const stage = ctx.stage;
  /* ctx.stage sert de racine de repli si la coque a détaché le layout. */
  const root = (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false)
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  const matrix = root.querySelector('.points-matrix');
  const grid = matrix && typeof matrix.querySelector === 'function'
    ? matrix.querySelector('.points-grid') : null;
  if (!matrix || !grid || typeof matrix.insertBefore !== 'function') return;

  const doc = (layout && layout.ownerDocument)
    || (stage && stage.ownerDocument)
    || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.getElementById !== 'function') return;

  /* ctx.viewId : identifiant de vue reporté, sans inventer de valeur. */
  const viewId = typeof ctx.viewId === 'string' && ctx.viewId ? ctx.viewId : 'pointsv2';

  /* E002-10 — portée unique, ctx.stage marqué, ctx.reducedMotion consultée,
   * puis UNE seule feuille injectée (cssOnce garantit l'idempotence). */
  if (layout && layout.classList && typeof layout.classList.add === 'function') {
    layout.classList.add(SCOPE);
  }
  const still = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (layout && layout.classList && typeof layout.classList.toggle === 'function') {
    layout.classList.toggle(`${SCOPE}-still`, still);
  }
  put(stage, 'data-points-v2-e002', viewId);
  ctx.css(CSS_ID, CSS);

  /* E002-07 preparation — domaines et ères lus dans le DOM réel de points.js. */
  const head = grid.querySelector('.points-grid-row.is-head');
  const domains = childrenOf(head).slice(1).map(txt);
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');

  /* E002-06 — compteurs initialisés à zéro,aucun chiffre littéral. */
  let filled = 0;
  let empty = 0;

  rows.forEach((row) => {
    const era = txt(row.querySelector('.points-era')) || txt(childrenOf(row)[0]);
    const cells = nodes(row, '.points-cell');

    cells.forEach((cell, index) => {
      const domain = domains[index] || '';
      const state = cell.classList && cell.classList.contains('has-points') ? 'filled' : 'empty';
      const count = txt(cell);

      /* E002-01 — signal binaire dérivé de la classe réelle, ancré dans un
       * attribut V2 distinct de la passe 1. La classe d'origine est intacte. */
      if (cell.dataset) cell.dataset.e002V2State = state;
      /* E002-06 — incrément pour chaque cellule réellement parcourue. */
      if (state === 'filled') filled += 1;
      else empty += 1;

      /* E002-03 — étiquette énonçant l'état en premier, reconstruite à chaque
       * rendu (jamais accumulée) pour rester idempotente. */
      put(cell, 'aria-label', ariaLabel(state, count, era, domain));

      /* E002-08 — titre d'origine préservé ; préfixe ajouté une seule fois.
       * Le garde-fou V2 et le contrôle d'un préfixe déjà présent (passe 1)
       * empêchent tout empilement « Remplie · Remplie · … ». */
      if (cell.dataset && cell.dataset.e002V2Titled !== '1') {
        const base = cell.getAttribute('title') || '';
        const word = state === 'filled' ? 'Remplie' : 'Vide';
        if (!/^(Remplie|Vide)\b/i.test(base)) {
          put(cell, 'title', base ? `${word} · ${base}` : word);
        }
        cell.dataset.e002V2Titled = '1';
      }
    });
  });

  /* E002-06 — total dérivé du décompte observé. */
  const total = filled + empty;

  /* E002-05 — légende construite par ctx.el et placée avant la grille, dans
   * .points-matrix seulement. Le nœud existant est réutilisé (anti-doublon). */
  const legend = ensureAnchor(doc, ID.legend, 'points-v2-e002-legend', matrix, grid, ctx);
  put(legend, 'data-view-id', viewId);
  legend.replaceChildren(
    ctx.el('span', '', 'Lecture V2 de la matrice — '),
    ctx.el('strong', 'points-v2-e002-key', '◆ case remplie'),
    ctx.el('span', '', ' (au moins un point validé) · '),
    ctx.el('strong', 'points-v2-e002-key', '◇ case vide'),
    ctx.el('span', '', ' (aucun point) : la forme et le trait de bordure distinguent les cases, jamais la couleur.')
  );
  place(matrix, legend, grid);

  /* E002-04 — récapitulatif chiffré en région live unique, alimenté une seule
   * fois par rendu, avec repli si la matrice est vide. */
  const coverage = ensureAnchor(doc, ID.coverage, 'points-v2-e002-coverage', matrix, grid, ctx);
  put(coverage, 'data-view-id', viewId);
  put(coverage, 'role', 'status');
  put(coverage, 'aria-live', 'polite');
  coverage.textContent = total
    ? `${filled} case${plural(filled, '', 's')} remplie${plural(filled, '', 's')} · `
      + `${empty} case${plural(empty, '', 's')} vide${plural(empty, '', 's')} · ${total} cellules au total.`
    : 'Aucune cellule dans la matrice.';
  place(matrix, coverage, grid);

  /* E002-07 — fusion additive de l'aria-describedby : toute relation posée
   * par la passe 1 ou une autre lentille est conservée, puis dédupliquée. */
  const existing = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const refs = [ID.legend, ID.coverage].filter((id) => doc.getElementById(id));
  const merged = Array.from(new Set(existing.concat(refs))).join(' ');
  if (merged) put(grid, 'aria-describedby', merged);

  /* E002-02 / E002-09 — la forme est entièrement portée par la feuille
   * préfixée (::after + bordure, @media forced-colors / prefers-contrast /
   * prefers-reduced-motion). Aucun timer, aucune rAF, aucune animation propre
   * à la lentille : ctx.reducedMotion() ne sert qu'à poser une classe
   * défensive. Le marquage de ctx.stage et l'usage de ctx.viewId sont faits
   * plus haut ; aucune information n'est confiée à la seule couleur. */
  void still;
}

register('E002', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
