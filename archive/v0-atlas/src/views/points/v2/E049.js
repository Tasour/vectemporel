import { register } from './registry.js';

/* Lentille POINTS E049 — passe 2 (V2) : accessibilité & ARIA, mouvement réduit
 * respecté (domaine E : accessibilité & ARIA).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E049.md — chantiers E049-01 à E049-10.
 * Fichier possédé : src/views/points/v2/E049.js uniquement. Ni la passe 1
 * (src/views/points/E049.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés. La lentille enrichit le DOM déjà rendu sans
 * retirer ni réétiqueter aucun nœud natif ni aucun nœud de la passe 1.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e049 / pointsV2E049 pour ne pas écraser ceux de la passe
 * 1 (points-e049, points-e049-*, data-points-e049*). Les deux passes
 * coexistent sans conflit : la V2 est additive et non destructive.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, le routeur ou une autre
 * lentille : aucun filtre, ère, index ni état applicatif n'est modifié.
 *
 * Invariants : une seule feuille (ctx.css), une seule portée
 * (.points-v2-e049), une seule note de lecture, un seul miroir auditable.
 * Zéro animation propre : la feuille ne déclare aucune transition ni animation
 * positive, elle ne fait que neutraliser celles des autres sous préférence de
 * mouvement réduit. Aucune réinterprétation de balisage, aucun réseau, aucun
 * aléa, aucun minuteur, aucune boucle d'animation, aucune sortie de journal,
 * aucun écouteur global.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e049';
const SCOPE = 'points-v2-e049';

/* Tous les identifiants créés par la V2 sont préfixés `points-v2-e049-` et
 * posés sur des descendants, jamais sur .points-matrix / .points-detail
 * (enfants directs de .points-layout) : _diagnostics.js:69-78 marquerait le
 * nœud. Les identifiants déjà portés par un nœud sont réutilisés (ensureId). */
const ID = {
  title: 'points-v2-e049-title',         // sur .points-title si sans id
  pointTitle: 'points-v2-e049-point-title', // sur .points-point-title si sans id
  kicker: 'points-v2-e049-detail-kicker',   // repli si aucun titre de point
  grid: 'points-v2-e049-grid',           // sur .points-grid si sans id
  help: 'points-v2-e049-grid-help',      // note sr-only créée par ctx.el
  audit: 'points-v2-e049-audit',         // miroir auditable créé par ctx.el
  filters: 'points-v2-e049-filters',     // sur .points-filters si sans id
  domain: 'points-v2-e049-domain-select', // sur le 1er select si sans id
  family: 'points-v2-e049-family-select', // sur le 2e select si sans id
  nav: 'points-v2-e049-nav',             // sur .points-nav si sans id
};

const DATA_SCOPE = 'data-points-v2-e049-scope';
const DATA_REDUCED = 'data-points-v2-e049-reduced';
const DATA_LANDMARK = 'data-points-v2-e049-landmark';
const DATA_GRID = 'data-points-v2-e049-grid-size';
const DATA_CELL = 'data-points-v2-e049-cell';
const DATA_ERA = 'data-points-v2-e049-era';
const DATA_CURRENT = 'data-points-v2-e049-current';
const DATA_FILTERS = 'data-points-v2-e049-filters';
const DATA_SELECT = 'data-points-v2-e049-select';
const DATA_NAV = 'data-points-v2-e049-nav';
const DATA_AUDIT = 'data-points-v2-e049-audit';

/* E049-07 : texte réel, visible pour les lecteurs d'écran (pas aria-hidden,
 * pas généré dynamiquement) : il explique la notation de la matrice. Le libellé
 * V2 est distinct de la note de la passe 1, sans l'écraser. */
const HELP_TEXT = 'Matrice ère × domaine (lecture V2) : chaque ligne est une ère et chaque colonne un domaine. Le tiret « · » signifie zéro point validé ; un nombre donne le nombre de points validés. Le bouton d’ère change d’ère, le bouton de cellule filtre le domaine.';

