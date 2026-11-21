import { register } from './registry.js';

/* Lentille E091 — passe 2 (module POINTS/V2 E091). Pédagogie & narration :
  * le kicker « Matrice de couverture » mis en récit — carnet de lecture
  * falsifiable, complémentaire du récit de la passe 1.
  *
  * Dix chantiers V2, E091-V2-01 à E091-V2-10, décrits dans
  * UNIFIED_AUDIT/POINTS/V2/views/E091.md.
  *
  * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
  * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
  * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E091.js) garde
  * son récit `<details class="points-e091-story">` inséré après le kicker ; la
  * passe 2 ajoute un « carnet de lecture » distinct, juste après ce kicker,
  * dans un espace de noms séparé — identifiants et attributs préfixés
  * `points-v2-e091` / `v2-e091`, feuille injectée sous l'id `points-v2-e091`.
  * Aucun nœud de la passe 1 n'est lu, réécrit ou supprimé.
  *
  * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
  * Aucune dépendance vers le store, aucun écriture d'état, aucun écouteur
  * global : toutes les grandeurs sont recomptées sur le DOM réel produit par
  * points.js:34-59 (ères, domaines, cellules, cellules pourvues, marque
  * d'absence) et le taux de couverture en est dérivé, comparé à la référence
  * explicite de 100 %. Aucun millésime, aucun libellé de point, aucune source
  * n'est inventé. Le guide de lecture est un `<details open>` natif : repli clavier
  * sans script, cible ≥ 44 px, focus visible.
  *
  * Invariants : un seul register, une seule feuille, un seul carnet par rendu ;
  * ids préfixés et dédupliqués ; tout DOM bâti avec ctx.el (jamais de markup
  * injecté) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro journalisation,
  * zéro région live (E041 reste seul propriétaire de l'annonce) ; chaque état
  * porte un glyphe ET un mot, jamais la couleur seule.
  */

const CSS_ID = 'points-v2-e091';
const SCOPE = 'points-v2-e091';
const PANEL_ID = 'points-v2-e091-panel';
const TITLE_ID = 'points-v2-e091-title';
const DETAILS_ID = 'points-v2-e091-details';
const REDUCED_ATTR = 'data-v2-e091-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Référence de couverture affichée comme repère, jamais présentée comme un
  * fait du jeu : 100 % signifierait « toutes les cases pourvues ». */
const COVERAGE_REFERENCE = 100;

/* E091-V2-01 : feuille unique, entièrement préfixée par .points-v2-e091,
  * classe posée sur .points-layout : aucune fuite hors de la vue Points V2. */
const CSS = `
.points-v2-e091 .points-v2-e091-panel {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-left: 3px solid var(--gold);
  border-radius: 8px; background: #0b0f15;
  color: var(--ink-soft); font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.points-v2-e091 .points-v2-e091-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 14px; color: var(--gold-bright);
}
.points-v2-e091 .points-v2-e091-intro,
.points-v2-e091 .points-v2-e091-note {
  margin: 0 0 8px; max-width: 68ch; color: var(--muted-2);
  font-size: 11px; line-height: 1.5; overflow-wrap: break-word;
}
.points-v2-e091 .points-v2-e091-details {
  margin: 0; padding: 0;
}
.points-v2-e091 .points-v2-e091-summary {
  min-height: 44px; padding: 8px 2px;
  cursor: pointer; color: var(--gold-bright);
  font-size: 12px; font-weight: 600;
  transition: background-color .2s ease;
}
.points-v2-e091 .points-v2-e091-summary:hover {
  background: rgba(255, 255, 255, .04);
}
.points-v2-e091 .points-v2-e091-summary:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.points-v2-e091 .points-v2-e091-body { padding: 2px 0 0; }
.points-v2-e091 .points-v2-e091-body p,
.points-v2-e091 .points-v2-e091-body ol {
  margin: 0 0 8px; max-width: 68ch;
}
.points-v2-e091 .points-v2-e091-body ol { padding-left: 1.5em; }
.points-v2-e091 .points-v2-e091-body li { margin-bottom: 5px; }
.points-v2-e091 .points-v2-e091-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e091 .points-v2-e091-bad { color: var(--muted-2); }
.points-v2-e091 .points-v2-e091-recap {
  margin: 6px 0 0; padding-top: 6px;
  border-top: 1px solid var(--line);
  color: var(--muted-2); font-size: 10px;
  font-variant-numeric: tabular-nums;
}
/* E091-V2-09 : mouvement réduit — aucune animation JS, seule la transition
  * déclarative du récapitulatif est neutralisée (attribut + media query). */
.points-v2-e091[` + REDUCED_ATTR + `="1"] .points-v2-e091-summary { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e091 .points-v2-e091-summary { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e091 .points-v2-e091-panel { padding: 10px; }
  .points-v2-e091 .points-v2-e091-summary { min-height: 44px; }
}
@media (forced-colors: active) {
  .points-v2-e091 .points-v2-e091-panel {
    border-color: CanvasText; background: Canvas; color: CanvasText;
  }
  .points-v2-e091 .points-v2-e091-summary,
  .points-v2-e091 .points-v2-e091-title,
  .points-v2-e091 .points-v2-e091-glyph { color: CanvasText; }
  .points-v2-e091 .points-v2-e091-summary:focus-visible { outline-color: Highlight; }
}
@media print {
  .points-v2-e091 .points-v2-e091-panel {
    border-color: #000; background: #fff; color: #000; break-inside: avoid;
  }
  .points-v2-e091 .points-v2-e091-summary,
  .points-v2-e091 .points-v2-e091-title,
  .points-v2-e091 .points-v2-e091-glyph,
  .points-v2-e091 .points-v2-e091-recap { color: #000; }
}
`;

