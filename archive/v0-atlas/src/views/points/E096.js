import { register } from './registry.js';

/* Lentille E096 — Pédagogie & narration : comparaison chiffrée de la couverture
 * (domaine J : théorie & transmission). Rapport : UNIFIED_AUDIT/POINTS/views/E096.md
 * — chantiers E096-01 à E096-10.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E096 ajoute un panneau LOCAL de
 * lecture, non modal, accroché à .points-matrix, et ne fait que LIRE le DOM déjà
 * produit par la vue. Le greffon de la coque (? / #atlas-help) n'est pas touché.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : la narration reste vraie
 * avec un ctx minimal.
 *
 * Invariants :
 * - aucun chiffre de couverture codé en dur : ni « 784 », ni « 845 », ni un
 *   total littéral — tout est dérivé des cellules réellement rendues ;
 * - un seul CSS, un seul panneau, une seule région live, un seul observateur ;
 * - non destructif et idempotent : aucun gestionnaire natif retiré, aucun
 *   nœud périmé conservé, aucun doublon après un second passage ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*, zéro innerHTML.
 */

const CSS_ID = 'points-e096';
const SCOPE = 'points-e096';
const PANEL_ID = 'points-e096-pedagogy';
const TITLE_ID = 'points-e096-title';
const READOUT_ID = 'points-e096-readout';
const SCOPE_ATTR = 'data-e096-reduced';

/* Toutes les règles sont préfixées par `.points-e096`, classe posée sur
 * .points-layout : aucune fuite hors de cette vue. L'info n'est jamais portée
 * par la seule couleur (libellés textuels + chiffres tabulaires). */
const CSS = `
  .points-e096 .points-e096-pedagogy {
    margin: 10px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong, #444); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px; background: rgba(8, 11, 16, .55);
    color: var(--ink-soft, #c9d2e0); font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .points-e096 .e096-title {
    margin: 0 0 6px; font-family: var(--serif); font-size: 14px;
    color: var(--gold-bright, #f0d49a);
  }
  .points-e096 .e096-p { margin: 0 0 6px; overflow-wrap: anywhere; }
  .points-e096 .e096-readout {
    margin: 0 0 6px; padding: 6px 8px;
    border: 1px solid var(--line, #333); border-radius: 6px;
    background: rgba(230, 185, 111, .06); color: var(--ink, #e8e8e8);
    transition: background-color .2s linear;
  }
  .points-e096 .e096-details { margin: 2px 0 0; }
  .points-e096 .e096-summary {
    min-height: 36px; display: flex; align-items: center;
    padding: 6px 8px; border: 1px solid var(--line, #333); border-radius: 6px;
    color: var(--gold, #e6b96f); cursor: pointer;
  }
  .points-e096 .e096-summary:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  .points-e096 .e096-formula { margin: 6px 8px 0; color: var(--muted-2, #9aa6b8); }
  .points-e096[` + SCOPE_ATTR + `="1"] .e096-readout { transition: none; }
  @media (max-width: 620px) {
    .points-e096 .points-e096-pedagogy { padding: 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e096 .e096-readout { transition: none; }
  }
  @media (forced-colors: active) {
    .points-e096 .points-e096-pedagogy,
    .points-e096 .e096-readout,
    .points-e096 .e096-summary { border-color: CanvasText; color: CanvasText; }
  }
`;

let currentCtx = null;        // dernier ctx reçu, pour l'observateur
let observer = null;          // unique MutationObserver, ciblé sur la grille
let renderedSignature = '';   // empreinte du texte, pour éviter les réécritures
let readoutNode = null;       // région live, conservée d'un rendu à l'autre du panneau

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* E096-02 : une cellule « has-points » porte un compte lisible. On lit d'abord
 * son texte, puis son title (« … · N point(s) ») en repli : aucun nombre n'est
 * supposé, aucune donnée du dataset n'est importée. */
