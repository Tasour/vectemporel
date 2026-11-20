import { register } from './registry.js';

/* Lentille POINTS E050 — passe 2 (V2) : compagnon de lisibilité auditable pour
 * le zoom texte 200 % (domaine E : accessibilité & ARIA).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E050.md — chantiers E050-01 à E050-10.
 * Fichier possédé : src/views/points/v2/E050.js uniquement. Ni la passe 1
 * (src/views/points/E050.js), ni la vue points.js, ni la coque, ni styles.css,
 * ni registry.js, ni index.js ne sont modifiés. La lentille s'appuie sur le DOM
 * déjà rendu et ajoute sa propre portée CSS, ses propres planchers de police et
 * une seule note statique auditable dérivée du DOM.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*) sont
 * préfixés points-v2-e050 / pointsV2E050 pour ne pas écraser ceux de la passe 1
 * (points-e050, data-e050, points-e050-zoom-note). Les deux passes coexistent
 * sur le même DOM : la V2 ne retire ni ne réétiquette aucun nœud de la passe 1.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au store ni au routeur : aucun filtre, ère,
 * index ou état applicatif n'est modifié, aucun chiffre n'est inventé (les
 * compteurs de la note sont lus dans la grille rendue).
 *
 * Invariants : une seule feuille (ctx.css), une seule portée (.points-v2-e050),
 * une seule note (id points-v2-e050-contract), un seul marqueur d'état, zéro
 * région live, zéro écouteur global, zéro timer, zéro rAF, zéro réseau, zéro
 * aléa, zéro appel à la console, jamais d'écriture directe de balisage.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e050';
const SCOPE = 'points-v2-e050';
const NOTE_ID = 'points-v2-e050-contract';
const NOTE_CLASS = 'points-v2-e050-contract';
const REDUCED_ATTR = 'data-points-v2-e050-reduced';

const DATA_SCOPE = 'pointsV2E050';
const DATA_STATE = 'pointsV2E050State';
const DATA_REFLOW = 'pointsV2E050Reflow';
const DATA_NOTE = 'pointsV2E050Note';

let noteSignature = '';

/* Chaque sélecteur commence littéralement par `.points-v2-e050`, y compris à
 * l'intérieur des @media : aucune règle ne peut fuir hors de la vue Points ni
 * écraser la feuille points-e050 de la passe 1. Les planchers sont au moins
 * égaux à ceux de la passe 1, donc la V2 ne fait jamais régresser la lisibilité
 * là où ses sélecteurs recouvrent les siens (feuille injectée après). */
const CSS = `
  /* E050-02 : ajustement automatique iOS neutralisé dans la portée V2 ; la
   * propriété est héritée, aucun réglage global n'est modifié. */
  .points-v2-e050 {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  /* E050-03 : planchers de police max(px, rem), au moins égaux à la passe 1. */
  .points-v2-e050 .points-grid-row.is-head { font-size: max(11px, .75rem); }
  .points-v2-e050 .points-grid-row > span,
  .points-v2-e050 .points-grid-row > button {
    font-size: max(12px, .82rem);
    min-height: max(36px, 2.5rem);
    line-height: 1.35;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .points-v2-e050 .points-meta span,
  .points-v2-e050 .points-families span,
  .points-v2-e050 .points-sources,
  .points-v2-e050 .points-justification { font-size: max(11px, .75rem); }
  .points-v2-e050 .points-point-text { font-size: max(13px, .9rem); line-height: 1.55; }
  /* E050-04 : titres fluides et mots longs rentrés dans leur colonne. */
  .points-v2-e050 .points-title { font-size: max(26px, 1.9rem); overflow-wrap: anywhere; }
  .points-v2-e050 .points-point-title { font-size: max(28px, 2rem); overflow-wrap: anywhere; }
  /* E050-05 : le conteneur et ses deux panneaux ne peuvent pas imposer de
   * largeur minimale supérieure au viewport, même à zoom 200 %. */
  .points-v2-e050.points-layout { min-width: 0; }
  .points-v2-e050.points-layout > * { min-width: 0; }
  .points-v2-e050 .points-matrix,
  .points-v2-e050 .points-detail { min-width: 0; }
  /* E050-06 : la grille garde son défilement horizontal interne mais ne rogne
   * plus le texte des cellules ni des en-têtes. */
  .points-v2-e050 .points-grid { max-width: 100%; }
  .points-v2-e050 .points-grid-row {
    grid-template-columns: minmax(140px, 190px) repeat(auto-fit, minmax(72px, 1fr));
  }
  /* E050-07 : les deux selects et la remise à zéro restent dans le périmètre.
   * Les aria-label de points.js:62,74 sont conservés : aucun attribut n'est
   * réécrit. */
  .points-v2-e050 .points-filters { max-width: 100%; }
  .points-v2-e050 .points-filters select {
    flex: 1 1 min(100%, 220px);
    min-width: 0;
    max-width: 100%;
    min-height: max(40px, 2.7rem);
    font-size: max(12px, .82rem);
  }
  .points-v2-e050 .points-filters button {
    min-height: max(40px, 2.7rem);
    font-size: max(12px, .82rem);
    white-space: normal;
  }
  /* E050-08 : la fiche absorbe le texte agrandi au lieu de le faire déborder,
   * avec une mesure de 68 caractères (plage 60–75). */
  .points-v2-e050 .points-detail { overflow-wrap: anywhere; }
  .points-v2-e050 .points-point-text,
  .points-v2-e050 .points-justification,
  .points-v2-e050 .points-sources { max-width: 68ch; overflow-wrap: anywhere; }
  .points-v2-e050 .points-meta span,
  .points-v2-e050 .points-families span {
    max-width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  /* E050-09 : cibles et anneau de focus, y compris en contraste forcé. Aucun
   * aria-pressed, aucun role=dialog, aucune région live ajoutée. */
  .points-v2-e050 .points-nav button {
    min-height: max(40px, 2.7rem);
    font-size: max(12px, .82rem);
    white-space: normal;
  }
  .points-v2-e050 :is(button, select):focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 2px;
  }
  /* E050-10 : note statique, hors région live, jamais portée par la couleur
   * seule. */
  .points-v2-e050 .points-v2-e050-contract {
    margin: 0 0 12px;
    color: var(--muted-2);
    font-size: max(11px, .75rem);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  /* E050-06 : reflow anticipé. À 200 % de zoom, la largeur CSS utile est
   * divisée par deux : dès 1200 px CSS, la fiche repasse sous la matrice avant
   * que la colonne fixe de 380 px (styles.css:347) ne contraigne le texte.
   * Spécificité 0,2,0 pour prévaloir sur le @media 1000 px de styles.css. */
  @media (max-width: 1200px) {
    .points-v2-e050.points-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(0, 46%);
    }
    .points-v2-e050 .points-detail { border-left: 0; border-top: 1px solid var(--line); }
  }
  /* E050-09 : contraste forcé — l'anneau et le libellé textuel restent seuls
   * porteurs de l'information. */
  @media (forced-colors: active) {
    .points-v2-e050 :is(button, select):focus-visible { outline-color: Highlight; }
    .points-v2-e050 .points-grid,
    .points-v2-e050 .points-detail { border-color: CanvasText; }
    .points-v2-e050 .points-v2-e050-contract { color: CanvasText; }
  }
  /* E050-02 : aucune animation propre à la lentille ; garde-fou si une feuille
   * voisine introduisait une transition dans la même portée. Couplage JS via
   * l'attribut et media query pour les environnements sans préférence fiable. */
  .points-v2-e050[data-points-v2-e050-reduced="1"] :is(button, select, .points-grid) { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e050 :is(button, select, .points-grid) { transition: none; }
  }
  /* E050-10 : le reflow est une affordance d'écran, jamais un masquage sur
   * papier. */
  @media print {
    .points-v2-e050.points-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
    }
    .points-v2-e050 .points-grid { max-width: none; }
  }
`;

