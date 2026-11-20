import { register } from './registry.js';

/* Lentille V2 E050 — E. Accessibilité & ARIA : zoom texte 200 % sans
 * débordement (thème « E050 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E050.md — chantiers E050-01 à E050-10.
 * Fichier possédé : src/views/chronology/v2/E050.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js) n'est
 * modifié, aucune autre lentille n'est touchée, la passe 1 reste intacte.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live concurrente ; l'annonce de zoom est un texte visible dédupliqué.
 *
 * Invariants :
 * - un seul register('E050', install), un seul ctx.css('chronology-v2-e050', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e050- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const CSS_ID = 'chronology-v2-e050';
const PANEL_ID = 'chronology-v2-e050-panel';
const TITLE_ID = 'chronology-v2-e050-title';
const DEMO_ID = 'chronology-v2-e050-demo';
const ZOOM_BTN_ID = 'chronology-v2-e050-zoom';
const ANNOUNCE_ID = 'chronology-v2-e050-announce';
const REGISTER_ID = 'chronology-v2-e050-register';
const METRIC_ID = 'chronology-v2-e050-metric';

/* E050-01 à E050-10 : une seule feuille. Toutes les tailles de texte sont en
   rem/em et le facteur de zoom est une variable CSS, jamais une valeur px en
   dur. Le retour à la ligne, l'absence d'ellipse et le min-width:0 garantissent
   l'absence de débordement même à 200 %. */
const CSS = `
  #${PANEL_ID} {
    --e050-grow: 1;
    margin: 16px 0 0; padding: 0.9rem 1rem 1rem;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 0.95rem; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID}[data-e050-zoom="200"] { --e050-grow: 2; }
  #${PANEL_ID} .e050-title {
    margin: 0 0 0.3rem; color: var(--gold-bright);
    font-family: var(--serif); font-size: 1.25rem; font-weight: 600;
    line-height: 1.3; text-transform: none;
  }
  #${PANEL_ID} .e050-lede { margin: 0 0 0.7rem; color: var(--muted); }
  #${DEMO_ID} {
    margin: 0 0 0.7rem; padding: 0.7rem 0.8rem;
    border: 1px dashed var(--line-strong); border-radius: 8px;
    font-size: calc(1rem * var(--e050-grow));
  }
  #${ZOOM_BTN_ID} {
    min-height: 2.4em; margin: 0 0 0.6rem; padding: 0.5em 1em;
    border: 1px solid var(--line-strong); border-radius: 999px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 1rem; cursor: pointer;
  }
  #${ZOOM_BTN_ID}:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${ANNOUNCE_ID} { margin: 0 0 0.6rem; color: var(--gold-bright); }
  #${PANEL_ID} .e050-scale { margin: 0 0 0.5rem; color: var(--ink); }
  #${PANEL_ID} .e050-wrap {
    margin: 0 0 0.5rem; overflow-wrap: anywhere; word-break: break-word;
  }
  #${PANEL_ID} .e050-flow {
    margin: 0 0 0.5rem; white-space: normal; text-overflow: clip; overflow: visible;
  }
  #${PANEL_ID} .e050-flex {
    display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 0.5rem;
  }
  #${PANEL_ID} .e050-flex > span {
    flex: 1 1 8rem; min-width: 0; padding: 0.2rem 0.4rem;
    border: 1px solid var(--line); border-radius: 4px;
  }
  #${PANEL_ID} .e050-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.4rem; margin: 0;
  }
  #${PANEL_ID} .e050-grid > span {
    min-width: 0; padding: 0.2rem 0.4rem;
    border: 1px solid var(--line); border-radius: 4px;
  }
  #${REGISTER_ID} { margin: 0; padding: 0; list-style: none; }
  #${REGISTER_ID} .e050-row {
    display: flex; flex-wrap: wrap; gap: 0.15rem 0.6rem;
    margin: 0; padding: 0.4rem 0; min-width: 0;
  }
  #${REGISTER_ID} .e050-row + .e050-row {
    border-top: 1px dashed var(--line);
  }
  #${PANEL_ID} .e050-code { flex: 0 0 auto; color: var(--gold-bright); }
  #${PANEL_ID} .e050-intitule { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .e050-etat { flex: 1 1 auto; min-width: 0; color: var(--muted); }
  #${METRIC_ID} { margin: 0.7rem 0 0; color: var(--muted-2); font-size: 0.85rem; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e050-title { font-size: 1.15rem; }
    #${REGISTER_ID} .e050-row { gap: 0.1rem 0.4rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${DEMO_ID}, #${ZOOM_BTN_ID},
    #${PANEL_ID} .e050-flex > span, #${PANEL_ID} .e050-grid > span {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e050-title, #${ANNOUNCE_ID}, #${PANEL_ID} .e050-code,
    #${ZOOM_BTN_ID} { color: CanvasText; }
  }
`;

