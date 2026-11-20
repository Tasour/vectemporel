import { register } from './registry.js';

/* Lentille E071 — passe V2, domaine H (responsive & mobile).
 * Thème canonique : « H. Responsive & mobile — grille fluide en 390×844 »
 * (UNIFIED_AUDIT/POINTS/themes.json:79). Rapport : UNIFIED_AUDIT/POINTS/V2/views/E071.md.
 * Fichier possédé : src/views/points/v2/E071.js uniquement. Lectures seules :
 * registry.js, index.js, src/views/points.js, styles.css, E071.js (passe 1),
 * src/views/chronology/v2/E071.js (modèle de style V2 du même domaine).
 *
 * La passe 1 (src/views/points/E071.js) a posé le socle CSS fluide : rupture à
 * 620 px, pistes minmax/fr, min-width:0, clamp(), cibles 44 px, filtres en
 * grille. La passe V2 ne double aucun de ces réglages : elle ajoute un panneau
 * de MESURE en lecture seule, strictement additif, qui rend visibles dix faits
 * de mise en page recalculés depuis le DOM, les styles et la géométrie réels.
 * Aucune cellule, aucun filtre, aucun détail n'est modifié ni réordonné.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion()
 * (registry.js:28-43). Le registre V2 n'expose pas de say() : la lentille
 * n'ajoute AUCUNE région live et n'écrit dans aucune région existante ; son
 * état est affiché en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E071', …), une seule feuille ctx.css('points-v2-e071', …) ;
 * - chaque sélecteur CSS est préfixé .points-v2-e071 (classe de portée posée
 *   sur .points-layout) : aucune règle ne fuit hors de la vue ;
 * - tous les IDs DOM sont préfixés points-v2-e071- et protégés par une garde
 *   d'existence (idempotence multi-rendus) ;
 * - zéro journalisation, zéro réseau, zéro aléa, zéro HTML brut, zéro timer,
 *   zéro rAF, zéro écouteur, zéro animation propre.
 *
 * Les dix chantiers V2, distincts de ceux de la passe 1 :
 * 01 largeur mesurée / cible 390×844 · 02 inventaire des domaines et alignement
 * en-tête/corps · 03 débordement horizontal de la page · 04 confinement du
 * défilement de la grille · 05 cibles tactiles ≥ 44 px · 06 mouvement réduit ·
 * 07 couverture binaire lue comme donnée · 08 ruptures actives · 09 replis de
 * la feuille injectée · 10 idempotence et signature anti-écriture redondante.
 */

const CSS_ID = 'points-v2-e071';
const SCOPE = 'points-v2-e071';
const PANEL_ID = 'points-v2-e071-panel';
const TITLE_ID = 'points-v2-e071-title';
const VIEWPORT_ID = 'points-v2-e071-viewport';
const ALIGN_ID = 'points-v2-e071-align';
const OVERFLOW_ID = 'points-v2-e071-overflow';
const SCROLL_ID = 'points-v2-e071-scroll';
const TARGET_ID = 'points-v2-e071-target';
const MOTION_ID = 'points-v2-e071-motion';
const COVERAGE_ID = 'points-v2-e071-coverage';
const BREAKPOINT_ID = 'points-v2-e071-breakpoint';
const FALLBACK_ID = 'points-v2-e071-fallback';
const RENDERS_ID = 'points-v2-e071-renders';
const BILAN_ID = 'points-v2-e071-bilan';

/* Feuille unique, intégralement préfixée `.points-v2-e071`. Les règles de
   mesure ciblent le panneau ; deux gardes additifs (grille et libellés) ne
   contredisent pas la passe 1 et restent sans effet cassant sur desktop.
   Aucune information n'est portée par la seule couleur. */