/* E049-01 : feuille unique. Chaque sélecteur commence littéralement par
 * `.points-v2-e049`, y compris dans les @media, donc aucune règle ne peut fuir
 * hors de la vue Points ni écraser la feuille points-e049 de la passe 1. */
const CSS = `
  /* E049-07 / E049-10 : notes sr-only, exposées aux AT sans être masquées
   * par aria-hidden ni hidden. */
  .points-v2-e049 .points-v2-e049-sr,
  .points-v2-e049-sr {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
  /* E049-09 : focus visible et cibles tactiles ≥ 36 px (44 px sous 620 px). */
  .points-v2-e049 button:focus-visible,
  .points-v2-e049 select:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 2px;
  }
  .points-v2-e049 .points-cell,
  .points-v2-e049 .points-era,
  .points-v2-e049 .points-filters button,
  .points-v2-e049 .points-nav button { min-height: 36px; }
  @media (max-width: 620px) {
    .points-v2-e049 .points-filters button,
    .points-v2-e049 .points-nav button { min-height: 44px; }
  }
  /* E049-05 / E049-09 : contraste forcé — l'état courant n'est jamais porté
   * par la seule couleur et le focus reste tracé. */
  @media (forced-colors: active) {
    .points-v2-e049 [aria-current="true"] { outline: 2px solid Highlight; }
    .points-v2-e049 :focus-visible { outline: 2px solid Highlight; }
  }
  /* E049-09 : E049 V2 ne définit AUCUNE animation propre. La neutralisation
   * n'intervient que si la préférence est détectée (signal JS ci-dessous) ou
   * si la media query le demande ; elle couvre aussi les transitions posées
   * par d'autres lentilles dans la grille, sans toucher au DOM ni au store. */
  .points-v2-e049[data-points-v2-e049-reduced="1"] .points-grid,
  .points-v2-e049[data-points-v2-e049-reduced="1"] .points-grid * {
    transition: none !important; animation: none !important;
    scroll-behavior: auto !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e049 .points-grid,
    .points-v2-e049 .points-grid * {
      transition: none !important; animation: none !important;
      scroll-behavior: auto !important;
    }
  }
  /* E049-10 : le miroir auditable n'a pas sa place sur papier. */
  @media print {
    .points-v2-e049-audit { display: none; }
  }
`;

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* E049-02/03/06/08 : on réutilise un id existant (posé par la passe 1 ou une
 * lentille antérieure) plutôt que de l'écraser, et on ne pose le nôtre que
 * s'il manque. */
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

/* E049-07 : on AJOUTE l'annotation à une description existante (passe 1,
 * E002/E004) au lieu de la remplacer. */
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

/* E049-06/08 : on AJOUTE une relation aria-controls sans écraser celle déjà
 * posée par la passe 1 ou une autre lentille. */
function addControl(node, id) {
  if (!node || !id) return;
  const current = node.getAttribute('aria-controls');
  if (!current) {
    node.setAttribute('aria-controls', id);
    return;
  }
  const ids = current.split(/\s+/).filter(Boolean);
  if (ids.indexOf(id) === -1) node.setAttribute('aria-controls', `${current} ${id}`);
}

/* E049-09 : double source de vérité avec repli sûr. ctx.reducedMotion() est
 * interrogé en premier ; la media query couvre les environnements où le ctx
 * ne fournit pas de signal fiable. On applique un OU prudent : le doute tourne
 * toujours en faveur du mouvement réduit. */
