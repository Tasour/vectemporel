import { register } from './registry.js';

/* Lentille V2 E073 — H. Responsive & mobile : situation et navigation latérale
 * de la matrice de couverture.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E073.md — chantiers E073-01 à E073-10.
 * Fichier possédé : src/views/points/v2/E073.js uniquement. Lectures seules :
 * la passe 1 (src/views/points/E073.js, UNIFIED_AUDIT/POINTS/views/E073.md),
 * le modèle de domaine H (src/views/chronology/v2/E073.js,
 * UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E073.md), la vue points.js et registry.js.
 * Ne sont ni édités ni doublés : la passe 1, la vue points.js, registry.js,
 * index.js, styles.css, ni aucune autre lentille.
 *
 * La passe 1 rend déjà le défilement de .points-grid découvrable (barre de
 * progression, conseil, flèches ≥ 44 px, colonne « Ère » épinglée sous 600 px,
 * région clavier, compteur live). La V2 ne remplace aucun de ces nœuds : elle
 * ajoute un panneau de situation DISTINCT, en flux dans .points-matrix, hors du
 * conteneur défilant, qui expose dix améliorations mesurées sur la géométrie
 * réelle : débordement, largeur de colonne, rappel de l'ère active, fenêtre de
 * domaines visibles, saut direct à un domaine, restauration de position,
 * mouvement réduit, accessibilité clavier, idempotence et métriques publiées.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css, ctx.el, ctx.reducedMotion fournis par points/v2/registry.js. Aucune
 * région live n'est ajoutée (la passe 1 porte la seule de cette vue) : l'état
 * est écrit en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants : un seul register('E073', …), un seul ctx.css('points-v2-e073', …),
 * toutes les règles CSS préfixées .points-v2-e073, tous les IDs préfixés
 * points-v2-e073- et protégés par une garde d'existence, un seul écouteur
 * scroll passif marqué en dataset, zéro rAF, zéro timer, zéro réseau, zéro aléa,
 * zéro journalisation, zéro HTML brut. Les marqueurs data-v2-e073-* sont
 * distincts des data-points-e073-* de la passe 1 : aucune collision sur le DOM
 * partagé.
 */

const CSS_ID = 'points-v2-e073';
const SCOPE = 'points-v2-e073';

const PANEL_ID = 'points-v2-e073-panel';
const TITLE_ID = 'points-v2-e073-title';
const OVERFLOW_ID = 'points-v2-e073-overflow';
const COLUMN_ID = 'points-v2-e073-column';
const ERA_ID = 'points-v2-e073-era';
const VISIBLE_ID = 'points-v2-e073-visible';
const MOTION_ID = 'points-v2-e073-motion';
const RESTORE_ID = 'points-v2-e073-restore';
const RENDERS_ID = 'points-v2-e073-renders';
const JUMP_ID = 'points-v2-e073-jump';
const BILAN_ID = 'points-v2-e073-bilan';

/* Sélecteurs strictement bornés à la grille réellement rendue par points.js. */
const HEAD_SELECTOR = '.points-grid-row.is-head > span';
const ERA_SELECTOR = '.points-grid-row.is-active .points-era';

/* E073-01 à E073-10 : feuille unique. Chaque règle est préfixée
 * .points-v2-e073 : aucune ne fuit hors de la lentille. Le panneau est un bloc
 * en flux inséré à la fin de .points-matrix, jamais modal, jamais superposé ;
 * il n'ajoute qu'un seul arrêt Tab (le sélecteur de domaine). */
const CSS = `
  .${SCOPE} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e073-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e073-lede { margin: 0 0 8px; color: var(--muted); }
  .points-v2-e073-list { margin: 0 0 10px; padding: 0; }
  .points-v2-e073-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  .points-v2-e073-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  .points-v2-e073-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  .points-v2-e073-jump-label {
    display: block; margin: 0 0 4px; color: var(--muted);
  }
  .points-v2-e073-jump {
    display: block; box-sizing: border-box; width: 100%;
    min-height: 44px; min-width: 44px; padding: 0 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: var(--surface-2, rgba(255,255,255,.04)); color: var(--ink);
    font: inherit; font-size: 12px;
  }
  .points-v2-e073-bilan {
    margin: 9px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  .points-v2-e073-panel:focus-visible,
  .points-v2-e073-jump:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .points-v2-e073-row { flex-wrap: wrap; gap: 1px 8px; }
    .points-v2-e073-key { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .${SCOPE}, .${SCOPE} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .${SCOPE}, .points-v2-e073-jump {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e073-title, .points-v2-e073-key,
    .points-v2-e073-val, .points-v2-e073-bilan,
    .points-v2-e073-jump-label { color: CanvasText; }
  }
`;

let installs = 0;
let grid = null;
let reduced = false;
let lastRestored = false;
let memory = { shape: '', x: 0 };
let refs = {
  panel: null, overflow: null, column: null, era: null, visible: null,
  motion: null, restore: null, renders: null, jump: null, bilan: null,
};

