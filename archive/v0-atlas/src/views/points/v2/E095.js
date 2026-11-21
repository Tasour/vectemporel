import { register } from './registry.js';

/* Lentille V2 E095 — glossaire au premier terme (ère, domaine, échelle, certitude).
 * Domaine J : pédagogie & narration de la vue Points (passe V2).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E095.md — chantiers E095-01 à E095-10.
 * Fichier possédé : src/views/points/v2/E095.js uniquement. Lectures seules :
 * src/views/points/E095.js et UNIFIED_AUDIT/POINTS/views/E095.md (modèle de
 * qualité de la passe 1). La passe 1, le routeur clavier, la coque, le CSS
 * global et les registres ne sont ni édités ni doublés.
 *
 * Contrat : module ESM, un seul import { register } from './registry.js' (:1),
 * un seul register('E095', (ctx) => { … }), une seule feuille
 * ctx.css(CSS_ID, CSS). ctx = { viewId:'pointsv2', stage, layout } enrichi de
 * css / el / reducedMotion (v2/registry.js:28-37).
 *
 * Différence contractuelle V2 : points.js:128 appelle runEnhancementsV2 avec
 * viewId 'pointsv2' (et non 'points' en passe 1). Tous les signaux sont
 * distincts de ceux de la passe 1 : identifiants et classes préfixés
 * points-v2-e095-, attributs data-points-v2-e095-*, feuille points-v2-e095.
 * La lentille est additive : aucun nœud ni signal de la passe 1 n'est retiré.
 *
 * Invariants :
 * - identifiants DOM tous préfixés points-v2-e095- et uniques ; le panneau est
 *   gardé par ensureNode, ses enfants sont remplacés par replaceChildren ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF, zéro écouteur de touche ;
 * - définitions en texte sémantique visible (<dl>/<dt>/<dd>/<p>/<li>), jamais
 *   en sr-only, aria-hidden ni contenu généré par le seul JavaScript ;
 * - aucun chiffre ni millésime littéral : les décomptes sont dérivés du DOM ;
 * - français partout (commentaires, libellés, définitions, rapport).
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e095';
const PANEL_ID = 'points-v2-e095-glossary';
const TITLE_ID = 'points-v2-e095-title';
const DEFS_ID = 'points-v2-e095-definitions';
const DFN_ERA_ID = 'points-v2-e095-dfn-era';
const DFN_DOMAIN_ID = 'points-v2-e095-dfn-domain';
const DFN_SCALE_ID = 'points-v2-e095-dfn-scale';
const DFN_CONF_ID = 'points-v2-e095-dfn-confidence';
const DEF_ERA_ID = 'points-v2-e095-def-era';
const DEF_DOMAIN_ID = 'points-v2-e095-def-domain';
const DEF_SCALE_ID = 'points-v2-e095-def-scale';
const DEF_CONF_ID = 'points-v2-e095-def-confidence';
const ORDER_ID = 'points-v2-e095-order';
const DEEP_ID = 'points-v2-e095-deep';
const DEEP_ERA_ID = 'points-v2-e095-deep-era';
const DEEP_DOMAIN_ID = 'points-v2-e095-deep-domain';
const DEEP_SCALE_ID = 'points-v2-e095-deep-scale';
const DEEP_CONF_ID = 'points-v2-e095-deep-confidence';
const INDEX_ID = 'points-v2-e095-index';
const METRIC_ID = 'points-v2-e095-metric';

/* E095-01, E095-09 : une seule feuille, injectée une fois par ctx.css. Toutes
 * les règles sont préfixées par .points-v2-e095, classe posée sur le panneau :
 * aucune fuite hors de la vue et aucune collision avec la feuille points-e095
 * de la passe 1. Le panneau reste en flux normal : jamais de modale, jamais de
 * superposition, jamais de piège de focus, jamais de région live ajoutée.
 * Replis mouvement réduit, couleurs forcées et 620 px inclus. Aucune
 * information n'est portée par la seule couleur : les rôles sont donnés par
 * les balises et par des libellés textuels. */