const CSS = `
/* E071-01 à E071-09 — panneau de mesure, portée .points-v2-e071. */
.points-v2-e071 .points-v2-e071-panel {
  margin: 14px 0 4px;
  padding: 10px 12px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold);
  border-radius: 10px;
  background: rgba(255, 255, 255, .02);
  color: var(--ink-soft);
  font: inherit; font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-v2-e071 .points-v2-e071-title {
  margin: 0 0 6px; color: var(--gold-bright);
  font-family: var(--serif); font-size: 14px; font-weight: 600;
  letter-spacing: 0; text-transform: none;
}
.points-v2-e071 .points-v2-e071-lede { margin: 0 0 8px; color: var(--muted); }
.points-v2-e071 .points-v2-e071-list { margin: 0; padding: 0; }
.points-v2-e071 .points-v2-e071-row {
  display: flex; gap: 10px; margin: 0 0 3px;
  padding: 0 0 3px; border-bottom: 1px solid var(--line);
}
.points-v2-e071 .points-v2-e071-key { flex: 0 0 150px; margin: 0; color: var(--muted); }
.points-v2-e071 .points-v2-e071-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
.points-v2-e071 .points-v2-e071-bilan {
  margin: 8px 0 0; padding-top: 7px;
  border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
}

/* E071-04 — confinement additif : la grille ne peut pas dépasser sa colonne. */
.points-v2-e071 .points-grid { max-width: 100%; }

/* E071-02 / E071-07 — libellés qui se coupent plutôt que de déborder. */
.points-v2-e071 .points-grid-row > span,
.points-v2-e071 .points-grid-row > button { overflow-wrap: anywhere; }

/* E071-08 — le panneau suit la largeur réelle sous la rupture de la passe 1. */
@media (max-width: 620px) {
  .points-v2-e071 .points-v2-e071-row { flex-wrap: wrap; gap: 1px 8px; }
  .points-v2-e071 .points-v2-e071-key { flex-basis: 100%; }
  .points-v2-e071 .points-v2-e071-panel { padding: clamp(10px, 3vw, 12px); }
}

/* E071-09 — replis défensifs : aucune animation n'est créée, seulement
   neutralisée ; contraste textuel de secours en couleurs forcées. */
@media (prefers-reduced-motion: reduce) {
  .points-v2-e071 .points-v2-e071-panel,
  .points-v2-e071 .points-v2-e071-panel * {
    animation: none !important; transition: none !important;
  }
}
@media (forced-colors: active) {
  .points-v2-e071 .points-v2-e071-panel {
    border: 1px solid CanvasText; border-left: 3px solid CanvasText;
    background: Canvas; color: CanvasText;
  }
  .points-v2-e071 .points-v2-e071-title,
  .points-v2-e071 .points-v2-e071-key,
  .points-v2-e071 .points-v2-e071-val,
  .points-v2-e071 .points-v2-e071-bilan { color: CanvasText; }
}
`;

function occurrences(regex) {
  return (CSS.match(regex) || []).length;
}

/* Audit de la feuille unique, calculé une fois depuis sa chaîne source : chaque
   chiffre affiché en résulte, aucun n'est inventé. */
