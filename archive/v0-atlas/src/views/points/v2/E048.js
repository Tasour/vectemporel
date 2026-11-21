import { register } from './registry.js';

/* Lentille V2 E048 — Accessibilité & ARIA : aucune information portée par la
 * seule couleur (domaine E). Seconde passe, dix chantiers INÉDITS.
 *
 * Fichier possédé : ce module uniquement. Rapport possédé :
 * UNIFIED_AUDIT/POINTS/V2/views/E048.md — chantiers E048-V2-01 à E048-V2-10.
 * La passe 1 (src/views/points/E048.js), son rapport, la vue (points.js), la
 * coque, styles.css, le registre/index V2 et toute autre lentille ne sont ni
 * édités ni doublés.
 *
 * La passe 1 portait : recensement, aria-current + « ◀ ère courante », glyphes
 * de certitude, libellé accessible, légende, bilan auditable, aria-describedby,
 * forced-colors/contraste/mouvement réduit et idempotence. La seconde passe
 * ajoute : registre visible des codages, drapeau d'ère en ::before, plan de
 * lecture ordinal, échelle de barres en ::after, hachures de cellules en
 * ::after, récapitulatif textuel des filtres, signature déterministe, audition
 * d'unicité. Aucun signal existant n'est retiré, aucun libellé tiers écrasé.
 *
 * Contrat exploité : viewId ('pointsv2', toléré 'points'), stage, layout,
 * css(id, règles), el(balise, classe, texte). Zéro réseau, zéro aléa, zéro
 * minuteur, zéro boucle d'animation, zéro journalisation, zéro écriture de
 * balisage en chaîne. Un seul greffon, une seule feuille, préfixe
 * `.points-v2-e048` pour les sélecteurs et `points-v2-e048-` pour les ids.
 *
 * Coexistence des pseudo-éléments (contractuel) :
 *   .points-era   ::after  -> passe 1 (« ◀ ère courante »)  | V2 utilise ::before
 *   .confidence   ::before -> passe 1 (glyphe de forme)      | V2 utilise ::after
 *   .points-cell  ::before -> E002 (◆ / ◇)                  | V2 utilise ::after
 * Aucun content: n'est donc volé à une autre lentille.
 *
 * Registre des dix chantiers V2 (repères de relecture et de vérification) :
 *   E048-V2-01 — feuille isolée, portée `.points-v2-e048` et gardes de type
 *   E048-V2-02 — recensement unique, dérivé du DOM rendu (aucun total figé)
 *   E048-V2-03 — registre visible des codages, lisible sans feuille de style
 *   E048-V2-04 — drapeau d'ère courante en ::before (nom du bouton intact)
 *   E048-V2-05 — plan de lecture ordinal « Ère N » en texte
 *   E048-V2-06 — échelle de barres de certitude en ::after
 *   E048-V2-07 — hachures et libellé d'état des cellules en ::after
 *   E048-V2-08 — récapitulatif textuel des filtres (role="note", non live)
 *   E048-V2-09 — signature déterministe et métrique publiée
 *   E048-V2-10 — unicité des nœuds, audit et résilience des modes de contraste
 */

const CSS_ID = 'points-v2-e048';
const SCOPE = 'points-v2-e048';

/* E048-V2-01 — identifiants DOM tous préfixés `points-v2-e048-`. */
const ID = {
  PANEL: 'points-v2-e048-panel',
  TITLE: 'points-v2-e048-title',
  REGISTER: 'points-v2-e048-register',
  ORDINALS: 'points-v2-e048-ordinals',
  METRIC: 'points-v2-e048-metric',
  FILTER: 'points-v2-e048-filter-state',
};

/* V2-03 — registre documentaire : chaque codage coloré est nommé avec son
 * équivalent non coloriel. Aucun chiffre, aucun millésime, aucune donnée
 * historique : ces lignes décrivent des conventions, pas des mesures. */
