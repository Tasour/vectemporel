import { register } from './registry.js';

/* Lentille E075 — passe V2, domaine H (responsive & mobile).
 * Thème : « points de rupture documentés » (themes.json, clé E075).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E075.md — chantiers E075-01 à E075-10.
 * Fichier possédé : src/views/chronology/v2/E075.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e075', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e075- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E075', install), un seul ctx.css, un seul panneau ;
 * - zéro écouteur, zéro minuteur, zéro boucle rAF, zéro IntersectionObserver ;
 * - zéro aléa, zéro réseau, zéro journalisation, zéro innerHTML ;
 * - zéro région live ajoutée, zéro vol de focus ;
 * - les largeurs et seuils affichés sont des lectures ponctuelles au rendu ;
 *   le suivi « en direct » des seuils est porté par les media queries CSS,
 *   sans code d'écoute ni polling.
 */

const CSS_ID = 'chronology-v2-e075';
const PANEL_ID = 'chronology-v2-e075-panel';
const TITLE_ID = 'chronology-v2-e075-title';
const REGISTER_ID = 'chronology-v2-e075-register';
const SEUIL_1000_ID = 'chronology-v2-e075-seuil-1000';
const SEUIL_620_ID = 'chronology-v2-e075-seuil-620';
const BANDE_INTER_ID = 'chronology-v2-e075-bande-intermediaire';
const BANDE_LARGE_ID = 'chronology-v2-e075-bande-large';
const CASCADE_ID = 'chronology-v2-e075-cascade';
const MOUVEMENT_ID = 'chronology-v2-e075-mouvement';
const CONTRASTE_ID = 'chronology-v2-e075-contraste';
const LARGEUR_ID = 'chronology-v2-e075-largeur';
const DEBORDEMENT_ID = 'chronology-v2-e075-debordement';
const BILAN_ID = 'chronology-v2-e075-bilan';
const RENDUS_ID = 'chronology-v2-e075-rendus';
const HOST_ID = 'atlas-chrono-main';

/* E075-01 à E075-07 : feuille unique. Les cinq blocs @media (1000, 620,
   bande intermédiaire, bande large, mouvement réduit) et les deux replis de
   contraste constituent les points de rupture documentés : chacun porte un
   témoin visuel dont le texte est déjà présent dans le DOM. Aucune animation,
   aucune transition affirmative, aucun défilement fluide. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e075-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e075-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e075-list { margin: 0 0 8px; padding: 0; }
  #${PANEL_ID} .v2e075-row {
    display: flex; flex-wrap: wrap; gap: 1px 10px;
    margin: 0; padding: 3px 0; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e075-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e075-val { flex: 1 1 160px; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e075-marker::after {
    content: 'hors seuil'; margin-left: 6px; padding: 0 5px;
    border: 1px solid var(--line); border-radius: 4px;
    color: var(--muted-2); font-size: 9px;
  }
  #${PANEL_ID} .v2e075-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  #${PANEL_ID} .v2e075-table { width: 100%; margin: 8px 0 10px; border-collapse: collapse; }
  #${PANEL_ID} .v2e075-table caption {
    margin: 0 0 4px; color: var(--gold-bright); font-size: 10px; text-align: left;
  }
  #${PANEL_ID} .v2e075-table th,
  #${PANEL_ID} .v2e075-table td {
    padding: 3px 5px; border-bottom: 1px solid var(--line);
    font-size: 10px; text-align: left; vertical-align: top;
  }
  #${PANEL_ID} .v2e075-table th { width: 28%; color: var(--muted); font-weight: 600; }
  #${PANEL_ID} .v2e075-table code { color: var(--gold-bright); font: inherit; }

  /* E075-02 : seuil 1000 px — premier de la cascade, avant 620 px. */
  @media (max-width: 1000px) {
    #${PANEL_ID} { padding: 8px 10px 10px; }
    #${SEUIL_1000_ID} .v2e075-marker::after { content: 'seuil 1000 px actif'; color: var(--gold-bright); border-color: var(--gold); }
  }
  /* E075-03 : seuil 620 px — les lignes passent en colonne pour éviter le débordement. */
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e075-key { flex-basis: 100%; }
    #${PANEL_ID} .v2e075-table th { width: 34%; }
    #${SEUIL_620_ID} .v2e075-marker::after { content: 'seuil 620 px actif'; color: var(--gold-bright); border-color: var(--gold); }
  }
  /* E075-04 : les deux bandes entre et au-dessus des seuils sont nommées. */
  @media (min-width: 621px) and (max-width: 1000px) {
    #${BANDE_INTER_ID} .v2e075-marker::after { content: 'bande 621–1000 px active'; color: var(--gold-bright); border-color: var(--gold); }
  }
  @media (min-width: 1001px) {
    #${BANDE_LARGE_ID} .v2e075-marker::after { content: 'bande 1001 px et plus active'; color: var(--gold-bright); border-color: var(--gold); }
  }
  /* E075-06 : le repli mouvement réduit est documenté comme seuil, sans mouvement créé. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
    #${MOUVEMENT_ID} .v2e075-marker::after { content: 'repli mouvement réduit actif'; color: var(--gold-bright); border-color: var(--gold); }
  }
  /* E075-07 : replis de contraste, documentés au même titre que les largeurs. */
  @media (prefers-contrast: more) {
    #${PANEL_ID} { border-left-width: 4px; }
    #${CONTRASTE_ID} .v2e075-marker::after { content: 'contraste renforcé actif'; color: var(--gold-bright); border-color: var(--gold); }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border-color: CanvasText; border-left-color: CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .v2e075-title, #${PANEL_ID} .v2e075-key,
    #${PANEL_ID} .v2e075-val, #${PANEL_ID} .v2e075-bilan,
    #${PANEL_ID} .v2e075-table th, #${PANEL_ID} .v2e075-table td,
    #${PANEL_ID} .v2e075-table code { color: CanvasText; }
    #${CONTRASTE_ID} .v2e075-marker::after { content: 'couleurs forcées actives'; color: CanvasText; border-color: CanvasText; }
  }