const CSS_AUDIT = Object.freeze({
  media: occurrences(/@media/g),
  clamps: occurrences(/clamp\(/g),
  minZero: occurrences(/min-width:\s*0/g),
  reduced: occurrences(/prefers-reduced-motion:\s*reduce/g),
  forced: occurrences(/forced-colors:\s*active/g),
  scope: occurrences(/\.points-v2-e071/g),
});

let installs = 0;
let refs = {
  panel: null, viewport: null, align: null, overflow: null, scroll: null,
  target: null, motion: null, coverage: null, breakpoint: null,
  fallback: null, renders: null, bilan: null,
};
let snapshot = {
  width: 0, pageOverflow: 0, narrow: false, portrait: false,
  desktopSplit: false, shortView: false, domains: 0, rows: 0, aligned: false,
  gridOverflow: 0, minTarget: null, declaredMin: null,
  cells: 0, filled: 0, reduced: false,
};

/* E071-10 — garde d'existence : la coque reconstruisant le stage, le panneau
   d'un rendu précédent est détaché ; on le réutilise et on le déplace dans le
   parent courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function taillePx(valeur) {
  const trouve = String(valeur || '').match(/([0-9]+(?:\.[0-9]+)?)px/);
  return trouve ? parseFloat(trouve[1]) : null;
}

function pourcentage(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

/* E071-01 à E071-08 — mesure en lecture seule de la grille et du viewport.
   Aucun contenu historique n'est lu ni inventé : seuls des faits de mise en
   page (largeur, orientation, ruptures, comptage, géométrie) sont relevés. */
function measure(host) {
  const root = document.documentElement;
  const width = root && typeof root.clientWidth === 'number' ? root.clientWidth : 0;
  const pageOverflow = root
    ? Math.max(0, (root.scrollWidth || 0) - (root.clientWidth || 0)) : 0;
  const matches = (query) => {
    try {
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches : false;
    } catch { return false; }
  };

  const head = host.querySelector('.points-grid-row.is-head');
  const rows = Array.from(host.querySelectorAll('.points-grid-row:not(.is-head)'));
  const headChildren = head ? head.children.length : 0;
  const domains = head ? head.querySelectorAll('span').length : 0;
  const aligned = headChildren > 0 && rows.every((row) => row.children.length === headChildren);

  const grid = host.querySelector('.points-grid');
  const gridOverflow = grid
    ? Math.max(0, (grid.scrollWidth || 0) - (grid.clientWidth || 0)) : 0;

  let minTarget = null;
  let declaredMin = null;
  Array.from(host.querySelectorAll('.points-grid-row > button')).forEach((node) => {
    const h = typeof node.offsetHeight === 'number' ? node.offsetHeight : 0;
    if (h > 0) minTarget = minTarget === null ? h : Math.min(minTarget, h);
    try {
      const v = taillePx(window.getComputedStyle(node).minHeight);
      if (v !== null) declaredMin = declaredMin === null ? v : Math.min(declaredMin, v);
    } catch { /* mesure de style indisponible : on s'en passe. */ }
  });

  const cells = Array.from(host.querySelectorAll('.points-cell'));
  const filled = cells.filter((cell) => cell.classList
    && cell.classList.contains('has-points')).length;

  return {
    width,
    pageOverflow,
    narrow: matches('(max-width: 620px)'),
    portrait: matches('(orientation: portrait)'),
    desktopSplit: matches('(max-width: 1000px)'),
    shortView: matches('(max-height: 520px)'),
    domains,
    rows: rows.length,
    aligned,
    gridOverflow,
    minTarget,
    declaredMin,
    cells: cells.length,
    filled,
  };
}

function breakpoints(s) {
  const actifs = [];
  if (s.desktopSplit) actifs.push('1000 px');
  if (s.narrow) actifs.push('620 px');
  if (s.shortView) actifs.push('hauteur ≤ 520 px');
  if (s.portrait) actifs.push('portrait');
  return actifs;
}

function signature(s) {
  return [
    `largeur:${s.width}`,
    `debordement:${s.pageOverflow}`,
    `domaines:${s.domains}`,
    `aligne:${s.aligned ? 1 : 0}`,
    `grille:${s.gridOverflow}`,
    `cible:${s.minTarget === null ? '-' : s.minTarget}`,
    `mouvement:${s.reduced ? 1 : 0}`,
    `couverture:${s.filled}/${s.cells}`,
    `css:${CSS_AUDIT.scope}`,
    'chantiers:10',
    `rendus:${installs}`,
  ].join(' ');
}

/* E071-01 à E071-10 — état affiché en texte visible ordinaire, sans région
   live et sans écriture redondante (write déduplique les textes). */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const s = snapshot;
  const actifs = breakpoints(s);
  const cible = s.minTarget === null ? 'non mesurables'
    : `${s.minTarget} px mesurés${s.declaredMin === null ? '' : ` (${s.declaredMin} px déclarés)`}`;

  write(r.viewport, `${s.width} px de large mesurés · cible de fluidité 390×844.`);
  write(r.align, `${s.domains} colonne(s) de domaine · ${s.rows} ligne(s) d'ère · `
    + `gabarit en-tête/corps ${s.aligned ? 'aligné' : 'à revérifier'}.`);
  write(r.overflow, s.pageOverflow === 0
    ? 'Aucun débordement horizontal de la page · mesure prise sur documentElement.'
    : `${s.pageOverflow} px de débordement horizontal de la page · mesure prise sur documentElement.`);
  write(r.scroll, s.gridOverflow > 0
    ? `La grille défile de ${s.gridOverflow} px en largeur · défilement confiné, page non déplacée.`
    : 'La grille tient dans son conteneur · aucun défilement latéral nécessaire.');
  write(r.target, `Cibles tactiles : ${cible} · seuil 44 px : `
    + `${s.minTarget !== null && s.minTarget >= 44 ? 'conforme' : 'à renforcer'}.`);
  write(r.motion, `Mouvement réduit : ${s.reduced ? 'préférence active' : 'préférence inactive'} `
    + '· la feuille V2 n’introduit aucune animation propre.');
  write(r.coverage, `Couverture binaire lue comme donnée : ${s.filled}/${s.cells} cellule(s) pourvue(s), `
    + `soit ${pourcentage(s.filled, s.cells)} % · jamais la seule couleur.`);
  write(r.breakpoint, `Ruptures actives : ${actifs.length ? actifs.join(', ') : 'aucune'} `
    + `· largeur ${s.width} px.`);
  write(r.fallback, `Replis de la feuille : mouvement réduit ${CSS_AUDIT.reduced}, `
    + `couleurs forcées ${CSS_AUDIT.forced} · ${CSS_AUDIT.clamps} valeur(s) fluide(s) clamp().`);
  write(r.renders, String(installs));
  write(r.bilan, `Grille fluide : ${s.domains} colonne(s), ${s.rows} ligne(s), `
    + `${s.cells} cellule(s), ${CSS_AUDIT.media} repli(s) média, ${CSS_AUDIT.scope} sélecteur(s) préfixé(s). `
    + `${s.narrow ? 'Vue étroite : la mesure est relevée sur le rendu réel.' : 'Vue large : les mêmes règles restent sans effet cassant.'}`);

  setData(r.panel, 'e071Width', String(s.width));
  setData(r.panel, 'e071Overflow', String(s.pageOverflow));
  setData(r.panel, 'e071Domains', String(s.domains));
  setData(r.panel, 'e071Aligned', s.aligned ? '1' : '0');
  setData(r.panel, 'e071Scroll', String(s.gridOverflow));
  setData(r.panel, 'e071Target', s.minTarget === null ? '-' : String(s.minTarget));
  setData(r.panel, 'e071Reduced', s.reduced ? '1' : '0');
  setData(r.panel, 'e071Coverage', `${s.filled}/${s.cells}`);
  setData(r.panel, 'e071Breakpoints', actifs.join('|'));
  setData(r.panel, 'e071Renders', String(installs));
}