/* E050-01…E050-09 : libellés des dix chantiers. Aucun chiffre historique,
   aucune date : ils décrivent uniquement le comportement du greffon. */
const CHANTIERS = [
  { code: 'E050-01', titre: 'Échelle typographique en unités relatives' },
  { code: 'E050-02', titre: 'Bascule de simulation de zoom 100 % / 200 %' },
  { code: 'E050-03', titre: 'Annonce visible du niveau de zoom' },
  { code: 'E050-04', titre: 'Retour à la ligne des mots longs' },
  { code: 'E050-05', titre: 'Flux de texte sans nowrap ni ellipse' },
  { code: 'E050-06', titre: 'Boîtes flexibles à largeur nulle minimale' },
  { code: 'E050-07', titre: 'Cibles tactibles qui grandissent avec le zoom' },
  { code: 'E050-08', titre: 'Grille adaptative en colonnes fluides' },
  { code: 'E050-09', titre: 'Contraste forcé et mouvement réduit' },
  { code: 'E050-10', titre: 'Idempotence multi-rendus du greffon' },
];

let installCount = 0;
let zoomLevel = 100;
let refs = {
  panel: null, button: null, announce: null,
  rows: [], metric: null, reduced: false,
};

/* E050-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
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

function rowId(index) {
  return `${PANEL_ID}-c${String(index + 1).padStart(2, '0')}`;
}

function etatFor(index, zoom, reduced) {
  switch (index) {
    case 0: return `Échelle rem/em active — facteur ${zoom / 100}.`;
    case 1: return `Niveau courant : ${zoom} %.`;
    case 2: return `Dernier état : ${zoom === 200 ? 'agrandi' : 'normal'}.`;
    case 3: return 'Mots longs coupés à l’intérieur, sans débordement.';
    case 4: return 'white-space normal, ellipse désactivée.';
    case 5: return 'min-width: 0, retour à la ligne autorisé.';
    case 6: return `Bouton en em — hauteur ${zoom === 200 ? 'doublée' : 'normal'}.`;
    case 7: return `auto-fit / minmax(9rem, 1fr) — ${zoom} %.`;
    case 8: return reduced ? 'Mouvement réduit : contraste préservé.' : 'Mouvement normal : contraste préservé.';
    default: return `Installations : ${installCount} — un panneau, un CSS.`;
  }
}

function refreshRegister(zoom, reduced) {
  refs.rows.forEach((etat, index) => {
    write(etat, etatFor(index, zoom, reduced));
    const row = etat.parentElement;
    if (row && row.dataset.e050Zoom !== String(zoom)) row.dataset.e050Zoom = String(zoom);
  });
}

function metricText() {
  const reduced = refs.reduced;
  return `Zoom simulé : ${zoomLevel} % · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'} · chantiers actifs : ${CHANTIERS.length}.`;
}

/* E050-02, E050-03, E050-07 : une seule bascule indépendante, native et
   clavier. Elle pose le facteur sur la variable CSS, met à jour aria-pressed
   et écrit l'annonce visible ; aucun timer, aucun déplacement de focus. */