const CSS = `
.points-v2-e095 {
  margin: 12px 0 14px; padding: 11px 13px 12px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f);
  border-radius: 10px; background: rgba(8, 11, 16, .94);
  color: var(--ink-soft, #d8d8d8); font: inherit; font-size: 11px;
  line-height: 1.5; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-v2-e095 .e095-title {
  margin: 0 0 6px; color: var(--gold-bright, #e9c98f);
  font-family: var(--serif, serif); font-size: 14px; font-weight: 600;
  letter-spacing: 0; text-transform: none;
}
.points-v2-e095 .e095-subtitle {
  margin: 10px 0 4px; color: var(--ink-soft, #d8d8d8);
  font-family: var(--serif, serif); font-size: 11px; font-weight: 600;
}
.points-v2-e095 .e095-lede { margin: 0 0 8px; color: var(--muted, #9a9a9a); }
.points-v2-e095 .e095-defs { margin: 0 0 8px; }
.points-v2-e095 .e095-defs dt { margin: 7px 0 2px; color: var(--ink-soft, #d8d8d8); }
.points-v2-e095 .e095-defs dd { margin: 0 0 4px; color: var(--muted, #9a9a9a); }
.points-v2-e095 .e095-dfn {
  color: var(--gold-bright, #e9c98f); font-style: normal; font-weight: 600;
}
.points-v2-e095 .e095-first {
  margin-left: 5px; padding: 1px 5px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 999px;
  color: var(--muted, #9a9a9a); font-size: 9px;
}
.points-v2-e095 .e095-order { margin: 0 0 8px; padding-left: 18px; }
.points-v2-e095 .e095-order li { margin: 0 0 2px; color: var(--muted, #9a9a9a); }
.points-v2-e095 .e095-deep {
  margin: 0 0 8px; padding: 3px 0;
  border-top: 1px solid var(--line-strong, #5b5b5b);
}
.points-v2-e095 .e095-deep summary {
  color: var(--gold-bright, #e9c98f); cursor: pointer; font-size: 10px;
}
.points-v2-e095 .e095-deep summary:focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
}
.points-v2-e095 .e095-deep p { margin: 4px 0 2px; color: var(--muted, #9a9a9a); }
.points-v2-e095 .e095-index { margin: 0 0 8px; color: var(--muted, #9a9a9a); }
.points-v2-e095 .e095-index a {
  margin-right: 8px; color: var(--gold-bright, #e9c98f);
  text-decoration: underline; text-underline-offset: 2px;
}
.points-v2-e095 .e095-index a:focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
}
.points-v2-e095 .e095-metric { margin: 5px 0 0; color: var(--muted, #9a9a9a); font-size: 9px; }
@media (max-width: 620px) {
  .points-v2-e095 { padding: 10px; }
  .points-v2-e095 .e095-first { display: block; width: fit-content; margin: 3px 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .points-v2-e095, .points-v2-e095 * { transition: none !important; }
}
@media (forced-colors: active) {
  .points-v2-e095 {
    border: 1px solid CanvasText; background: Canvas; color: CanvasText;
  }
  .points-v2-e095 .e095-title, .points-v2-e095 .e095-dfn,
  .points-v2-e095 .e095-first, .points-v2-e095 .e095-deep summary,
  .points-v2-e095 .e095-index a { color: CanvasText; }
}
`;

/* E095-02 à E095-04 : quatre entrées, une par terme du champ lexical de la
 * passe 1, dans l'ordre de lecture de la vue (matrice puis fiche). Les textes
 * courts et les précisions décrivent le contrat de points.js ; ils n'inventent
 * aucune date, aucun chiffre ni aucune source. La définition longue, elle, est
 * dérivée du DOM à chaque rendu (voir deriveDefinitions). */
const TERMS = [
  {
    key: 'era',
    word: 'ère',
    label: 'Ère',
    dfnId: DFN_ERA_ID,
    defId: DEF_ERA_ID,
    deepId: DEEP_ERA_ID,
    deep: 'Une ère est une bande de lecture de la matrice. Chaque ligne porte un bouton d’ère : l’active est la tranche courante, les autres restent consultables. La durée se lit au regard des autres lignes, jamais à la seule couleur de la cellule.',
  },
  {
    key: 'domain',
    word: 'domaine',
    label: 'Domaine',
    dfnId: DFN_DOMAIN_ID,
    defId: DEF_DOMAIN_ID,
    deepId: DEEP_DOMAIN_ID,
    deep: 'Un domaine est une colonne de la matrice et une valeur du filtre. Choisir un domaine ne modifie pas l’ère : il ne conserve que les points qui appartiennent à ce champ de savoir, sans effacer le reste de la grille.',
  },
  {
    key: 'scale',
    word: 'échelle',
    label: 'Échelle',
    dfnId: DFN_SCALE_ID,
    defId: DEF_SCALE_ID,
    deepId: DEEP_SCALE_ID,
    deep: 'L’échelle est l’une des valeurs de la fiche : elle dit la portée du point, du fait local au phénomène étendu. Quand aucun point n’est affiché, la fiche ne porte pas cette valeur : le glossaire le constate au lieu d’en inventer une.',
  },
  {
    key: 'confidence',
    word: 'certitude',
    label: 'Certitude',
    dfnId: DFN_CONF_ID,
    defId: DEF_CONF_ID,
    deepId: DEEP_CONF_ID,
    deep: 'La certitude est le degré de confiance attaché au point validé. Elle est écrite dans la fiche et portée par une classe de la fiche : le libellé reste lisible même quand la couleur seule ne distingue plus les degrés.',
  },
];

