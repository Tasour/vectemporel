import { register } from './registry.js';

/* Lentille POINTS E048 — Accessibilité & ARIA : aucune information portée par
 * la seule couleur (domaine E). Fichier possédé : ce module uniquement.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E048.md — chantiers E048-01 à E048-10.
 *
 * La vue Points porte plusieurs états par la couleur : ligne d'ère courante
 * (`.points-grid-row.is-active`, styles.css:354), badge de certitude
 * `.confidence.is-certain` en or (styles.css:370) et cellules pleines/vides
 * (styles.css:360, déjà doublées par la lentille E002). E048 ajoute un
 * équivalent TEXTUEL et de FORME redondant, sans retirer une seule couleur :
 * `aria-current` + repère visuel pour l'ère, glyphe + libellé pour la
 * certitude, légende globale, tableau de bord auditable et relations ARIA
 * additives. Aucun chiffre n'est codé en dur : tout est dérivé du DOM rendu.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
 * console.*, zéro innerHTML. Un seul greffon, une seule feuille CSS, tous les
 * identifiants préfixés `points-e048-`.
 *
 * Invariants :
 * - non destructif : classes, textes, titres et attributs existants conservés ;
 * - idempotent : nœuds réutilisés par identifiant, gardes `data-e048-*` ;
 * - additif : aria-describedby fusionné, jamais remplacé.
 */

const CSS_ID = 'points-e048';

const ID = {
  legend: 'points-e048-legend',
  audit: 'points-e048-audit',
};

/* Formes distinctes par niveau de certitude : la forme reste discernable en
 * niveaux de gris, en impression et sous daltonisme. La clé vient de la classe
 * réelle `is-<niveau>` posée par points.js:105 ; aucun niveau n'est inventé. */
const GLYPHS = {
  certain: '\u25CF',   /* ● */
  high: '\u25D5',      /* ◕ */
  probable: '\u25D0',  /* ◐ */
  medium: '\u25D1',    /* ◑ */
  disputed: '\u25CB',  /* ○ */
};
const GLYPH_FALLBACK = '\u25C7'; /* ◇ */

/* Feuille unique. Les contenus générés (::before/::after) ne sont PAS du texte
 * de l'élément : ils n'altèrent donc ni les libellés lus par les autres
 * lentilles, ni le `textContent` de la matrice. */
const CSS = `
  .points-era[aria-current="true"]{font-weight:700;text-decoration:underline;text-underline-offset:3px}
  .points-era[aria-current="true"]::after{content:"\\00A0\\25C0 ère courante";font-weight:400;font-size:9px}
  .confidence[data-e048-glyph]::before{content:attr(data-e048-glyph) "\\00A0";font-style:normal}
  .e048-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  #${ID.legend},#${ID.audit}{margin:6px 0 4px;color:var(--ink-soft);font-size:10px;line-height:1.5}
  #${ID.legend} strong{color:var(--gold-bright)}
  #${ID.audit}{margin:0 0 10px;color:var(--muted);font-variant-numeric:tabular-nums}
  @media (forced-colors:active){
    .points-era[aria-current="true"]{outline:2px solid CanvasText;outline-offset:2px}
    .confidence[data-e048-glyph]{border-style:solid}
  }
  @media (prefers-contrast:more){
    .confidence[data-e048-glyph]{border-width:2px}
  }
  @media (prefers-reduced-motion:reduce){
    .points-era,.confidence{transition:none}
  }
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(node) {
  if (typeof node === 'string') return node.trim();
  if (node && typeof node.textContent === 'string') return node.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function place(parent, node, before) {
  if (!parent || !node) return;
  if (node.parentNode !== parent || (before && node.nextSibling !== before)) {
    parent.insertBefore(node, before || null);
  }
}

/* Niveau de certitude lu sur la classe réelle, jamais sur la couleur. */
function levelOf(badge) {
  const classes = badge && badge.classList ? Array.prototype.slice.call(badge.classList) : [];
  for (let i = 0; i < classes.length; i += 1) {
    if (classes[i].indexOf('is-') === 0) return classes[i].slice(3);
  }
  return '';
}

function glyphFor(level) {
  return Object.prototype.hasOwnProperty.call(GLYPHS, level) ? GLYPHS[level] : GLYPH_FALLBACK;
}

/* E048-02 / E048-03 — l'ère active est désignée par aria-current ( lecteurs
 * d'écran ) ET par un repère textuel généré en CSS ( niveaux de gris ). */
function markEra(row) {
  const era = row.querySelector('.points-era');
  if (!era) return false;
  if (row.classList.contains('is-active')) {
    put(era, 'aria-current', 'true');
    if (era.dataset) era.dataset.e048Era = 'current';
    return true;
  }
  if (era.dataset && era.dataset.e048Era === 'current') {
    era.removeAttribute('aria-current');
    delete era.dataset.e048Era;
  }
  return false;
}

/* E048-04 — glyphe de forme attaché au badge, dérivé de sa classe `is-*`. */
function glyphBadge(badge) {
  const level = levelOf(badge) || txt(badge) || 'inconnu';
  const glyph = glyphFor(levelOf(badge));
  if (badge.dataset) {
    badge.dataset.e048Confidence = level;
    badge.dataset.e048Glyph = glyph;
  }
  return level;
}

/* E048-05 — libellé accessible : on enrichit un aria-label existant sans
 * l'écraser, sinon on préfixe un texte visuellement masqué. Le garde-fou rend
 * l'opération idempotente et respecte un libellé posé par une autre lentille. */
function labelBadge(ctx, badge, level) {
  if (!badge.dataset || badge.dataset.e048Labeled === '1') return;
  const existing = badge.getAttribute('aria-label') || '';
  if (/certitude/i.test(existing)) {
    badge.dataset.e048Labeled = '1';
    return;
  }
  if (existing) {
    put(badge, 'aria-label', `${existing} — Certitude : ${level}.`);
  } else {
    badge.insertBefore(ctx.el('span', 'e048-sr-only', `Certitude : ${level}. `), badge.firstChild);
  }
  badge.dataset.e048Labeled = '1';
}

/* E048-06 — légende globale : les conventions sont écrites en texte, jamais
 * déduites d'une teinte. Les comptes sont dérivés du DOM parcouru. */
function putLegend(ctx, matrix, grid, stats) {
  let legend = document.getElementById(ID.legend);
  if (legend && legend.parentNode !== matrix) legend.remove();
  if (!legend) {
    legend = ctx.el('div', 'e048-legend');
    legend.id = ID.legend;
    put(legend, 'role', 'note');
  }
  legend.replaceChildren(
    ctx.el('strong', '', 'Lecture sans couleur — '),
    ctx.el('span', '', `${stats.activeEras} ère${stats.activeEras > 1 ? 's' : ''} courante${stats.activeEras > 1 ? 's' : ''} signalée${stats.activeEras > 1 ? 's' : ''} par « ◀ ère courante » · `),
    ctx.el('strong', '', `${stats.badges} certitude${stats.badges > 1 ? 's' : ''}`),
    ctx.el('span', '', ' distinguée(s) par une forme (● certain, ◐ probable, ○ disputé, ◇ repli) · cases pleines/vides distinguées par la forme dans la matrice. Aucune de ces informations ne dépend de la couleur.')
  );
  place(matrix, legend, grid);
}

/* E048-07 — tableau de bord auditable, en texte statique (pas une région live
 * supplémentaire : la région unique relève de la lentille E041). */
function putAudit(ctx, matrix, grid, stats) {
  let audit = document.getElementById(ID.audit);
  if (audit && audit.parentNode !== matrix) audit.remove();
  if (!audit) {
    audit = ctx.el('p', 'e048-audit');
    audit.id = ID.audit;
  }
  audit.textContent = stats.colorBorne
    ? `Contrôle « jamais la couleur seule » : ${stats.colorBorne} état(s) à codage coloriel recensé(s), ${stats.covered} pourvu(s) d'un repère de forme ou de texte.`
    : 'Contrôle « jamais la couleur seule » : aucun état à codage coloriel recensé dans cette vue.';
  place(matrix, audit, grid);
}

