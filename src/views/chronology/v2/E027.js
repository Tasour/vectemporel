import { register } from './registry.js';

/* Lentille V2 E027 — C. Détail & fiche : texte du point en paragraphe à mesure
 * lisible (thème « E027 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E027.md — chantiers E027-01 à
 * E027-10. Fichier possédé : src/views/chronology/v2/E027.js uniquement.
 * Aucun fichier partagé (registry.js, index.js, styles.css, chronology.js)
 * n'est modifié ; la passe 1 et toutes les autres lentilles V2 restent intactes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, elle n'écrit dans aucune région existante et se contente d'afficher
 * son état en texte visible, dédupliqué, hors aria-live.
 *
 * Périmètre strict : le TEXTE du point (le <p> produit par chronology.js:488),
 * jamais les sources (E025), la confiance (E022), les familles (E024), la
 * justification (E026) ni le résumé du repère. Aucune donnée historique n'est
 * inventée : le paragraphe d'exemple est une illustration de mise en forme.
 *
 * Invariants :
 * - exactement un register('E027', ctx => { … }) ;
 * - exactement un ctx.css('chronology-v2-e027', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e027- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const PANEL_ID = 'chronology-v2-e027-panel';
const TITLE_ID = 'chronology-v2-e027-title';
const DEMO_ID = 'chronology-v2-e027-demo';
const READ_ID = 'chronology-v2-e027-read';
const DISTINCT_ID = 'chronology-v2-e027-distinct';
const MEASURE_ID = 'chronology-v2-e027-measure';
const RHYTHM_ID = 'chronology-v2-e027-rhythm';
const EMPTY_ID = 'chronology-v2-e027-empty';
const LENGTH_ID = 'chronology-v2-e027-length';
const WRAP_ID = 'chronology-v2-e027-wrap';
const CONTRAST_ID = 'chronology-v2-e027-contrast';
const MOTION_ID = 'chronology-v2-e027-motion';
const METRIC_ID = 'chronology-v2-e027-metric';
const ASIDE_ID = 'atlas-chrono-aside';

/* Sélecteur tolérant : la passe 2 peut nommer ses points différemment de la
   passe 1. On ne fait que lire et annoter, jamais renommer ni supprimer. */
const POINT_SELECTOR = 'li.point, [data-point-id]';
const MAX_POINTS = 200;
const SEUIL_COURT = 40;
const SEUIL_LONG = 1200;
const MESURE_CH = 70;

/* E027-02 à E027-09 : une seule feuille. Les effets portent sur .e027-text,
   classe ajoutée par la lentille au seul <p> de texte des points. Aucune règle
   globale n'est modifiée : le chapeau, les puces de confiance et les sources
   gardent leur mise en forme d'origine. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.6;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e027-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    line-height: 1.3; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e027-lede { margin: 0 0 10px; color: var(--muted); }

  /* E027-02 : mesure de lecture bornée, en caractères et non en pixels. */
  .e027-text { max-width: ${MESURE_CH}ch; }

  /* E027-03 : rythme vertical — interlignage et respiration du paragraphe. */
  .e027-text { line-height: 1.62; margin: .55rem 0 .95rem; }

  /* E027-04 : le texte du point se distingue du chapeau et des sources par
     un filet, un corps plein et un poids propre — sans modifier .point-head
     ni .point-sources. */
  .e027-text {
    padding-left: 10px; border-left: 2px solid var(--gold);
    font-size: 1rem; font-weight: 400; font-style: normal;
  }

  /* E027-07 : aucune ligne orpheline ni veuve en fin de paragraphe. */
  .e027-text { orphans: 3; widows: 3; hyphens: auto; text-wrap: pretty; }

  /* E027-08 : couleur explicite à fort contraste pour le texte du point ;
     le repli couleurs forcées ne laisse aucune information à la teinte. */
  .e027-text { color: var(--ink); overflow-wrap: break-word; }

  /* E027-05 : état vide explicite quand un point n'a pas de texte. */
  .e027-empty {
    margin: .4rem 0; padding: 6px 9px;
    border: 1px dashed var(--line); border-radius: 6px;
    color: var(--muted); font-size: 10px; font-style: italic; line-height: 1.5;
  }

  /* E027-06, E027-01 : marqueurs discrets pilotés par data-e027-*, visibles
     sans donner d'information nouvelle au lecteur de technologie d'assistance. */
  .e027-text[data-e027-short="1"] { border-left-style: dotted; }
  .e027-text[data-e027-long="1"] { border-left-width: 4px; }
  #${PANEL_ID} .e027-line { margin: 4px 0 0; }
  #${PANEL_ID} .e027-key { color: var(--gold-bright); }
  #${PANEL_ID} .e027-demo-note { margin: 8px 0 6px; color: var(--muted); font-size: 9px; }
  #${DEMO_ID} {
    max-width: ${MESURE_CH}ch; margin: 0 0 10px; padding: 8px 10px;
    border: 1px solid var(--line); border-left: 2px solid var(--gold);
    border-radius: 6px; background: rgba(255,255,255,.015);
    color: var(--ink); font-size: 11px; line-height: 1.62;
    orphans: 3; widows: 3; hyphens: auto; text-wrap: pretty;
  }
  #${PANEL_ID} .e027-metric { margin-top: 9px; color: var(--muted-2); font-size: 9px; }

  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    .e027-text { max-width: 100%; }
    #${DEMO_ID} { max-width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .e027-text, #${DEMO_ID} {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${DEMO_ID}, .e027-text, .e027-empty {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e027-title,
    #${PANEL_ID} .e027-key { color: CanvasText; }
  }
