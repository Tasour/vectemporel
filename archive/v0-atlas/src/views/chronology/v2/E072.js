import { register } from './registry.js';

/* Lentille E072 — passe V2, domaine H (Responsive & mobile).
 * Thème : cibles tactiles ≥ 44 px.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E072.md — chantiers E072-01 à E072-10.
 * Fichier possédé : src/views/chronology/v2/E072.js uniquement. Modèles de qualité
 * consultés en lecture seule : src/views/chronology/E049.js et
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md. Aucun fichier partagé n'est modifié :
 * ni la passe 1, ni registry.js, index.js, styles.css, src/views/chronology.js,
 * ni une autre lentille.
 *
 * Contrat exploité : ctx = { viewId, stage, layout } plus les helpers css, el et
 * reducedMotion. Une seule feuille ctx.css('chronology-v2-e072', …), un seul
 * register('E072', install). Tous les IDs DOM sont préfixés 'chronology-v2-e072-'
 * et protégés par ensureNode (idempotence multi-rendus).
 *
 * Invariants : zéro console.*, zéro fetch/XHR, zéro Math.random, zéro innerHTML,
 * zéro timer, zéro boucle rAF. Le panneau est un bloc en flux normal, non modal,
 * sans tabindex : il n'ajoute aucun arrêt Tab, ne masque ni la frise ni la fiche.
 * Le seuil de 44 px est la constante SEUIL, affichée et mesurée, jamais devinée.
 */

const CSS_ID = 'chronology-v2-e072';
const PANEL_ID = 'chronology-v2-e072-panel';
const TITLE_ID = 'chronology-v2-e072-title';
const TABLE_ID = 'chronology-v2-e072-table';
const METRIC_ID = 'chronology-v2-e072-metric';
const AUDIT_ID = 'chronology-v2-e072-audit';
const NOTE_ID = 'chronology-v2-e072-note';
const MAIN_ID = 'atlas-chrono-main';
const ASIDE_ID = 'atlas-chrono-aside';
const TOOLS_ID = 'atlas-chrono-tools';
const SEARCH_ID = 'atlas-chrono-search';
const SEUIL = 44;

/* E072-01 à E072-10 : une seule feuille, injectée une fois. Chaque bloc porte
   le numéro du chantier qu'il rend observable. Les sélecteurs sont volontairement
   ancrés aux régions connues de la vue (main, aside, outils) pour ne pas déborder
   sur le reste de l'application. */
const CSS = `
  /* E072-01 — panneau témoin : bloc en flux, jamais une modale ni un calque. */
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e072-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e072-note { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e072-table {
    width: 100%; margin: 0 0 8px; border-collapse: collapse; text-align: left;
  }
  #${PANEL_ID} .e072-table th,
  #${PANEL_ID} .e072-table td {
    padding: 4px 6px; border-bottom: 1px solid var(--line);
    font: inherit; font-size: 9px; vertical-align: top;
  }
  #${PANEL_ID} .e072-table th { color: var(--muted-2); font-weight: 600; }
  #${PANEL_ID} .e072-audit { color: var(--gold-bright); }
  #${PANEL_ID} .e072-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }

  /* E072-02 — hauteur minimale des boutons de la frise (bandes d'ère, cartes). */
  #${MAIN_ID} button,
  #${MAIN_ID} .era-band,
  #${MAIN_ID} .event-card { min-height: ${SEUIL}px; box-sizing: border-box; }

  /* E072-03 — largeur minimale des cibles étiquetées par aria-label (icônes). */
  #${MAIN_ID} button[aria-label],
  #${ASIDE_ID} button[aria-label],
  #${TOOLS_ID} button[aria-label] { min-width: ${SEUIL}px; box-sizing: border-box; }

  /* E072-04 — respiration tactile : au moins 8 px entre cibles voisines. */
  #${MAIN_ID} .era-band + .era-band,
  #${MAIN_ID} .event-card + .event-card,
  #${TOOLS_ID} button + button { margin-top: 8px; }
  #${TOOLS_ID} { gap: 8px; }

  /* E072-05 — champ de recherche : 44 px de haut et 16 px de police (anti-zoom iOS). */
  #${SEARCH_ID} {
    min-height: ${SEUIL}px; box-sizing: border-box;
    font-size: 16px; line-height: 1.25;
  }
  #${ASIDE_ID} input[type="search"],
  #${ASIDE_ID} input[type="text"] { min-height: ${SEUIL}px; font-size: 16px; box-sizing: border-box; }

  /* E072-06 — liens et ancres : zone de tap 44 px sans grossir le texte. */
  #${MAIN_ID} a,
  #${ASIDE_ID} a {
    display: inline-flex; align-items: center;
    min-height: ${SEUIL}px; padding: 4px 6px; box-sizing: border-box;
  }
  #${MAIN_ID} a.e072-crumb,
  #${ASIDE_ID} a.e072-crumb { min-width: ${SEUIL}px; }

  /* E072-07 — commandes de navigation : retour, précédent/suivant, réinitialisation. */
  #${MAIN_ID} button[aria-keyshortcuts],
  #${MAIN_ID} button[data-action],
  #${ASIDE_ID} button,
  #${TOOLS_ID} button { min-height: ${SEUIL}px; min-width: ${SEUIL}px; }

  /* E072-08 — repli 390×844 : seuils maintenus, aucun débordement horizontal. */
  @media (max-width: 480px) {
    #${MAIN_ID} button,
    #${MAIN_ID} a,
    #${ASIDE_ID} button,
    #${ASIDE_ID} a,
    #${TOOLS_ID} button { min-height: ${SEUIL}px; min-width: ${SEUIL}px; }
    #${PANEL_ID} .e072-table th,
    #${PANEL_ID} .e072-table td { padding: 3px 4px; overflow-wrap: anywhere; }
    #${MAIN_ID}, #${ASIDE_ID} { min-width: 0; }
  }

  /* E072-09 — paysage court : cibles conservées, marges compactées. */
  @media (orientation: landscape) and (max-height: 520px) {
    #${MAIN_ID} button,
    #${ASIDE_ID} button,
    #${TOOLS_ID} button { min-height: ${SEUIL}px; }
    #${PANEL_ID} { margin-top: 8px; padding: 8px 10px; }
    #${MAIN_ID} .era-band + .era-band,
    #${MAIN_ID} .event-card + .event-card { margin-top: 4px; }
  }

  /* E072-10 — mouvement réduit et forced-colors : aucun effet animé sur les
     cibles, contrastes conservés quel que soit le mode système. */
  @media (prefers-reduced-motion: reduce) {
    #${MAIN_ID} button, #${ASIDE_ID} button, #${TOOLS_ID} button,
    #${MAIN_ID} a, #${ASIDE_ID} a, #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${MAIN_ID} button, #${ASIDE_ID} button, #${TOOLS_ID} button,
    #${MAIN_ID} a, #${ASIDE_ID} a { border: 1px solid CanvasText; color: CanvasText; }
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  }
`;