function addRow(list, make, key, id) {
  const row = make('div', 'points-v2-e071-row');
  const dt = make('dt', 'points-v2-e071-key', key);
  const dd = make('dd', 'points-v2-e071-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

register('E071', (ctx) => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout;
  if (typeof layout.classList === 'object') layout.classList.add(SCOPE);

  /* Le panneau est ajouté en fin de colonne matrice, qui défile en interne :
     il ne s'insère pas dans la grille à deux colonnes de .points-layout. */
  const host = layout.querySelector
    ? (layout.querySelector('.points-matrix') || layout) : layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e071-panel', host);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Mesures V2 de la grille fluide en 390×844');

  const title = make('h2', 'points-v2-e071-title', 'Grille fluide en 390×844 — mesures V2');
  title.id = TITLE_ID;
  const lede = make('p', 'points-v2-e071-lede',
    'Ce panneau rend visibles dix faits de mise en page recalculés depuis le DOM, '
    + 'les styles et la géométrie réellement rendus. Il n’ajoute aucune région live, '
    + 'ne détourne aucun contrôle et n’invente aucune donnée.');

  const list = make('dl', 'points-v2-e071-list');
  const viewport = addRow(list, make, 'Largeur mesurée', VIEWPORT_ID);
  const align = addRow(list, make, 'Domaines / alignement', ALIGN_ID);
  const overflow = addRow(list, make, 'Débordement de page', OVERFLOW_ID);
  const scroll = addRow(list, make, 'Défilement de la grille', SCROLL_ID);
  const target = addRow(list, make, 'Cibles tactiles', TARGET_ID);
  const motion = addRow(list, make, 'Mouvement réduit', MOTION_ID);
  const coverage = addRow(list, make, 'Couverture binaire', COVERAGE_ID);
  const breakpoint = addRow(list, make, 'Ruptures actives', BREAKPOINT_ID);
  const fallback = addRow(list, make, 'Replis de la feuille', FALLBACK_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  const bilan = make('p', 'points-v2-e071-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt qu'une affectation de HTML brut : les nœuds de la
     rendu précédente sont détachés, donc aucun ID en doublon ne subsiste. */
  panel.replaceChildren(title, lede, list, bilan);

  const s = measure(host);
  s.reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  snapshot = s;
  refs = {
    panel, viewport, align, overflow, scroll, target, motion,
    coverage, breakpoint, fallback, renders, bilan,
  };
  paint();

  /* Signature consolidée, lisible depuis l'inspecteur, hors aria-live. */
  layout.dataset.pointsV2E071 = '1';
  layout.setAttribute('data-points-v2-e071-metrics', signature(s));
});
