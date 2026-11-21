import { register } from './registry.js';

/* Lentille V2 E079 — domaine H : responsive & mobile, thème « écran étroit sans
 * débordement horizontal ». La passe 1 (src/views/points/E079.js) pose déjà une
 * barrière anti-débordement, une colonne unique sous 700 px, le défilement
 * interne de la grille, des cibles tactiles de 44 px, des filtres fluides, le
 * retour à la ligne du détail, un titre adaptatif, le mouvement réduit et une
 * mesure racine. La V2 propose DIX chantiers neufs et distincts : elle chiffre
 * les sources de débordement que la passe 1 ne mesure pas et ajoute des replis
 * défensifs complémentaires dans sa propre feuille.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E079.md — chantiers E079-01 à E079-10.
 * Fichier possédé : src/views/points/v2/E079.js uniquement. La passe 1, la vue
 * (src/views/points.js), le store, les registres, index.js et styles.css ne sont
 * ni édités ni doublés.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } et les helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Le
 * registre V2 n'expose pas de say() : la lentille n'ajoute aucune région live,
 * elle affiche son état en texte visible et dédupliqué.
 *
 * Périmètre strict : tout est dérivé du DOM réellement rendu et de la feuille
 * CSS calculée. Aucun total n'est codé en dur dans les libellés, aucune donnée
 * n'est inventée, aucun champ manquant n'est corrigé.
 *
 * Invariants :
 * - exactement un register('E079', ctx => { … }) ;
 * - exactement un ctx.css('points-v2-e079', …) ;
 * - tous les IDs DOM sont préfixés points-v2-e079- et protégés par une garde
 *   d'existence (idempotence multi-rendus) ;
 * - toute écriture de texte passe par ctx.el / textContent, jamais par injection
 *   de balises (aucun innerHTML) ;
 * - zéro sortie de débogage, zéro réseau, zéro import distant, zéro aléa,
 *   zéro timer, zéro rAF, zéro animation pilotée par le temps, zéro region live.
 */

const RACINE = 'points-v2-e079-racine';
const CSS_ID = 'points-v2-e079';

const ID_TABLEAU = 'points-v2-e079-tableau';
const ID_TITRE = 'points-v2-e079-titre';
const ID_ENTETE = 'points-v2-e079-entete';
const ID_S01 = 'points-v2-e079-s01';
const ID_S02 = 'points-v2-e079-s02';
const ID_S03 = 'points-v2-e079-s03';
const ID_S04 = 'points-v2-e079-s04';
const ID_S05 = 'points-v2-e079-s05';
const ID_S06 = 'points-v2-e079-s06';
const ID_S07 = 'points-v2-e079-s07';
const ID_S08 = 'points-v2-e079-s08';
const ID_S09 = 'points-v2-e079-s09';
const ID_S10 = 'points-v2-e079-s10';
const ID_BILAN = 'points-v2-e079-bilan';

/* Chaque règle est préfixée par `.points-v2-e079`, classe posée sur le layout :
 * aucune fuite hors de la vue Points. Les replis sous 620 px ciblent des
 * sélecteurs réels de points.js / styles.css en lecture seule. Aucune couleur,
 * aucune police, aucune animation propre n'est modifiée : seules la largeur et
 * la coupe des mots sont ciblées, en complément — jamais en remplacement — de
 * la passe 1. */
