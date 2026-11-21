import { register } from './registry.js';

/* Lentille V2 E033 — D. Navigation & clavier : Entrée / Espace, activation
 * native contre ouverture du détail (thème « E033 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E033.md — chantiers E033-01 à E033-10.
 * Fichier possédé : src/views/chronology/v2/E033.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose aucun say() : la lentille n'ajoute AUCUNE région live,
 * n'écrit dans aucune région existante et affiche son état en texte visible,
 * dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E033', ctx => …), un seul ctx.css('chronology-v2-e033', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e033- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - aucun écouteur de touche : Entrée, Espace, Échap, Tab et les flèches
 *   restent au routeur (keyboard.js:123-197) ; un seul focusin observationnel ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau, zéro vol de focus.
 */

const CSS_ID = 'chronology-v2-e033';
const PANEL_ID = 'chronology-v2-e033-panel';
const TITLE_ID = 'chronology-v2-e033-title';
const MATRIX_ID = 'chronology-v2-e033-matrix';
const NATIVE_ID = 'chronology-v2-e033-native';
const EDITABLE_ID = 'chronology-v2-e033-editable';
const DETAIL_ID = 'chronology-v2-e033-detail';
const ORDER_ID = 'chronology-v2-e033-order';
const TARGET_ID = 'chronology-v2-e033-target';
const SHORTCUTS_ID = 'chronology-v2-e033-shortcuts';
const MOTION_ID = 'chronology-v2-e033-motion';
const METRIC_ID = 'chronology-v2-e033-metric';

/* Lecture seulement : on reconnaît les contrôles et les champs avec les mêmes
   catégories que le routeur (keyboard.js:59-73), sans jamais les modifier. */
const CONTROL_SELECTOR = 'button:not([disabled]), a[href], summary, [role="button"], [role="link"]';
const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const MAX_CONTROLS = 24;

/* E033-01 : les six cases.documentées — deux touches × trois contextes. */
const CASES = [
  { id: 'entree-controle', key: 'Entrée', contexte: 'Contrôle', issue: 'activation native : le clic du bouton part, aucun raccourci.' },
  { id: 'entree-scene', key: 'Entrée', contexte: 'Scène', issue: 'bascule du détail hors de tout contrôle.' },
  { id: 'entree-champ', key: 'Entrée', contexte: 'Champ', issue: 'aucun raccourci : le champ reçoit la touche.' },
  { id: 'espace-controle', key: 'Espace', contexte: 'Contrôle', issue: 'activation native : le clic du bouton part, aucun raccourci.' },
  { id: 'espace-scene', key: 'Espace', contexte: 'Scène', issue: 'bascule du détail dans la Chronologie, jamais la lecture du récit.' },
  { id: 'espace-champ', key: 'Espace', contexte: 'Champ', issue: 'aucun raccourci : une espace est saisie dans le champ.' },
];

/* E033-05 : les quatre filtres successifs du routeur (keyboard.js:124-166). */
const ETAPES = [
  'Modificateurs : Ctrl, Meta ou Alt rendent la main au navigateur.',
  'Champ éditable : Entrée et Espace sont ignorés par le routeur.',
  'Contrôle : l’activation native prime, y compris si un gestionnaire local a déjà consommé la touche.',
  'Scène : touches de vue, puis Entrée ou Espace pour basculer le détail.',
];

/* E033-04 : les deux chemins de détail, déjà distincts dans keyboard.js. */
const CHEMINS = [
  { id: 'entree', touche: 'Entrée', texte: 'Hors contrôle : le détail s’ouvre comme une bascule.' },
  { id: 'espace', touche: 'Espace', texte: 'Dans la Chronologie : le détail bascule aussi, sans toucher au récit.' },
];

