import { register } from './registry.js';

/* Lentille E010 — Matrice & grille : styles d'impression / export papier (domaine A).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E010.md — chantiers E010-01 à E010-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : la lentille ajoute une portée CSS
 * d'impression, une commande locale et une légende dérivée du DOM réel.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail ; aucun chiffre inventé.
 * reducedMotion est volontairement inutilisé : la lentille n'ajoute ni animation,
 * ni transition, ni timer, ni rAF (E010-03 neutralise au contraire toute transition).
 *
 * Invariants : un seul CSS, un seul bouton, une seule légende, une seule étiquette
 * d'annexe par rendu ; zéro écouteur global, zéro timer, zéro rAF, zéro réseau,
 * zéro aléa, aucun balisage écrit en chaîne, aucune journalisation.
 */

const CSS_ID = 'points-e010';
const SCOPE = 'points-e010';
const PRINT_ID = 'points-e010-print';
const LEGEND_ID = 'points-e010-legend';
const ANNEX_ID = 'points-e010-annex';

/* E010-01 — Une seule feuille, préfixée, sans import ni ressource distante.
 * Les règles d'écran précèdent le @media print afin qu'à spécificité égale
 * l'impression gagne (ordre source), sans !important superflu. */
const CSS = `
/* E010-08 / E010-10 — la légende et l'étiquette n'existent que sur papier. */
.points-e010 .points-e010-legend,
.points-e010 .points-e010-annex { display: none; }

/* E010-02 — Commande d'impression sobre, cible tactile ≥ 38 px, focus visible. */
#points-e010-print {
  min-height: 38px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: #0b0f15; color: var(--ink-soft);
  font: inherit; font-size: 10px; cursor: pointer;
}
#points-e010-print:hover { border-color: var(--gold); color: var(--gold-bright); }
#points-e010-print:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

@media print {
  /* E010-03 — Papier blanc, encre noire : fonds, ombres et transitions neutralisés. */
  .points-e010.points-layout {
    display: block; height: auto; min-height: 0; overflow: visible;
    margin: 0; padding: 0; background: #fff; color: #000;
    -webkit-print-color-adjust: economy; print-color-adjust: economy;
  }
  .points-e010 .points-matrix,
  .points-e010 .points-detail {
    height: auto; max-height: none; min-height: 0; overflow: visible;
    margin: 0; padding: 0; border: 0; background: #fff; color: #000;
  }

  /* E010-04 — Déverrouillage du défilement et des en-têtes épinglés par E001 :
   * toute la matrice doit tenir sur le papier, rien n'est coupé par un overflow. */
  .points-e010 .points-grid {
    max-height: none; overflow: visible; overscroll-behavior: auto;
    position: static; box-shadow: none;
  }
  .points-e010 .points-grid-row.is-head,
  .points-e010 .points-grid-row > :first-child {
    position: static !important; box-shadow: none;
  }

  /* E010-05 — Grille convertie en table CSS : l'en-tête de colonnes se répète
   * en tête de chaque page (table-header-group), sans modifier le DOM d'écran. */
  .points-e010 .points-grid {
    display: table; width: 100%; table-layout: fixed;
    border: 1pt solid #000; border-collapse: collapse; background: #fff;
  }
  .points-e010 .points-grid-row {
    display: table-row; min-width: 0; padding: 0; border: 0; background: #fff;
  }
  .points-e010 .points-grid-row.is-head {
    display: table-header-group; background: #fff;
  }

  /* E010-07 — Cellules : le compte, le poids et la forme du cadre remplacent
   * la couleur ; une cellule vide est pointillée, une cellule pourvue est pleine. */
  .points-e010 .points-grid-row > span,
  .points-e010 .points-grid-row > button {
    display: table-cell; min-height: 0; padding: 3pt 4pt;
    border: .5pt solid #000; border-radius: 0;
    background: #fff !important; color: #000 !important;
    font-size: 8pt; line-height: 1.2; text-align: left;
    box-shadow: none;
  }
  .points-e010 .points-cell {
    text-align: center !important; font-variant-numeric: tabular-nums;
  }
  .points-e010 .points-cell.has-points {
    border: 1.25pt solid #000; font-weight: 700;
  }
  .points-e010 .points-cell:not(.has-points) { border-style: dotted; }

  /* E010-06 — Coupures maîtrisées : jamais une ligne d'ère scindée, annexe sur
   * page neuve, légende solidaire du haut de page. Aucun @page global (voir rapport). */
  .points-e010 .points-grid-row { break-inside: avoid; page-break-inside: avoid; }
  .points-e010 .points-grid { break-inside: auto; }
  .points-e010 .points-detail { break-before: page; page-break-before: always; }
  .points-e010 .points-e010-legend { break-after: avoid; page-break-after: avoid; }

  /* E010-09 — Retrait des contrôles interactifs et de l'aide d'écran (E001). */
  .points-e010 .points-filters,
  .points-e010 .points-nav,
  .points-e010 #points-e010-print,
  .points-e010 .points-e001-hint { display: none !important; }

  /* E010-04 — Titre et champs sémantiques du point conservés en noir sur blanc. */
  .points-e010 .points-title { margin: 0 0 8pt; font-size: 18pt; color: #000; }
  .points-e010 .points-point-title { color: #000; font-size: 14pt; }
  .points-e010 .points-point-text,
  .points-e010 .points-justification { color: #000; font-size: 9pt; }
  .points-e010 .points-meta span,
  .points-e010 .points-families span { border-color: #000; color: #000; }
  .points-e010 .points-sources { color: #000; }

  /* E010-08 — Légende imprimée, dérivée du DOM (aucun chiffre codé en dur). */
  .points-e010 .points-e010-legend {
    display: block; margin: 0 0 10pt; padding: 6pt 8pt;
    border: .5pt solid #000; background: #fff;
  }
  .points-e010 .points-e010-legend p {
    margin: 0 0 3pt; color: #000; font-size: 8pt; line-height: 1.35;
  }
  .points-e010 .points-e010-legend p:last-child { margin-bottom: 0; }

  /* E010-10 — Étiquette d'annexe, ajoutée par nœud (jamais de balisage en chaîne). */
  .points-e010 .points-e010-annex {
    display: block; margin: 0 0 6pt; color: #000; font-size: 9pt; font-weight: 700;
  }
}
`;

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/* E010-08 — Toute grandeur affichée est recomptée sur le DOM courant :
 * ères, domaines, cellules pourvues/vides et valeurs réelles des deux filtres. */
