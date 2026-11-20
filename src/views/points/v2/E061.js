import { register } from './registry.js';

/* Lentille POINTS E061 — passe 2 (V2) : observatoire STATIQUE du coût de rendu.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E061.md — chantiers V2 E061-01 à
 * E061-10. Fichier possédé : ce module uniquement. Ni la passe 1
 * (src/views/points/E061.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés : la V2 s'appuie sur le DOM déjà rendu.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) ; la passe 1 reste
 * sous 'points' (points.js:127). La lentille filtre donc sur 'pointsv2'. Tous
 * ses signaux (feuille, ids, classes, attributs de donnée) sont préfixés
 * points-v2-e061 / data-points-v2-e061*, sans écraser ceux de la passe 1.
 *
 * La passe 1 possède l'unique écouteur de visibilité et publie des compteurs
 * de reprise. La V2 ne réimplémente aucune pause : elle n'ajoute aucun écouteur,
 * aucun timer et aucune boucle d'animation. Elle lit le DOM et document.hidden
 * une seule fois par rendu, et publie un instantané daté du rendu, non réactif.
 * Les deux lecteurs coexistent sans conflit ni double compteur.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance vers le store, les filtres, le détail ni
 * les autres lentilles. Toutes les valeurs sont DÉRIVÉES DU DOM réel : aucun
 * chiffre n'est codé en dur, aucune mesure n'est inventée.
 *
 * Invariants : un seul register, une seule feuille, une seule portée, un seul
 * panneau, cinq lectures préfixées, une signature anti-écriture, zéro HTML
 * injecté, zéro réseau, zéro aléa, zéro timer, zéro boucle d'animation, zéro
 * écouteur global, aucun appel de diagnostic.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e061';
const SCOPE = 'points-v2-e061';
const PANEL_ID = 'points-v2-e061-panel';
const NODES_ID = 'points-v2-e061-nodes';
const GRID_ID = 'points-v2-e061-grid';
const CONTROLS_ID = 'points-v2-e061-controls';
const LOOP_ID = 'points-v2-e061-loop';
const VISIBILITY_ID = 'points-v2-e061-visibility';

const DATA_SCOPE = 'pointsV2E061';
const DATA_SIGNATURE = 'pointsV2E061Signature';
const REDUCED_ATTR = 'data-points-v2-e061-reduced';
const VISIBILITY_ATTR = 'data-points-v2-e061-visibility';
const LOOP_ATTR = 'data-points-v2-e061-loop';

const CONTROL_SELECTOR =
  'button:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/* E061-01 : chaque sélecteur commence littéralement par `.points-v2-e061`,
 * y compris dans les @media : aucune règle ne peut fuir hors de la vue Points
 * ni écraser la feuille points-e061 de la passe 1. */
const CSS = `
  .points-v2-e061 .points-v2-e061-panel {
    margin: 12px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong, #3a4252); border-radius: 8px;
    background: rgba(8, 11, 16, .82); color: var(--muted, #aab4c2);
  }
  .points-v2-e061 .points-v2-e061-heading {
    margin: 0 0 6px; font-size: 12px; font-weight: 600;
    color: var(--gold-bright, #e9c98f);
  }
  .points-v2-e061 .points-v2-e061-row {
    margin: 0; padding: 3px 0; font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums;
  }
  /* E061-08 : l'état masqué est aussi porté par un rail latéral, jamais par
   * la seule couleur du texte. */
  .points-v2-e061 .points-v2-e061-panel[data-points-v2-e061-visibility="hidden"] {
    border-left: 3px solid var(--gold, #e6b96f);
  }
  @media (max-width: 620px) {
    .points-v2-e061 .points-v2-e061-panel { padding: 8px; }
    .points-v2-e061 .points-v2-e061-row { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e061 .points-v2-e061-panel { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e061 .points-v2-e061-panel {
      border: 1px solid CanvasText; color: CanvasText;
    }
    .points-v2-e061 .points-v2-e061-heading { color: CanvasText; }
    .points-v2-e061 .points-v2-e061-panel[data-points-v2-e061-visibility="hidden"] {
      border-left-color: Highlight;
    }
  }
  @media print {
    .points-v2-e061 .points-v2-e061-panel { display: none; }
  }
`;

