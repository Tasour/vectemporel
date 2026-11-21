import { register } from './registry.js';

/* Lentille POINTS E092 — Pédagogie & narration : qu'est-ce qu'un point d'histoire ?
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E092.md — chantiers E092-01 à E092-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et POINT_METHODOLOGY.md ne sont ni édités ni doublés : la lentille
 * ajoute UN panneau pédagogique local, dérive chaque valeur affichée du DOM déjà
 * rendu, et ne modifie aucun nœud existant hors attributs de signalement.
 *
 * Source doctrinale : POINT_METHODOLOGY.md v1.0 (définition opératoire §1,
 * huit familles §2, règles d'intégrité §3, couverture §4, hiérarchie §5).
 * Le texte doctrinal est cité (attribué), jamais réécrit sous forme de donnée.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail interne : le guide reste
 * lisible avec un ctx minimal et une structure DOM partielle.
 *
 * Invariants :
 * - un seul CSS (ctx.css('points-e092', …)), un seul panneau par rendu ;
 * - tous les identifiants sont préfixés `points-e092-` ;
 * - zéro écouteur global, zéro réseau, zéro aléa, zéro timer, zéro rAF,
 *   aucune réinterprétation de balisage, aucun usage du journal global ;
 * - non destructif : selects, cellules, boutons, fiche et navigation intacts ;
 * - idempotent : le panneau est réutilisé par identifiant et reconstruit à
 *   chaque rendu, sans doublon ni référence périmée.
 */

const CSS_ID = 'points-e092';
const GUIDE_ID = 'points-e092-guide';
const SUMMARY_ID = 'points-e092-summary';
const BODY_ID = 'points-e092-body';

const FAMILIES = [
  { key: 'evenement', label: 'Événement', question: 'Quand l’événement a-t-il eu lieu ?' },
  { key: 'processus', label: 'Processus', question: 'Quel changement lent ?' },
  { key: 'acteur', label: 'Acteur', question: 'Qui a agi ?' },
  { key: 'groupe', label: 'Groupe social', question: 'Quel collectif ?' },
  { key: 'lieu', label: 'Lieu', question: 'Où ?' },
  { key: 'institution', label: 'Institution', question: 'Quelle structure ?' },
  { key: 'normatif', label: 'Repère normatif', question: 'Quelle règle ?' },
  { key: 'memoire', label: 'Mémoire', question: 'Comment le passé est-il raconté ?' },
];

const INTEGRITY = [
  'Aucune date sans rôle : toute année doit dire ce qu’elle mesure.',
  'Aucune affirmation sans source : une référence ou une omission documentée.',
  'Aucun point invisible : un point absent de la matrice n’existe pas pour le système.',
  'Le disputé reste disputé : une controverse ne se résout pas par un silence.',
];

/* Feuille unique, entièrement portée par les ancres `points-e092-` : aucune
 * fuite hors du panneau, aucune ressource externe, cibles ≥ 36 px, focus
 * visible, repli mobile et mouvement réduit. */
