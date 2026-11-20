import { register } from './registry.js';

/* Lentille E049 — passe V2, domaine E (accessibilité & ARIA).
 * Thème : « mouvement réduit respecté (zéro animation propre) ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E049.md — chantiers E049-01 à E049-10.
 * Fichier possédé : src/views/chronology/v2/E049.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e049', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e049- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E049', install) ;
 * - aucune animation, aucune transition, aucune transformation, aucun défilement
 *   fluide créé par le module : l'état est porté par le texte, jamais par un mouvement ;
 * - aucune boucle requestAnimationFrame, aucun minuteur, aucun aléa, aucun réseau,
 *   aucune journalisation, aucun HTML brut, aucune région live supplémentaire ;
 * - un seul écouteur « change » sur la préférence système, sans polling.
 */

const CSS_ID = 'chronology-v2-e049';
const PANEL_ID = 'chronology-v2-e049-panel';
const TITLE_ID = 'chronology-v2-e049-title';
const PREF_ID = 'chronology-v2-e049-preference';
const KEYFRAMES_ID = 'chronology-v2-e049-keyframes';
const TRANSITIONS_ID = 'chronology-v2-e049-transitions';
const TRANSFORMS_ID = 'chronology-v2-e049-transforms';
const PROGRAMMED_ID = 'chronology-v2-e049-programmed';
const FOLLOW_ID = 'chronology-v2-e049-follow';
const FALLBACK_ID = 'chronology-v2-e049-fallback';
const CONTRAST_ID = 'chronology-v2-e049-contrast';
const BILAN_ID = 'chronology-v2-e049-bilan';
const RENDERS_ID = 'chronology-v2-e049-renders';
const HOST_ID = 'atlas-chrono-main';

/* E049-02, E049-03, E049-06, E049-07, E049-09 : feuille unique. Les seules
   mentions de « animation » et « transition » sont des neutralisations à but
   défensif, jamais des mouvements créés : les compteurs ci-dessous ciblent
   animation-name / transition-property et restent donc à zéro. Le panneau est
   un bloc en flux normal : il n'ajoute aucun arrêt Tab et ne recouvre rien. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e049-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e049-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e049-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e049-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e049-key { flex: 0 0 142px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e049-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e049-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e049-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e049-key { flex-basis: 100%; }
  }
  /* E049-06 : repli défensif. Neutralise un mouvement éventuellement hérité
     de la coque, sans jamais en introduire un ; aucune valeur animée ici. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  /* E049-09 : l'état reste lisible en couleurs forcées, par le texte et la
     bordure, sans dépendre d'un mouvement ni de la seule teinte dorée. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e049-title,
    #${PANEL_ID} .v2e049-key,
    #${PANEL_ID} .v2e049-val,
    #${PANEL_ID} .v2e049-bilan { color: CanvasText; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E049-02, E049-03, E049-07, E049-06 et E049-09 : audit de la feuille unique,
   calculé une fois depuis sa chaîne source. Aucune valeur n'est codée en dur
   dans les libellés : chaque chiffre affiché dérive de cette mesure. */
const MOTION_AUDIT = Object.freeze({
  keyframes: occurrences(/@keyframes/g),
  animations: occurrences(/animation-name\s*:/g),
  transitions: occurrences(/transition-property\s*:/g),
  transforms: occurrences(/\btransform\s*:/g),
  smoothScroll: occurrences(/scroll-behavior\s*:\s*smooth/g),
  fallbacks: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
});

/* E049-04 : aucun mouvement programmé en JavaScript. Ces compteurs sont des
   faits structurels vérifiables par relecture du présent fichier : ni rAF, ni
   minuteur, ni boucle d'animation ne sont instanciés. */
const PROGRAMMED = Object.freeze({ raf: 0, timers: 0, loops: 0 });

let installs = 0;
let mediaBound = false;
let preference = false;
let refs = {
  panel: null, pref: null, keyframes: null, transitions: null,
  transforms: null, programmed: null, follow: null, fallback: null,
  contrast: null, bilan: null, renders: null, following: false,
};