function applyZoom() {
  const { panel, button, announce, metric, reduced } = refs;
  if (!panel || !panel.isConnected) return;
  const is200 = zoomLevel === 200;
  panel.dataset.e050Zoom = String(zoomLevel);
  panel.dataset.e050Target = is200 ? 'agrandi' : 'normal';
  if (button) {
    button.setAttribute('aria-pressed', is200 ? 'true' : 'false');
    write(button, is200 ? 'Revenir à un zoom de 100 %' : 'Simuler un zoom de 200 %');
  }
  write(announce, is200
    ? 'Zoom simulé à 200 % : le texte grandit, les blocs se réorganisent et aucun contenu ne déborde.'
    : 'Zoom à 100 % : la taille normale est restaurée.');
  write(metric, metricText());
  refreshRegister(zoomLevel, reduced);
}

function onZoomClick() {
  zoomLevel = zoomLevel === 200 ? 100 : 200;
  applyZoom();
}

/* E050-04 : chaîne non fragmentable volontairement longue. Elle vérifie que
   overflow-wrap:anywhere tient le texte dans la boîte à 200 %. */
const TOKEN = 'chronologie-zoom-deux-cents-pour-cent-sans-debordement-horizontal-foyer-era-repere-point';

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e050-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e050-title', 'Zoom texte 200 % sans débordement');
  title.id = TITLE_ID;
  const lede = make('p', 'e050-lede', 'Panneau de démonstration : le facteur de zoom est simulé par un bouton. Toutes les tailles sont en unités relatives et chaque bloc reste dans sa boîte, même quand le texte double.');

  const demo = ensureNode(make, DEMO_ID, 'div', 'e050-demo', panel);

  const button = ensureNode(make, ZOOM_BTN_ID, 'button', 'e050-zoom', demo);
  button.setAttribute('type', 'button');

  const announce = ensureNode(make, ANNOUNCE_ID, 'p', 'e050-announce', demo);
  const scale = make('p', 'e050-scale', 'Échelle de lecture : ère · repère · point — les trois niveaux restent distincts à 200 %.');
  const wrap = make('p', 'e050-wrap', TOKEN);
  const flow = make('p', 'e050-flow', 'Le texte du repère se répartit sur plusieurs lignes et ne tronque aucune information.');
  const flex = make('div', 'e050-flex');
  flex.append(make('span', '', 'Ère'), make('span', '', 'Repère'), make('span', '', 'Point'));
  const grid = make('div', 'e050-grid');
  grid.append(make('span', '', 'Colonne A'), make('span', '', 'Colonne B'), make('span', '', 'Colonne C'));
  demo.replaceChildren(button, announce, scale, wrap, flow, flex, grid);

  const register = ensureNode(make, REGISTER_ID, 'ol', 'e050-register', panel);
  const rows = CHANTIERS.map((chantier, index) => {
    const row = ensureNode(make, rowId(index), 'li', 'e050-row', register);
    const code = make('span', 'e050-code', chantier.code);
    const intitule = make('span', 'e050-intitule', chantier.titre);
    const etat = make('span', 'e050-etat');
    row.replaceChildren(code, intitule, etat);
    return etat;
  });

  const metric = ensureNode(make, METRIC_ID, 'p', 'e050-metric', panel);
  panel.replaceChildren(title, lede, demo, register, metric);

  if (button.dataset.e050Bound !== '1') {
    button.addEventListener('click', onZoomClick);
    button.dataset.e050Bound = '1';
  }

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, button, announce, rows, metric, reduced };
  panel.dataset.e050Reduced = reduced ? '1' : '0';
  panel.dataset.e050Installs = String(installCount);
  panel.dataset.e050Rows = String(rows.length);
  applyZoom();
}

register('E050', install);