/* E033-01 à E033-09 : une seule feuille. Les couleurs ne portent jamais seules
   une information : chaque état a son libellé, son attribut de données ou sa
   forme de bordure. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e033-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    line-height: 1.3; letter-spacing: .01em; text-transform: none;
  }
  #${PANEL_ID} .e033-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e033-sub {
    margin: 8px 0 2px; color: var(--ink); font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  }
  #${PANEL_ID} .e033-matrix { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e033-case {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px;
    margin: 0; padding: 6px 0; border-top: 1px dashed var(--line);
  }
  #${PANEL_ID} .e033-case:first-child { border-top: 0; }
  #${PANEL_ID} .e033-key {
    flex: 0 0 58px; padding: 1px 5px; border: 1px solid var(--line-strong);
    border-radius: 4px; color: var(--gold-bright); font-size: 10px; text-align: center;
  }
  #${PANEL_ID} .e033-context {
    flex: 0 0 62px; color: var(--muted-2); font-size: 9px;
    text-transform: uppercase; letter-spacing: .04em;
  }
  #${PANEL_ID} .e033-outcome { flex: 1 1 240px; min-width: 0; color: var(--ink-soft); }
  .e033-native-flag {
    margin-left: 6px; padding: 0 4px; border: 1px solid currentColor;
    border-radius: 3px; font-size: 9px; font-style: normal; opacity: .8;
  }
  #${PANEL_ID} .e033-readout { margin: 5px 0 0; color: var(--muted); }
  #${PANEL_ID} .e033-readout[data-e033-editable="1"] { color: var(--gold-bright); }
  #${PANEL_ID} .e033-detail { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 0; }
  #${PANEL_ID} .e033-path {
    flex: 1 1 220px; min-width: 0; margin: 0; padding: 8px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 8px; background: rgba(255,255,255,.015);
  }
  #${PANEL_ID} .e033-path[data-e033-path="espace"] { border-left-style: dashed; }
  #${PANEL_ID} .e033-path-key {
    display: block; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .e033-order { margin: 6px 0 0; padding-left: 20px; color: var(--muted); }
  #${PANEL_ID} .e033-order li { margin: 2px 0; }
  #${PANEL_ID} .e033-target strong { color: var(--ink); }
  #${PANEL_ID} .e033-shortcuts, #${PANEL_ID} .e033-motion { color: var(--muted); }
  #${PANEL_ID} .e033-metric { margin: 8px 0 0; color: var(--muted-2); font-size: 9px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e033-case > * { flex-basis: 100%; }
    #${PANEL_ID} .e033-path { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, .e033-native-flag { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e033-title, #${PANEL_ID} .e033-key, #${PANEL_ID} .e033-path-key,
    #${PANEL_ID} .e033-readout[data-e033-editable="1"] { color: CanvasText; border-color: CanvasText; }
    #${PANEL_ID} .e033-path[data-e033-path="espace"] { border-left-style: solid; }
  }
`;

let installCount = 0;
let focusSamples = 0;
let focusBound = false;
let refs = {
  panel: null, editable: null, native: null, target: null,
  shortcuts: null, motion: null, metric: null, reduced: false,
};

/* E033-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant le stage,
   un nœud de la rendu précédente est détaché et n'est plus trouvé par
   getElementById, mais l'idempotence reste assurée dans les deux cas. */
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

function estChamp(cible) {
  if (!(cible instanceof Element)) return false;
  return cible.matches(FIELD_SELECTOR) || cible.isContentEditable === true;
}

function estControle(cible) {
  if (!(cible instanceof Element)) return false;
  if (cible.matches(CONTROL_SELECTOR)) return true;
  const role = cible.getAttribute('role');
  return Boolean(role) && ['button', 'link', 'checkbox', 'radio', 'switch', 'tab',
    'menuitem', 'option', 'slider', 'spinbutton'].includes(role);
}

/* E033-03 et E033-06 : classification en lecture seule de la cible courante,
   calquée sur keyboard.js:59-73. Aucun focus n'est déplacé, aucune touche lue. */
function decrireCible(cible) {
  if (!(cible instanceof Element)) return { genre: 'aucune', libelle: 'aucune cible active' };
  if (estChamp(cible)) return { genre: 'champ', libelle: 'champ éditable : raccourcis suspendus' };
  if (estControle(cible)) return { genre: 'controle', libelle: 'contrôle : activation native prioritaire' };
  return { genre: 'scene', libelle: 'scène : raccourcis de détail actifs' };
}

/* E033-01 : la matrice est du texte visible et indexable, jamais un tableau
   généré par CSS ni un contenu aria-hidden. */
function rendreMatrice(make, matrice) {
  const lignes = CASES.map((cas) => {
    const ligne = make('li', 'e033-case');
    ligne.dataset.e033Case = cas.id;
    ligne.append(
      make('span', 'e033-key', cas.key),
      make('span', 'e033-context', cas.contexte),
      make('span', 'e033-outcome', cas.issue)
    );
    return ligne;
  });
  matrice.replaceChildren(...lignes);
  return lignes.length;
}

/* E033-02, E033-07 : annotation non destructive des contrôles existants. On
   pose un attribut de données et un drapeau aria-hidden avec garde d'unicité ;
   on ne touche ni au texte, ni au type, ni au gestionnaire de clic. */
function inspecterHote(make, panneau) {
  const hote = panneau.parentElement || document;
  const controles = Array.prototype.slice.call(hote.querySelectorAll(CONTROL_SELECTOR), 0, MAX_CONTROLS);
  let drapeaux = 0;
  controles.forEach((controle) => {
    if (panneau.contains(controle)) return;
    controle.dataset.e033Native = '1';
    if (!controle.querySelector('.e033-native-flag')) {
      const drapeau = make('span', 'e033-native-flag', '↵ natif');
      drapeau.setAttribute('aria-hidden', 'true');
      controle.appendChild(drapeau);
      drapeaux += 1;
    }
  });
  const champs = hote.querySelectorAll(FIELD_SELECTOR).length;
  const raccourcis = hote.querySelectorAll('[aria-keyshortcuts]').length;
  return { controles: controles.length, drapeaux, champs, raccourcis };
}

/* E033-03 et E033-06 : rafraîchissement piloté par focusin uniquement. Aucune
   écriture dans une région live, aucun preventDefault, aucun stopPropagation. */
