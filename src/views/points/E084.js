import { register } from './registry.js';

/* Lentille POINTS E084 — domaine I : qualité & validation.
 *
 * Thème : feuille CSS unique et idempotente (ctx.css('points-e084', …)),
 * signal de présence explicite, zéro doublon après rendus successifs.
 * Rapport : UNIFIED_AUDIT/POINTS/views/E084.md — chantiers E084-01 à E084-10.
 * Fichier possédé : ce module uniquement ; aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, txt),
 * reducedMotion. Aucune dépendance vers le store, le routeur ou une autre
 * lentille : le greffon reste actif avec le ctx minimal de la vue Points.
 *
 * Invariants :
 * - UNE feuille style#points-e084 dans <head>, UN badge #points-e084-badge
 *   dans .points-matrix, UNE classe de portée .points-e084 sur .points-layout ;
 * - tous les identifiants ajoutés sont préfixés points-e084- ;
 * - non destructif : aucun nœud ni attribut appartenant à une autre lentille
 *   n'est retiré ; seul le doublon de nos propres ancres est élagué ;
 * - zéro console.*, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
 *   innerHTML, aucune donnée historique inventée ;
 * - idempotent : un second passage sur le même DOM réutilise les mêmes nœuds
 *   et n'écrit que si la signature calculée change.
 */

const CSS_ID = 'points-e084';
const SCOPE = 'points-e084';
const SIGNAL = 'data-points-e084';
const BADGE_ID = 'points-e084-badge';
const AUDIT = 'data-points-e084-audit';
const AUDIT_SHEETS = 'data-points-e084-sheets';
const AUDIT_BADGES = 'data-points-e084-badges';

/* Toute règle est ancrée sur la portée .points-e084 ou un id préfixé. Aucune
 * ressource externe, aucune animation, lecture aisée en 390×844 et repli
 * forced-colors : la feuille reste valide même si elle est réinjectée. */
const CSS = `
  .points-e084 { --points-e084-accent: var(--gold-bright, #e9c98f); }
  #${BADGE_ID} {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px;
    margin: 8px 0 10px; padding: 7px 10px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 8px;
    background: rgba(230, 185, 111, .06); color: var(--ink-soft, #d8d8d8);
    font-size: 10px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  #${BADGE_ID} .points-e084-tag {
    color: var(--points-e084-accent); font-weight: 700; letter-spacing: .03em;
  }
  #${BADGE_ID} .points-e084-digest { color: var(--muted-2, #9a9a9a); }
  @media (max-width: 620px) {
    #${BADGE_ID} { flex-direction: column; align-items: flex-start; padding: 6px 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${BADGE_ID} { transition: none; }
  }
  @media (forced-colors: active) {
    #${BADGE_ID} { background: Canvas; color: CanvasText; border-color: CanvasText; }
    #${BADGE_ID} .points-e084-tag { color: Highlight; }
  }
`;

/* Requêtes ciblées : aucun sélecteur générique ne peut ramasser un nœud
 * appartenant à une autre lentille. */
function sheetList() {
  return Array.prototype.slice.call(document.querySelectorAll('style#' + CSS_ID));
}

function badgeList() {
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + BADGE_ID + '"]'));
}

/* E084-02 — cssOnce (registry.js:13-19) refuse déjà une seconde injection.
 * Ce garde-fou élague en plus une copie surnuméraire déjà présente (ancienne
 * version, copie artisanale) : un seul style survit, de préférence dans <head>. */
function ensureSingleSheet() {
  const sheets = sheetList();
  const head = sheets.filter((sheet) => sheet.parentNode === document.head)[0] || sheets[0] || null;
  let kept = false;
  sheets.forEach((sheet) => {
    if (sheet === head && !kept) {
      kept = true;
      return;
    }
    if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
  });
  return head;
}

/* E084-05/06/08 — un seul badge, réutilisé par identifiant. Tout doublon ou
 * nœud mal parenté portant NOTRE id est retiré ; aucun autre nœud n'est touché.
 * Le badge vit dans .points-matrix, jamais en enfant direct de .points-layout
 * (où _diagnostics.js:69-75 l'expédierait dans le tiroir). */
function ensureBadge(ctx, matrix) {
  const badges = badgeList();
  let badge = null;
  badges.forEach((node) => {
    if (!badge && node.isConnected && node.parentElement === matrix) {
      badge = node;
      return;
    }
    if (node.parentNode) node.parentNode.removeChild(node);
  });
  if (!badge) {
    badge = ctx.el('p', 'points-e084-badge');
    badge.id = BADGE_ID;
    const title = matrix.querySelector('.points-title');
    matrix.insertBefore(badge, title ? title.nextSibling : matrix.firstChild);
  }
  return badge;
}

