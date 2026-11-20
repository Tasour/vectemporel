import { register } from './registry.js';

/* Lentille E077 — passe V2, domaine H (responsive & mobile).
 * Thème : « forced-colors / prefers-contrast » (themes.json, clé E077).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E077.md — chantiers E077-01 à E077-10.
 * Fichier possédé : src/views/chronology/v2/E077.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1, rapport E048 et autres lentilles V2 laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e077', CSS). Tous les IDs DOM
 * créés sont préfixés chronology-v2-e077- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E077', install) ;
 * - aucun timer, aucun polling, aucune boucle rAF, aucun aléa, aucun réseau,
 *   aucune journalisation, aucun HTML brut, aucune région live ajoutée ;
 * - le suivi des préférences système passe par des MediaQueryList et leurs
 *   événements « change » (jamais par sondage) ;
 * - le module ne désactive jamais forced-color-adjust et ne crée ni ombre ni
 *   dégradé : en contraste forcé, l'information est portée par le texte et la
 *   bordure, jamais par la seule teinte.
 */

const CSS_ID = 'chronology-v2-e077';
const PANEL_ID = 'chronology-v2-e077-panel';
const TITLE_ID = 'chronology-v2-e077-title';
const REGISTER_ID = 'chronology-v2-e077-register';
const FORCED_ID = 'chronology-v2-e077-forced';
const CONTRAST_ID = 'chronology-v2-e077-contrast';
const TOKENS_ID = 'chronology-v2-e077-tokens';
const BORDERS_ID = 'chronology-v2-e077-borders';
const REINFORCE_ID = 'chronology-v2-e077-reinforce';
const ADJUST_ID = 'chronology-v2-e077-adjust';
const MOBILE_ID = 'chronology-v2-e077-mobile';
const DECOR_ID = 'chronology-v2-e077-decor';
const LANDSCAPE_ID = 'chronology-v2-e077-landscape';
const RENDERS_ID = 'chronology-v2-e077-renders';
const BILAN_ID = 'chronology-v2-e077-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E077-03 à E077-09 : feuille unique. Les seules règles de couleur du panneau
   utilisent les variables de la coque en mode normal et les couleurs système
   (Canvas / CanvasText / ButtonText) dès que forced-colors est actif. Aucune
   ombre, aucun dégradé, aucune animation : en contraste forcé ces effets sont
   neutralisés par le navigateur, ils ne doivent donc rien porter d'essentiel. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e077-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e077-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e077-list { margin: 0 0 8px; padding: 0; }
  #${PANEL_ID} .v2e077-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e077-key { flex: 0 0 158px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e077-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e077-register { margin: 0 0 8px; padding: 6px 0 0; list-style: none; border-top: 1px solid var(--line); }
  #${PANEL_ID} .v2e077-item { display: flex; gap: 8px; margin: 0 0 2px; }
  #${PANEL_ID} .v2e077-code { flex: 0 0 62px; color: var(--muted-2); }
  #${PANEL_ID} .v2e077-label { flex: 1 1 auto; min-width: 0; color: var(--ink-soft); }
  #${PANEL_ID} .v2e077-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  /* E077-03, E077-04, E077-08 : en contraste forcé, la coque remplace les
     couleurs par ses propres pinceaux. On reprend les jetons système pour que
     le panneau garde une bordure et un texte délimités, sans ombre ni teinte. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e077-title,
    #${PANEL_ID} .v2e077-key,
    #${PANEL_ID} .v2e077-val,
    #${PANEL_ID} .v2e077-code,
    #${PANEL_ID} .v2e077-label,
    #${PANEL_ID} .v2e077-bilan { color: CanvasText; }
    #${PANEL_ID} .v2e077-row,
    #${PANEL_ID} .v2e077-register,
    #${PANEL_ID} .v2e077-bilan { border-color: CanvasText; }
    #${PANEL_ID} .v2e077-code { color: ButtonText; text-decoration: underline; }
  }
  /* E077-05 : contraste renforcé demandé — on épaissit la démarcation et on
     souligne la valeur, sans déplacer ni masquer le moindre caractère. */
  @media (prefers-contrast: more) {
    #${PANEL_ID} { border-width: 2px; }
    #${PANEL_ID} .v2e077-row,
    #${PANEL_ID} .v2e077-register { border-bottom-width: 2px; }
    #${PANEL_ID} .v2e077-val { text-decoration: underline; text-underline-offset: 2px; }
  }
  /* E077-07 : en 390×844, les libellés passent au-dessus de la valeur : les
     paires clé/valeur restent lisibles sans défilement horizontal. */
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e077-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e077-key { flex-basis: 100%; }
    #${PANEL_ID} .v2e077-item { flex-wrap: wrap; gap: 0 6px; }
    #${PANEL_ID} .v2e077-code { flex-basis: 100%; }
  }
  /* E077-09 : paysage court ou zoom texte élevé — on réduit les espacements,
     jamais la taille du texte, afin d'éviter la troncature verticale. */
  @media (max-height: 480px) and (orientation: landscape) {
    #${PANEL_ID} { margin-top: 8px; padding: 6px 10px 8px; }
    #${PANEL_ID} .v2e077-title { margin-bottom: 3px; }
    #${PANEL_ID} .v2e077-lede,
    #${PANEL_ID} .v2e077-register { margin-bottom: 4px; }
    #${PANEL_ID} .v2e077-bilan { margin-top: 4px; padding-top: 4px; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E077-03 à E077-09 : audit de la feuille unique, dérivé de sa chaîne source.
   Aucun chiffre n'est codé en dur dans les libellés : tout est mesuré ici. */
const CSS_AUDIT = Object.freeze({
  forcedBlocks: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
  contrastBlocks: occurrences(/@media\s*\(prefers-contrast:\s*more\)/g),
  systemTokens: occurrences(/\b(?:Canvas|CanvasText|ButtonText)\b/g),
  solidBorders: occurrences(/border(?:-left|-bottom)?:\s*\d+px\s+solid/g),
  adjustNone: occurrences(/forced-color-adjust\s*:\s*none/g),
  shadows: occurrences(/box-shadow\s*:/g),
  gradients: occurrences(/gradient\s*\(/g),
  narrowBlocks: occurrences(/@media\s*\(max-width:\s*620px\)/g),
  landscapeBlocks: occurrences(/@media[^{}]*orientation:\s*landscape/g),
});

/* E077-01, E077-02 : les préférences système sont lues via matchMedia et
   suivies par événements « change ». Aucun sondage, aucun minuteur. */
const QUERIES = Object.freeze([
  ['forced', '(forced-colors: active)'],
  ['more', '(prefers-contrast: more)'],
  ['less', '(prefers-contrast: less)'],
]);

/* E077-10 : registre visible des dix chantiers, un nœud par chantier. */
const CHANTIERS = Object.freeze([
  ['E077-01', 'État forced-colors exposé en texte'],
  ['E077-02', 'Préférence prefers-contrast suivie (more / less)'],
  ['E077-03', 'Couleurs système Canvas / CanvasText en repli'],
  ['E077-04', 'Bordures de démarcation conservées'],
  ['E077-05', 'Contraste renforcé : bordure épaisse et soulignement'],
  ['E077-06', 'forced-color-adjust jamais désactivé'],
  ['E077-07', 'Paires clé / valeur repliées sous 620 px'],
  ['E077-08', 'Fond et ombre neutralisés relayés par le texte'],
  ['E077-09', 'Paysage court : espacements réduits, texte intact'],
  ['E077-10', 'CSS, IDs et écouteurs idempotents'],
]);

let installs = 0;
let mediaBound = false;
const media = { forced: false, more: false, less: false };
let refs = {
  panel: null, forced: null, contrast: null, tokens: null, borders: null,
  reinforce: null, adjust: null, mobile: null, decor: null, landscape: null,
  renders: null, bilan: null,
};

/* E077-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
function assurerNoeud(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function ecrire(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function poserDonnee(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function libelleContraste() {
  if (media.more) return 'renforcé (prefers-contrast: more)';
  if (media.less) return 'atténué (prefers-contrast: less)';
  return 'par défaut (aucune préférence déclarée)';
}

/* E077-01 à E077-09 : tout l'état est affiché en texte visible ordinaire, sans
   région live et sans écriture redondante. Les compteurs viennent de CSS_AUDIT. */
function peindre() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  ecrire(r.forced, media.forced
    ? 'active — la coque applique ses couleurs système ; le panneau suit Canvas / CanvasText.'
    : 'inactive — le panneau utilise les variables de la coque, avec repli prêt à l’emploi.');
  ecrire(r.contrast, libelleContraste());
  ecrire(r.tokens, `${CSS_AUDIT.systemTokens} jetons système (Canvas, CanvasText, ButtonText) dans la feuille.`);
  ecrire(r.borders, `${CSS_AUDIT.solidBorders} bordures pleines délimitent le panneau et ses rangées.`);
  ecrire(r.reinforce, `${CSS_AUDIT.contrastBlocks} règle « prefers-contrast: more » : bordure épaissie et valeur soulignée.`);
  ecrire(r.adjust, `${CSS_AUDIT.adjustNone} désactivation de forced-color-adjust dans le module : l’ajustement système reste actif.`);
  ecrire(r.mobile, `${CSS_AUDIT.narrowBlocks} règle sous 620 px : clé sur sa propre ligne, valeur en dessous, aucun débordement.`);
  ecrire(r.decor, `${CSS_AUDIT.shadows} ombre et ${CSS_AUDIT.gradients} dégradé : le fond et l’ombre neutralisés sont relayés par le texte et la bordure.`);
  ecrire(r.landscape, `${CSS_AUDIT.landscapeBlocks} règle paysage court : marges réduites, taille de texte inchangée.`);
  ecrire(r.renders, String(installs));
  ecrire(r.bilan, `Bilan contraste : ${CSS_AUDIT.forcedBlocks} repli forced-colors, ${CSS_AUDIT.contrastBlocks} repli contraste renforcé, ${CSS_AUDIT.systemTokens} jetons système, ${CSS_AUDIT.adjustNone} forced-color-adjust désactivé. ${media.forced ? 'Le repli système est actif : aucune information ne repose sur la seule teinte.' : 'Aucune information du panneau ne repose sur la seule teinte, quel que soit le mode.'}`);

  poserDonnee(r.panel, 'e077Forced', media.forced ? '1' : '0');
  poserDonnee(r.panel, 'e077Contrast', media.more ? 'more' : (media.less ? 'less' : 'default'));
  poserDonnee(r.panel, 'e077Tokens', String(CSS_AUDIT.systemTokens));
  poserDonnee(r.panel, 'e077Borders', String(CSS_AUDIT.solidBorders));
  poserDonnee(r.panel, 'e077Adjust', String(CSS_AUDIT.adjustNone));
  poserDonnee(r.panel, 'e077Mobile', String(CSS_AUDIT.narrowBlocks));
  poserDonnee(r.panel, 'e077Decor', `${CSS_AUDIT.shadows}/${CSS_AUDIT.gradients}`);
  poserDonnee(r.panel, 'e077Landscape', String(CSS_AUDIT.landscapeBlocks));
  poserDonnee(r.panel, 'e077Renders', String(installs));
}

/* E077-01, E077-02 : suivi réactif par MediaQueryList. La garde mediaBound
   évite toute fuite d'écouteur sur les rendus successifs ; aucun timer. */
function lierPreferences() {
  if (mediaBound) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  let rattachees = 0;
  QUERIES.forEach(([key, query]) => {
    let mql;
    try { mql = window.matchMedia(query); }
    catch { return; }
    media[key] = Boolean(mql.matches);
    const onChange = (event) => {
      media[key] = Boolean(event && typeof event.matches === 'boolean' ? event.matches : mql.matches);
      peindre();
    };
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
    else if (typeof mql.addListener === 'function') mql.addListener(onChange);
    else return;
    rattachees += 1;
  });

  if (rattachees === 0) return false;
  mediaBound = true;
  return true;
}

function ajouterLigne(list, make, key, id) {
  const row = make('div', 'v2e077-row');
  const dt = make('dt', 'v2e077-key', key);
  const dd = make('dd', 'v2e077-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = assurerNoeud(make, PANEL_ID, 'section', 'v2e077-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e077-title', 'Couleurs forcées et contraste renforcé');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e077-lede', 'Ce panneau rend observable la prise en charge des préférences système de contraste. Il n’ajoute ni région live ni animation : l’état est porté par le texte, la bordure et le soulignement, jamais par la seule couleur.');

  const list = make('dl', 'v2e077-list');
  const forced = ajouterLigne(list, make, 'Mode couleurs forcées', FORCED_ID);
  const contrast = ajouterLigne(list, make, 'Préférence de contraste', CONTRAST_ID);
  const tokens = ajouterLigne(list, make, 'Jetons système', TOKENS_ID);
  const borders = ajouterLigne(list, make, 'Bordures de démarcation', BORDERS_ID);
  const reinforce = ajouterLigne(list, make, 'Contraste renforcé', REINFORCE_ID);
  const adjust = ajouterLigne(list, make, 'Ajustement système', ADJUST_ID);
  const mobile = ajouterLigne(list, make, 'Repli mobile 620 px', MOBILE_ID);
  const decor = ajouterLigne(list, make, 'Fond, ombre et dégradé', DECOR_ID);
  const landscape = ajouterLigne(list, make, 'Paysage court', LANDSCAPE_ID);
  const renders = ajouterLigne(list, make, 'Rendus du greffon', RENDERS_ID);

  const register = make('ul', 'v2e077-register');
  register.id = REGISTER_ID;
  CHANTIERS.forEach(([code, label]) => {
    const item = make('li', 'v2e077-item');
    item.append(make('span', 'v2e077-code', code), make('span', 'v2e077-label', label));
    register.appendChild(item);
  });

  const bilan = make('p', 'v2e077-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, register, bilan);

  refs = {
    panel, forced, contrast, tokens, borders, reinforce, adjust,
    mobile, decor, landscape, renders, bilan,
  };
  peindre();

  /* lierPreferences lit la valeur initiale de chaque requête puis installe les
     écouteurs ; une seule lecture suffit, sans sondage complémentaire. */
  lierPreferences();
  peindre();
}

register('E077', install);