function rafraichir() {
  const { panel, editable, target, shortcuts, motion, metric, reduced } = refs;
  if (!panel || !panel.isConnected) return;

  const actif = document.activeElement;
  const cible = decrireCible(actif);
  if (panel.dataset.e033Target !== cible.genre) panel.dataset.e033Target = cible.genre;
  write(target, `Cible courante : ${cible.libelle}.`);

  const editer = estChamp(actif) ? '1' : '0';
  if (editable.dataset.e033Editable !== editer) editable.dataset.e033Editable = editer;
  write(editable, editer === '1'
    ? 'Champ éditable actif : Entrée et Espace sont neutralisés, aucun raccourci ne s’applique.'
    : 'Hors champ : Entrée et Espace suivent la matrice ci-dessus.');

  write(shortcuts, `Attributs aria-keyshortcuts relevés dans la vue : ${refs.nombreRaccourcis}. La lentille n’en ajoute aucun : le raccourci détail reste porté par le contrôle existant.`);
  write(motion, reduced
    ? 'Mouvement réduit actif : aucun effet de survol ni transition ne porte d’information.'
    : 'Mouvement normal : la matrice et les deux voies restent lisibles sans animation.');
  write(metric, `Cas documentés : ${refs.nombreCas} · contrôles repérés : ${refs.nombreControles} · drapeaux ajoutés : ${refs.nombreDrapeaux} · champs détectés : ${refs.nombreChamps} · installations : ${installCount} · changements de focus observés : ${focusSamples} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e033Editable = editer;
  panel.dataset.e033Reduced = reduced ? '1' : '0';
  panel.dataset.e033Cases = String(refs.nombreCas);
  panel.dataset.e033Installs = String(installCount);
}

function surFocusIn() {
  focusSamples += 1;
  rafraichir();
}

/* Contrat d'entrée : un seul ctx.css, un seul greffon, un seul écouteur. */
register('E033', (ctx) => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const panneau = ensureNode(make, PANEL_ID, 'section', 'e033-panel', ctx.layout);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITLE_ID);

  const titre = ensureNode(make, TITLE_ID, 'h2', 'e033-title', panneau);
  titre.textContent = 'Entrée / Espace — activation native ou détail';

  const lede = make('p', 'e033-lede',
    'Panneau de lecture : il décrit le contrat clavier existant. Il n’ajoute aucun raccourci, ne détourne aucune touche et ne déplace jamais le focus.');

  const sousMatrice = make('h3', 'e033-sub', 'Six cas documentés');
  const matrice = ensureNode(make, MATRIX_ID, 'ul', 'e033-matrix', panneau);
  const nombreCas = rendreMatrice(make, matrice);

  const hote = inspecterHote(make, panneau);

  const native = ensureNode(make, NATIVE_ID, 'p', 'e033-readout', panneau);
  write(native, `${hote.controles} contrôles repérés, dont ${hote.drapeaux} marqués « activation native ». Le clic natif reste intact.`);

  const editable = ensureNode(make, EDITABLE_ID, 'p', 'e033-readout', panneau);
  const sousDetail = make('h3', 'e033-sub', 'Deux voies vers le détail');
  const detail = ensureNode(make, DETAIL_ID, 'div', 'e033-detail', panneau);
  detail.replaceChildren(...CHEMINS.map((chemin) => {
    const voie = make('p', 'e033-path');
    voie.dataset.e033Path = chemin.id;
    voie.append(make('span', 'e033-path-key', chemin.touche), make('span', '', chemin.texte));
    return voie;
  }));

  const sousOrdre = make('h3', 'e033-sub', 'Ordre de priorité du routeur');
  const ordre = ensureNode(make, ORDER_ID, 'ol', 'e033-order', panneau);
  ordre.replaceChildren(...ETAPES.map((etape, index) => {
    const item = make('li', '');
    item.dataset.e033Step = String(index + 1);
    item.textContent = etape;
    return item;
  }));

  const target = ensureNode(make, TARGET_ID, 'p', 'e033-readout e033-target', panneau);
  const shortcuts = ensureNode(make, SHORTCUTS_ID, 'p', 'e033-shortcuts', panneau);
  const motion = ensureNode(make, MOTION_ID, 'p', 'e033-motion', panneau);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e033-metric', panneau);

  panneau.replaceChildren(titre, lede, sousMatrice, matrice, native, editable,
    sousDetail, detail, sousOrdre, ordre, target, shortcuts, motion, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel: panneau, editable, native, target, shortcuts, motion, metric, reduced,
    nombreCas, nombreControles: hote.controles, nombreDrapeaux: hote.drapeaux,
    nombreChamps: hote.champs, nombreRaccourcis: hote.raccourcis,
  };
  panneau.dataset.e033Shortcuts = String(hote.raccourcis);
  panneau.dataset.e033Controls = String(hote.controles);
  rafraichir();

  if (!focusBound) {
    document.addEventListener('focusin', surFocusIn, true);
    focusBound = true;
  }
});