let renderCount = 0;

/* E095-10 : garde d'existence pour toute ID préfixée points-v2-e095. Un nœud
 * déjà présent est réutilisé et déplacé dans le parent courant, avec insertion
 * optionnelle avant un nœud de référence : la coque reconstruisant le stage, un
 * nœud du rendu précédent est détaché et n'est donc pas retrouvé par
 * getElementById. */
function ensureNode(make, id, tagName, className, parent, before) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (before && before.parentElement === parent) parent.insertBefore(node, before);
  else if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function norm(value) {
  return String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function elements(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function first(list) {
  return list.length ? list[0] : null;
}

/* E095-05 : définitions entièrement dérivées du DOM rendu par points.js. Les
 * seuls nombres affichés sont des décomptes de lignes et de colonnes et les
 * valeurs lues dans la fiche ; aucun millésime, aucun total, aucune valeur
 * d'échelle ou de certitude n'est codé en dur. Le repli explicite évite
 * d'inventer une donnée quand aucun point n'est affiché. */
function deriveDefinitions(root) {
  const rows = elements(root, '.points-grid-row:not(.is-head)').length;
  const headers = elements(root, '.points-grid-row.is-head > span');
  const domains = Math.max(0, headers.length - 1); // première colonne = « Ère »
  const meta = elements(root, '.points-detail .points-meta > span');
  const scaleNode = meta[1] || null;
  const confNode = first(elements(root, '.points-detail .points-meta .confidence')) || meta[3] || null;
  const scale = scaleNode ? txt(scaleNode) : '';
  const conf = confNode ? txt(confNode) : '';

  return {
    era: 'Une ère est une tranche de temps nommée qui structure la lecture : chaque ligne de la matrice en est une. La vue en affiche ' + rows + '.',
    domain: 'Un domaine est un champ de savoir auquel appartient un point validé : chaque colonne de la matrice en est un. La vue en affiche ' + domains + '.',
    scale: scale
      ? 'L’échelle indique la portée du point décrit, du fait local au phénomène étendu. Le point affiché porte l’échelle « ' + scale + ' » dans sa fiche.'
      : 'L’échelle indique la portée du point décrit, du fait local au phénomène étendu. Aucun point n’est affiché dans ce périmètre : sa valeur n’est pas renseignée.',
    confidence: conf
      ? 'La certitude est le degré de confiance attaché au point validé, affiché dans sa fiche. Le point affiché porte la mention « ' + conf + ' » ; elle est aussi portée par une classe de la fiche.'
      : 'La certitude est le degré de confiance attaché au point validé, affiché dans sa fiche. Aucun point n’est affiché dans ce périmètre : sa mention n’est pas renseignée.',
  };
}

/* E095-06 : mesure en lecture seule des occurrences réelles des quatre termes
 * dans le texte de la vue (grille et fiche), avant toute construction du
 * glossaire. Recherche déterministe insensible aux accents et à la casse, sans
 * aléa et sans écriture dans la zone observée. */
function countOccurrences(haystack, needle) {
  const text = norm(haystack);
  const term = norm(needle);
  if (!term) return 0;
  let count = 0;
  let from = 0;
  let at = text.indexOf(term, from);
  while (at !== -1) {
    count += 1;
    from = at + term.length;
    at = text.indexOf(term, from);
  }
  return count;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || typeof ctx.css !== 'function') return;
  if (ctx.viewId && ctx.viewId !== VIEW_ID) return;
  const root = rootOf(ctx);
  if (!root || typeof document === 'undefined') return;

  renderCount += 1;
  ctx.css(CSS_ID, CSS);

  const matrix = root.querySelector('.points-matrix')
    || (root.classList && root.classList.contains('points-matrix') ? root : null);
  const host = matrix || (root.nodeType === 1 ? root : document.body);
  const before = host.querySelector('.points-grid');
  const defsByKey = deriveDefinitions(root);

  /* E095-06 : relevé avant insertion du glossaire, sur la seule vue. */
  const grid = root.querySelector('.points-grid');
  const detail = root.querySelector('.points-detail');
  const viewText = [grid, detail].map((node) => (node ? node.textContent : '')).join(' ');
  const occurrences = Object.create(null);
  TERMS.forEach((term) => { occurrences[term.key] = countOccurrences(viewText, term.word); });

  /* E095-01 : panneau non modal, en flux normal, nommé par son titre. La classe
   * de portée est le préfixe de toute la feuille CSS. */
  const panel = ensureNode(make, PANEL_ID, 'section', 'points-v2-e095', host, before);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  setData(panel, 'e095Renders', String(renderCount));

  const title = make('h2', 'e095-title', 'Glossaire — ère, domaine, échelle, certitude');
  title.id = TITLE_ID;
  const lede = make('p', 'e095-lede', 'Les quatre mots qui structurent la lecture de la matrice Points sont définis ici dès leur première occurrence, signalée par la mention « 1ʳᵉ occurrence ». Ce glossaire est un texte lisible : il n’ajoute ni annonce sonore, ni fenêtre, ni raccourci.');

  /* E095-02 : structure sémantique <dl> — définitions indexables en plein
   * texte, jamais en sr-only ni en contenu généré par le seul JavaScript. */
  const defs = make('dl', 'e095-defs');
  defs.id = DEFS_ID;

  /* E095-07 : ordre de première rencontre, explicite et numéroté. */
  const orderHeading = make('h3', 'e095-subtitle', 'Ordre de première rencontre');
  const order = make('ol', 'e095-order');
  order.id = ORDER_ID;

  /* E095-08 : approfondissement dépliable nativement. <details>/<summary>
   * donne l'équivalent clavier sans JavaScript, sans modale et sans infobulle
   * à base de title : la définition courte reste toujours visible. */
  const deepHeading = make('h3', 'e095-subtitle', 'Pour aller plus loin');
  const deep = make('div', 'e095-deep-list');
  deep.id = DEEP_ID;

  /* E095-09 : renvois locaux vers chaque définition ; ancre de fragment,
   * activation native, aucun intercepteur de clic ni conflit de routeur. */
  const indexHeading = make('h3', 'e095-subtitle', 'Aller à une définition');
  const index = make('nav', 'e095-index');
  index.id = INDEX_ID;
  index.setAttribute('aria-label', 'Index du glossaire Points');

  TERMS.forEach((term) => {
    /* E095-03, E095-04 : le terme est marqué comme premier terme avec <dfn>,
     * la définition dérivée du DOM suit immédiatement dans <dd><p>. */
    const dt = make('dt', 'e095-term');
    const dfn = make('dfn', 'e095-dfn', term.word);
    dfn.id = term.dfnId;
    setData(dfn, 'e095First', '1');
    dt.append(dfn, make('span', 'e095-first', '1ʳᵉ occurrence'));

    const dd = make('dd', 'e095-definition');
    const definition = make('p', 'e095-definition-text', defsByKey[term.key]);
    definition.id = term.defId;
    setData(definition, 'e095Term', term.key);
    dd.appendChild(definition);
    defs.append(dt, dd);

    order.appendChild(make('li', 'e095-order-item', term.label));

    const block = make('details', 'e095-deep');
    block.id = term.deepId;
    block.appendChild(make('summary', 'e095-deep-summary', term.label + ' — précision'));
    block.appendChild(make('p', 'e095-deep-text', term.deep));
    deep.appendChild(block);

    const link = make('a', 'e095-index-link', term.label);
    link.href = '#' + term.defId;
    link.setAttribute('aria-label', 'Aller à la définition : ' + term.word);
    index.appendChild(link);
  });

  /* E095-10 : métrique visible et dédupliquée, préférence de mouvement publiée. */
  const metric = make('p', 'e095-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(
    title, lede,
    defs,
    orderHeading, order,
    deepHeading, deep,
    indexHeading, index,
    metric
  );

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const total = TERMS.reduce((sum, term) => sum + occurrences[term.key], 0);
  setData(panel, 'e095Reduced', reduced ? '1' : '0');
  setData(panel, 'e095Terms', String(TERMS.length));
  setData(panel, 'e095Occurrences', String(total));
  TERMS.forEach((term) => setData(panel, 'e095Occurrences-' + term.key, String(occurrences[term.key])));
  setData(panel, 'e095Anchors', String(index.querySelectorAll('a[href^="#points-v2-e095-"]').length));
  setData(panel, 'e095Details', String(deep.querySelectorAll('details').length));

  write(metric, 'Installations : ' + renderCount
    + ' · termes définis : ' + TERMS.length
    + ' · occurrences relevées dans la vue : ' + total
    + ' (ère ' + occurrences.era + ' · domaine ' + occurrences.domain
    + ' · échelle ' + occurrences.scale + ' · certitude ' + occurrences.confidence + ')'
    + ' · renvois : ' + TERMS.length
    + ' · mouvement réduit : ' + (reduced ? 'oui' : 'non') + '.');
}

register('E095', (ctx) => {
  install(ctx);
});
