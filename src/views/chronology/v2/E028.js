import { register } from './registry.js';

/* Lentille V2 E028 — C. Détail & fiche : fil d'Ariane Ère → Repère → Point
 * (thème « E028 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E028.md — chantiers E028-01 à E028-10.
 * Fichier possédé : src/views/chronology/v2/E028.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js) n'est
 * modifié, aucune autre lentille n'est touchée, la passe 1 reste intacte.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, elle n'écrit dans aucune région existante et se contente d'afficher
 * son état en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E028', install), un seul ctx.css('chronology-v2-e028', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e028- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const CSS_ID = 'chronology-v2-e028';
const NAV_ID = 'chronology-v2-e028-breadcrumb';
const LIST_ID = 'chronology-v2-e028-list';
const ERA_ID = 'chronology-v2-e028-era';
const REPERE_ID = 'chronology-v2-e028-repere';
const POINT_ID = 'chronology-v2-e028-point';
const METRIC_ID = 'chronology-v2-e028-metric';

/* Sélecteurs tolérants : la passe 2 peut nommer ses bandes, ses cartes et sa
   fiche différemment de la passe 1. On ne fait que lire, jamais renommer ni
   supprimer. L'ordre des sélecteurs va du plus explicite au plus générique. */
const ERA_SELECTORS = [
  '[class*="era-band"][aria-pressed="true"]',
  '[class*="era-band"][aria-current="true"]',
  '[class*="era-band"][aria-current="page"]',
  '[class*="era-band"][aria-selected="true"]',
  '[class*="era-band"].is-active',
  '[class*="era-band"].active',
  '[class*="era-band"][aria-current]',
  '[data-era][aria-pressed="true"]',
  '[data-era][aria-current]',
  '[class*="era-band"]',
  '[data-era]',
];
const REPERE_SELECTORS = [
  '[class*="event-card"][aria-pressed="true"]',
  '[class*="event-card"][aria-current="true"]',
  '[class*="event-card"][aria-current="page"]',
  '[class*="event-card"][aria-selected="true"]',
  '[class*="event-card"].is-active',
  '[class*="event-card"].active',
  '[class*="event-card"][aria-current]',
  '[data-event][aria-pressed="true"]',
  '[data-event][aria-current]',
  '[class*="event-card"]',
  '[data-event]',
];
const POINT_SELECTORS = [
  '.chronology-detail h2',
  '.chronology-detail h3',
  '[role="dialog"] h2',
  '[class*="detail"] h2',
  '[class*="detail"] h3',
  '.detail-title',
  '[data-detail-title]',
];

const MAX_TEXTE = 110;

/* E028-01 à E028-10 : une seule feuille. Le fil est un bloc en flux normal en
   tête de la colonne, jamais une modale ni un calque. Le séparateur est un
   texte (›) et chaque niveau porte son libellé : aucune information n'est
   portée par la seule couleur. */