/* E050-01 : la racine est le layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

/* E050-02 : double source de vérité avec repli sûr : ctx.reducedMotion()
 * d'abord, matchMedia ensuite, repli false. */
function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/* E050-10 : les deux compteurs de la note sont LUS dans la grille rendue,
 * jamais codés en dur. Le nombre d'ères = lignes de données (hors en-tête),
 * le nombre de domaines = colonnes de l'en-tête moins la colonne « Ère ». */
function matrixCounts(root) {
  const grid = root ? root.querySelector('.points-grid') : null;
  if (!grid) return { eras: 0, domains: 0 };
  const head = grid.querySelector('.points-grid-row.is-head');
  const domains = head ? Math.max(0, head.children.length - 1) : 0;
  const eras = grid.querySelectorAll('.points-grid-row:not(.is-head)').length;
  return { eras, domains };
}

/* E050-10 : libellé dérivé du DOM. Aucun millésime ni total littéral n'est
 * introduit : seuls les comptes lus dans la grille sont repris. */
function desiredNote(counts) {
  if (!counts.eras || !counts.domains) {
    return 'Contrat de lisibilité (V2) : sous 1200 px CSS, la fiche se replace sous la matrice et aucun texte n’est tronqué.';
  }
  return `Contrat de lisibilité (V2) : ${counts.eras} ère(s) × ${counts.domains} domaine(s) ; sous 1200 px CSS, la fiche se replace sous la matrice et aucun texte n’est tronqué.`;
}

/* E050-10 : note statique, créée par ctx.el (jamais d'écriture de balisage),
 * réutilisée ou relogée sans doublon. role="note", hors région live : E041
 * reste le seul propriétaire de l'annonce. Le garde de signature évite les
 * écritures redondantes sur un DOM inchangé. */
function ensureNote(ctx, root, counts) {
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

  const text = desiredNote(counts);
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
  /* E050-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  /* E050-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  ctx.css(CSS_ID, CSS);
  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : root;
  layout.classList.add(SCOPE);
  if (layout.dataset) {
    layout.dataset[DATA_SCOPE] = '1';
    layout.dataset[DATA_STATE] = 'ready';
    /* E050-06 : miroir auditable du seuil de reflow, distinct de la passe 1. */
    layout.dataset[DATA_REFLOW] = '1200';
  }

  /* E050-02 : couplage explicite à la préférence de mouvement réduit, en plus
   * de la media query, pour les environnements sans matchMedia fiable. */
  if (reducedMotion(ctx)) layout.setAttribute(REDUCED_ATTR, '1');
  else layout.removeAttribute(REDUCED_ATTR);

  /* E050-10 : un rendu neuf recrée la note : sa signature est remise à zéro
   * pour qu'un contenu dérivé différent soit bien réécrit. */
  if (!document.getElementById(NOTE_ID)) noteSignature = '';

  const counts = matrixCounts(root);
  ensureNote(ctx, root, counts);
}

/* E050-10 : enregistrement unique, isolé par un try/catch — une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E050', (ctx) => {
  try { apply(ctx); } catch { return; }
});