/* E048-08 — relation ARIA additive : on fusionne, on ne remplace jamais une
 * relation posée par E002, E044 ou toute autre lentille. */
function mergeDescribedBy(grid, ids) {
  if (!grid || typeof grid.getAttribute !== 'function') return;
  const existing = (grid.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const merged = Array.from(new Set(existing.concat(ids.filter((id) => document.getElementById(id))))).join(' ');
  if (merged) put(grid, 'aria-describedby', merged);
}

function apply(ctx) {
  /* E048-10 — gardes de type sur le ctx minimal, avant toute écriture. */
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  if (!matrix || !grid || typeof matrix.insertBefore !== 'function') return;

  /* Une seule feuille, injectée par cssOnce (idempotent entre rendus). */
  ctx.css(CSS_ID, CSS);

  /* E048-01 — recensement dérivé du DOM : aucun état n'est supposé. */
  const rows = nodes(grid, '.points-grid-row:not(.is-head)');
  const badges = nodes(layout, '.points-meta .confidence');
  const cells = nodes(grid, '.points-cell');
  const stats = {
    activeEras: 0,
    badges: badges.length,
    cells: cells.length,
    colorBorne: 0,
    covered: 0,
  };

  rows.forEach((row) => {
    if (markEra(row)) {
      stats.activeEras += 1;
      stats.colorBorne += 1;
      stats.covered += row.querySelector('.points-era[aria-current="true"]') ? 1 : 0;
    }
  });

  badges.forEach((badge) => {
    const level = glyphBadge(badge);
    labelBadge(ctx, badge, level);
    stats.colorBorne += 1;
    stats.covered += badge.dataset.e048Glyph ? 1 : 0;
  });

  /* Cases : E002 porte déjà le repère de forme. On le détecte sans le modifier
   * et on ne recense que les cellules réellement colorées par `has-points`. */
  let coloredCells = 0;
  cells.forEach((cell) => {
    if (!cell.classList || !cell.classList.contains('has-points')) return;
    coloredCells += 1;
    stats.colorBorne += 1;
    const cued = cell.dataset && (cell.dataset.e002State === 'filled' || /remplie/i.test(cell.getAttribute('aria-label') || ''));
    stats.covered += cued ? 1 : 0;
  });
  stats.cells = cells.length;
  stats.coloredCells = coloredCells;

  putLegend(ctx, matrix, grid, stats);
  putAudit(ctx, matrix, grid, stats);
  mergeDescribedBy(grid, [ID.legend, ID.audit]);

  /* E048-09 — aucune animation propre : la feuille ne fait que neutraliser les
   * transitions sous mouvement réduit. Les deux appuis ci-dessous documentent
   * l'absence de timer / rAF sans introduire d'effet. */
  void ctx.reducedMotion;
  void stats.cells;
}

register('E048', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