const CSS = `
/* E079-01 — panneau de mesure, inséré en fin de matrice. */
.points-v2-e079-racine .points-v2-e079-tableau{margin:10px 0 4px;padding:9px 11px;border:1px solid var(--line,#35405a);border-left:3px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(255,255,255,.025);color:var(--ink-soft,#c8d0df);font:inherit;font-size:10px;line-height:1.55;overflow-wrap:anywhere;box-sizing:border-box;max-width:100%;min-width:0}
.points-v2-e079-racine .points-v2-e079-titre{margin:0 0 5px;color:var(--gold-bright,#f5e9d0);font-size:12px;font-weight:600;letter-spacing:.03em;overflow-wrap:anywhere}
.points-v2-e079-racine .points-v2-e079-intro{margin:0 0 6px;color:var(--muted,#9aa5b8);font-size:9px;overflow-wrap:anywhere}
.points-v2-e079-racine .points-v2-e079-ligne{margin:3px 0;color:var(--muted,#9aa5b8);font-size:9px;line-height:1.5;overflow-wrap:anywhere;min-width:0}
.points-v2-e079-racine .points-v2-e079-label{color:var(--gold-bright,#f5e9d0);font-weight:600}

/* E079-02, E079-03, E079-05, E079-06, E079-07, E079-08 : repli étroit.
   Les largeurs minimales héritées sont annulées et les libellés longs peuvent
   se couper, jamais déborder. Ce repli s'applique en plus de celui de la passe
   1 (700 px) : il vise les nœuds que la passe 1 ne traite pas (pires, en-têtes,
   cellules, pastilles, sélecteurs, navigation). */
@media (max-width:620px){
  .points-v2-e079-racine{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;height:auto;min-height:100%}
  .points-v2-e079-racine .points-matrix{min-width:0}
  .points-v2-e079-racine .points-grid-row{min-width:0;grid-template-columns:minmax(0,1.2fr) repeat(auto-fit, minmax(42px,1fr))}
  .points-v2-e079-racine .points-era,
  .points-v2-e079-racine .points-grid-row.is-head span,
  .points-v2-e079-racine .points-cell,
  .points-v2-e079-racine .points-meta span,
  .points-v2-e079-racine .points-families span,
  .points-v2-e079-racine .points-filters select,
  .points-v2-e079-racine .points-nav button{min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word}
  .points-v2-e079-racine .points-v2-e079-ligne{font-size:10px}
}

/* E079-09 — l'état reste lisible en couleurs forcées, par le texte et la
   bordure, sans dépendre de la seule teinte dorée. */
@media (forced-colors: active){
  .points-v2-e079-racine .points-v2-e079-tableau{border-color:CanvasText;background:Canvas;color:CanvasText}
  .points-v2-e079-racine .points-v2-e079-titre,
  .points-v2-e079-racine .points-v2-e079-label{color:CanvasText}
}

/* E079-10 — neutralisation défensive d'un mouvement éventuellement hérité ;
   la lentille ne crée elle-même aucune animation, transition ni boucle. */
@media (prefers-reduced-motion: reduce){
  .points-v2-e079-racine .points-v2-e079-tableau,
  .points-v2-e079-racine .points-v2-e079-tableau *{transition:none !important;animation:none !important}
}
.points-v2-e079-racine[data-points-v2-e079-motion="reduce"] .points-v2-e079-tableau,
.points-v2-e079-racine[data-points-v2-e079-motion="reduce"] .points-v2-e079-tableau *{transition:none !important;animation:none !important}
`;

/* Audit de la feuille unique, calculé une fois depuis sa chaîne source. Aucun
   chiffre n'est codé en dur dans les libellés : chaque valeur affichée dérive
   de cette mesure ou du DOM réel. */
function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