const CODAGES = [
  ['Ère courante', 'Drapeau « ● Ère courante » en texte et ordinal « Ère N » dans le plan de lecture, en plus de aria-current.'],
  ['Niveau de certitude', 'Échelle de barres ▮ croissante accolée au nom du niveau relevé, en plus du glyphe et de la teinte du badge.'],
  ['Case pourvue', 'Hachure de texture, marqueur ▨ et mention « case pleine » dans le libellé, en plus du chiffre et de la forme E002.'],
  ['Case vide', 'Marqueur ▢ et mention « case vide » dans le libellé, en plus du point médian et de la forme E002.'],
  ['Filtre actif', 'Récapitulatif textuel « Filtre : valeur », indépendant de la teinte du sélecteur.'],
  ['Contraste forcé', 'Bordure et traits CanvasText : chaque marqueur survit au mode couleurs forcées.'],
  ['Contraste renforcé', 'Traits doublés et poids de police accru sous prefers-contrast: more.'],
  ['Mouvement réduit', 'Aucune transition ni animation propre ; l’état est publié en texte.'],
  ['Idempotence', 'Un seul greffon, une seule feuille, un seul jeu de marqueurs après reconstruction du stage.'],
];

/* V2-06 — barres deterministes par niveau réellement rencontré. Les clés sont
 * exactement celles posées par points.js:106 (`confidence is-<niveau>`) ; un
 * niveau inconnu reçoit une barre unique, jamais une teinte par défaut muette. */
const BARRES = {
  certain: '▮▮▮',
  high: '▮▮▮',
  probable: '▮▮',
  medium: '▮▮',
  disputed: '▮',
};
const BARRE_REPLI = '▮';

/* V2-01 — une seule feuille, entièrement préfixée. Les couleurs d'origine ne
 * sont jamais retirées : les repères ajoutés sont du texte, une forme, une
 * texture ou un trait. Aucune règle d'import distant, aucune ressource distante,
 * aucune règle de pagination globale. */
const CSS = `
  .points-v2-e048 #points-v2-e048-panel {
    margin: 10px 0 4px; padding: 11px 13px 12px;
    border: 1px solid var(--line, #444); border-left: 3px solid var(--gold, #b8943f);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d8d2c4); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e048 #points-v2-e048-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0c96b);
    font-family: var(--serif, Georgia, serif); font-size: 14px; font-weight: 600;
  }
  .points-v2-e048 .points-v2-e048-lede { margin: 0 0 8px; color: var(--muted, #9a9386); }
  .points-v2-e048 #points-v2-e048-register { margin: 0; padding: 0; list-style: none; }
  .points-v2-e048 .points-v2-e048-row {
    display: flex; gap: 8px; padding: 5px 0;
    border-top: 1px dashed var(--line, #444);
  }
  .points-v2-e048 .points-v2-e048-row:first-child { border-top: 0; }
  .points-v2-e048 .points-v2-e048-key {
    flex: 0 0 132px; color: var(--gold-bright, #f0c96b); font-weight: 600;
  }
  .points-v2-e048 .points-v2-e048-value {
    flex: 1 1 auto; min-width: 0; color: var(--muted, #9a9386);
  }
  .points-v2-e048 #points-v2-e048-ordinals,
  .points-v2-e048 #points-v2-e048-metric {
    margin: 8px 0 0; color: var(--muted-2, #8a857a); font-size: 9px;
  }
  .points-v2-e048 #points-v2-e048-filter-state {
    margin: 6px 0 0; padding: 5px 8px;
    border: 1px dashed var(--line, #444); border-radius: 6px;
    color: var(--ink-soft, #d8d2c4); font-size: 10px; line-height: 1.4;
  }

  /* V2-04 — drapeau en ::before : le ::after de .points-era appartient à la
   * passe 1 et n'est pas touché. */
  .points-v2-e048 .points-era[data-points-v2-e048-era="current"]::before {
    content: '\\25CF\\00A0\\00C8re courante\\00A0\\00B7\\00A0';
    font-size: 9px; font-weight: 700; color: var(--gold-bright, #f0c96b);
  }

  /* V2-06 — barres en ::after : le ::before de .confidence appartient à la
   * passe 1 et n'est pas touché. */
  .points-v2-e048 .confidence[data-points-v2-e048-bars]::after {
    content: '\\00A0' attr(data-points-v2-e048-bars);
    font-size: 9px; font-weight: 700; letter-spacing: 1px;
  }

  /* V2-07 — hachure de texture et marqueur ::after : le ::before de
   * .points-cell appartient à E002 et n'est pas touché. */
  .points-v2-e048 .points-cell[data-points-v2-e048-cell="filled"] {
    background-image: repeating-linear-gradient(135deg, transparent 0 3px, currentColor 3px 4px);
  }
  .points-v2-e048 .points-cell[data-points-v2-e048-cell="filled"]::after {
    content: '\\00A0\\25A8'; font-size: 8px; opacity: .8;
  }
  .points-v2-e048 .points-cell[data-points-v2-e048-cell="empty"]::after {
    content: '\\00A0\\25A2'; font-size: 8px;
  }

  /* V2-09 / V2-10 — replis défensifs : aucun mouvement propre à neutraliser. */
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e048 #points-v2-e048-panel,
    .points-v2-e048 .points-cell { transition: none; }
  }
  @media (prefers-contrast: more) {
    .points-v2-e048 .points-era[data-points-v2-e048-era="current"]::before,
    .points-v2-e048 .confidence[data-points-v2-e048-bars]::after { font-weight: 700; }
    .points-v2-e048 #points-v2-e048-filter-state { border-width: 2px; }
  }
  @media (forced-colors: active) {
    .points-v2-e048 #points-v2-e048-panel,
    .points-v2-e048 #points-v2-e048-filter-state {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e048 .points-cell[data-points-v2-e048-cell="filled"] {
      background-image: none; outline: 1px dashed CanvasText; outline-offset: -2px;
    }
    .points-v2-e048 .points-era[data-points-v2-e048-era="current"] {
      outline: 2px solid CanvasText; outline-offset: 1px;
    }
  }
  @media (max-width: 620px) {
    .points-v2-e048 .points-v2-e048-row { flex-wrap: wrap; gap: 2px 8px; }
    .points-v2-e048 .points-v2-e048-key { flex-basis: 100%; }
  }
`;