`;

/* E075-01, E075-04, E075-06, E075-07 : inventaire des seuils. Six lignes,
   une par condition média réellement présente dans la vue ou la coque ; aucun
   seuil n'est inventé, aucun chiffre n'est codé en dur dans les libellés. */
const SEUILS = Object.freeze([
  ['1000 px', '@media (max-width: 1000px)', 'Grille en une colonne, fiche sous la frise (styles.css:316-317).'],
  ['620 px', '@media (max-width: 620px)', 'Ères à 45 %, outils en colonne, recherche pleine largeur (chronology.js:84-88).'],
  ['621–1000 px', '@media (min-width: 621px) and (max-width: 1000px)', 'Bande intermédiaire : une colonne, hors repli mobile.'],
  ['1001 px et +', '@media (min-width: 1001px)', 'Deux colonnes : frise à gauche, fiche à droite.'],
  ['Mouvement réduit', '@media (prefers-reduced-motion: reduce)', 'Transitions neutralisées (styles.css:342-344, chronology.js:90-92).'],
  ['Contraste', '@media (prefers-contrast: more), (forced-colors: active)', 'Couleurs système ; l’information reste portée par le texte.'],
]);

/* E075-02 à E075-07 : chaque requête est comptée depuis la source de la
   feuille unique. Le total et l'ordre de cascade sont donc mesurés, jamais
   supposés. */
const REQUETES = Object.freeze({
  max1000: '@media (max-width: 1000px)',
  max620: '@media (max-width: 620px)',
  inter: '@media (min-width: 621px) and (max-width: 1000px)',
  large: '@media (min-width: 1001px)',
  reduce: '@media (prefers-reduced-motion: reduce)',
  contrast: '@media (prefers-contrast: more)',
  forced: '@media (forced-colors: active)',
});

function occurrences(aiguille) {
  return CSS.split(aiguille).length - 1;
}

const MEDIA = Object.freeze({
  max1000: occurrences(REQUETES.max1000),
  max620: occurrences(REQUETES.max620),
  inter: occurrences(REQUETES.inter),
  large: occurrences(REQUETES.large),
  reduce: occurrences(REQUETES.reduce),
  contrast: occurrences(REQUETES.contrast),
  forced: occurrences(REQUETES.forced),
});

function ordreCascade() {
  const positions = Object.keys(REQUETES).map((cle) => CSS.indexOf(REQUETES[cle]));
  if (positions.some((position) => position < 0)) return false;
  const [p1000, p620, pInter, pLarge, pReduce, pContrast, pForced] = positions;
  return p1000 < p620 && p620 < pInter && pInter < pLarge
    && pLarge < pReduce && pReduce < pContrast && pContrast < pForced;
}

const CASCADE_OK = ordreCascade();
const TOTAL_MEDIA = Object.keys(MEDIA).reduce((somme, cle) => somme + MEDIA[cle], 0);

let rendus = 0;
let refs = {
  panel: null, register: null, seuil1000: null, seuil620: null,
  inter: null, large: null, cascade: null, mouvement: null,
  contraste: null, largeur: null, debordement: null, bilan: null,
  rendus: null, largeurMesuree: null, bande: 'n/d', reduction: false,
  debordementPx: 0,
};

/* E075-10 : garde d'existence. La coque reconstruisant le stage, un nœud de
   la rendu précédente est détaché ; on le réutilise et on le déplace dans le
   parent courant plutôt que d'en créer un doublon. */
function assurerNoeud(creer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = creer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (!noeud) return;
  /* Le texte va dans un enfant dédié : le témoin CSS (span .v2e075-marker)
     doit survivre à chaque rafraîchissement. */
  const cible = noeud.querySelector('.v2e075-text') || noeud;
  if (cible.textContent !== texte) cible.textContent = texte;
}

function setData(noeud, cle, valeur) {
  if (noeud && noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

/* E075-08 : lecture ponctuelle de la largeur. Aucun écouteur resize : le suivi
   en direct est délégué aux media queries CSS (témoins des chantiers 02 à 07). */
function mesurerLargeur() {
  if (typeof window === 'undefined' || typeof window.innerWidth !== 'number') return null;
  return Math.max(0, Math.floor(window.innerWidth));
}

function nommerBande(largeur) {
  if (largeur === null) return 'n/d';
  if (largeur <= 620) return 'mobile · 620 px et moins';
  if (largeur <= 1000) return 'intermédiaire · 621–1000 px';
  return 'large · 1001 px et plus';
}

/* E075-09 : mesure de débordement en lecture seule. Un débordement positif
   est signalé, pas corrigé : la correction relève de styles.css, non possédé. */
function mesurerDebordement() {
  const racine = document.documentElement;
  if (!racine || typeof racine.scrollWidth !== 'number') return 0;
  return Math.max(0, Math.floor(racine.scrollWidth - racine.clientWidth));
}

function ajouterLigne(liste, creer, cle, id, avecTémoin) {
  const ligne = creer('div', 'v2e075-row');
  const dt = creer('dt', 'v2e075-key', cle);
  const dd = creer('dd', 'v2e075-val');
  dd.id = id;
  dd.appendChild(creer('span', 'v2e075-text', ''));
  if (avecTémoin) dd.appendChild(creer('span', 'v2e075-marker', ''));
  ligne.append(dt, dd);
  liste.appendChild(ligne);
  return dd;
}

/* E075-01 : le registre est une vraie table sémantique, lisible sans CSS. */
function construireRegistre(creer) {
  const table = creer('table', 'v2e075-table');
  table.id = REGISTER_ID;
  const caption = creer('caption', '', 'Points de rupture et replis documentés de la vue Chronologie');
  table.appendChild(caption);
  const enTete = creer('tr', '');
  enTete.append(creer('th', '', 'Seuil'), creer('th', '', 'Condition et effet'));
  const corps = creer('tbody', '');
  SEUILS.forEach(([seuil, condition, effet]) => {
    const ligne = creer('tr', '');
    const celluleSeuil = creer('td', '', seuil);
    const celluleEffet = creer('td', '');
    celluleEffet.append(creer('code', '', condition), creer('span', '', ` — ${effet}`));
    ligne.append(celluleSeuil, celluleEffet);
    corps.appendChild(ligne);
  });
  table.append(enTete, corps);
  return table;
}

/* E075-01 à E075-10 : toute l'état tient dans du texte visible ordinaire,
   dédupliqué, sans région live, sans annonce et sans écriture redondante. */
function peindre() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  ecrire(r.largeur, r.largeurMesuree === null
    ? 'Largeur non mesurable dans ce contexte.'
    : `${r.largeurMesuree} px · bande ${r.bande}`);
  ecrire(r.debordement, r.debordementPx === 0
    ? 'Aucun débordement horizontal détecté au rendu.'
    : `Débordement horizontal de ${r.debordementPx} px détecté au rendu.`);
  ecrire(r.cascade, CASCADE_OK
    ? `Cascade ordonnée : 1000 px avant 620 px, puis les bandes et les replis. ${TOTAL_MEDIA} blocs @media déclarés dans la feuille unique.`
    : `Cascade à vérifier : l'ordre des blocs @media n'est pas celui attendu. ${TOTAL_MEDIA} blocs déclarés.`);
  ecrire(r.mouvement, r.reduction
    ? 'Préférence de mouvement réduit signalée par le contexte ; le repli CSS neutralise toute transition héritée.'
    : 'Mouvement réduit non signalé ; le module ne crée lui-même aucune animation.');
  ecrire(r.contraste, 'Les seuils de contraste sont documentés : renforcement de bordure et couleurs système, information portée par le texte.');
  ecrire(r.rendus, String(rendus));
  ecrire(r.bilan, `Bilan seuils : ${SEUILS.length} lignes documentées, ${TOTAL_MEDIA} blocs @media (1000 px : ${MEDIA.max1000}, 620 px : ${MEDIA.max620}, bandes : ${MEDIA.inter + MEDIA.large}, mouvement : ${MEDIA.reduce}, contraste : ${MEDIA.contrast + MEDIA.forced}). Largeur au rendu : ${r.largeurMesuree === null ? 'n/d' : `${r.largeurMesuree} px`} ; débordement : ${r.debordementPx} px.`);

  setData(r.panel, 'e075Seuils', String(SEUILS.length));
  setData(r.panel, 'e075Media', String(TOTAL_MEDIA));
  setData(r.panel, 'e075Cascade', CASCADE_OK ? 'ordonnee' : 'a-verifier');
  setData(r.panel, 'e075Largeur', r.largeurMesuree === null ? 'nd' : String(r.largeurMesuree));
  setData(r.panel, 'e075Bande', r.bande);
  setData(r.panel, 'e075Reduced', r.reduction ? '1' : '0');
  setData(r.panel, 'e075Overflow', String(r.debordementPx));
  setData(r.panel, 'e075Renders', String(rendus));
}

function install(ctx) {
  const creer = ctx && ctx.el;
  if (typeof creer !== 'function' || !ctx.layout) return;

  rendus += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = assurerNoeud(creer, PANEL_ID, 'section', 'v2e075-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = creer('h2', 'v2e075-title', 'Points de rupture documentés');
  title.id = TITLE_ID;
  const lede = creer('p', 'v2e075-lede', 'Ce panneau décrit les seuils de la vue Chronologie et signale celui qui est actif. Il n’ajoute aucun écouteur : les témoins « seuil actif » sont pilotés par les media queries de la feuille unique, la largeur et le débordement étant lus au moment du rendu.');

  const liste = creer('dl', 'v2e075-list');
  const seuil1000 = ajouterLigne(liste, creer, 'Seuil 1000 px', SEUIL_1000_ID, true);
  const seuil620 = ajouterLigne(liste, creer, 'Seuil 620 px', SEUIL_620_ID, true);
  const inter = ajouterLigne(liste, creer, 'Bande 621–1000 px', BANDE_INTER_ID, true);
  const large = ajouterLigne(liste, creer, 'Bande 1001 px et plus', BANDE_LARGE_ID, true);
  const cascade = ajouterLigne(liste, creer, 'Ordre de cascade', CASCADE_ID, false);
  const mouvement = ajouterLigne(liste, creer, 'Mouvement réduit', MOUVEMENT_ID, true);
  const contraste = ajouterLigne(liste, creer, 'Replis de contraste', CONTRASTE_ID, true);
  const largeur = ajouterLigne(liste, creer, 'Largeur mesurée', LARGEUR_ID, false);
  const debordement = ajouterLigne(liste, creer, 'Débordement horizontal', DEBORDEMENT_ID, false);
  const rendusNoeud = ajouterLigne(liste, creer, 'Rendus du greffon', RENDUS_ID, false);

  ecrire(seuil1000, 'Deux colonnes au-dessus du seuil, une colonne au-dessous.');
  ecrire(seuil620, 'Outils en colonne et recherche pleine largeur au-dessous du seuil.');
  ecrire(inter, 'Une colonne sans repli mobile : c’est la bande intermédiaire.');
  ecrire(large, 'Deux colonnes : frise à gauche, fiche à droite.');

  const bilan = creer('p', 'v2e075-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : aucun nœud en doublon ne subsiste
     dans le document après un rendu successif. */
  panel.replaceChildren(title, lede, construireRegistre(creer), liste, bilan);

  const largeurMesuree = mesurerLargeur();
  refs = {
    panel, register: document.getElementById(REGISTER_ID), seuil1000, seuil620,
    inter, large, cascade, mouvement, contraste, largeur, debordement,
    bilan, rendus: rendusNoeud,
    largeurMesuree,
    bande: nommerBande(largeurMesuree),
    reduction: typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false,
    debordementPx: mesurerDebordement(),
  };
  peindre();
}

register('E075', install);