const NARROW_AUDIT = Object.freeze({
  narrow620: occurrences(/@media\s*\(max-width:\s*620px\)/g),
  wrapAnywhere: occurrences(/overflow-wrap:\s*anywhere/g),
  minZero: occurrences(/min-width:\s*0/g),
  gridMin: occurrences(/minmax\(0,\s*1fr\)/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
  reduced: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
});

let installs = 0;
let resizeBound = false;
let refs = { panel: null, layout: null, stage: null, view: null, getReduced: null };

/* E079-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

function ajouteClasse(node, name) {
  if (node && node.classList && !node.classList.contains(name)) node.classList.add(name);
}

function texte(node) {
  if (!node || node.nodeType !== 1) return '';
  return String(node.textContent || '').replace(/\s+/g, ' ').trim();
}

function parsePx(value) {
  return (String(value || '').match(/-?\d+(?:\.\d+)?px/g) || [])
    .map((token) => Math.round(parseFloat(token)));
}

function overflowOf(node) {
  if (!node) return 0;
  const over = node.scrollWidth - node.clientWidth;
  return over > 0 ? over : 0;
}

function countOverflow(nodes) {
  let total = 0;
  for (let i = 0; i < nodes.length; i += 1) if (overflowOf(nodes[i]) > 0) total += 1;
  return total;
}

function styleOf(view, node) {
  if (!node) return null;
  if (view && typeof view.getComputedStyle === 'function') {
    try { return view.getComputedStyle(node); }
    catch { return null; }
  }
  return null;
}

/* Lecture unique de toutes les grandeurs affichées par la V2. Chaque valeur
   est dérivée du DOM rendu ou du style calculé : aucun chiffre n'est inventé. */
function collecter(layout, view, stage, getReduced) {
  const matrice = layout.querySelector('.points-matrix');
  const layoutStyle = styleOf(view, layout);
  const columns = parsePx(layoutStyle && layoutStyle.gridTemplateColumns);
  const rows = parsePx(layoutStyle && layoutStyle.gridTemplateRows);

  const ms = styleOf(view, matrice);
  const matrixWidth = matrice ? matrice.clientWidth : 0;
  const matrixPad = ms
    ? Math.round(parseFloat(ms.paddingLeft || 0) + parseFloat(ms.paddingRight || 0))
    : 0;

  const ligne = matrice && matrice.querySelector('.points-grid-row');
  const rs = styleOf(view, ligne);
  const rowMin = rs && rs.minWidth ? rs.minWidth : '—';
  const rowTracks = parsePx(rs && rs.gridTemplateColumns);

  const eras = Array.from(layout.querySelectorAll('.points-era'));
  const heads = Array.from(layout.querySelectorAll('.points-grid-row.is-head span'));
  const cells = Array.from(layout.querySelectorAll('.points-cell'));
  const pills = Array.from(layout.querySelectorAll('.points-meta span, .points-families span'));
  const selects = Array.from(layout.querySelectorAll('.points-filters select'));
  const navButtons = Array.from(layout.querySelectorAll('.points-nav button'));

  const root = document.documentElement;
  const rootOver = root ? Math.max(0, root.scrollWidth - root.clientWidth) : 0;
  const stageOver = overflowOf(stage);

  let reduit = false;
  try { reduit = Boolean(getReduced && typeof getReduced === 'function' && getReduced()); }
  catch { reduit = false; }

  return {
    columns, rows, matrixWidth, matrixPad, rowMin, rowTracks,
    eraOver: countOverflow(eras), erasTotal: eras.length,
    headOver: countOverflow(heads), headsTotal: heads.length,
    cellOver: countOverflow(cells), cellsTotal: cells.length,
    pillOver: countOverflow(pills), pillsTotal: pills.length,
    selectOver: countOverflow(selects), selectsTotal: selects.length,
    navOver: countOverflow(navButtons), navTotal: navButtons.length,
    rootOver, stageOver,
    viewport: view && typeof view.innerWidth === 'number' ? view.innerWidth : 0,
    reduced: reduit,
  };
}

/* Dépose une ligne de synthèse visible dans le panneau, réutilisée par id. */
function ligneTableau(tableau, el, id, classe, libelle, valeur) {
  if (!tableau) return null;
  let node = document.getElementById(id);
  if (!node) {
    node = el('p', `points-v2-e079-ligne ${classe}`);
    node.id = id;
  }
  node.textContent = '';
  node.appendChild(el('strong', 'points-v2-e079-label', `${libelle} : `));
  node.appendChild(document.createTextNode(valeur));
  tableau.appendChild(node);
  return node;
}

function ecrireDonnee(node, cle, valeur) {
  if (node) node.setAttribute(`data-points-v2-e079-${cle}`, String(valeur));
}

/* Les dix mesures sont écrites en texte visible ordinaire, sans région live.
   Chaque ligne porte son propre attribut data-points-v2-e079-* : effet DOM
   observable, indépendant de toute couleur. */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected || !r.layout) return;
  const d = collecter(r.layout, r.view, r.stage, r.getReduced);

  /* E079-01 — piste fixe de 380 px de la grille de la vue (styles.css:347). */
  ligneTableau(r.panel, r.make, ID_S01, 'points-v2-e079-s01', 'S01 · Pistes de la grille',
    `${d.columns.length} colonne(s) — ${d.columns.join(' + ') || '—'} px (largeur d'écran ${d.viewport} px).`);
  ecrireDonnee(document.getElementById(ID_S01), 'columns', d.columns.length);

  /* E079-02 — marges internes de la matrice (styles.css:348 : 24 px de côté). */
  ligneTableau(r.panel, r.make, ID_S02, 'points-v2-e079-s02', 'S02 · Marges de la matrice',
    `${d.matrixWidth} px dont ${d.matrixPad} px de marges internes ; largeur utile ${d.matrixWidth - d.matrixPad} px.`);
  ecrireDonnee(document.getElementById(ID_S02), 'matrix-width', d.matrixWidth);
  ecrireDonnee(document.getElementById(ID_S02), 'matrix-padding', d.matrixPad);

  /* E079-03 — plancher de 900 px et piste de 190 px des lignes (styles.css:351). */
  ligneTableau(r.panel, r.make, ID_S03, 'points-v2-e079-s03', 'S03 · Plancher des lignes',
    `largeur minimale ${d.rowMin}, première piste ${d.rowTracks.length ? d.rowTracks[0] : '—'} px sur ${d.rowTracks.length} piste(s).`);
  ecrireDonnee(document.getElementById(ID_S03), 'row-min', d.rowMin);
  ecrireDonnee(document.getElementById(ID_S03), 'row-tracks', d.rowTracks.length);

  /* E079-04 — hauteur de détail à 42 % sous 1000 px (styles.css:378). */
  ligneTableau(r.panel, r.make, ID_S04, 'points-v2-e079-s04', 'S04 · Lignes de la grille',
    `${d.rows.length} ligne(s) — ${d.rows.join(' + ') || '—'} px ; le repli 1000 px impose une ligne de détail haute de 42 %.`);
  ecrireDonnee(document.getElementById(ID_S04), 'rows', d.rows.length);

  /* E079-05 — libellés d'ères longs (boutons .points-era, points.js:41). */
  ligneTableau(r.panel, r.make, ID_S05, 'points-v2-e079-s05', 'S05 · Libellés d’ère',
    `libellés débordants : ${d.eraOver} sur ${d.erasTotal} bouton(s) d'ère.`);
  ecrireDonnee(document.getElementById(ID_S05), 'era-over', d.eraOver);

  /* E079-06 — libellés de domaines de l'en-tête (points.js:36-37). */
  ligneTableau(r.panel, r.make, ID_S06, 'points-v2-e079-s06', 'S06 · Domaines de l’en-tête',
    `libellés débordants : ${d.headOver} sur ${d.headsTotal} cellule(s) d'en-tête.`);
  ecrireDonnee(document.getElementById(ID_S06), 'head-over', d.headOver);

  /* E079-07 — valeurs des cellules et leur title (points.js:47-49). */
  ligneTableau(r.panel, r.make, ID_S07, 'points-v2-e079-s07', 'S07 · Valeurs des cellules',
    `cellules dont la valeur déborde : ${d.cellOver} sur ${d.cellsTotal} cellule(s) de la matrice.`);
  ecrireDonnee(document.getElementById(ID_S07), 'cell-over', d.cellOver);

  /* E079-08 — pastilles de meta et de familles (points.js:101-111). */
  ligneTableau(r.panel, r.make, ID_S08, 'points-v2-e079-s08', 'S08 · Pastilles du détail',
    `pastilles débordantes : ${d.pillOver} sur ${d.pillsTotal} pastille(s) de meta/famille.`);
  ecrireDonnee(document.getElementById(ID_S08), 'pill-over', d.pillOver);

  /* E079-09 — sélecteurs de filtres et boutons de navigation. */
  ligneTableau(r.panel, r.make, ID_S09, 'points-v2-e079-s09', 'S09 · Filtres et navigation',
    `sélecteurs débordants : ${d.selectOver}/${d.selectsTotal} · boutons de navigation débordants : ${d.navOver}/${d.navTotal}.`);
  ecrireDonnee(document.getElementById(ID_S09), 'select-over', d.selectOver);
  ecrireDonnee(document.getElementById(ID_S09), 'nav-over', d.navOver);

  /* E079-10 — débordement racine et contenu masqué par le stage de la coque. */
  ligneTableau(r.panel, r.make, ID_S10, 'points-v2-e079-s10', 'S10 · Débordement racine',
    `débordement du document : ${d.rootOver} px · contenu masqué dans le stage : ${d.stageOver} px.`);
  ecrireDonnee(document.getElementById(ID_S10), 'root-over', d.rootOver);
  ecrireDonnee(document.getElementById(ID_S10), 'stage-over', d.stageOver);

  /* Bilan dérivé des seules mesures ci-dessus et de l'audit de la feuille. */
  const signaux = d.eraOver + d.headOver + d.cellOver + d.pillOver
    + d.selectOver + d.navOver + d.rootOver + d.stageOver;
  const rendus = document.querySelectorAll(`#${ID_TABLEAU}`).length;
  writeBilan(d, signaux, rendus);
  ecrireDonnee(r.panel, 'viewport', d.viewport);
  ecrireDonnee(r.panel, 'signals', signaux);
  ecrireDonnee(r.panel, 'renders', installs);
  ecrireDonnee(r.panel, 'panels', rendus);
  ecrireDonnee(r.panel, 'narrow-rules', NARROW_AUDIT.narrow620);
  ecrireDonnee(r.panel, 'reduced', d.reduced ? 1 : 0);
}

