import { register } from './registry.js';

/* Lentille POINTS E072 — passe 2 (V2) : cibles tactiles auditables et
 * adaptatives (domaine H : responsive & mobile).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E072.md — chantiers E072-01 à E072-10.
 * Fichier possédé : src/views/points/v2/E072.js uniquement. Ni la passe 1
 * (src/views/points/E072.js), ni la vue points.js, ni la coque, ni styles.css,
 * ni registry.js, ni index.js ne sont modifiés. La lentille s'appuie sur le DOM
 * déjà rendu et ajoute sa propre portée CSS, ses propres planchers tactiles et
 * une seule note statique auditable dérivée du DOM.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e072 / pointsV2E072 pour ne pas écraser ceux de la passe 1
 * (points-e072, data-points-e072, points-e072-note). Les deux passes coexistent
 * sur le même DOM : la V2 ne retire ni ne réétiquette aucun nœud de la passe 1.
 * Ses planchers sont au moins égaux à ceux de la passe 1 (44 px), donc la
 * superposition ne fait jamais régresser la zone tactile.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au store ni au routeur : aucun filtre, ère,
 * index ou état applicatif n'est modifié, aucun chiffre n'est inventé (le
 * compteur de la note est lu dans le grille rendue).
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e072),
 * une seule note (id points-v2-e072-contract), un seul jeu de miroirs de données
 * auditables, zéro région live, zéro écouteur global, zéro timer, zéro rAF,
 * zéro réseau, zéro aléa, zéro appel à la console, jamais d'écriture directe de
 * balisage.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e072';
const SCOPE = 'points-v2-e072';
const NOTE_ID = 'points-v2-e072-contract';
const NOTE_CLASS = 'points-v2-e072-contract';
const COARSE_ATTR = 'data-points-v2-e072-coarse';
const REDUCED_ATTR = 'data-points-v2-e072-motion';

const DATA_SCOPE = 'pointsV2E072';
const DATA_STATE = 'pointsV2E072State';
const DATA_COARSE = 'pointsV2E072Coarse';
const DATA_MOTION = 'pointsV2E072Motion';
const DATA_TARGETS = 'pointsV2E072Targets';
const DATA_NOTE = 'pointsV2E072Note';

const TARGET_SELECTOR = '.points-grid-row > button, .points-filters select, .points-filters button, .points-nav button';

let noteSignature = '';

/* Chaque sélecteur commence littéralement par `.points-v2-e072`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points ni
 * écraser la feuille points-e072 de la passe 1. Les planchers max(px, rem)
 * suivent la préférence de police tout en garantissant 44 px (48 px au doigt),
 * jamais en dessous de la passe 1. Rien n'est animé par la lentille. */
const CSS = `
  /* E072-01 : portée stricte, le layout ne déborde pas son parent. */
  .points-v2-e072 {
    min-width: 0;
    max-width: 100%;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .points-v2-e072.points-layout > * { min-width: 0; }

  /* E072-02 : cibles tactiles adaptatives sur la matrice : boutons d'ère
   * (.points-era) et cellules (.points-cell), sans toucher aux couleurs ni
   * aux classes is-active / has-points. max(px, rem) >= 44 px. */
  .points-v2-e072 .points-grid-row > button {
    min-height: max(44px, 2.75rem);
    min-width: max(44px, 2.75rem);
    padding: 8px 10px;
    font-size: max(11px, .75rem);
    line-height: 1.3;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  /* E072-03 : les deux selects et le bouton de réinitialisation des filtres.
   * Les aria-label et les écouteurs natifs ne sont pas réécrits. */
  .points-v2-e072 .points-filters { max-width: 100%; }
  .points-v2-e072 .points-filters select {
    flex: 1 1 min(100%, 220px);
    min-width: 0;
    max-width: 100%;
    min-height: max(44px, 2.75rem);
    padding: 8px 12px;
    font-size: max(11px, .75rem);
  }
  .points-v2-e072 .points-filters button {
    min-height: max(44px, 2.75rem);
    padding: 8px 12px;
    font-size: max(11px, .75rem);
    white-space: normal;
  }

  /* E072-04 : navigation « Point précédent / Point suivant » (>= 44 px),
   * flex:1 hérité de styles.css:375 conservé. */
  .points-v2-e072 .points-nav button {
    min-height: max(44px, 2.75rem);
    padding: 8px 10px;
    font-size: max(11px, .75rem);
    white-space: normal;
  }

  /* E072-05 : pointeur grossier (tactile) — cibles et espacements élargis.
   * Signal JS (data-points-v2-e072-coarse) ET media query, même résultat. */
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-filters,
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-nav { gap: 12px; }
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-grid-row > button,
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-filters select,
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-filters button,
  .points-v2-e072[data-points-v2-e072-coarse="1"] .points-nav button {
    min-height: max(48px, 3rem);
  }
  @media (pointer: coarse) {
    .points-v2-e072 .points-grid-row > button,
    .points-v2-e072 .points-filters select,
    .points-v2-e072 .points-filters button,
    .points-v2-e072 .points-nav button { min-height: max(48px, 3rem); }
    .points-v2-e072 .points-filters,
    .points-v2-e072 .points-nav { gap: 12px; }
  }

  /* E072-06 : reflow mobile sans débordement horizontal de la page. Les
   * panneaux ne peuvent pas imposer une largeur supérieure au viewport. */
  @media (max-width: 1000px) {
    .points-v2-e072.points-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(0, 42%);
    }
    .points-v2-e072 .points-detail { border-left: 0; border-top: 1px solid var(--line); }
  }
  @media (max-width: 620px) {
    .points-v2-e072 .points-matrix { padding: 14px 12px 20px; }
    .points-v2-e072 .points-detail { padding: 16px 12px; }
    .points-v2-e072 .points-title { font-size: max(24px, 1.75rem); overflow-wrap: anywhere; }
  }

  /* E072-07 : défilement horizontal confiné à la grille. Momentum et
   * containment évitent le piège de défilement ; hauteur plafonnée pour garder
   * le détail visible en dessous. */
  @media (max-width: 620px) {
    .points-v2-e072 .points-grid {
      overflow-x: auto;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      max-height: 58vh;
    }
  }

  /* E072-08 : focus visible renforcé, lisible au clavier comme au toucher. */
  .points-v2-e072 :is(button, select):focus-visible {
    outline: 3px solid var(--gold-bright, #e9c98f);
    outline-offset: 2px;
  }
  @media (forced-colors: active) {
    .points-v2-e072 :is(button, select):focus-visible { outline-color: Highlight; }
    .points-v2-e072 .points-grid,
    .points-v2-e072 .points-detail { border-color: CanvasText; }
    .points-v2-e072 .points-v2-e072-contract { color: CanvasText; }
  }

  /* E072-09 : note de lecture statique, hors région live. */
  .points-v2-e072 .points-v2-e072-contract {
    margin: 0 0 12px;
    color: var(--muted-2, #8a8a8a);
    font-size: max(11px, .75rem);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  /* E072-10 : Mouvement réduit — aucune transition propre, simple garde-fou.
   * Couplage JS (attribut) ET media query pour les environnements sans
   * préférence fiable. Le papier ne masque aucun contenu. */
  .points-v2-e072[data-points-v2-e072-motion="reduce"] :is(button, select, .points-grid) { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e072 :is(button, select, .points-grid) { transition: none; }
  }
  @media print {
    .points-v2-e072.points-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
    }
    .points-v2-e072 .points-grid { max-width: none; max-height: none; }
  }
`;

