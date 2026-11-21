import { register } from './registry.js';

/* Lentille E049 — Accessibilité & ARIA : mouvement réduit respecté
 * (domaine E : accessibilité & ARIA).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E049.md — chantiers E049-01 à E049-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la
 * coque, styles.css et les autres lentilles ne sont ni édités ni doublés.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (tels que
 * fournis par points/registry.js). Aucune dépendance vers le store, le routeur
 * ni une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, une seule note de lecture par rendu ;
 * - aucun id `points-e049-*` posé sur un enfant DIRECT de stage/layout/body :
 *   _diagnostics.js masquerait le nœud (E030) — les ancres sont posées sur des
 *   descendants (titre, grille, filtres, navigation, cellules, ères) ;
 * - non destructif : les attributs ARIA déjà présents sont conservés, seuls
 *   des attributs absents sont ajoutés (setIfAbsent / addDescribedBy) ;
 * - zéro animation propre : aucune transition, aucune animation, aucun timer,
 *   aucun rAF ; neutralisation CSS CONDITIONNELLE sous mouvement réduit ;
 * - zéro réseau, zéro aléa, aucune réinterprétation de balisage, aucune
 *   sortie de journal.
 */

const CSS_ID = 'points-e049';
const SCOPE = 'points-e049';
const REDUCED_ATTR = 'data-points-e049-reduced';

/* Tous les identifiants sont préfixés `points-e049-` et posés sur des
 * descendants, jamais sur .points-matrix / .points-detail (enfants directs de
 * .points-layout) afin d'échapper au marqueur de _diagnostics.js. */
const ID = {
  title: 'points-e049-title',             // sur .points-title
  pointTitle: 'points-e049-point-title',  // sur .points-point-title
  kicker: 'points-e049-detail-kicker',    // repli si aucun titre de point
  grid: 'points-e049-grid',               // sur .points-grid
  help: 'points-e049-grid-help',          // note sr-only dans .points-matrix
  filters: 'points-e049-filters',         // sur .points-filters
  domain: 'points-e049-domain-select',    // sur le 1er select
  family: 'points-e049-family-select',    // sur le 2e select
  nav: 'points-e049-nav',                 // sur .points-nav
};

/* E049-07 : texte réel, visible pour les lecteurs d'écran (pas aria-hidden,
 * pas généré par JS dynamique) : il explique la notation de la matrice. */
const HELP_TEXT = 'Matrice ère × domaine : chaque ligne est une ère, chaque colonne un domaine. Le tiret « · » signifie zéro point validé ; un nombre donne le nombre de points validés. Le bouton d’ère change d’ère, le bouton de cellule filtre le domaine.';

const CSS = `
  /* E049-07 : note de lecture masquée visuellement, exposée aux AT. */
  .points-e049-sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
  /* E049-10 : focus visible et cibles tactiles ≥ 36 px (44 px sur mobile). */
  .points-e049 button:focus-visible,
  .points-e049 select:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  .points-e049 .points-cell,
  .points-e049 .points-era,
  .points-e049 .points-filters button,
  .points-e049 .points-nav button { min-height: 36px; }
  @media (max-width: 620px) {
    .points-e049 .points-filters button,
    .points-e049 .points-nav button { min-height: 44px; }
  }
  /* E049-10 : couleurs forcées — l'état courant n'est jamais porté par la
   * seule couleur (E049-05) et le focus reste tracé. */
  @media (forced-colors: active) {
    .points-e049 [aria-current="true"] { outline: 2px solid Highlight; }
    .points-e049 :focus-visible { outline: 2px solid Highlight; }
  }
  /* E049-09 : E049 ne définit AUCUNE animation propre. La neutralisation
   * n'intervient que si la préférence est détectée (signal JS ci-dessous) ou
   * si la media query le demande ; elle couvre aussi les transitions posées
   * par d'autres lentilles dans la grille, sans toucher au DOM ni au store. */
  .points-e049[${REDUCED_ATTR}="1"] .points-grid,
  .points-e049[${REDUCED_ATTR}="1"] .points-grid * {
    transition: none !important; animation: none !important;
    scroll-behavior: auto !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e049 .points-grid,
    .points-e049 .points-grid * {
      transition: none !important; animation: none !important;
      scroll-behavior: auto !important;
    }
  }
`;

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* E049-01/02/03/06/08 : on réutilise un id existant (posé par une lentille
 * antérieure) plutôt que d'écraser, et on ne pose le nôtre que s'il manque. */
function ensureId(node, preferred) {
  if (!node) return '';
  if (node.id) return node.id;
  node.id = preferred;
  return preferred;
}

/* Non destructif : jamais d'écrasement d'un attribut déjà porté. */
function setIfAbsent(node, attr, value) {
  if (node && !node.hasAttribute(attr)) node.setAttribute(attr, String(value));
}

/* E049-07 : on AJOUTE l'annotation à une description existante (E002/E004)
 * au lieu de la remplacer. */
function addDescribedBy(node, id) {
  if (!node || !id) return;
  const current = node.getAttribute('aria-describedby');
  if (!current) {
    node.setAttribute('aria-describedby', id);
    return;
  }
  const ids = current.split(/\s+/).filter(Boolean);
  if (ids.indexOf(id) === -1) node.setAttribute('aria-describedby', `${current} ${id}`);
}

/* E049-09 : double source de vérité avec repli sûr. ctx.reducedMotion() est
 * interrogé en premier ; la media query couvre les environnements où le ctx
 * ne fournit pas de signal fiable. On applique un OU prudent : le doute tourne
 * toujours en faveur du mouvement réduit. */