const CSS = `
  #${NAV_ID} {
    margin: 0 0 14px; padding: 9px 12px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 9px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.45;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${NAV_ID} .e028-list {
    display: flex; flex-wrap: wrap; align-items: baseline;
    gap: 2px 0; margin: 0; padding: 0; list-style: none;
  }
  #${NAV_ID} .e028-level {
    display: inline-flex; align-items: baseline; gap: 5px;
    min-width: 0; margin: 0; padding: 2px 0;
  }
  /* E028-02 : séparateur textuel inséré entre deux niveaux. Il est aussi un
     repère de lecture pour les technologies d'assistance via la liste <ol>. */
  #${NAV_ID} .e028-level + .e028-level::before {
    content: '›'; flex: 0 0 auto; margin: 0 7px 0 2px;
    color: var(--muted-2); font-size: 13px; font-weight: 700;
  }
  #${NAV_ID} .e028-name {
    flex: 0 0 auto; color: var(--muted); font-size: 9px;
    letter-spacing: .06em; text-transform: uppercase;
  }
  #${NAV_ID} .e028-value {
    min-width: 0; max-width: 34ch; color: var(--ink-soft); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  /* E028-03 : le niveau courant est marqué par aria-current ET par une
     inscription textuelle (gras + soulignement), jamais par la teinte seule. */
  #${NAV_ID} .e028-level[aria-current="page"] .e028-value {
    color: var(--gold-bright); font-weight: 700;
    text-decoration: underline; text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
  #${NAV_ID} .e028-metric {
    margin: 7px 0 0; color: var(--muted-2); font-size: 9px; line-height: 1.4;
  }
  /* E028-06 : repli 390×844 — le fil se répartit sur plusieurs lignes, chaque
     valeur garde son titre complet dans l'attribut title. */
  @media (max-width: 620px) {
    #${NAV_ID} { padding: 8px 10px 9px; }
    #${NAV_ID} .e028-list { display: block; }
    #${NAV_ID} .e028-level { display: flex; width: 100%; }
    #${NAV_ID} .e028-level + .e028-level::before { margin-left: 0; }
    #${NAV_ID} .e028-value { max-width: none; white-space: normal; }
  }
  /* E028-08 : aucune transition propre, même si la feuille globale en ajoute. */
  @media (prefers-reduced-motion: reduce) {
    #${NAV_ID}, #${NAV_ID} * { transition: none !important; animation: none !important; }
  }
  /* E028-07 : en couleurs forcées, le marquage textuel (gras + soulignement)
     et les libellés restent lisibles. */
  @media (forced-colors: active) {
    #${NAV_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${NAV_ID} .e028-name,
    #${NAV_ID} .e028-metric,
    #${NAV_ID} .e028-level[aria-current="page"] .e028-value { color: CanvasText; }
    #${NAV_ID} .e028-level + .e028-level::before { color: CanvasText; }
  }
`;

let installCount = 0;
let selectionSamples = 0;
let clickBound = false;
let refs = {
  nav: null, era: null, repere: null, point: null, metric: null,
  reduced: false, viewId: '',
};

/* E028-09 : garde d'existence. Un nœud déjà présent est réutilisé et déplacé
   dans le parent courant ; la coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E028-05 : une seule fonction d'écriture, dédupliquée, pour ne pas provoquer
   de mutations redondantes à chaque rafraîchissement. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function attribute(node, name, value) {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/* E028-04 : lecture du nom accessible réellement porté par le DOM. On ne
   retourne que du texte observé, jamais une date ni un nom historiques codés
   en dur dans la lentille. */
function lireDepuis(selectors) {
  for (const selector of selectors) {
    let node = null;
    try { node = document.querySelector(selector); } catch { continue; }
    if (!node) continue;
    const label = node.getAttribute('aria-label')
      || node.getAttribute('title')
      || (node.textContent || '').trim();
    if (label) return { texte: label.slice(0, MAX_TEXTE), source: selector };
  }
  return null;
}

function eraCourante() {
  const actif = lireDepuis(ERA_SELECTORS.slice(0, 9));
  if (actif) return actif;
  const repli = lireDepuis(ERA_SELECTORS.slice(9));
  return repli ? { texte: repli.texte, source: `${repli.source} (première bande)` } : null;
}

function repereCourant() {
  const actif = lireDepuis(REPERE_SELECTORS.slice(0, 9));
  if (actif) return actif;
  const repli = lireDepuis(REPERE_SELECTORS.slice(9));
  return repli ? { texte: repli.texte, source: `${repli.source} (premier repère)` } : null;
}

function pointCourant() {
  const titre = lireDepuis(POINT_SELECTORS);
  if (titre) return titre;
  const repli = repereCourant();
  return repli
    ? { texte: repli.texte, source: `${repli.source} (détail non identifié)` }
    : null;
}