function textOf(node) {
  return node && typeof node.textContent === 'string'
    ? node.textContent.replace(/\s+/g, ' ').trim()
    : '';
}

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setIf(node, name, value) {
  if (node && typeof node.setAttribute === 'function' && node.getAttribute(name) !== value) {
    node.setAttribute(name, value);
  }
}

/* Un nœud possédé par identifiant : réutilisé s'il est déjà dans le layout,
 * sinon recréé après retrait d'un éventuel orphelin d'un rendu précédent. */
function uniqueNode(ctx, layout, id, tag, className) {
  let node = layout.querySelector('#' + id);
  if (node) return node;
  const orphan = document.getElementById(id);
  if (orphan && orphan.parentElement) orphan.parentElement.removeChild(orphan);
  node = ctx.el(tag, className);
  node.id = id;
  return node;
}

function placeAfter(parent, node, ref) {
  const want = ref ? ref.nextSibling : null;
  if (node.parentElement !== parent || node.nextSibling !== want) {
    if (want) parent.insertBefore(node, want);
    else parent.appendChild(node);
  }
}

/* V2-02 — recensement unique, entièrement dérivé du DOM rendu. Toute grandeur
 * publiée plus bas vient d'ici : aucun total n'est codé en dur dans le texte. */
function collect(layout) {
  const matrix = layout.querySelector('.points-matrix') || layout;
  const grid = layout.querySelector('.points-grid');
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headCells = head ? Array.prototype.slice.call(head.children) : [];
  const domains = Math.max(0, headCells.length - 1);
  const domainNames = headCells.slice(1).map(textOf);

  const rows = grid
    ? Array.prototype.slice.call(grid.children).filter((node) =>
        node !== head && node.classList && node.classList.contains('points-grid-row'))
    : [];
  const eras = rows.map((row) => {
    const button = row.querySelector('.points-era');
    return {
      row: row,
      button: button,
      name: textOf(button),
      active: row.classList.contains('is-active'),
    };
  });
  const activeEras = eras.filter((era) => era.active).length;

  const confidences = nodes(layout, '.points-meta .confidence').map((badge) => {
    const classes = badge.classList ? Array.prototype.slice.call(badge.classList) : [];
    let level = '';
    for (let i = 0; i < classes.length; i += 1) {
      if (classes[i].indexOf('is-') === 0) { level = classes[i].slice(3); break; }
    }
    return { node: badge, level: level || textOf(badge) || 'inconnu' };
  });

  const cells = nodes(layout, '.points-cell');
  let filled = 0;
  let empty = 0;
  cells.forEach((cell) => {
    if (cell.classList && cell.classList.contains('has-points')) filled += 1;
    else empty += 1;
  });

  const filters = nodes(layout, '.points-filters select').map((select) => ({
    node: select,
    label: select.getAttribute('aria-label') || 'Filtre',
    value: select.value || '*',
  }));

  return {
    matrix: matrix, grid: grid,
    domains: domains, domainNames: domainNames,
    eras: eras, activeEras: activeEras,
    confidences: confidences,
    filled: filled, empty: empty, cells: cells.length, cellNodes: cells,
    filters: filters,
  };
}