function reducedMotion(ctx) {
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

/* E049-01 : la racine est le layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E049-07 : une seule note statique, réutilisée ou relogée sans doublon après
 * un rendu neuf, créée par ctx.el uniquement. */
function ensureNote(ctx, matrix) {
  if (typeof document === 'undefined' || !matrix) return null;
  let note = document.getElementById(ID.help);
  if (note && note.parentElement !== matrix) note.remove();
  note = document.getElementById(ID.help);
  if (!note) {
    note = ctx.el('p', 'points-v2-e049-sr', HELP_TEXT);
    note.id = ID.help;
    matrix.appendChild(note);
  }
  return note;
}

/* E049-10 : miroir auditable unique, lui aussi créé par ctx.el et relogé sans
 * doublon. Hors région live : la V2 reste silencieuse au montage et au rendu. */
function ensureAudit(ctx, matrix) {
  if (typeof document === 'undefined' || !matrix) return null;
  let audit = document.getElementById(ID.audit);
  if (audit && audit.parentElement !== matrix) audit.remove();
  audit = document.getElementById(ID.audit);
  if (!audit) {
    audit = ctx.el('p', 'points-v2-e049-sr points-v2-e049-audit');
    audit.id = ID.audit;
    matrix.appendChild(audit);
  }
  return audit;
}

function apply(ctx) {
  /* E049-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E049-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);
  layout.setAttribute(DATA_SCOPE, '1');

  const matrix = root.querySelector('.points-matrix');
  const detail = root.querySelector('.points-detail');
  const grid = root.querySelector('.points-grid');
  const filters = root.querySelector('.points-filters');
  const rows = root.querySelectorAll('.points-grid-row:not(.is-head)');

  /* E049-09 : couplage explicite à la préférence de mouvement réduite, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  const motion = reducedMotion(ctx);
  layout.setAttribute(DATA_REDUCED, motion ? '1' : '0');

  /* E049-02 — la matrice devient un repère nommé par son titre. Le titre est
   * un descendant de .points-matrix : aucun id sur un enfant direct de layout. */
  let landmarks = 0;
  if (matrix) {
    const titleId = ensureId(matrix.querySelector('.points-title'), ID.title);
    if (titleId) {
      setIfAbsent(matrix, 'role', 'region');
      setIfAbsent(matrix, 'aria-labelledby', titleId);
      matrix.setAttribute(DATA_LANDMARK, 'matrix');
      landmarks += 1;
    }
  }

  /* E049-02 — le panneau de détail (aside = complément) reçoit un nom : le
   * titre du point, avec repli sur le kicker « N point(s) dans ce périmètre »
   * lorsque aucun point n'est affiché. */
  let labelId = '';
  if (detail) {
    labelId = ensureId(detail.querySelector('.points-point-title'), ID.pointTitle);
    if (!labelId) labelId = ensureId(detail.querySelector('.view-kicker'), ID.kicker);
    if (labelId) {
      setIfAbsent(detail, 'aria-labelledby', labelId);
      detail.setAttribute(DATA_LANDMARK, 'detail');
      landmarks += 1;
    }
  }

  /* E049-03 — la grille est un groupe nommé ; le nom est dérivé du DOM réel
   * (nombre de lignes d'ère et d'en-têtes de domaine), sans chiffre codé en dur.
   * L'id est réutilisé si la passe 1 l'a déjà posé. */
  const heads = root.querySelectorAll('.points-grid-row.is-head > span');
  const domainCount = Math.max(0, heads.length - 1);
  let gridId = '';
  if (grid) {
    gridId = ensureId(grid, ID.grid);
    setIfAbsent(grid, 'role', 'group');
    setIfAbsent(grid, 'aria-label',
      `Matrice de couverture : ${rows.length} ère(s), ${domainCount} domaine(s). Lecture V2.`);
    grid.setAttribute(DATA_GRID, `${rows.length}:${domainCount}`);
  }

  /* E049-07 — une seule note V2, réutilisée ou relogée, puis AJOUTÉE à
   * l'aria-describedby de la grille sans écraser la note de la passe 1 ni
   * celles de E002/E004. */
  const note = ensureNote(ctx, matrix);
  if (note && grid) addDescribedBy(grid, note.id);

  /* E049-04 — chaque cellule porte un libellé complet repris de l'attribut
   * title natif de points.js (« ère · domaine · N point(s) »), uniquement si
   * l'aria-label manque. Le title, le texte visible et le clic restent intacts. */
  const cells = root.querySelectorAll('.points-cell');
  let labelledCells = 0;
  cells.forEach((cell) => {
    const title = txt(cell.getAttribute('title'));
    if (title) {
      labelledCells += 1;
      setIfAbsent(cell, 'aria-label', title);
    }
    cell.setAttribute(DATA_CELL, '1');
  });

  /* E049-05 — l'ère courante est signalée par aria-current, jamais par
   * aria-pressed (choix unique, pas bascule indépendante). Les positions sont
   * ajoutées sans écrasement. On ne retire que le marqueur posé par la V2. */
  let currentEra = '';
  rows.forEach((row, index) => {
    const era = row.querySelector('.points-era');
    if (!era) return;
    era.setAttribute(DATA_ERA, '1');
    setIfAbsent(era, 'aria-posinset', String(index + 1));
    setIfAbsent(era, 'aria-setsize', String(rows.length));
    if (row.classList.contains('is-active')) {
      setIfAbsent(era, 'aria-current', 'true');
      era.setAttribute(DATA_CURRENT, '1');
      currentEra = txt(era.textContent);
    } else if (era.getAttribute(DATA_CURRENT) === '1') {
      era.removeAttribute('aria-current');
      era.removeAttribute(DATA_CURRENT);
      currentEra = '';
    }
  });

  /* E049-06 — les filtres forment un groupe nommé ; les deux <select>
   * conservent leur aria-label natif et gagnent une relation aria-controls
   * vers la grille, ajoutée sans écraser celle de la passe 1. */
  let selectsLinked = 0;
  if (filters) {
    setIfAbsent(filters, 'role', 'group');
    setIfAbsent(filters, 'aria-label', 'Filtres du périmètre des points');
    filters.setAttribute(DATA_FILTERS, '1');
    const selects = filters.querySelectorAll('select');
    [ID.domain, ID.family].forEach((preferred, index) => {
      const select = selects[index];
      if (!select) return;
      const selectId = ensureId(select, preferred);
      if (gridId && selectId) addControl(select, gridId);
      select.setAttribute(DATA_SELECT, '1');
      selectsLinked += 1;
    });
  }

  /* E049-08 — la navigation devient une région nommée reliée au contenu
   * qu'elle fait changer ; chaque bouton garde son texte visible (conservé dans
   * l'aria-label, « Label in Name ») et y ajoute le point courant. */
  const nav = detail ? detail.querySelector('.points-nav') : root.querySelector('.points-nav');
  let navLinked = 0;
  if (nav) {
    setIfAbsent(nav, 'role', 'navigation');
    setIfAbsent(nav, 'aria-label', 'Navigation entre les points validés');
    nav.setAttribute(DATA_NAV, '1');
    const subject = detail ? txt(detail.querySelector('.points-point-title')) : '';
    nav.querySelectorAll('button').forEach((button) => {
      if (labelId) addControl(button, labelId);
      const visible = txt(button);
      if (subject && visible && !button.hasAttribute('aria-label')) {
        button.setAttribute('aria-label', `${visible} : ${subject}`);
      }
      navLinked += 1;
    });
    landmarks += 1;
  }

  /* E049-10 — miroir auditable : compteurs dérivés du DOM réel, écrit par
   * textContent avec signature anti-écriture redondante et miroir data-*. */
  const audit = ensureAudit(ctx, matrix);
  if (audit) {
    const summary = `Accessibilité V2 : ${landmarks} repère(s) nommé(s), ${labelledCells}/${cells.length} cellule(s) étiquetée(s), ${selectsLinked} filtre(s) relié(s), ${navLinked} bouton(s) de navigation, ère courante ${currentEra ? 'annoncée' : 'absente'}, mouvement réduit ${motion ? 'activé' : 'désactivé'}.`;
    if (audit.textContent !== summary) audit.textContent = summary;
    audit.setAttribute(DATA_AUDIT,
      `${landmarks}/${labelledCells}/${cells.length}/${selectsLinked}/${navLinked}/${motion ? 1 : 0}`);
  }
}

/* E049-10 : enregistrement unique, isolé par un try/catch — une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E049', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