/* E091-V2-01 : gardes structurelles réutilisées dans tout le module. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function textOf(node) {
  if (typeof node === 'string') return node.replace(/\s+/g, ' ').trim();
  return node && typeof node.textContent === 'string'
    ? node.textContent.replace(/\s+/g, ' ').trim() : '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E091-V2-10 : garde anti-doublon — tout nœud portant un id préfixé qui n'est
  * pas celui conservé est retiré du document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E091-V2-03 : toutes les grandeurs sont recomptées sur le DOM courant :
  * ères, domaines, cases, cellules pourvues/vides, marque réelle d'absence et
  * taux de couverture dérivé. Aucun total historique n'est codé en dur. */
function factsOf(layout) {
  const eras = nodes(layout, '.points-era').length;
  const head = query(layout, '.points-grid-row.is-head');
  const headCells = head ? nodes(head, 'span').length : 0;
  const domains = Math.max(0, headCells - 1);
  const cells = nodes(layout, '.points-cell');
  let filled = 0;
  let emptyMark = '';
  cells.forEach((cell) => {
    if (cell.classList && cell.classList.contains('has-points')) filled += 1;
    else if (!emptyMark) emptyMark = textOf(cell);
  });
  const total = cells.length;
  const empty = Math.max(0, total - filled);
  const coverage = total ? Math.round((filled / total) * 100) : 0;
  return {
    eras, domains, total, filled, empty, coverage,
    emptyMark,
    balanced: filled + empty === total,
  };
}

function signatureOf(f) {
  return [f.eras, f.domains, f.total, f.filled, f.empty, f.coverage,
    f.emptyMark, f.balanced ? '1' : '0'].join('|');
}

/* E091-V2-04 / E091-V2-05 / E091-V2-06 / E091-V2-07 / E091-V2-08 :
  * structure statique construite une seule fois par rendu avec ctx.el
  * (jamais de markup injecté). Le repli est natif, sans écouteur ni état JS. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e091-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e091-title',
    'Carnet de lecture — vérifier la couverture');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e091-intro',
    'Le récit de la passe 1 explique pourquoi cette grille existe. Ce carnet propose de la vérifier : il relit les cases telles qu’elles sont rendues, affiche son calcul et laisse au lecteur le soin de le contredire. Il n’écrit aucun champ du point.'));

  const details = ctx.el('details', 'points-v2-e091-details');
  details.id = DETAILS_ID;
  details.open = true;
  details.appendChild(ctx.el('summary', 'points-v2-e091-summary',
    'Comment vérifier cette grille ? — le contrôle du lecteur'));

  const body = ctx.el('div', 'points-v2-e091-body');
  body.appendChild(ctx.el('p', 'points-v2-e091-question', ''));
  body.appendChild(ctx.el('ol', 'points-v2-e091-steps'));
  body.appendChild(ctx.el('p', 'points-v2-e091-cell', ''));
  body.appendChild(ctx.el('p', 'points-v2-e091-balance', ''));
  body.appendChild(ctx.el('p', 'points-v2-e091-note',
    'Règle de lecture : ères, domaines et cases sont recomptés sur le rendu courant ; le taux de couverture est un rapport calculé, comparé à la référence de ' + COVERAGE_REFERENCE + ' % (toutes les cases pourvues). La marque d’absence est lue dans la première case vide réellement présente. Chaque contrôle est écrit avec un signe et un mot, jamais par la couleur seule.'));
  details.appendChild(body);
  panel.appendChild(details);

  panel.appendChild(ctx.el('p', 'points-v2-e091-recap', ''));
  return panel;
}

/* E091-V2-04 / E091-V2-05 / E091-V2-06 / E091-V2-07 : tout le contenu
  * dynamique est écrit ici, à partir des grandeurs recomptées plus haut. */
