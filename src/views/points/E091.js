import { register } from './registry.js';

/* Lentille E091 — Pédagogie & narration : le kicker « Matrice de couverture »
 * mis en récit, c'est-à-dire raconté plutôt que simplement affiché (domaine J).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E091.md — chantiers E091-01 à E091-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et les autres lentilles ne sont ni édités ni doublés. E091 ajoute
 * un récit LOCAL dans la matrice, juste après le kicker existant, et s'appuie
 * sur le DOM réel déjà produit par la vue.
 *
 * Contrat exploité : viewId, stage, layout, css, el. Aucune dépendance vers le
 * store, les filtres ou le détail : le récit reste lisible avec un ctx minimal.
 * reducedMotion est volontairement inutilisé : la lentille n'ajoute ni animation,
 * ni transition, ni timer, ni rAF (elle n'a donc rien à neutraliser).
 *
 * Invariants : un seul CSS, un seul récit, un seul récapitulatif par rendu ;
 * zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro aléa, aucune
 * réinterprétation de balisage, aucun usage de l'objet global de journalisation.
 */

const CSS_ID = 'points-e091';
const SCOPE = 'points-e091';
const STORY_ID = 'points-e091-story';
const TRACE_ID = 'points-e091-trace';
const BODY_CLASS = 'points-e091-body';

/* E091-01 / E091-09 — Une seule feuille, entièrement préfixée par la classe
 * posée sur `.points-layout` : aucune fuite hors de la vue Points, aucune
 * feuille distante, aucune transition à neutraliser. */
const CSS = `
.points-e091 .points-e091-story {
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold);
  border-radius: 8px;
  background: #0b0f15;
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.5;
}
/* E091-09 — Le repli natif <details>/<summary> reste clavier sans JS :
 * cible ≥ 44 px, focus visible, triangle de disclosure conservé. */
.points-e091 .points-e091-story > summary {
  min-height: 44px;
  padding: 8px 2px;
  cursor: pointer;
  color: var(--gold-bright);
  font-size: 12px;
  font-weight: 600;
}
.points-e091 .points-e091-story > summary:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
/* E091-08 — Le récit est du texte sémantique : paragraphes et liste ordonnée,
 * mesure de 60 à 75 caractères par ligne, aucun contenu masqué. */
.points-e091 .points-e091-story p { margin: 0 0 8px; max-width: 68ch; }
.points-e091 .points-e091-story ol { margin: 0 0 8px; padding-left: 1.5em; max-width: 68ch; }
.points-e091 .points-e091-story li { margin-bottom: 5px; }
/* E091-03 — Récapitulatif dérivé du DOM, chiffres tabulaires, hors région live. */
.points-e091 .points-e091-trace {
  margin: 0;
  padding-top: 7px;
  border-top: 1px solid var(--line);
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 620px) {
  .points-e091 .points-e091-story { padding: 10px; }
  .points-e091 .points-e091-story > summary { min-height: 44px; }
}
/* E091-09 — Couleurs forcées : la structure reste lisible sans couleur. */
@media (forced-colors: active) {
  .points-e091 .points-e091-story,
  .points-e091 .points-e091-trace { border-color: CanvasText; background: Canvas; color: CanvasText; }
  .points-e091 .points-e091-story > summary { color: CanvasText; }
  .points-e091 .points-e091-story > summary:focus-visible { outline-color: Highlight; }
}
/* E091-08 — Sur papier, le récit reste imprimable en noir sur blanc. */
@media print {
  .points-e091 .points-e091-story {
    border-color: #000; background: #fff; color: #000; break-inside: avoid;
  }
  .points-e091 .points-e091-story > summary,
  .points-e091 .points-e091-trace { color: #000; }
}
`;