/* E072-01 : la racine est le layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E072-05 : détection du pointeur grossier avec repli prudent (faux si
 * matchMedia est absent) ; le même signal est couplé au CSS par attribut. */
function coarsePointer() {
  try {
    return Boolean(window.matchMedia('(pointer: coarse)').matches);
  } catch {
    return false;
  }
}

/* E072-10 : double source de vérité avec repli sûr : ctx.reducedMotion()
 * d'abord, matchMedia ensuite, repli false. */
function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E072-02/03/04 : le nombre de cibles est LU dans le DOM rendu, jamais codé
 * en dur. Aucune valeur n'est inventée. */
function countTargets(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  return root.querySelectorAll(TARGET_SELECTOR).length;
}

/* E072-09 : libellé dérivé du DOM. Aucun millésime ni total littéral : seul le
 * compteur lu dans la grille est repris. */
function desiredNote(targets) {
  if (!targets) {
    return 'Contrat tactile (V2) : toutes les cibles élargies mesurent au moins 44 px (48 px au doigt) et le défilement horizontal reste dans la grille.';
  }
  return `Contrat tactile (V2) : ${targets} cible(s) élargie(s) à 44 px minimum (48 px au doigt) ; le défilement horizontal reste dans la grille.`;
}

/* E072-09 : note statique, créée par ctx.el (jamais d'écriture de balisage),
 * réutilisée ou relogée sans doublon. role="note", hors région live : E041
 * reste le seul propriétaire de l'annonce. Le garde de signature évite les
 * écritures redondantes sur un DOM inchangé. */
function ensureNote(ctx, root, targets) {
  const matrix = root ? root.querySelector('.points-matrix') : null;
  if (!matrix) return null;

  let note = document.getElementById(NOTE_ID);
  if (note && !matrix.contains(note)) note.remove();
  note = document.getElementById(NOTE_ID);
  if (!note) {
    note = ctx.el('p', NOTE_CLASS);
    note.id = NOTE_ID;
    note.setAttribute('role', 'note');
  }

  const text = desiredNote(targets);
  if (!note.isConnected || noteSignature !== text) {
    note.textContent = text;
    noteSignature = text;
  }
  if (note.dataset) note.dataset[DATA_NOTE] = 'ready';

  if (note.parentElement !== matrix) {
    const title = matrix.querySelector('.points-title');
    if (title && title.nextSibling) matrix.insertBefore(note, title.nextSibling);
    else matrix.appendChild(note);
  }
  return note;
}

function apply(ctx) {
  /* E072-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E072-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);

  /* E072-05 : exposent un état auditable distinct de la passe 1. */
  const coarse = coarsePointer();
  const reduce = reducedMotion(ctx);
  if (layout.dataset) {
    layout.dataset[DATA_SCOPE] = '1';
    layout.dataset[DATA_STATE] = 'ready';
    layout.dataset[DATA_COARSE] = coarse ? '1' : '0';
    layout.dataset[DATA_MOTION] = reduce ? 'reduce' : 'normal';
  }
  if (coarse) layout.setAttribute(COARSE_ATTR, '1');
  else layout.removeAttribute(COARSE_ATTR);
  if (reduce) layout.setAttribute(REDUCED_ATTR, 'reduce');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E072-02/03/04 : miroir du nombre réel de cibles élargies, dérivé du DOM. */
  const targets = countTargets(root);
  if (layout.dataset) layout.dataset[DATA_TARGETS] = String(targets);

  /* E072-09 : un rendu neuf recrée la note : sa signature est remise à zéro
   * pour qu'un contenu dérivé différent soit bien réécrit. */
  if (!document.getElementById(NOTE_ID)) noteSignature = '';
  ensureNote(ctx, root, targets);
}

/* E072-10 : enregistrement unique, isolé par un try/catch — une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E072', (ctx) => {
  try { apply(ctx); } catch { return; }
});