/* E049-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
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

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E049-01 et E049-08 : l'état est affiché en texte visible ordinaire, sans
   région live, sans dépendance à un mouvement et sans écriture redondante. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  write(r.pref, preference
    ? 'Mouvement réduit demandé par le système : oui.'
    : 'Mouvement réduit demandé par le système : non — le module ne crée aucun mouvement pour autant.');
  write(r.keyframes, String(MOTION_AUDIT.keyframes));
  write(r.transitions, String(MOTION_AUDIT.transitions));
  write(r.transforms, `${MOTION_AUDIT.transforms} transformation · ${MOTION_AUDIT.smoothScroll} défilement fluide`);
  write(r.programmed, `rAF ${PROGRAMMED.raf} · minuteur ${PROGRAMMED.timers} · boucle ${PROGRAMMED.loops} : aucun mouvement programmé.`);
  write(r.follow, r.following
    ? 'Suivi de la préférence : écoute « change » active, sans polling.'
    : 'Suivi de la préférence : écoute indisponible, seule la valeur initiale est connue.');
  write(r.fallback, `Repli « prefers-reduced-motion: reduce » : ${MOTION_AUDIT.fallbacks} règle de neutralisation.`);
  write(r.contrast, `État porté par le texte et la bordure, pas par le mouvement ni la seule couleur (repli forced-colors : ${MOTION_AUDIT.forced}).`);
  write(r.renders, String(installs));
  write(r.bilan, `Bilan mouvement : ${MOTION_AUDIT.keyframes} keyframe, ${MOTION_AUDIT.transitions} transition propre, ${MOTION_AUDIT.transforms} transformation, ${PROGRAMMED.raf} rAF et ${PROGRAMMED.timers} minuteur. ${preference ? 'Le repli système neutralise tout mouvement hérité.' : 'Aucun mouvement n’est créé, quelle que soit la préférence.'}`);

  setData(r.panel, 'e049Motion', preference ? '1' : '0');
  setData(r.panel, 'e049Keyframes', String(MOTION_AUDIT.keyframes));
  setData(r.panel, 'e049Transitions', String(MOTION_AUDIT.transitions));
  setData(r.panel, 'e049Transforms', String(MOTION_AUDIT.transforms));
  setData(r.panel, 'e049Smooth', String(MOTION_AUDIT.smoothScroll));
  setData(r.panel, 'e049Programmed', 'none');
  setData(r.panel, 'e049Fallback', String(MOTION_AUDIT.fallbacks));
  setData(r.panel, 'e049Contrast', 'text+border');
  setData(r.panel, 'e049Follow', r.following ? 'change' : 'none');
  setData(r.panel, 'e049Renders', String(installs));
}

/* E049-05 : suivi réactif de la préférence système par un unique écouteur
   « change », sans minuteur ni sondage. La garde mediaBound évite toute fuite
   sur les rendus successifs. */
function bindMedia() {
  if (mediaBound) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onChange = (event) => {
    preference = Boolean(event && typeof event.matches === 'boolean' ? event.matches : query.matches);
    paint();
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  else return false;
  mediaBound = true;
  return true;
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e049-row');
  const dt = make('dt', 'v2e049-key', key);
  const dd = make('dd', 'v2e049-val');
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

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e049-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e049-title', 'Mouvement réduit — zéro animation propre');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e049-lede', 'Ce panneau décrit l’état du mouvement dans cette vue. Il ne crée aucune animation, aucune transition et aucune boucle : l’information est portée par le texte, jamais par un déplacement.');

  const list = make('dl', 'v2e049-list');
  const pref = addRow(list, make, 'Préférence système', PREF_ID);
  const keyframes = addRow(list, make, 'Keyframes propres', KEYFRAMES_ID);
  const transitions = addRow(list, make, 'Transitions propres', TRANSITIONS_ID);
  const transforms = addRow(list, make, 'Transformations / défilement fluide', TRANSFORMS_ID);
  const programmed = addRow(list, make, 'Mouvement programmé', PROGRAMMED_ID);
  const follow = addRow(list, make, 'Suivi de la préférence', FOLLOW_ID);
  const fallback = addRow(list, make, 'Repli mouvement réduit', FALLBACK_ID);
  const contrast = addRow(list, make, 'Contraste / couleur', CONTRAST_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  const bilan = make('p', 'v2e049-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, bilan);

  preference = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, pref, keyframes, transitions, transforms, programmed,
    follow, fallback, contrast, bilan, renders, following: false,
  };
  paint();

  refs.following = bindMedia();
  paint();
}

register('E049', install);