/* --- Sélecteurs et écritures défensives (jamais d'exception sur un DOM partiel). */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}
function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}
function setData(node, key, value) {
  if (node && node.dataset && node.dataset[key] !== value) node.dataset[key] = value;
}
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* --- Mesures : toutes dérivées de la géométrie réelle, aucune constante de
 * largeur ni de nombre de colonnes écrite en dur. */
function maxScroll(g) {
  return g ? Math.max(0, g.scrollWidth - g.clientWidth) : 0;
}
function headerSpans(g) {
  return qa(g, HEAD_SELECTOR);
}
function domainSpans(g) {
  return headerSpans(g).slice(1); // première colonne = « Ère »
}
function columnWidth(g) {
  const head = headerSpans(g)[1];
  return head && head.offsetWidth > 0 ? head.offsetWidth : 0;
}
function activeEra(g) {
  const node = q(g, ERA_SELECTOR);
  return node && node.textContent ? node.textContent.trim() : '';
}
function gridShape(g) {
  if (!g) return '';
  const rows = qa(g, '.points-grid-row').length;
  const cols = headerSpans(g).length;
  return `${cols}x${rows}`;
}

/* E073-05 : fenêtre de domaines réellement à l'écran, par intersection des
 * rectangles des en-têtes avec la zone visible de la grille. */
function visibleWindow(g, spans) {
  const gb = g.getBoundingClientRect();
  const indexes = [];
  spans.forEach((span, index) => {
    if (typeof span.getBoundingClientRect !== 'function') return;
    const r = span.getBoundingClientRect();
    if (r.width > 0 && r.right > gb.left + 1 && r.left < gb.right - 1) indexes.push(index);
  });
  return {
    indexes,
    count: indexes.length,
    first: indexes.length ? indexes[0] : -1,
    last: indexes.length ? indexes[indexes.length - 1] : -1,
  };
}

/* E073-02 à E073-05, E073-07 à E073-10 : une seule fonction de rafraîchissement.
 * Les marqueurs data-v2-e073-* rendent chaque grandeur auditable par harnais,
 * distincts des data-points-e073-* de la passe 1. */
function update() {
  const g = grid;
  const panel = refs.panel;
  if (!g || !g.isConnected || !panel || !panel.isConnected) return;

  const max = maxScroll(g);
  const x = Math.max(0, Math.min(max, Math.round(g.scrollLeft)));
  const pct = max > 0 ? Math.round((x / max) * 100) : 100;
  const col = columnWidth(g);
  const spans = domainSpans(g);
  const win = visibleWindow(g, spans);
  const era = activeEra(g);

  write(refs.overflow, max > 0
    ? `${max} px au-delà du conteneur : la matrice défile horizontalement.`
    : 'Aucun débordement : la matrice tient dans le conteneur.');
  write(refs.column, col > 0
    ? `${col} px, mesurés sur l’en-tête réel.`
    : 'Non mesurable sur ce rendu.');
  write(refs.era, era || 'Aucune ère active.');
  write(refs.visible, spans.length
    ? (win.count
      ? `${win.count} sur ${spans.length} à l’écran : ${(spans[win.first].textContent || '').trim()} → ${(spans[win.last].textContent || '').trim()}.`
      : `0 sur ${spans.length} à l’écran.`)
    : 'Aucun domaine déclaré.');
  write(refs.motion, reduced
    ? 'Instantané : mouvement réduit demandé par le système.'
    : 'Fluide : le système force l’instantané si le mouvement réduit est demandé.');
  write(refs.restore, lastRestored
    ? 'Position horizontale mémorisée puis restaurée (structure de matrice identique).'
    : 'Aucune position antérieure compatible : défilement initial.');
  write(refs.renders, String(installs));
  write(refs.bilan, `Position ${x} / ${max} px · ${pct} % · ${spans.length} domaines · colonne ${col} px · ère « ${era || '—'} ».`);

  setData(panel, 'v2E073Overflow', String(max));
  setData(panel, 'v2E073Column', String(col));
  setData(panel, 'v2E073Domains', String(spans.length));
  setData(panel, 'v2E073Visible', String(win.count));
  setData(panel, 'v2E073Reduced', reduced ? '1' : '0');
  setData(panel, 'v2E073Restored', lastRestored ? '1' : '0');
  setData(panel, 'v2E073Renders', String(installs));
  setData(panel, 'v2E073Shape', gridShape(g));
}

/* E073-07 : mémorisation de la position horizontale à chaque défilement, sans
 * écriture dans le store partagé. La clé de forme évite de restaurer une
 * position issue d'une matrice au nombre de colonnes différent. */
function onScroll() {
  const g = grid;
  if (!g) return;
  memory = { shape: gridShape(g), x: Math.round(g.scrollLeft) };
  update();
}

/* E073-06 et E073-08 : saut natif à la colonne choisie. L'amplitude est
 * calculée depuis le rectangle réel de l'en-tête ; le mouvement doux est
 * délégué au navigateur et devient instantané sous préférence de mouvement
 * réduit. Aucun timer, aucune animation propre. */
