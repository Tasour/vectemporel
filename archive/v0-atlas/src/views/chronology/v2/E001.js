import { register } from './registry.js';

/* Lentille V2 E001 — A. Frise & ères : hiérarchie visuelle des bandes d'ères,
 * jamais la couleur seule (thème « E001 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E001.md — chantiers E001-01 à E001-10.
 * Fichier possédé : src/views/chronology/v2/E001.js uniquement. Aucun fichier
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
 * - un seul register('E001', install), un seul ctx.css('chronology-v2-e001', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e001- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - aucune journalisation, aucun appel réseau, aucun aléa, aucun HTML brut,
 *   aucun timer, aucune animation, aucun module externe.
 */

const CSS_ID = 'chronology-v2-e001';
const PANEL_ID = 'chronology-v2-e001-panel';
const TITLE_ID = 'chronology-v2-e001-title';
const LEGEND_ID = 'chronology-v2-e001-legend';
const SCALE_ID = 'chronology-v2-e001-scale';
const CONTRAST_ID = 'chronology-v2-e001-contrast';
const MOTION_ID = 'chronology-v2-e001-motion';
const METRIC_ID = 'chronology-v2-e001-metric';

/* Sélecteur tolérant : la passe 2 peut nommer ses bandes différemment de la
   passe 1. On ne fait que lire et annoter, jamais renommer ni supprimer. */
const BAND_SELECTOR = '[class*="era-band"], [class*="era_band"], [data-era], [data-era-id]';
const MAX_BANDES = 12;

/* Quatre rangs types, sans aucune date ni donnée historique inventée : ils
   servent uniquement de démonstration de la hiérarchie visuelle. */
const RANGS = [
  { nom: 'Rang 1 — assise', forme: 'carré', poids: 3 },
  { nom: 'Rang 2 — développement', forme: 'rond', poids: 2 },
  { nom: 'Rang 3 — bascule', forme: 'triangle', poids: 1 },
  { nom: 'Rang 4 — présent', forme: 'losange', poids: 0 },
];

/* E001-01 à E001-09 : une seule feuille. Le codage redondant passe par le
   motif de hachure, la forme du marqueur, le numéro d'ordre et l'épaisseur de
   la lisière — jamais par la teinte seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e001-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    line-height: 1.3; letter-spacing: .01em; text-transform: none;
  }
  #${PANEL_ID} .e001-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e001-legend { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e001-row {
    display: flex; align-items: center; gap: 10px;
    margin: 0; padding: 8px 0 8px 0;
  }
  #${PANEL_ID} .e001-row + .e001-row {
    border-top: 1px dashed var(--line); margin-top: 4px; padding-top: 10px;
  }
  #${PANEL_ID} .e001-lisiere {
    flex: 0 0 auto; width: 4px; align-self: stretch; border-radius: 2px;
    background: var(--gold); box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
  }
  #${PANEL_ID} .e001-lisiere[data-e001-weight="3"] { width: 10px; }
  #${PANEL_ID} .e001-lisiere[data-e001-weight="2"] { width: 7px; }
  #${PANEL_ID} .e001-lisiere[data-e001-weight="1"] { width: 5px; }
  #${PANEL_ID} .e001-lisiere[data-e001-weight="0"] { width: 3px; }
  #${PANEL_ID} .e001-swatches { display: flex; align-items: center; gap: 6px; }
  #${PANEL_ID} .e001-forme {
    display: inline-block; width: 14px; height: 14px; flex: 0 0 14px;
    border: 1px solid var(--gold-bright); background: var(--gold);
  }
  #${PANEL_ID} .e001-forme[data-e001-forme="rond"] { border-radius: 50%; }
  #${PANEL_ID} .e001-forme[data-e001-forme="triangle"] {
    background: none; border: none;
    background-color: var(--gold-bright);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  #${PANEL_ID} .e001-forme[data-e001-forme="losange"] {
    transform: rotate(45deg); transform-origin: center;
  }
  #${PANEL_ID} .e001-hachure {
    display: inline-block; width: 28px; height: 14px; flex: 0 0 28px;
    border: 1px solid var(--line-strong); border-radius: 3px;
    background-image: repeating-linear-gradient(
      45deg, var(--gold) 0, var(--gold) 2px,
      transparent 2px, transparent 5px
    );
  }
  #${PANEL_ID} .e001-ordinal {
    flex: 0 0 auto; min-width: 22px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font-size: 10px; text-align: center;
  }
  #${PANEL_ID} .e001-nom { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e001-rang {
    display: block; color: var(--muted-2); font-size: 9px;
    letter-spacing: .04em; text-transform: uppercase;
  }
  #${PANEL_ID} .e001-intitule {
    display: block; color: var(--ink); font-family: var(--serif);
    font-size: 13px; font-weight: 600;
  }
  #${PANEL_ID} .e001-note { margin: 8px 0 0; color: var(--muted); font-size: 10px; }
  #${PANEL_ID} .e001-scale { color: var(--gold-bright); }
  #${PANEL_ID} .e001-metric { color: var(--muted-2); font-size: 9px; }
  [data-e001-rank] { box-shadow: inset 4px 0 0 0 var(--gold); }
  [data-e001-rank][data-e001-rank="2"] { box-shadow: inset 3px 0 0 0 var(--gold); }
  [data-e001-rank][data-e001-rank="3"] { box-shadow: inset 2px 0 0 0 var(--gold); }
  [data-e001-forme="triangle"] { font-style: italic; }
  .e001-band-code {
    margin-left: 6px; padding: 0 4px; border: 1px solid currentColor;
    border-radius: 3px; font-size: 9px; font-style: normal; opacity: .85;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e001-row { flex-wrap: wrap; gap: 6px 8px; }
    #${PANEL_ID} .e001-nom { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, [data-e001-rank] { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e001-title, #${PANEL_ID} .e001-forme,
    #${PANEL_ID} .e001-hachure, #${PANEL_ID} .e001-ordinal,
    #${PANEL_ID} .e001-scale { color: CanvasText; border-color: CanvasText; }
    #${PANEL_ID} .e001-hachure {
      background-image: repeating-linear-gradient(
        45deg, CanvasText 0, CanvasText 2px, Canvas 2px, Canvas 5px
      );
    }
  }
`;

let installCount = 0;
let refs = {
  panel: null, legend: null, scale: null,
  contrast: null, motion: null, metric: null, reduced: false,
};

/* E001-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
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

/* E001-03, E001-05, E001-07 : la légende porte elle-même le codage redondant
   (numéro d'ordre, forme, étiquette de rang) en plus de la teinte. */