function publier(level, donnee, libelleVide) {
  if (!level) return;
  const li = level.li;
  const valeur = level.valeur;
  write(valeur, donnee ? donnee.texte : libelleVide);
  attribute(valeur, 'title', donnee ? donnee.texte : libelleVide);
  attribute(li, 'data-e028-source', donnee ? donnee.source : 'aucune');
  return donnee;
}

/* E028-01, E028-03, E028-04, E028-05, E028-10 : rafraîchissement complet du
   fil à partir de l'état courant du DOM. Le niveau Point porte seul
   aria-current="page" ; les deux autres se le voient retirer. */
function refresh() {
  const { nav, era, repere, point, metric, reduced, viewId } = refs;
  if (!nav || !nav.isConnected) return;

  const e = publier(era, eraCourante(), 'Ère non déterminée');
  const r = publier(repere, repereCourant(), 'Repère non déterminé');
  const p = publier(point, pointCourant(), 'Point non déterminé');

  if (era && era.li) era.li.removeAttribute('aria-current');
  if (repere && repere.li) repere.li.removeAttribute('aria-current');
  if (point && point.li) attribute(point.li, 'aria-current', 'page');

  attribute(nav, 'data-e028-view', viewId || 'inconnue');
  attribute(nav, 'data-e028-installs', String(installCount));
  attribute(nav, 'data-e028-selections', String(selectionSamples));
  attribute(nav, 'data-e028-reduced', reduced ? '1' : '0');
  attribute(nav, 'data-e028-era-source', e ? e.source : 'aucune');
  attribute(nav, 'data-e028-repere-source', r ? r.source : 'aucune');
  attribute(nav, 'data-e028-point-source', p ? p.source : 'aucune');

  write(metric, `Fil d’Ariane dérivé du DOM (${installCount} rendu${installCount > 1 ? 's' : ''}, `
    + `${selectionSamples} changement${selectionSamples > 1 ? 's' : ''} observé${selectionSamples > 1 ? 's' : ''})`
    + ` · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

/* E028-05 : un seul écouteur captif, purement observationnel. Il ne fait ni
   preventDefault, ni stopPropagation, ni focus(), ni écriture live. Il ne
   réagit que si une frise est effectivement présente à l'écran. */
function onSelection(event) {
  if (!(event.target instanceof Element)) return;
  let present = false;
  try { present = Boolean(document.querySelector('[class*="era-band"], [class*="event-card"], [data-era], [data-event]')); }
  catch { present = false; }
  if (!present) return;
  selectionSamples += 1;
  refresh();
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById('atlas-chrono-main')
    || document.getElementById('atlas-chrono-aside')
    || ctx.layout;
  const nav = ensureNode(make, NAV_ID, 'nav', 'e028-breadcrumb', host);
  attribute(nav, 'aria-label', 'Fil d’Ariane : ère, repère, point');

  const list = ensureNode(make, LIST_ID, 'ol', 'e028-list', nav);
  const niveaux = [
    { id: ERA_ID, nom: 'Ère', cle: 'era' },
    { id: REPERE_ID, nom: 'Repère', cle: 'repere' },
    { id: POINT_ID, nom: 'Point', cle: 'point' },
  ];
  const niveauxRefs = {};
  niveaux.forEach(({ id, nom, cle }) => {
    const li = ensureNode(make, id, 'li', 'e028-level', list);
    const libelle = make('span', 'e028-name', `${nom} :`);
    const valeur = make('span', 'e028-value', '—');
    valeur.id = `chronology-v2-e028-${cle}-valeur`;
    li.replaceChildren(libelle, valeur);
    niveauxRefs[cle] = { li, valeur };
  });

  const metric = ensureNode(make, METRIC_ID, 'p', 'e028-metric', nav);
  nav.replaceChildren(list, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    nav,
    era: niveauxRefs.era,
    repere: niveauxRefs.repere,
    point: niveauxRefs.point,
    metric,
    reduced,
    viewId: ctx.viewId || '',
  };
  refresh();

  if (!clickBound) {
    document.addEventListener('click', onSelection, true);
    clickBound = true;
  }
}

register('E028', install);