function jumpTo(index) {
  const g = grid;
  if (!g || !g.isConnected) return;
  const span = domainSpans(g)[index];
  if (!span || typeof span.getBoundingClientRect !== 'function') return;
  const gb = g.getBoundingClientRect();
  const sb = span.getBoundingClientRect();
  const target = Math.max(0, Math.min(maxScroll(g), g.scrollLeft + (sb.left - gb.left) - 6));
  if (reduced || typeof g.scrollBy !== 'function') {
    g.scrollLeft = target;
  } else {
    try { g.scrollBy({ left: target - g.scrollLeft, behavior: 'smooth' }); }
    catch { g.scrollLeft = target; }
  }
  setData(g, 'v2E073Jump', (span.textContent || '').trim());
}

function onChange() {
  const node = refs.jump;
  if (!node || node.value === '') return;
  const index = Number(node.value);
  if (!Number.isFinite(index) || index < 0) return;
  jumpTo(index);
}

/* E073-10 : un seul écouteur par nœud, posé sous marqueur de données. */
function bindScroll(g) {
  if (!g || g.dataset.v2E073Scroll === '1') return;
  g.addEventListener('scroll', onScroll, { passive: true });
  setData(g, 'v2E073Scroll', '1');
}
function bindJump(node) {
  if (!node || node.dataset.v2E073Bound === '1') return;
  node.addEventListener('change', onChange);
  setData(node, 'v2E073Bound', '1');
}

function addRow(list, make, key, id) {
  const row = make('div', 'points-v2-e073-row');
  const dt = make('dt', 'points-v2-e073-key', key);
  const dd = make('dd', 'points-v2-e073-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

function buildOptions(jump, make, domains) {
  const options = [make('option', '', 'Choisir un domaine…')];
  options[0].value = '';
  domains.forEach((domain, index) => {
    const option = make('option', '', domain);
    option.value = String(index);
    options.push(option);
  });
  jump.replaceChildren(...options);
}

/* La passe V2 est appelée avec viewId 'pointsv2' (points.js:128). Le garde
 * évite une installation accidentelle sur un autre contrat de rendu. */
register('E073', (ctx) => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;
  if (ctx.viewId && ctx.viewId !== 'pointsv2') return;

  installs += 1;
  ctx.css(CSS_ID, CSS);
  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  const matrix = q(ctx.layout, '.points-matrix') || ctx.layout;
  const g = q(matrix, '.points-grid');
  if (!g || typeof g.getBoundingClientRect !== 'function') return;
  grid = g;

  /* Panneau autonome, en dehors du conteneur défilant : il ne bouge pas quand
   * la matrice défile, ce qui assure le rappel d'ère (E073-04). */
  const panel = ensureNode(make, PANEL_ID, 'section', SCOPE, matrix);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'points-v2-e073-title', 'Défilement latéral — situation de la matrice');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e073-lede', 'Ce panneau mesure le défilement horizontal de la matrice : débordement, largeur de colonne, ère active, domaines à l’écran et saut direct. Il n’ajoute aucune annonce live et ne modifie aucun contrôle existant.');

  const dl = make('dl', 'points-v2-e073-list');
  const overflow = addRow(dl, make, 'Débordement horizontal', OVERFLOW_ID);
  const column = addRow(dl, make, 'Largeur d’une colonne', COLUMN_ID);
  const era = addRow(dl, make, 'Ère active (hors défilement)', ERA_ID);
  const visible = addRow(dl, make, 'Domaines à l’écran', VISIBLE_ID);
  const motion = addRow(dl, make, 'Comportement du saut', MOTION_ID);
  const restore = addRow(dl, make, 'Position restaurée', RESTORE_ID);
  const renders = addRow(dl, make, 'Rendus du greffon', RENDERS_ID);

  const jumpLabel = make('label', 'points-v2-e073-jump-label', 'Sauter directement à un domaine');
  jumpLabel.htmlFor = JUMP_ID;
  const jump = ensureNode(make, JUMP_ID, 'select', 'points-v2-e073-jump', panel);
  jump.setAttribute('aria-label', 'Sauter directement à un domaine de la matrice');
  const bilan = make('p', 'points-v2-e073-bilan');
  bilan.id = BILAN_ID;

  panel.replaceChildren(title, lede, dl, jumpLabel, jump, bilan);
  refs = { panel, overflow, column, era, visible, motion, restore, renders, jump, bilan };

  const domains = domainSpans(g)
    .map((span) => (span.textContent || '').trim())
    .filter(Boolean);
  buildOptions(jump, make, domains);

  bindScroll(g);
  bindJump(jump);

  const shape = gridShape(g);
  lastRestored = memory.shape === shape && memory.x > 0 && maxScroll(g) > 0;
  if (lastRestored) g.scrollLeft = Math.min(maxScroll(g), memory.x);
  setData(g, 'v2E073Restored', lastRestored ? '1' : '0');

  update();
});