function legendLines(layout) {
  const eras = layout.querySelectorAll('.points-era').length;
  const head = layout.querySelector('.points-grid-row.is-head');
  const headCells = head ? head.querySelectorAll('span').length : 0;
  const domains = Math.max(0, headCells - 1);
  const cells = layout.querySelectorAll('.points-cell');
  let filled = 0;
  cells.forEach((cell) => {
    if (cell.classList.contains('has-points')) filled += 1;
  });
  const empty = Math.max(0, cells.length - filled);
  const selects = layout.querySelectorAll('.points-filters select');
  const domain = selects.length && typeof selects[0].value === 'string' ? selects[0].value : '*';
  const family = selects.length > 1 && typeof selects[1].value === 'string' ? selects[1].value : '*';
  const title = textOf(layout.querySelector('.points-title')) || 'Matrice de couverture';
  return [
    `Matrice imprimée — ${title}.`,
    `${eras} ères · ${domains} domaines · ${filled} cellules pourvues · ${empty} cellules vides.`,
    `Filtres au moment de l’impression : domaine ${domain} · famille ${family}.`,
    'Lecture du papier : une cellule pourvue porte son compte en gras dans un cadre plein ; une cellule vide est pointillée.',
  ];
}

function placeUnique(ctx, layout, id, node, parent) {
  const current = layout.querySelector('#' + id);
  if (current && current !== node) current.remove();
  const orphan = document.getElementById(id);
  if (orphan && orphan !== node && !layout.contains(orphan)) orphan.remove();
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E010-02 — Bouton natif unique, sans raccourci global ni écouteur documentaire.
 * L'impression n'est déclenchée que par un clic explicite, jamais au chargement. */
function ensureButton(ctx, layout) {
  let button = layout.querySelector('#' + PRINT_ID);
  if (!button) {
    button = ctx.el('button', '', 'Imprimer la matrice');
    button.id = PRINT_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Imprimer la matrice de couverture au format papier');
    button.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
    });
  }
  const parent = layout.querySelector('.points-filters') || layout.querySelector('.points-matrix');
  if (parent) placeUnique(ctx, layout, PRINT_ID, button, parent);
}

/* E010-08 — Légende reconstruite à chaque rendu par replaceChildren :
 * aucun balisage en chaîne, pas de doublon, valeurs dérivées du DOM courant. */
function ensureLegend(ctx, layout) {
  let legend = layout.querySelector('#' + LEGEND_ID);
  if (!legend) {
    legend = ctx.el('section', 'points-e010-legend');
    legend.id = LEGEND_ID;
    legend.setAttribute('aria-label', 'Légende de la matrice imprimée');
  }
  legend.replaceChildren(...legendLines(layout).map((line) => ctx.el('p', '', line)));
  const matrix = layout.querySelector('.points-matrix');
  if (matrix) {
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling !== legend) matrix.insertBefore(legend, title.nextSibling);
    else if (!title && legend.parentElement !== matrix) matrix.appendChild(legend);
  }
}

/* E010-10 — Étiquette d'annexe dans le détail : les champs sémantiques déjà
 * produits par la vue (titre, texte, meta, familles, sources, justification)
 * sont imprimés tels quels, sans duplication de contenu. */
function ensureAnnex(ctx, layout) {
  const detail = layout.querySelector('.points-detail');
  if (!detail) return;
  let annex = layout.querySelector('#' + ANNEX_ID);
  if (!annex) {
    annex = ctx.el('p', 'points-e010-annex', 'Annexe — point sélectionné et ses sources.');
    annex.id = ANNEX_ID;
  }
  if (annex.parentElement !== detail) detail.prepend(annex);
}

register('E010', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;

  /* Greffon tolérant : toute anomalie neutralise la lentille sans exception,
   * sans journalisation et sans laisser de nœud à moitié inséré. */
  try {
    const layout = ctx.layout;
    ctx.css(CSS_ID, CSS);                       /* E010-01 : cssOnce */
    layout.classList.add(SCOPE);
    layout.dataset.e010Print = '1';
    const grid = layout.querySelector('.points-grid');
    if (grid) grid.dataset.e010Table = '1';     /* E010-05 : trace de la table */
    ensureButton(ctx, layout);                  /* E010-02 / E010-09 */
    ensureLegend(ctx, layout);                  /* E010-08 */
    ensureAnnex(ctx, layout);                   /* E010-10 */
  } catch {
    return;
  }
});