/* E072-01 : inventaire en lecture seule des catégories de cibles à mesurer. */
const CATEGORIES = [
  ['Boutons de la frise', `#${MAIN_ID} button`],
  ['Commandes latérales', `#${ASIDE_ID} button`],
  ['Champs de saisie', `#${ASIDE_ID} input[type="search"], #${ASIDE_ID} input[type="text"]`],
  ['Liens et ancres', `#${MAIN_ID} a, #${ASIDE_ID} a`],
];

let installCount = 0;
let refs = { panel: null, table: null, metric: null, audit: null, reduced: false };

/* E072-10 : garde d'existence pour toute ID préfixée chronology-v2-e072-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant le stage, un nœud de la rendu précédent est détaché et n'est donc
   plus retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : aucun textContent modifié sans changement réel. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E072-01 : mesure géométrique réelle (getBoundingClientRect), jamais une valeur
   codée en dur. Une cible est dite « sous le seuil » si sa hauteur OU sa largeur
   est inférieure à 44 px, et seulement si elle est réellement affichée. */
function mesureCibles() {
  const resultats = [];
  CATEGORIES.forEach(([libelle, selecteur]) => {
    let total = 0;
    let sousSeuil = 0;
    document.querySelectorAll(selecteur).forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      total += 1;
      if (rect.height < SEUIL || rect.width < SEUIL) sousSeuil += 1;
    });
    resultats.push({ libelle, total, sousSeuil });
  });
  return resultats;
}

/* E072-01, E072-02 à E072-09 : le panneau affiche un instantané chiffré et des
   attributs de diagnostic. Il ne modifie ni le CSS global ni la structure de la
   vue : il rend visible ce que la feuille E072 corrige. */
function refresh() {
  const { panel, table, metric, audit, reduced } = refs;
  if (!panel || !panel.isConnected) return;

  const resultats = mesureCibles();
  const totalSousSeuil = resultats.reduce((somme, ligne) => somme + ligne.sousSeuil, 0);
  const totalCibles = resultats.reduce((somme, ligne) => somme + ligne.total, 0);

  const corps = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
  const lignes = resultats.map(({ libelle, total, sousSeuil }) => {
    const tr = document.createElement('tr');
    const celluleLibelle = document.createElement('td');
    celluleLibelle.textContent = libelle;
    const celluleTotal = document.createElement('td');
    celluleTotal.textContent = String(total);
    const celluleSous = document.createElement('td');
    celluleSous.textContent = `${sousSeuil} / ${total}`;
    tr.append(celluleLibelle, celluleTotal, celluleSous);
    return tr;
  });
  corps.replaceChildren(...lignes);

  write(audit, `Cibles mesurées : ${totalCibles} · sous ${SEUIL} px : ${totalSousSeuil}.`);
  write(metric, `Seuil : ${SEUIL} px · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
  panel.dataset.e072Seuil = String(SEUIL);
  panel.dataset.e072Rendus = String(installCount);
  panel.dataset.e072SousSeuil = String(totalSousSeuil);
  panel.dataset.e072Reduced = reduced ? '1' : '0';
}

/* E072-10 : un seul point d'entrée, une seule feuille CSS, aucun écouteur, aucun
   timer. Le contrat fourni par le registre est vérifié avant toute écriture. */
function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.stage || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e072-panel', host);
  panel.setAttribute('role', 'region');

  const title = make('h2', 'e072-title', 'Cibles tactiles : le seuil de 44 px');
  title.id = TITLE_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const note = make('p', 'e072-note',
    'Panneau de lecture : il mesure les cibles réellement présentes et applique un seuil tactile minimal de 44 px. Aucun contrôle n’est ajouté, aucun focus n’est déplacé.');
  note.id = NOTE_ID;

  const table = make('table', 'e072-table');
  table.id = TABLE_ID;
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Catégorie', 'Cibles', `Sous ${SEUIL} px`].forEach((libelle) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = libelle;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);
  table.appendChild(document.createElement('tbody'));

  const audit = make('p', 'e072-audit');
  audit.id = AUDIT_ID;
  const metric = make('p', 'e072-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, note, table, audit, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, table, metric, audit, reduced };
  refresh();
}

register('E072', install);