function writeBilan(d, signaux, rendus) {
  let bilan = document.getElementById(ID_BILAN);
  if (!bilan) return;
  bilan.textContent = `Bilan écran étroit (${d.viewport} px) : ${signaux} signal(aux) de débordement · `
    + `${NARROW_AUDIT.narrow620} repli 620 px, ${NARROW_AUDIT.wrapAnywhere} coupe(s) de mots, `
    + `${NARROW_AUDIT.minZero} largeur(s) minimale(s) remise(s) à zéro, `
    + `${NARROW_AUDIT.gridMin} grille(s) en minmax(0,1fr), `
    + `${NARROW_AUDIT.forced} repli couleurs forcées, ${NARROW_AUDIT.reduced} repli mouvement réduit · `
    + `panneaux : ${rendus} · rendus : ${installs} · mouvement réduit : ${d.reduced ? 'oui' : 'non'}.`;
}

/* E079-10 : un seul écouteur « resize » passif, sans minuteur ni sondage. La
   garde resizeBound évite toute fuite sur les rendus successifs. */
function onResize() {
  if (refs.panel && refs.panel.isConnected) refresh();
}

function bindResize() {
  if (resizeBound) return;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.addEventListener('resize', onResize, { passive: true });
  resizeBound = true;
}

register('E079', (ctx) => {
  const { layout, stage, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function'
      || typeof el !== 'function' || typeof css !== 'function') return;

    installs += 1;
    css(CSS_ID, CSS);
    ajouteClasse(layout, RACINE);
    layout.setAttribute('data-points-v2-e079-racine', '1');

    const host = layout.querySelector('.points-matrix') || stage || layout;
    const panel = ensureNode(el, ID_TABLEAU, 'section', 'points-v2-e079-tableau', host);
    setOnce(panel, 'aria-label', 'Panneau de mesure responsive V2 de la vue Points');

    const titre = el('h2', 'points-v2-e079-titre', 'Écran étroit — diagnostic V2');
    titre.id = ID_TITRE;
    const intro = el('p', 'points-v2-e079-intro',
      'Dix mesures lisent les largeurs réelles de la matrice et des contrôles. La V2 ajoute des replis défensifs complémentaires de la passe 1, sans éditer les fichiers partagés ni détourner le routeur.');
    const entete = el('p', 'points-v2-e079-entete',
      'Grandeurs dérivées du DOM rendu et de la feuille calculée — aucune valeur codée en dur.');
    entete.id = ID_ENTETE;

    const bilan = el('p', 'points-v2-e079-ligne');
    bilan.id = ID_BILAN;

    panel.replaceChildren(titre, intro, entete, bilan);

    let reduit = false;
    try { reduit = Boolean(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    layout.setAttribute('data-points-v2-e079-motion', reduit ? 'reduce' : 'normal');

    const view = (stage && stage.ownerDocument && stage.ownerDocument.defaultView)
      || (typeof window !== 'undefined' ? window : null);

    refs = {
      panel, layout, stage: stage || null, view, getReduced: reducedMotion, make: el,
    };
    refresh();
    bindResize();
    refresh();
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