const CSS = `
#${GUIDE_ID} {
  margin: 10px 0 12px; padding: 0 12px 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(230, 185, 111, .04); color: var(--ink-soft);
  font-size: 11px; line-height: 1.55; font-variant-numeric: tabular-nums;
}
#${SUMMARY_ID} {
  min-height: 36px; display: flex; align-items: center; gap: 8px;
  padding: 8px 2px; cursor: pointer; list-style: none;
  color: var(--gold-bright); font-family: var(--serif); font-size: 14px;
  transition: background-color .18s linear;
}
#${SUMMARY_ID}::-webkit-details-marker { display: none; }
#${SUMMARY_ID}::before { content: "\\25B8"; color: var(--gold); }
#${GUIDE_ID}[open] #${SUMMARY_ID}::before { content: "\\25BE"; }
#${SUMMARY_ID}:hover { background: rgba(230, 185, 111, .08); }
#${SUMMARY_ID}:focus-visible,
#${BODY_ID} a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }
.points-e092-hint { margin: 0; color: var(--muted-2); font-size: 10px; }
.points-e092-lead { margin: 6px 0 10px; color: var(--ink-soft); }
.points-e092-lead strong { color: var(--gold); }
#${BODY_ID} h3 {
  margin: 12px 0 4px; color: var(--gold); font-family: var(--serif);
  font-size: 12px; font-weight: 600;
}
#${BODY_ID} p { margin: 0 0 6px; }
#${BODY_ID} dl {
  margin: 6px 0; display: grid; grid-template-columns: 58px minmax(0, 1fr);
  gap: 2px 8px;
}
#${BODY_ID} dt { color: var(--gold); font-weight: 600; }
#${BODY_ID} dd { margin: 0; overflow-wrap: anywhere; }
#${BODY_ID} ol { margin: 6px 0; padding-left: 20px; }
#${BODY_ID} li { margin-bottom: 3px; }
#${BODY_ID} ul { margin: 6px 0; padding-left: 20px; }
.points-e092-tag {
  margin-left: 6px; padding: 0 5px; border: 1px solid var(--gold);
  border-radius: 4px; color: var(--gold-bright); font-size: 9px;
}
.points-e092-formula {
  display: block; margin: 4px 0; color: var(--gold-bright);
  font-family: var(--serif); font-size: 13px; letter-spacing: .02em;
}
.points-e092-value { color: var(--gold-bright); }
@media (max-width: 620px) {
  #${GUIDE_ID} { padding: 0 8px 10px; }
  #${BODY_ID} dl { grid-template-columns: 48px minmax(0, 1fr); }
}
.points-layout[data-e092-reduced="1"] #${SUMMARY_ID} { transition: none; }
@media (prefers-reduced-motion: reduce) {
  #${SUMMARY_ID} { transition: none; }
}
@media (forced-colors: active) {
  #${GUIDE_ID}, #${SUMMARY_ID} { background: Canvas; color: CanvasText; border-color: CanvasText; }
  .points-e092-tag { border-color: Highlight; color: Highlight; }
}
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function clip(text, limit) {
  const value = String(text || '');
  return value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
}

function norm(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/* E092-04 / -06 / -07 / -08 : lecture unique de la fiche courante, strictement
 * dérivée du DOM rendu par points.js (aucun accès au store ni au dataset). */
function readPoint(layout) {
  const detail = layout.querySelector('.points-detail');
  const meta = detail ? nodes(detail, '.points-meta > span') : [];
  const families = detail ? nodes(detail, '.points-families > span').map(txt).filter(Boolean) : [];
  return {
    subject: txt(detail && detail.querySelector('.points-point-title')),
    text: txt(detail && detail.querySelector('.points-point-text')),
    domain: txt(meta[0]),
    scale: txt(meta[1]),
    time: txt(meta[2]),
    confidence: txt(meta[3]),
    families,
    sources: txt(detail && detail.querySelector('.points-sources')),
    justification: txt(detail && detail.querySelector('.points-justification')),
  };
}

/* E092-09 : tous les compteurs de couverture sont recomputés depuis la grille :
 * ères, domaines d'en-tête, cellules, cellules renseignées et vides. */
function readMatrix(layout) {
  const grid = layout.querySelector('.points-grid');
  const header = grid && grid.querySelector('.points-grid-row.is-head');
  const domains = header ? nodes(header, 'span').map(txt).slice(1) : [];
  const rows = grid ? nodes(grid, '.points-grid-row:not(.is-head)') : [];
  const active = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  const cells = grid ? nodes(grid, '.points-cell') : [];
  const filled = cells.filter((cell) => cell.classList.contains('has-points')).length;
  return {
    eras: rows.length,
    domains: domains.length,
    cells: cells.length,
    filled,
    empty: cells.length - filled,
    activeEra: active ? txt(active.querySelector('.points-era')) : '',
  };
}

function valueOr(value, fallback) {
  return value ? String(value) : fallback;
}

function addField(ctx, dl, symbol, label, value) {
  dl.appendChild(ctx.el('dt', '', `${symbol} — ${label}`));
  dl.appendChild(ctx.el('dd', '', value));
}

function heading(ctx, body, text) {
  body.appendChild(ctx.el('h3', '', text));
}

/* E092-03 / E092-04 : la forme minimale est affichée puis cartographiée sur la
 * fiche réelle. Les champs non présents dans le DOM sont nommés comme tels,
 * jamais devinés ; R et O sont illustrés par un extrait du texte affiché. */
function buildFields(ctx, body, point) {
  heading(ctx, body, 'La forme minimale d’un point');
  body.appendChild(ctx.el('span', 'points-e092-formula', 'P = (S, R, O, T, E, D, Src, C)'));
  body.appendChild(ctx.el('p', 'points-e092-hint',
    'Forme canonique de POINT_METHODOLOGY.md §1 : un point est une unité démontrable, datable, localisable et transmissible.'));
  const dl = ctx.el('dl');
  const excerpt = point.text ? `« ${clip(point.text, 96)} » (texte de la fiche)` : '';
  addField(ctx, dl, 'S', 'sujet', valueOr(point.subject, 'non affiché dans la fiche'));
  addField(ctx, dl, 'R', 'prédicat', valueOr(excerpt, 'non affiché dans la fiche'));
  addField(ctx, dl, 'O', 'objet / complément', valueOr(excerpt, 'non affiché dans la fiche'));
  addField(ctx, dl, 'T', 'temps', valueOr(point.time, 'non affiché dans la fiche'));
  addField(ctx, dl, 'E', 'échelle', valueOr(point.scale, 'non affichée dans la fiche'));
  addField(ctx, dl, 'D', 'domaine', valueOr(point.domain, 'non affiché dans la fiche'));
  addField(ctx, dl, 'Src', 'sources', valueOr(point.sources, 'aucune source affichée pour ce point'));
  addField(ctx, dl, 'C', 'certitude', valueOr(point.confidence, 'non affichée dans la fiche'));
  body.appendChild(dl);
}

/* E092-05 : les huit familles sont données avec leur question doctrinale ; la
 * famille du point affiché est marquée par un repère textuel, pas par couleur. */
function buildFamilies(ctx, body, point) {
  heading(ctx, body, 'Les huit familles de points');
  body.appendChild(ctx.el('p', 'points-e092-hint',
    'Une famille répond à une question ; un point peut en porter plusieurs. D’après POINT_METHODOLOGY.md §2.'));
  const ol = ctx.el('ol');
  FAMILIES.forEach((family) => {
    const li = ctx.el('li', '', `${family.label} — ${family.question}`);
    const current = point.families.some((shown) =>
      norm(shown) === norm(family.key) || norm(shown) === norm(family.label));
    if (current) {
      put(li, 'data-e092-current', 'true');
      li.appendChild(ctx.el('span', 'points-e092-tag', 'famille du point affiché'));
    }
    ol.appendChild(li);
  });
  body.appendChild(ol);
}

/* E092-06 : la date est un champ, pas le contenu. L'ère et l'ancre temporelle
 * viennent du DOM (ligne active et métadonnées), sans millésime codé en dur. */
function buildTime(ctx, body, point, matrix) {
  heading(ctx, body, 'Une date n’est pas un point');
  body.appendChild(ctx.el('p', '',
    'L’année ne mesure rien toute seule : elle doit dire ce qu’elle mesure (début, fin, borne conventionnelle ou date approchée). '
    + 'Le point, lui, dit qui a agi, quoi, où et avec qui.'));
  const dl = ctx.el('dl');
  addField(ctx, dl, 'Ère', 'cadre rendu', valueOr(matrix.activeEra, 'ère non identifiée dans la matrice'));
  addField(ctx, dl, 'T', 'ancre du point', valueOr(point.time, 'ancre temporelle non affichée'));
  body.appendChild(dl);
}

/* E092-07 : les quatre degrés de certitude sont explicités, puis la certitude
 * réellement affichée dans la fiche est rappelée sans la modifier. */
function buildConfidence(ctx, body, point) {
  heading(ctx, body, 'Quatre degrés de certitude');
  body.appendChild(ctx.el('p', '',
    'certain · probable · disputé · non documenté. Le disputé reste disputé : on ne résout pas une controverse par un silence.'));
  const p = ctx.el('p');
  p.appendChild(document.createTextNode('Point affiché : '));
  p.appendChild(ctx.el('span', 'points-e092-value', valueOr(point.confidence, 'certitude non affichée')));
  p.appendChild(document.createTextNode('. Ce degré est un champ du point, pas un jugement du panneau.'));
  body.appendChild(p);
}

/* E092-08 : règles d'intégrité doctrinales + état réel des sources et de la
 * justification du point courant, avec repli explicite quand le champ manque. */
function buildIntegrity(ctx, body, point) {
  heading(ctx, body, 'Sources, omissions et intégrité');
  const ul = ctx.el('ul');
  INTEGRITY.forEach((rule) => ul.appendChild(ctx.el('li', '', rule)));
  body.appendChild(ul);
  const dl = ctx.el('dl');
  addField(ctx, dl, 'Src', 'de ce point', valueOr(point.sources, 'aucune source affichée dans la fiche'));
  addField(ctx, dl, 'Just.', 'omission / justification', valueOr(point.justification, 'aucune justification affichée dans la fiche'));
  body.appendChild(dl);
  body.appendChild(ctx.el('p', 'points-e092-hint',
    'Une absence de source doit être documentée : un vide masqué n’est pas une donnée.'));
}

/* E092-09 : couverture binaire explicite et hiérarchie, recomputées depuis la
 * matrice ; aucun total historique n'est codé en dur dans le module. */
function buildCoverage(ctx, body, matrix) {
  heading(ctx, body, 'Une couverture explicite, pas une impression');
  body.appendChild(ctx.el('p', '',
    'Un pays est à 100 % de couverture quand, pour chacune de ses ères, chaque domaine est couvert par un point valide '
    + 'ou déclaré vide avec omission identifiée. Ni partiel, ni vide non traité.'));
  const p = ctx.el('p', 'points-e092-hint');
  p.appendChild(document.createTextNode('Matrice lue : '));
  p.appendChild(ctx.el('span', 'points-e092-value',
    `${matrix.eras} ère(s) × ${matrix.domains} domaine(s) · ${matrix.filled}/${matrix.cells} cellule(s) renseignée(s) · ${matrix.empty} vide(s).`));
  body.appendChild(p);
  body.appendChild(ctx.el('p', 'points-e092-hint',
    'Hiérarchie : Monde → Pays → Ère → Point → Sous-point. Un point se comprend sans dépendre d’un autre pays.'));
}

function apply(ctx) {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function' || typeof layout.insertBefore !== 'function') return;
  const matrixRoot = layout.querySelector('.points-matrix');
  if (!matrixRoot || typeof matrixRoot.insertBefore !== 'function') return;

  /* E092-01 : CSS unique, marqueur de greffage et préférence de mouvement. */
  ctx.css(CSS_ID, CSS);
  put(layout, 'data-e092', '1');
  const reduce = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  if (reduce) put(layout, 'data-e092-reduced', '1');
  else if (layout.hasAttribute && layout.hasAttribute('data-e092-reduced')) layout.removeAttribute('data-e092-reduced');

  /* E092-10 : un seul panneau, réutilisé par identifiant ; un nœud survivant
   * mal parenté est retiré avant réinsertion, jamais laissé en doublon. */
  let guide = document.getElementById(GUIDE_ID);
  if (guide && guide.parentElement && guide.parentElement !== matrixRoot) guide.remove();
  if (!guide || !guide.isConnected || guide.tagName !== 'DETAILS') {
    guide = ctx.el('details', 'points-e092-guide');
    guide.id = GUIDE_ID;
  }
  guide.open = true;
  guide.replaceChildren();

  const summary = ctx.el('summary', 'points-e092-summary');
  summary.id = SUMMARY_ID;
  summary.appendChild(ctx.el('span', '', 'Comprendre les points d’histoire'));
  summary.appendChild(ctx.el('span', 'points-e092-hint', '— définition, familles et règle de lecture'));
  guide.appendChild(summary);

  const body = ctx.el('div', '', '');
  body.id = BODY_ID;
  body.className = 'points-e092-body';
  guide.appendChild(body);

  const point = readPoint(layout);
  const matrixState = readMatrix(layout);

  /* E092-02 : définition opératoire citée et attribuée, en texte visible. */
  const lead = ctx.el('p', 'points-e092-lead');
  lead.appendChild(document.createTextNode('Un '));
  lead.appendChild(ctx.el('strong', '', 'point d’histoire'));
  lead.appendChild(document.createTextNode(
    ' est la plus petite unité de connaissance démontrable, datable, localisable et transmissible. '
    + 'Il ne se confond ni avec un événement, ni avec une opinion, ni avec une simple mention. (POINT_METHODOLOGY.md §1)'));
  body.appendChild(lead);

  buildFields(ctx, body, point);
  buildFamilies(ctx, body, point);
  buildTime(ctx, body, point, matrixState);
  buildConfidence(ctx, body, point);
  buildIntegrity(ctx, body, point);
  buildCoverage(ctx, body, matrixState);

  const title = matrixRoot.querySelector('.points-title');
  if (title && title.nextSibling) matrixRoot.insertBefore(guide, title.nextSibling);
  else matrixRoot.appendChild(guide);

  put(guide, 'data-e092', '1');
}

register('E092', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