`;

let installCount = 0;

/* E027-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById, mais l'idempotence reste assurée dans les deux cas. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E027-01 : le paragraphe de texte est l'enfant <p> DIRECT du <li> du point.
   Les sources sont dans un <ul> imbriqué (chronology.js:490) : ce filtre les
   exclut sans ambiguïté, sans jamais réécrire leur contenu. */
function findTextParagraph(item) {
  const children = Array.prototype.slice.call(item.children || []);
  return children.find((child) => child.tagName === 'P'
    && !child.classList.contains('e027-empty')) || null;
}

/* E027-01, E027-05, E027-06 : annotation en lecture seule des points déjà
   présents. On ajoute une classe, un id préfixé et des données de mesure ; on
   ne modifie ni le texte du point, ni ses classes existantes, ni le chapeau. */
function decoratePoints(make, scope) {
  const items = Array.prototype.slice.call(scope.querySelectorAll(POINT_SELECTOR), 0, MAX_POINTS);
  const stats = { annotes: 0, orphelins: 0, courts: 0, longs: 0, total: items.length };

  items.forEach((item, index) => {
    const paragraph = findTextParagraph(item);
    if (!paragraph) {
      stats.orphelins += 1;
      if (!item.querySelector('.e027-empty')) {
        item.appendChild(make('p', 'e027-empty',
          'Texte du point non renseigné pour ce repère : l’information est absente de la donnée source.'));
      }
      return;
    }

    paragraph.classList.add('e027-text');
    if (!paragraph.id) paragraph.id = `chronology-v2-e027-text-${index + 1}`;
    paragraph.dataset.e027Index = String(index + 1);

    const length = (paragraph.textContent || '').trim().length;
    paragraph.dataset.e027Length = String(length);
    paragraph.dataset.e027Measure = String(MESURE_CH);
    paragraph.dataset.e027Short = length < SEUIL_COURT ? '1' : '0';
    paragraph.dataset.e027Long = length > SEUIL_LONG ? '1' : '0';
    if (length < SEUIL_COURT) stats.courts += 1;
    if (length > SEUIL_LONG) stats.longs += 1;
    stats.annotes += 1;
  });

  return stats;
}

/* Montage du panneau de lecture : chaque chantier possède une ligne visible
   dédiée, ce qui rend son effet observable même sans outil de développement. */
function mountPanel(make, parent) {
  const panel = ensureNode(make, PANEL_ID, 'section', 'e027-panel', parent);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e027-title', 'Texte du point — mesure de lecture');
  title.id = TITLE_ID;

  const lede = make('p', 'e027-lede',
    'Ce panneau décrit la mise en forme du texte des points de la fiche. Il n’ajoute aucune donnée historique et ne modifie ni les sources, ni la confiance, ni les familles de points.');

  const demoNote = make('p', 'e027-demo-note',
    'Exemple de mise en forme (illustration sans donnée historique) :');

  const demo = make('p', 'e027-text',
    'Le texte du point se lit dans un paragraphe unique, sans coupure artificielle : la mesure reste comprise entre soixante et soixante-quinze caractères par ligne, afin que l’œil retrouve le début de la ligne suivante sans perdre le fil.');
  demo.id = DEMO_ID;

  const line = (id, label) => {
    const node = make('p', 'e027-line');
    node.id = id;
    node.appendChild(make('span', 'e027-key', `${label} : `));
    node.appendChild(make('span', 'e027-value', ''));
    return node;
  };

  const read = line(READ_ID, 'Paragraphes identifiés');
  const distinct = line(DISTINCT_ID, 'Distinction typographique');
  const measure = line(MEASURE_ID, 'Mesure de lecture');
  const rhythm = line(RHYTHM_ID, 'Rythme vertical');
  const empty = line(EMPTY_ID, 'Points sans texte');
  const length = line(LENGTH_ID, 'Longueur des paragraphes');
  const wrap = line(WRAP_ID, 'Coupures et veuves');
  const contrast = line(CONTRAST_ID, 'Contraste');
  const motion = line(MOTION_ID, 'Mouvement réduit');
  const metric = make('p', 'e027-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, demoNote, demo, read, distinct, measure,
    rhythm, empty, length, wrap, contrast, motion, metric);
  return panel;
}

/* Écrit la valeur d'une ligne sans toucher à son libellé (un seul textContent
   ciblé par ligne, dédupliqué). */
function setValue(lineNode, value) {
  if (!lineNode) return;
  const target = lineNode.querySelector('.e027-value');
  if (target && target.textContent !== value) target.textContent = value;
}

register('E027', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css('chronology-v2-e027', CSS);

  const host = document.getElementById(ASIDE_ID) || ctx.layout;
  const panel = mountPanel(make, host);
  const stats = decoratePoints(make, ctx.layout);
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  setValue(document.getElementById(READ_ID),
    `${stats.annotes} sur ${stats.total} paragraphes de point annotés (classe .e027-text, id préfixé, index de rang).`);
  setValue(document.getElementById(DISTINCT_ID),
    'Filet doré, corps plein et poids propre : le texte se distingue du chapeau et des sources.');
  setValue(document.getElementById(MEASURE_ID),
    `Largeur maximale fixée à ${MESURE_CH} caractères par ligne (${MESURE_CH}ch), sans coupure du contenu.`);
  setValue(document.getElementById(RHYTHM_ID),
    'Interlignage 1,62 et marges verticales appliquées au seul paragraphe de texte.');
  setValue(document.getElementById(EMPTY_ID),
    stats.orphelins === 0
      ? 'Aucun point sans texte : aucun état vide à signaler.'
      : `${stats.orphelins} point(s) sans texte : un avertissement explicite a été inséré dans le point.`);
  setValue(document.getElementById(LENGTH_ID),
    stats.courts === 0 && stats.longs === 0
      ? `Aucun paragraphe hors mesure (seuils : moins de ${SEUIL_COURT} ou plus de ${SEUIL_LONG} caractères).`
      : `${stats.courts} paragraphe(s) court(s), ${stats.longs} paragraphe(s) long(s) signalé(s) par data-e027-short / data-e027-long.`);
  setValue(document.getElementById(WRAP_ID),
    'Trois lignes d’orphelines et de veuves minimales, césure automatique et équilibrage de fin de paragraphe.');
  setValue(document.getElementById(CONTRAST_ID),
    'Couleur explicite var(--ink) et repli CanvasText en couleurs forcées : aucune information portée par la seule teinte.');
  setValue(document.getElementById(MOTION_ID), reduced
    ? 'Préférence de mouvement réduit détectée : aucune transition ni animation sur le texte du point.'
    : 'Mouvement normal : le paragraphe reste lisible sans animation, aucune transition ne porte d’information.');
  write(document.getElementById(METRIC_ID),
    `Installations : ${installCount} · points examinés : ${stats.total} · paragraphes annotés : ${stats.annotes} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e027Paragraphs = String(stats.annotes);
  panel.dataset.e027Orphans = String(stats.orphelins);
  panel.dataset.e027Short = String(stats.courts);
  panel.dataset.e027Long = String(stats.longs);
  panel.dataset.e027Reduced = reduced ? '1' : '0';
  panel.dataset.e027Installs = String(installCount);
});