function reduced(ctx) {
  let value = false;
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { value = !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) value = true;
  } catch { /* repli : on garde la valeur déjà obtenue */ }
  return value;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof layout.querySelector !== 'function') return;

  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.pointsE049 = '1';

  const matrix = layout.querySelector('.points-matrix');
  const detail = layout.querySelector('.points-detail');
  const grid = layout.querySelector('.points-grid');
  const filters = layout.querySelector('.points-filters');
  const rows = layout.querySelectorAll('.points-grid-row:not(.is-head)');

  /* E049-01 — la matrice devient un repère nommé par son titre. Le titre est
   * un descendant de .points-matrix : aucun id sur un enfant direct de layout. */
  const titleId = matrix ? ensureId(matrix.querySelector('.points-title'), ID.title) : '';
  if (matrix && titleId) {
    setIfAbsent(matrix, 'role', 'region');
    setIfAbsent(matrix, 'aria-labelledby', titleId);
  }

  /* E049-02 — le panneau de détail (aside = complément) reçoit un nom : le
   * titre du point, avec repli sur le kicker « N point(s) dans ce périmètre »
   * lorsque aucun point n'est affiché. */
  let labelId = '';
  if (detail) {
    labelId = ensureId(detail.querySelector('.points-point-title'), ID.pointTitle);
    if (!labelId) labelId = ensureId(detail.querySelector('.view-kicker'), ID.kicker);
    if (labelId) setIfAbsent(detail, 'aria-labelledby', labelId);
  }

  /* E049-03 — la grille est un groupe nommé ; le nom est dérivé du DOM réel
   * (nombre de lignes d'ère et d'en-têtes de domaine), sans chiffre codé en dur. */
  const gridId = grid ? ensureId(grid, ID.grid) : '';
  if (grid) {
    const heads = layout.querySelectorAll('.points-grid-row.is-head > span');
    setIfAbsent(grid, 'role', 'group');
    setIfAbsent(grid, 'aria-label',
      `Matrice de couverture : ${rows.length} ère(s), ${Math.max(0, heads.length - 1)} domaine(s).`);
  }

  /* E049-07 — une seule note statique, nettoyée si elle provient d'un rendu
   * antérieur, puis reliée à la grille par aria-describedby (append, pas
   * remplacement). */
  const stale = document.getElementById(ID.help);
  if (stale && !layout.contains(stale)) stale.remove();
  let help = layout.querySelector('#' + ID.help);
  if (!help && matrix) {
    help = el('p', 'points-e049-sr', HELP_TEXT);
    help.id = ID.help;
    matrix.appendChild(help);
  }
  if (help && grid) addDescribedBy(grid, help.id);

  /* E049-04 — chaque cellule porte un libellé complet repris de l'attribut
   * title natif de points.js (« ère · domaine · N point(s) »). Le title, le
   * texte visible et le gestionnaire de clic restent intacts. */
  layout.querySelectorAll('.points-cell').forEach((cell) => {
    const title = txt(cell.getAttribute('title'));
    if (title) setIfAbsent(cell, 'aria-label', title);
  });

  /* E049-05 — l'ère courante est signalée par aria-current, jamais par
   * aria-pressed (choix unique, pas bascule indépendante). On ne retire que
   * le marqueur que E049 a lui-même posé. */
  rows.forEach((row) => {
    const era = row.querySelector('.points-era');
    if (!era) return;
    if (row.classList.contains('is-active')) {
      setIfAbsent(era, 'aria-current', 'true');
      era.dataset.pointsE049Current = '1';
    } else if (era.dataset.pointsE049Current === '1') {
      era.removeAttribute('aria-current');
      delete era.dataset.pointsE049Current;
    }
  });

  /* E049-06 — les filtres forment un groupe nommé ; les deux <select>
   * conservent leur aria-label natif et gagnent une relation aria-controls
   * vers la grille. Le bouton « Réinitialiser » n'est pas modifié. */
  if (filters) {
    if (!filters.id) filters.id = ID.filters;
    setIfAbsent(filters, 'role', 'group');
    setIfAbsent(filters, 'aria-label', 'Filtres du périmètre des points');
    const selects = filters.querySelectorAll('select');
    if (selects[0]) {
      ensureId(selects[0], ID.domain);
      if (gridId) setIfAbsent(selects[0], 'aria-controls', gridId);
    }
    if (selects[1]) {
      ensureId(selects[1], ID.family);
      if (gridId) setIfAbsent(selects[1], 'aria-controls', gridId);
    }
  }

  /* E049-08 — la navigation devient une région nommée reliée au contenu qu'
   * elle fait changer ; chaque bouton garde son texte visible (conservé dans
   * l'aria-label, conformément à « Label in Name ») et y ajoute le point courant. */
  const nav = detail ? detail.querySelector('.points-nav') : layout.querySelector('.points-nav');
  if (nav) {
    if (!nav.id) nav.id = ID.nav;
    setIfAbsent(nav, 'role', 'navigation');
    setIfAbsent(nav, 'aria-label', 'Navigation entre les points validés');
    const subject = detail ? txt(detail.querySelector('.points-point-title')) : '';
    nav.querySelectorAll('button').forEach((button) => {
      if (labelId) setIfAbsent(button, 'aria-controls', labelId);
      if (subject && !button.hasAttribute('aria-label')) {
        const visible = txt(button);
        if (visible) button.setAttribute('aria-label', `${visible} : ${subject}`);
      }
    });
  }

  /* E049-09 — aucun timer, aucune boucle rAF, aucune transition déclarée en
   * propre : seul le signal de préférence est écrit. */
  layout.setAttribute(REDUCED_ATTR, reduced(ctx) ? '1' : '0');
}

register('E049', install);