function textOf(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E091-03 — Toutes les grandeurs du récit sont recomptées sur le DOM courant :
 * ères, domaines, cases, cases pourvues/vides et marque réelle d'absence.
 * Aucun millésime, aucun total historique n'est codé en dur. */
function factsOf(layout) {
  const eras = layout.querySelectorAll('.points-era').length;
  const head = layout.querySelector('.points-grid-row.is-head');
  const headCells = head ? head.querySelectorAll('span').length : 0;
  const domains = Math.max(0, headCells - 1);
  const cells = Array.prototype.slice.call(layout.querySelectorAll('.points-cell'));
  let filled = 0;
  let emptyMark = '';
  cells.forEach((cell) => {
    if (cell.classList.contains('has-points')) filled += 1;
    else if (!emptyMark) emptyMark = textOf(cell);
  });
  const empty = Math.max(0, cells.length - filled);
  return { eras, domains, cells: cells.length, filled, empty, emptyMark };
}

/* E091-01 / E091-02 / E091-10 — Repli natif : <details open> dont le récit
 * reste dans le DOM et dans l'arbre d'accessibilité même sans CSS ni script
 * supplémentaire. Le corps seul est reconstruit, jamais le conteneur hôte. */
function buildStory(ctx) {
  const story = ctx.el('details', 'points-e091-story');
  story.id = STORY_ID;
  story.open = true;
  story.appendChild(ctx.el('summary', '', 'Pourquoi cette grille ? — le récit de la couverture'));
  story.appendChild(ctx.el('div', BODY_CLASS));
  return story;
}

/* E091-04 à E091-07 — Le récit en quatre temps : la question, le cadre, la
 * lecture de la case, le passage à la fiche, puis le silence comme donnée. */
function fillStory(ctx, body, facts) {
  const intro = ctx.el('p', 'points-e091-intro',
    `La question est simple : où manque-t-il des points d’histoire ? Pour la rendre visible, la vue croise ${facts.eras} ${plural(facts.eras, 'ère', 'ères')} et ${facts.domains} ${plural(facts.domains, 'domaine', 'domaines')}, soit ${facts.cells} ${plural(facts.cells, 'case', 'cases')} à examiner une à une. La couverture se constate ; elle ne se devine pas.`);

  const definition = ctx.el('p', 'points-e091-definition',
    'Un point n’est pas une date. C’est un sujet, une action, un complément, une ancre temporelle, une échelle, un domaine, une source vérifiable et un degré de certitude. La date n’est qu’un champ parmi d’autres.');

  const absence = facts.emptyMark
    ? `la marque « ${facts.emptyMark} » signale l’absence`
    : 'une marque d’absence signale le vide';
  const steps = ctx.el('ol', 'points-e091-steps');
  [
    'D’abord, repérer le cadre : chaque ligne porte le nom d’une ère, chaque colonne un domaine, et leur croisement produit une case.',
    `Ensuite, lire la case : un chiffre compte les points validés ; ${absence}. Le titre de la cellule donne le même compte que le chiffre visible, rien n’est confié à la seule couleur.`,
    'Puis, ouvrir un point : cliquer une ère ou une cellule resserre le périmètre ; les filtres se mettent à jour et la fiche à droite enchaîne le titre, le texte, les métadonnées, les familles, les sources et la justification.',
    'Enfin, entendre le silence : une case vide est une donnée, pas un oubli. Un point absent de la matrice n’existe pas pour le système ; une omission doit être explicite pour que le vide soit traité.',
  ].forEach((line) => steps.appendChild(ctx.el('li', '', line)));

  const purpose = ctx.el('p', 'points-e091-purpose',
    'Cette grille existe pour montrer ce qu’une liste masquerait : les trous, leur position et leur nombre. Elle ne promet pas une complétude d’impression ; elle affiche une couverture explicite, et c’est précisément ce qui permet de la contester.');

  const trace = ctx.el('p', 'points-e091-trace',
    `${facts.filled}/${facts.cells} cases pourvues · ${facts.empty} ${plural(facts.empty, 'case vide', 'cases vides')} · ${facts.eras} ${plural(facts.eras, 'ère', 'ères')} · ${facts.domains} ${plural(facts.domains, 'domaine', 'domaines')}.`);
  trace.id = TRACE_ID;

  body.replaceChildren(intro, definition, steps, purpose, trace);
}

/* E091-02 / E091-10 — Insertion non destructive : le récit est glissé juste
 * après le kicker existant, sans remplacer le titre, la grille, les filtres ou
 * le détail. Un nœud dupliqué ou orphelin est retiré avant toute insertion. */
function placeStory(layout, story) {
  const current = layout.querySelector('#' + STORY_ID);
  if (current && current !== story) current.remove();
  const orphan = document.getElementById(STORY_ID);
  if (orphan && orphan !== story && !layout.contains(orphan)) orphan.remove();

  if (story.parentElement) return;
  const matrix = layout.querySelector('.points-matrix');
  if (!matrix) return;
  const kicker = matrix.querySelector('.view-kicker');
  if (kicker && kicker.nextSibling) matrix.insertBefore(story, kicker.nextSibling);
  else matrix.appendChild(story);
}

register('E091', (ctx) => {
  if (!ctx || ctx.viewId !== 'points' || !ctx.layout) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;
  if (!ctx.layout.querySelector('.points-matrix')) return;

  /* Greffon tolérant : toute anomalie neutralise la lentille sans exception,
   * sans journalisation et sans laisser de nœud à moitié inséré. */
  try {
    const layout = ctx.layout;
    ctx.css(CSS_ID, CSS);                     /* E091-01 : cssOnce */
    layout.classList.add(SCOPE);
    layout.dataset.e091Narrative = '1';

    const grid = layout.querySelector('.points-grid');
    if (grid) grid.dataset.e091Read = '1';    /* E091-05 : trace de lecture */

    let story = layout.querySelector('#' + STORY_ID);
    if (!story || story.tagName !== 'DETAILS' || !story.querySelector('.' + BODY_CLASS)) {
      if (story) story.remove();
      story = buildStory(ctx);
    }
    const body = story.querySelector('.' + BODY_CLASS);
    fillStory(ctx, body, factsOf(layout));    /* E091-03 à E091-07 */
    placeStory(layout, story);                /* E091-02 / E091-10 */
  } catch {
    return;
  }
});