/* V2-09 — signature deterministe : aucun horodatage, aucune graine aléatoire,
 * aucun identifiant de session. Deux rendus du même DOM donnent la même chaîne. */
function signature(m) {
  return 'Réf. E048-V2 · ' + m.eras.length + ' ères · ' + m.activeEras + ' courante(s) · '
    + m.confidences.length + ' certitude(s) · ' + m.filled + '/' + m.cells + ' cases pleines';
}

function metricLine(m) {
  return signature(m) + ' · ' + CODAGES.length + ' codages documentés · '
    + m.filters.length + ' filtre(s) décrit(s) · ' + m.domains + ' domaine(s).';
}

function ordinalLine(m) {
  if (!m.eras.length) return 'Plan de lecture — aucune ère détectée dans la matrice.';
  const parts = m.eras.map((era, index) =>
    'Ère ' + (index + 1) + ' — ' + (era.name || 'sans nom') + (era.active ? ' (courante)' : ''));
  return 'Plan de lecture — ' + parts.join(' · ') + '.';
}

/* V2-04 — drapeau d'ère courante porté par un attribut de données et rendu en
 * ::before. Le contenu généré n'entre pas dans le textContent du bouton : le
 * nom accessible calculé par points.js reste intact, et le ::after de la passe
 * 1 n'est pas écrasé. */
function annotateEra(m) {
  m.eras.forEach((era) => {
    if (!era.button || !era.button.dataset) return;
    era.button.dataset.pointsV2E048Era = era.active ? 'current' : 'other';
  });
}

/* V2-06 — échelle de barres deterministe, lue sur la classe is-<niveau> réelle.
 * Le nom du niveau est conservé tel quel dans un attribut : aucune traduction
 * invented, aucun libellé tiers remplacé. */
function annotateConfidence(m) {
  m.confidences.forEach((item) => {
    const badge = item.node;
    if (!badge || !badge.dataset) return;
    badge.dataset.pointsV2E048Level = item.level;
    badge.dataset.pointsV2E048Bars = Object.prototype.hasOwnProperty.call(BARRES, item.level)
      ? BARRES[item.level]
      : BARRE_REPLI;
  });
}

/* V2-07 — état de cellule : hachure (texture) + marqueur ::after + fusion
 * additive de l'aria-label. Un libellé portant déjà « case pleine/vide » n'est
 * pas dupliqué ; un libellé tiers (E002) est conservé et complété. */
function annotateCells(m) {
  m.cellNodes.forEach((cell) => {
    if (!cell || !cell.classList || !cell.dataset) return;
    const filled = cell.classList.contains('has-points');
    const state = filled ? 'filled' : 'empty';
    const mention = filled ? 'case pleine' : 'case vide';
    cell.dataset.pointsV2E048Cell = state;
    const existing = cell.getAttribute('aria-label') || '';
    if (!new RegExp(mention, 'i').test(existing)) {
      setIf(cell, 'aria-label', existing ? existing + ' — ' + mention + '.' : mention + '.');
    }
  });
}

/* V2-08 — récapitulatif textuel des filtres. Nœud statique (role="note"), sans
 * région live supplémentaire : la cohabitation avec les annonces des autres
 * lentilles reste inchangée. Aucun écouteur : un changement de filtre déclenche
 * un nouveau rendu, donc une nouvelle dérivation depuis le DOM. */