/* Toutes les grandeurs sont recomputées depuis le DOM rendu par points.js :
 * ères = lignes hors en-tête, domaines = colonnes de l'en-tête moins « Ère »,
 * cellules = boutons .points-cell. Aucun total littéral, aucun millésime. */
function matrixCounts(root) {
  const grid = root.querySelector('.points-grid');
  if (!grid || typeof grid.querySelectorAll !== 'function') {
    return { eras: 0, domains: 0, cells: 0 };
  }
  const head = grid.querySelector('.points-grid-row.is-head');
  return {
    eras: grid.querySelectorAll('.points-grid-row:not(.is-head)').length,
    domains: head ? Math.max(0, head.children.length - 1) : 0,
    cells: grid.querySelectorAll('.points-cell').length,
  };
}

function plural(count, one, many) {
  return `${count} ${count > 1 ? many : one}`;
}

/* E084-07 — signature entièrement dérivée du DOM et des compteurs réels. Les
 * nombres de feuilles et de badges sont affichés tels qu'observés : un doublon
 * devient immédiatement falsifiable dans le texte lui-même. */
function digestOf(counts, sheets, badges) {
  return `Portée active · ${plural(counts.eras, 'ère', 'ères')} × ${plural(counts.domains, 'domaine', 'domaines')} · `
    + `${plural(counts.cells, 'cellule', 'cellules')} · ${plural(sheets, 'feuille', 'feuilles')}, `
    + `${plural(badges, 'badge', 'badges')}.`;
}

/* E084-07 — écriture conditionnelle : à DOM identique la signature est stable,
 * donc replaceChildren n'est jamais appelé deux fois de suite. */
function writeBadge(ctx, badge, digest) {
  if (badge.dataset.pointsE084Digest === digest) return;
  badge.dataset.pointsE084Digest = digest;
  const tag = ctx.el('span', 'points-e084-tag', 'E084 · feuille unique');
  const detail = ctx.el('span', 'points-e084-digest', digest);
  badge.replaceChildren(tag, detail);
}

function apply(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  const layout = ctx.layout && typeof ctx.layout.querySelector === 'function'
    ? ctx.layout
    : (ctx.stage && typeof ctx.stage.querySelector === 'function' ? ctx.stage : null);
  if (!layout) return;
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix || typeof matrix.insertBefore !== 'function') return;

  /* E084-01 — injection unique par identifiant : cssOnce ne crée qu'une
   * feuille même si apply() est rejoué sur le même document. */
  ctx.css(CSS_ID, CSS);
  if (!document.getElementById(CSS_ID)) return;

  const rawSheets = sheetList().length;
  const sheet = ensureSingleSheet();
  const rawBadges = badgeList().length;
  const badge = ensureBadge(ctx, matrix);

  /* E084-03/04 — signaux de présence et de portée, posés sans écraser quoi
   * que ce soit d'étranger : la classe et les attributs sont les nôtres. */
  layout.classList.add(SCOPE);
  layout.setAttribute(SIGNAL, 'ready');

  const counts = matrixCounts(layout);
  const sheetCount = sheetList().length;
  const badgeCount = badgeList().length;
  writeBadge(ctx, badge, digestOf(counts, sheetCount, badgeCount));

  /* E084-09 — signaux auditables par l'agent maître : tout est DÉDUIT du DOM,
   * jamais incrémenté, donc stable d'un rendu à l'autre à DOM identique.
   * rawSheets/rawBadges consignent les doublons trouvés avant élagage. */
  layout.setAttribute(AUDIT,
    `sheets=${sheetCount};badges=${badgeCount};scope=1;rawSheets=${rawSheets};rawBadges=${rawBadges}`);
  layout.setAttribute(AUDIT_SHEETS, String(sheetCount));
  layout.setAttribute(AUDIT_BADGES, String(badgeCount));
  if (sheet) sheet.setAttribute('data-points-e084-sheet', '1');
  badge.setAttribute('data-points-e084-badge', '1');

  /* E084-10 — aucune dernière écriture : ni compteur, ni écouteur, ni timer.
   * Le try/catch du register neutralise une structure inattendue sans bruit. */
}

register('E084', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