/* E061-01 : la racine est le layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E061-03 : coût structurel du rendu, mesuré sur le DOM réel. Parcours
 * itératif (pile) : aucune récursion, aucune écriture, aucune mesure
 * planifiée. Les nœuds sont comptés hors racine, la profondeur est celle du
 * plus profond descendant. */
function domCost(root) {
  let nodes = 0;
  let maxDepth = 0;
  const stack = [[root, 0]];
  while (stack.length) {
    const entry = stack.pop();
    const node = entry[0];
    const depth = entry[1];
    const children = node.children || [];
    for (let i = 0; i < children.length; i += 1) {
      nodes += 1;
      const next = depth + 1;
      if (next > maxDepth) maxDepth = next;
      stack.push([children[i], next]);
    }
  }
  return { nodes, maxDepth };
}

/* E061-04 : densité de la matrice, dérivée des cellules réellement rendues.
 * Le taux est calculé, borné entre 0 et 100 puis arrondi : aucun total n'est
 * recopié du titre ni des données sources. */
function matrixDensity(root) {
  const cells = root ? root.querySelectorAll('.points-cell') : [];
  const total = cells.length;
  let filled = 0;
  for (let i = 0; i < total; i += 1) {
    if (cells[i].classList && cells[i].classList.contains('has-points')) filled += 1;
  }
  const rate = total ? Math.round((filled * 100) / total) : 0;
  return { total, filled, rate: Math.max(0, Math.min(100, rate)) };
}

/* E061-05 : charge d'interaction potentielle, comptée sur les seuls contrôles
 * réellement atteignables du DOM rendu. */
function controlCount(root) {
  return root ? root.querySelectorAll(CONTROL_SELECTOR).length : 0;
}

/* E061-06 : marqueur « boucle nulle » déduit d'un fait observable : l'absence
 * de canvas dans la vue. Aucune boucle n'est créée pour établir ce constat. */
function loopState(root) {
  const canvases = root ? root.querySelectorAll('canvas').length : 0;
  return canvases === 0 ? 'none' : 'canvas';
}

/* E061-07 : instantané de visibilité au rendu. Une seule lecture ponctuelle,
 * sans écouteur ni timer : contrairement à la passe 1, la V2 ne réagit pas aux
 * bascules ultérieures et le dit explicitement dans son libellé. */
function visibilitySnapshot() {
  if (typeof document === 'undefined') return 'visible';
  return document.hidden ? 'hidden' : 'visible';
}

/* E061-09 : signature anti-écriture. Toute lecture identique d'un rendu à
 * l'autre est laissée intacte : aucun bavardage, aucune écriture redondante. */
function signatureOf(v) {
  return [v.nodes, v.maxDepth, v.total, v.filled, v.rate, v.controls, v.loop, v.visibility].join('|');
}

/* E061-09 : recherche par id, réutilisation ou relogage sans doublon. Seul un
 * nœud portant UN DE NOS ids peut être retiré ; aucun nœud de la vue n'est
 * touché. Tout est construit par ctx.el, jamais par injection de HTML. */
function ensureRow(ctx, parent, id, className) {
  let row = document.getElementById(id);
  if (row && row.parentElement !== parent) row.remove();
  row = document.getElementById(id);
  if (!row) {
    row = ctx.el('p', className);
    row.id = id;
  }
  if (row.parentElement !== parent) parent.appendChild(row);
  return row;
}