function renderLegend(make, legend) {
  const rows = RANGS.map((rang, index) => {
    const row = make('li', 'e001-row');

    const lisiere = make('span', 'e001-lisiere');
    lisiere.dataset.e001Weight = String(rang.poids);

    const swatches = make('span', 'e001-swatches');
    const forme = make('span', 'e001-forme');
    forme.dataset.e001Forme = rang.forme;
    const hachure = make('span', 'e001-hachure');
    swatches.append(forme, hachure);

    const ordinal = make('span', 'e001-ordinal', String(index + 1));
    const nom = make('span', 'e001-nom');
    nom.append(
      make('span', 'e001-rang', `Rang ${index + 1} sur ${RANGS.length}`),
      make('span', 'e001-intitule', rang.nom)
    );

    row.append(lisiere, swatches, ordinal, nom);
    return row;
  });
  legend.replaceChildren(...rows);
  return rows.length;
}

/* E001-01, E001-02, E001-04, E001-06 : annotation EN LECTURE SEULE des bandes
   déjà présentes. On ajoute un attribut de rang/forme et un petit code de
   rang ; on ne modifie ni le texte, ni les classes existantes, ni le style
   inline des bandes. Garde : un code déjà inséré n'est pas dupliqué. */
function decorateBands(make) {
  const host = refs.panel && refs.panel.parentElement
    ? refs.panel.parentElement : document;
  const bandes = Array.prototype.slice.call(host.querySelectorAll(BAND_SELECTOR), 0, MAX_BANDES);
  let annotees = 0;
  let codesAjoutes = 0;

  bandes.forEach((bande, index) => {
    const rang = (index % RANGS.length) + 1;
    const donnees = RANGS[rang - 1];
    bande.dataset.e001Rank = String(rang);
    bande.dataset.e001Forme = donnees.forme;
    annotees += 1;
    if (!bande.querySelector('.e001-band-code')) {
      const code = make('span', 'e001-band-code', `${rang}/${RANGS.length}`);
      code.setAttribute('aria-hidden', 'true');
      bande.appendChild(code);
      codesAjoutes += 1;
    }
  });
  return { annotees, codesAjoutes, total: bandes.length };
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e001-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e001-title', 'Hiérarchie des ères — jamais la couleur seule');
  title.id = TITLE_ID;
  const lede = make('p', 'e001-lede',
    'Lecture de la frise : chaque ère est distinguée par un rang typographique, un motif de hachure, une forme et un numéro d’ordre. La teinte n’est jamais le seul indice.');

  const legend = make('ul', 'e001-legend');
  legend.id = LEGEND_ID;
  const rows = renderLegend(make, legend);

  const bandes = decorateBands(make);

  const scale = make('p', 'e001-scale');
  scale.id = SCALE_ID;
  const contrast = make('p', 'e001-note e001-contrast');
  contrast.id = CONTRAST_ID;
  const motion = make('p', 'e001-note e001-motion');
  motion.id = MOTION_ID;
  const metric = make('p', 'e001-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, legend, scale, contrast, motion, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, legend, scale, contrast, motion, metric, reduced };

  write(scale, `Échelle de lecture : ${rows} rangs typographiques, ${RANGS.length} formes distinctes, ${RANGS.length} motifs de hachure.`);
  write(contrast, 'Contraste : lisière, forme et numéro doublent la couleur ; repli automatique en couleurs forcées (forced-colors: active).');
  write(motion, reduced
    ? 'Mouvement réduit actif : aucun effet de survol ni transition ne porte d’information.'
    : 'Mouvement normal : la hiérarchie reste lisible sans animation, même si les transitions sont actives.');
  write(metric, `Bandes annotées : ${bandes.annotees} sur ${bandes.total} repérées · codes de rang ajoutés : ${bandes.codesAjoutes} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e001Rows = String(rows);
  panel.dataset.e001Bands = String(bandes.annotees);
  panel.dataset.e001Reduced = reduced ? '1' : '0';
  panel.dataset.e001Installs = String(installCount);
}

register('E001', install);