function fill(ctx, panel, f) {
  const question = query(panel, '.points-v2-e091-question');
  if (question) {
    question.textContent = 'La question est la suivante : où manque-t-il des points d’histoire, et comment le prouver ? Pour y répondre, comptez les cases vous-même, puis comparez votre compte au calcul ci-dessous.';
  }

  const steps = query(panel, '.points-v2-e091-steps');
  if (steps) {
    const absence = f.emptyMark
      ? 'la marque « ' + f.emptyMark + ' » y signale le vide'
      : 'une marque textuelle y signale le vide';
    const items = [
      'Repérez le cadre : chaque ligne porte le nom d’une ère, chaque colonne un domaine, et leur croisement produit une case.',
      'Comptez les cases : ' + f.total + ' ' + plural(f.total, 'case', 'cases')
        + ' à examiner, dont ' + f.filled + ' ' + plural(f.filled, 'case pourvue', 'cases pourvues')
        + ' et ' + f.empty + ' ' + plural(f.empty, 'case vide', 'cases vides') + '.',
      'Ouvrez un point : cliquer une ère ou une cellule resserre le périmètre ; la fiche à droite enchaîne le titre, le texte, les métadonnées, les familles, les sources et la justification.',
      'Contestez le vide : une case vide est une donnée, pas un oubli. ' + absence
        + '. Un point absent de la matrice n’existe pas pour le système : une omission doit être explicite pour que le vide soit traité.',
    ].map((line) => ctx.el('li', '', line));
    steps.replaceChildren.apply(steps, items);
  }

  const cell = query(panel, '.points-v2-e091-cell');
  if (cell) {
    cell.textContent = 'Lire la case sans la couleur seule : le chiffre visible compte les points validés, le titre de la cellule donne le même compte, et '
      + (f.emptyMark ? 'la marque « ' + f.emptyMark + ' » désigne l’absence' : 'une marque textuelle désigne l’absence')
      + '. Trois canaux redondants, jamais une teinte unique.';
  }

  const balance = query(panel, '.points-v2-e091-balance');
  if (balance) {
    const glyph = f.balanced ? '✓' : '!';
    const word = f.balanced ? 'contrôle exact' : 'incohérence de décompte';
    balance.replaceChildren(
      ctx.el('span', 'points-v2-e091-glyph', glyph),
      document.createTextNode(
        ' ' + word + ' : ' + f.filled + ' ' + plural(f.filled, 'pourvue', 'pourvues')
        + ' + ' + f.empty + ' ' + plural(f.empty, 'vide', 'vides') + ' = '
        + f.total + ' ' + plural(f.total, 'case', 'cases') + '. Couverture : ' + f.coverage + ' % / référence '
        + COVERAGE_REFERENCE + ' % — ' + f.empty + ' ' + plural(f.empty, 'case vide', 'cases vides')
        + ' restent à interroger.')
    );
  }

  const recap = query(panel, '.points-v2-e091-recap');
  if (recap) {
    recap.textContent = f.eras + ' ' + plural(f.eras, 'ère', 'ères') + ' · '
      + f.domains + ' ' + plural(f.domains, 'domaine', 'domaines') + ' · '
      + f.filled + '/' + f.total + ' cases pourvues · '
      + f.empty + ' ' + plural(f.empty, 'case vide', 'cases vides') + ' · '
      + f.coverage + ' % de couverture.';
  }

  setAttr(panel, 'data-v2-e091-eras', String(f.eras));
  setAttr(panel, 'data-v2-e091-domains', String(f.domains));
  setAttr(panel, 'data-v2-e091-cells', String(f.total));
  setAttr(panel, 'data-v2-e091-filled', String(f.filled));
  setAttr(panel, 'data-v2-e091-empty', String(f.empty));
  setAttr(panel, 'data-v2-e091-coverage', String(f.coverage));
  setAttr(panel, 'data-v2-e091-balanced', f.balanced ? '1' : '0');
}

/* E091-V2-01 / E091-V2-09 / E091-V2-10 : unique point d'entrée, gardes
  * structurelles, feuille unique, portée unique, ids dédupliqués, repli
  * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const matrix = query(layout, '.points-matrix');
  if (!isElement(matrix)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const facts = factsOf(layout);
  const sig = signatureOf(facts);

  /* E091-V2-10 : réconciliation par id — on conserve le carnet déjà monté
    * dans la matrice courante, on retire les doublons d'un rendu antérieur. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (matrix.contains(candidate) && candidate.parentElement === matrix) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    const kicker = query(matrix, '.view-kicker');
    if (kicker && kicker.nextSibling) matrix.insertBefore(panel, kicker.nextSibling);
    else matrix.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));
  enforceUnique(DETAILS_ID, query(panel, '#' + DETAILS_ID));

  if (getAttr(panel, 'data-v2-e091-signature') !== sig) {
    setAttr(panel, 'data-v2-e091-signature', sig);
    fill(ctx, panel, facts);
  }

  setAttr(panel, 'data-v2-e091', '1');
}

register('E091', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