function ensurePanel(ctx, parent) {
  let panel = document.getElementById(PANEL_ID);
  if (panel && panel.parentElement !== parent) panel.remove();
  panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'points-v2-e061-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label',
      'Observatoire du coût de rendu de la matrice, passe 2 : lectures dérivées du DOM, non réactives');
    panel.appendChild(ctx.el('h3', 'points-v2-e061-heading', 'Observatoire du coût de rendu (passe 2)'));
  }
  if (panel.parentElement !== parent) parent.appendChild(panel);
  return panel;
}

/* E061-08 : les préférences de mouvement sont couplées en JS et en CSS. Le
 * repli est silencieux si reducedMotion est absent ou défaillant. */
function applyReducedMotion(ctx, layout) {
  let reduced = false;
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);
}

register('E061', (ctx) => {
  try {
    /* E061-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
     * minimal. Un viewId étranger ou absent neutralise la lentille. */
    if (!ctx || ctx.viewId !== VIEW_ID) return;
    if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    if (typeof document === 'undefined') return;
    const root = rootOf(ctx);
    if (!root) return;

    /* E061-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
    ctx.css(CSS_ID, CSS);
    const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
    layout.classList.add(SCOPE);
    if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';

    /* E061-07 / E061-02 : une seule racine de mesure : la matrice si elle
     * existe, sinon le layout. Le panneau est ajouté en fin de matrice, sans
     * modifier aucun nœud produit par points.js. */
    const matrix = root.querySelector('.points-matrix') || root;
    const cost = domCost(matrix);
    const density = matrixDensity(matrix);
    const values = {
      nodes: cost.nodes,
      maxDepth: cost.maxDepth,
      total: density.total,
      filled: density.filled,
      rate: density.rate,
      controls: controlCount(root),
      loop: loopState(root),
      visibility: visibilitySnapshot(),
    };

    /* E061-09 : dimensions observables du miroir, hors région live. */
    layout.setAttribute(LOOP_ATTR, values.loop);

    const panel = ensurePanel(ctx, matrix);
    panel.setAttribute(VISIBILITY_ATTR, values.visibility);

    const rows = {
      nodes: ensureRow(ctx, panel, NODES_ID, 'points-v2-e061-row'),
      grid: ensureRow(ctx, panel, GRID_ID, 'points-v2-e061-row'),
      controls: ensureRow(ctx, panel, CONTROLS_ID, 'points-v2-e061-row'),
      loop: ensureRow(ctx, panel, LOOP_ID, 'points-v2-e061-row'),
      visibility: ensureRow(ctx, panel, VISIBILITY_ID, 'points-v2-e061-row'),
    };

    /* E061-09 : une seule écriture par changement réel de mesure. */
    const signature = signatureOf(values);
    if (panel.dataset && panel.dataset[DATA_SIGNATURE] === signature) return;
    if (panel.dataset) panel.dataset[DATA_SIGNATURE] = signature;

    rows.nodes.textContent =
      `Coût de rendu : ${values.nodes} élément(s) dans la matrice, profondeur maximale ${values.maxDepth}.`;
    rows.grid.textContent =
      `Matrice : ${values.filled} cellule(s) pourvue(s) sur ${values.total} (${values.rate} % de remplissage).`;
    rows.controls.textContent =
      `Contrôles interactifs : ${values.controls} dans cette vue.`;
    rows.loop.textContent = values.loop === 'none'
      ? 'Boucle d’animation : aucune (zéro canvas dans la vue, aucune frame demandée).'
      : `Boucle d’animation : ${values.loop} canvas détecté(s) dans la vue.`;
    rows.visibility.textContent = values.visibility === 'hidden'
      ? 'Visibilité au rendu : onglet masqué (instantané, non réactif).'
      : 'Visibilité au rendu : onglet visible (instantané, non réactif).';

    /* E061-10 : mouvement réduit, couplé ici sans dépendre d'une feuille
     * d'une autre lentille. */
    applyReducedMotion(ctx, layout);
  } catch {
    /* E061-09 : une lentille défaillante ne doit jamais casser le rendu. */
    return;
  }
});