function ensureFilterNote(ctx, layout, m) {
  const note = uniqueNode(ctx, layout, ID.FILTER, 'p', 'points-v2-e048-filter-state');
  setIf(note, 'role', 'note');
  write(note, m.filters.length
    ? 'Filtres — ' + m.filters.map((filter) =>
        filter.label + ' : ' + (filter.value === '*' ? 'tous' : filter.value)).join(' · ')
      + '. Aucun de ces états n’est porté par la seule couleur.'
    : 'Aucun filtre détecté dans cette vue.');
  const filters = layout.querySelector('.points-filters') || m.matrix;
  if (note.parentElement !== filters) filters.appendChild(note);
  return note;
}

/* V2-03 + V2-05 + V2-09 — panneau unique : registre des codages, plan de
 * lecture ordinal et métrique publiée. Construit exclusivement avec ctx.el,
 * replaceChildren et textContent, sans aucune écriture de balisage en chaîne. */
function ensurePanel(ctx, layout, m) {
  const panel = uniqueNode(ctx, layout, ID.PANEL, 'section', 'points-v2-e048-panel');
  setIf(panel, 'role', 'region');
  setIf(panel, 'aria-labelledby', ID.TITLE);

  const title = ctx.el('h2', 'points-v2-e048-title', 'Aucune information par la seule couleur — seconde passe');
  title.id = ID.TITLE;
  const lede = ctx.el('p', 'points-v2-e048-lede',
    'Chaque signal coloré de la matrice est doublé d’un texte, d’une forme, d’une texture ou d’un trait. '
    + 'Aucune couleur existante n’a été retirée : ce registre décrit les redondances ajoutées.');

  const register = ctx.el('ul', 'points-v2-e048-register');
  register.id = ID.REGISTER;
  CODAGES.forEach((pair) => {
    const row = ctx.el('li', 'points-v2-e048-row');
    row.append(ctx.el('span', 'points-v2-e048-key', pair[0]),
               ctx.el('span', 'points-v2-e048-value', pair[1]));
    register.appendChild(row);
  });

  const ordinals = ctx.el('p', 'points-v2-e048-ordinals', ordinalLine(m));
  ordinals.id = ID.ORDINALS;
  const metric = ctx.el('p', 'points-v2-e048-metric', metricLine(m));
  metric.id = ID.METRIC;

  panel.replaceChildren(title, lede, register, ordinals, metric);
  placeAfter(m.matrix, panel, m.grid);
  return panel;
}

/* V2-10 — audition d'unicité : un seul nœud par identifiant possédé, une seule
 * feuille, une seule marque de coexistence. Observable sans instrumenter le
 * rendu via l'attribut data-points-v2-e048-audit. */
function audit(layout, m) {
  const ids = Object.keys(ID).map((key) => ID[key]);
  let unique = 0;
  ids.forEach((id) => {
    if (document.querySelectorAll('#' + id).length === 1) unique += 1;
  });
  layout.setAttribute('data-points-v2-e048-audit',
    unique + '/' + ids.length + ' nœuds uniques · ' + m.eras.length + ' ères · '
    + m.confidences.length + ' certitudes · ' + m.cells + ' cases');
  layout.setAttribute('data-points-v2-e048-signature', signature(m));
}

register('E048', (ctx) => {
  /* V2-01 / V2-10 — gardes de type avant toute écriture, puis neutralisation
   * muette de la lentille en cas d'anomalie de DOM. */
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined' || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'pointsv2' && ctx.viewId !== 'points') return;

  try {
    const layout = ctx.layout;
    ctx.css(CSS_ID, CSS);
    layout.classList.add(SCOPE);
    layout.setAttribute('data-points-v2-e048', '1');

    const m = collect(layout);
    annotateEra(m);                       /* V2-04 */
    annotateConfidence(m);                /* V2-06 */
    annotateCells(m);                     /* V2-07 */
    ensureFilterNote(ctx, layout, m);     /* V2-08 */
    ensurePanel(ctx, layout, m);          /* V2-03 / V2-05 / V2-09 */
    audit(layout, m);                     /* V2-10 */
  } catch {
    return;
  }
});