function cellCount(cell) {
  const direct = parseInt(textOf(cell), 10);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const title = cell && cell.getAttribute ? String(cell.getAttribute('title') || '') : '';
  const match = title.match(/(\d+)\s*point/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/* E096-03 / E096-04 : toutes les grandeurs sont MESURÉES sur la grille rendue.
 * La référence est la grille complète elle-même (total/TOTAL), jamais un chiffre
 * mémorisé : c'est une comparaison chiffrée « observé vs référence ». */
function measure(root) {
  const grid = root ? root.querySelector('.points-grid') : null;
  const cells = grid ? [...grid.querySelectorAll('.points-cell')] : [];
  const covered = cells.filter((cell) => cell.classList.contains('has-points'));
  const total = cells.length;
  const coveredCount = covered.length;
  const silences = Math.max(0, total - coveredCount);
  let points = 0;
  covered.forEach((cell) => { points += cellCount(cell); });
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const headChildren = head ? head.children.length : 0;
  const domains = Math.max(0, headChildren - 1); // « Ère » n'est pas un domaine
  const rows = grid ? [...grid.querySelectorAll('.points-grid-row')] : [];
  const eras = Math.max(0, rows.filter((row) => !row.classList.contains('is-head')).length);
  const percent = total ? Math.round((coveredCount / total) * 100) : 0;
  return { grid, total, coveredCount, silences, points, domains, eras, percent };
}

/* E096-05 : narration en trois temps — définition, observation, comparaison.
 * Le texte est sémantique (<p>), lisible sans JS : E096 n'est qu'une couche de
 * pédagogie, la matrice reste la source de vérité. */
function buildLines(data) {
  const dash = '—';
  const total = data.total ? String(data.total) : dash;
  const covered = data.total ? String(data.coveredCount) : dash;
  const silences = data.total ? String(data.silences) : dash;
  const points = data.total ? String(data.points) : dash;
  const domains = data.domains ? String(data.domains) : dash;
  const eras = data.eras ? String(data.eras) : dash;

  return [
    'Un point d’histoire est la plus petite unité démontrable, datable et transmissible. La matrice ci-dessus croise les ères et les domaines : chaque case porte un nombre de points validés, ou « · » lorsqu’un silence est documenté.',
    data.total
      ? `Lecture de la matrice : ${covered} case(s) portent un nombre, ${silences} case(s) affichent « · » (silence documenté), sur ${total} case(s) en tout.`
      : 'Lecture de la matrice : aucune case mesurable pour le moment — le panneau se tait plutôt que d’inventer un chiffre.',
    data.total
      ? `Couverture observée : ${covered}/${total} case(s) (${data.percent} %). Référence, grille complète : ${total}/${total} case(s). Écart à la référence : ${silences} case(s).`
      : 'Couverture observée : indisponible. Référence : indisponible. Aucun écart calculable.',
    data.total
      ? `${points} point(s) validé(s) sont comptés dans cette matrice, répartis sur ${eras} ère(s) et ${domains} domaine(s).`
      : 'Aucun point à comptabiliser tant que la matrice n’est pas rendue.',
    'Limite : ces grandeurs mesurent la complétude de la matrice affichée, pas la véracité historique des points. Un silence documenté n’est pas une erreur : il doit être justifié, jamais masqué.',
  ];
}

function signatureOf(lines) {
  return lines.join(' | ');
}

/* E096-07 : la seule région live du module est le readout. On n'écrit que si
 * le texte change, pour ne pas bavarder à chaque MutationObserver. */
function refresh(ctx, panel, data) {
  if (!panel || !ctx || typeof ctx.el !== 'function') return;
  const lines = buildLines(data);
  const signature = signatureOf(lines);
  if (signature === renderedSignature && readoutNode && readoutNode.isConnected) return;
  renderedSignature = signature;

  const intro = ctx.el('p', 'e096-p', lines[0]);
  const lecture = ctx.el('p', 'e096-p', lines[1]);
  const readout = ctx.el('p', 'e096-readout', lines[2]);
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  readoutNode = readout;

  const totalLine = ctx.el('p', 'e096-p', lines[3]);
  const limitLine = ctx.el('p', 'e096-p', lines[4]);

  /* E096-06 : le calcul est exposé dans un <details> natif — pédagogie sans
   * script, atteignable au clavier, cible ≥ 36 px via .e096-summary. */
  const details = ctx.el('details', 'e096-details');
  details.appendChild(ctx.el('summary', 'e096-summary', 'Comment ce chiffre est-il calculé ?'));
  const formula = data.total
    ? `Couverture = cases « has-points » ÷ toutes les points-cell = ${data.coveredCount} ÷ ${data.total} = ${data.percent} %. La référence est la grille complète (${data.total} ÷ ${data.total}). Les nombres proviennent du texte et du title des cellules, jamais d’une valeur figée.`
    : 'Le calcul demande une matrice rendue : il n’y a rien à diviser tant que la grille est absente.';
  details.appendChild(ctx.el('p', 'e096-formula', formula));

  panel.replaceChildren(intro, lecture, readout, totalLine, limitLine, details);
  panel.dataset.pointsE096Readout = data.total ? `${data.coveredCount}/${data.total}` : 'indisponible';
}

/* E096-10 : un seul observateur, ciblé sur la grille en lecture seule. Le
 * panneau est hors de la grille, donc ses écritures ne peuvent pas le déclencher
 * (pas de boucle). Il est déconnecté puis reconnecté à chaque rendu. */
function observe(ctx, grid) {
  if (typeof MutationObserver === 'undefined') return;
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (!grid) return;
  observer = new MutationObserver(() => {
    if (!currentCtx) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    refresh(currentCtx, panel, measure(rootOf(currentCtx)));
  });
  observer.observe(grid, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const root = rootOf(ctx);
  if (!root) return;
  root.classList.add(SCOPE);
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    root.setAttribute(SCOPE_ATTR, '1');
  } else {
    root.removeAttribute(SCOPE_ATTR);
  }

  const matrix = root.querySelector('.points-matrix');
  if (!matrix) return;
  const data = measure(root);

  /* E096-08 / E096-10 : panneau unique. Un nœud du même id mais détaché ou mal
   * parenté est retiré ; le contenu est reconstruit, jamais doublé. */
  let panel = document.getElementById(PANEL_ID);
  if (panel && (panel.parentElement !== matrix || !matrix.contains(panel))) panel.remove();
  if (!panel) {
    panel = ctx.el('section', 'points-e096-pedagogy');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', TITLE_ID);
    const title = ctx.el('h2', 'e096-title', 'Comprendre la couverture en chiffres');
    title.id = TITLE_ID;
    title.tabIndex = -1;
    panel.appendChild(title);
  }
  if (panel.parentElement !== matrix) matrix.appendChild(panel);

  /* E096-09 : signaux préfixés, lisibles par les autres lentilles sans occuper
   * de nom générique. Aucun attribut d'une autre lentille n'est réécrit. */
  root.dataset.pointsE096 = 'ready';
  root.dataset.pointsE096Coverage = data.total ? `${data.coveredCount}/${data.total}` : 'indisponible';
  if (data.grid) data.grid.dataset.pointsE096 = 'measured';

  refresh(ctx, panel, data);
  observe(ctx, data.grid);
}

register('E096', install);
