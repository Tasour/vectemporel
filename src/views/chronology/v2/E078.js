import { register } from './registry.js';

/* Lentille E078 — passe V2, domaine H (responsive & mobile).
 * Thème : « paysage sans troncature ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E078.md — chantiers E078-01 à E078-10.
 * Fichier possédé : src/views/chronology/v2/E078.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts). Lectures seules autorisées :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e078', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e078- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E078', install) ;
 * - un seul écouteur « change » sur l'orientation, sans polling ni minuteur ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro rAF, aucune région live supplémentaire ;
 * - l'information est portée par le texte et le CSS, jamais par un mouvement.
 */

const CSS_ID = 'chronology-v2-e078';
const PANEL_ID = 'chronology-v2-e078-panel';
const TITLE_ID = 'chronology-v2-e078-title';
const ORIENTATION_ID = 'chronology-v2-e078-orientation';
const HEIGHT_ID = 'chronology-v2-e078-height';
const ELLIPSIS_ID = 'chronology-v2-e078-ellipsis';
const NOWRAP_ID = 'chronology-v2-e078-nowrap';
const CLIP_ID = 'chronology-v2-e078-clip';
const TOOLS_ID = 'chronology-v2-e078-tools';
const FRISE_ID = 'chronology-v2-e078-frise';
const SAFEAREA_ID = 'chronology-v2-e078-safearea';
const TARGETS_ID = 'chronology-v2-e078-targets';
const RENDERS_ID = 'chronology-v2-e078-renders';
const BILAN_ID = 'chronology-v2-e078-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E078-03 à E078-09 : feuille unique. Chaque règle paysage est une mesure
   anti-troncature observable ; le panneau reste un bloc en flux normal, sans
   arrêt Tab et sans recouvrement. Les compteurs ci-dessous dérivent de cette
   chaîne source : aucun chiffre n'est codé en dur dans les libellés. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e078-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e078-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e078-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e078-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e078-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e078-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e078-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }

  /* E078-08 : marges de sécurité en paysage (iPhone tourné). */
  @media (orientation: landscape) {
    #${PANEL_ID} {
      padding-left: max(12px, env(safe-area-inset-left, 0px));
      padding-right: max(12px, env(safe-area-inset-right, 0px));
    }
    /* E078-06 : la barre d'outils passe en flux au lieu de déborder. */
    #atlas-chrono-tools { flex-wrap: wrap; row-gap: 6px; }
    /* E078-03 : l'ellipse est neutralisée, le texte est restitué. */
    .event-card, .era-band, .era-label, .point-title { text-overflow: clip !important; }
    /* E078-04 : le nowrap est levé sur les étiquettes longues. */
    .era-label, .event-card, .point-title { white-space: normal !important; overflow-wrap: anywhere; }
    /* E078-05 : aucune hauteur fixe ne coupe le contenu en paysage. */
    .event-card, .era-band, .chronology-detail { max-height: none !important; min-height: 0; overflow: visible; }
    /* E078-07 : défilement horizontal borné avec respiration en fin de frise. */
    .chronology-track, .era-track { scroll-padding-inline-end: 24px; scroll-snap-type: x proximity; }
    /* E078-09 : les cibles tactiles gardent 44 px malgré le peu de hauteur. */
    #atlas-chrono-tools button, .era-band, .event-card { min-height: 44px; }
  }

  /* E078-02 : écran court = paysage typique ; on compacte sans rien couper. */
  @media (orientation: landscape) and (max-height: 500px) {
    #${PANEL_ID} { margin-top: 8px; padding-top: 6px; padding-bottom: 8px; }
    #${PANEL_ID} .v2e078-row { margin-bottom: 2px; padding-bottom: 2px; }
    #atlas-chrono-tools { row-gap: 4px; }
  }

  /* Repli défensif : aucun mouvement propre, y compris en paysage. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }

  /* E078-09 : l'état reste lisible en couleurs forcées, sans dépendre de
     la seule teinte ni d'un mouvement. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e078-title,
    #${PANEL_ID} .v2e078-key,
    #${PANEL_ID} .v2e078-val,
    #${PANEL_ID} .v2e078-bilan { color: CanvasText; }
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e078-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e078-key { flex-basis: 100%; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* Audit de la feuille unique, calculé une fois depuis sa chaîne source.
   Chaque champ alimente une ligne du panneau ; aucune valeur n'est codée en dur. */
const CSS_AUDIT = Object.freeze({
  landscape: occurrences(/@media\s*\(orientation:\s*landscape\)/g),
  shortHeight: occurrences(/@media[^{]*orientation:\s*landscape[^{]*max-height/g),
  ellipsisClip: occurrences(/text-overflow:\s*clip/g),
  normalSpace: occurrences(/white-space:\s*normal/g),
  anyWrap: occurrences(/overflow-wrap:\s*anywhere/g),
  noMaxHeight: occurrences(/max-height:\s*none/g),
  clippedOverflow: occurrences(/overflow:\s*visible/g),
  toolsWrap: occurrences(/flex-wrap:\s*wrap/g),
  scrollPadding: occurrences(/scroll-padding-inline-end/g),
  snap: occurrences(/scroll-snap-type/g),
  safeArea: occurrences(/env\(safe-area-inset/g),
  target44: occurrences(/min-height:\s*44px/g),
  reduced: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
});

const SHORT_VIEWPORT_PX = 500;

let installs = 0;
let orientationBound = false;
let landscape = false;
let viewportHeight = 0;
let refs = {
  panel: null, orientation: null, height: null, ellipsis: null,
  nowrap: null, clip: null, tools: null, frise: null, safearea: null,
  targets: null, renders: null, bilan: null,
};

/* E078-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
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

/* E078-01 et E078-02 : l'état d'orientation et la hauteur utile sont affichés
   en texte visible ordinaire, sans région live et sans écriture redondante. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  const court = viewportHeight > 0 && viewportHeight < SHORT_VIEWPORT_PX;

  write(r.orientation, landscape
    ? 'Paysage détecté : oui — les mesures anti-troncature sont actives.'
    : 'Paysage détecté : non — la vue reste en portrait, les mesures paysage sont prêtes.');
  write(r.height, `Hauteur utile : ${viewportHeight || 'non mesurée'} px · seuil écran court ${SHORT_VIEWPORT_PX} px · ${court ? 'écran court' : 'hauteur confortable'}.`);
  write(r.ellipsis, `${CSS_AUDIT.ellipsisClip} règle(s) neutralisant text-overflow en faveur d'un texte intégral.`);
  write(r.nowrap, `${CSS_AUDIT.normalSpace} règle(s) white-space: normal · ${CSS_AUDIT.anyWrap} règle(s) overflow-wrap: anywhere : les étiquettes longues se répartiennent au lieu d'être coupées.`);
  write(r.clip, `${CSS_AUDIT.noMaxHeight} règle(s) max-height: none · ${CSS_AUDIT.clippedOverflow} règle(s) overflow: visible : aucun contenu n'est tronqué verticalement.`);
  write(r.tools, `${CSS_AUDIT.toolsWrap} règle(s) flex-wrap: wrap : la barre d'outils passe en flux et ne déborde pas horizontalement.`);
  write(r.frise, `${CSS_AUDIT.scrollPadding} règle(s) scroll-padding-inline-end · ${CSS_AUDIT.snap} règle(s) scroll-snap-type : défilement borné avec respiration en fin de frise.`);
  write(r.safearea, `${CSS_AUDIT.safeArea} appel(s) env(safe-area-inset-*) : marges de sécurité gauche/droite respectées en paysage.`);
  write(r.targets, `${CSS_AUDIT.target44} règle(s) min-height: 44px : les cibles tactiles restent au moins aussi grandes en paysage.`);
  write(r.renders, String(installs));
  write(r.bilan, `Bilan paysage : ${CSS_AUDIT.landscape} bloc(s) de règles paysage, ${CSS_AUDIT.shortHeight} repli(s) écran court, ${CSS_AUDIT.reduced} repli mouvement réduit, ${CSS_AUDIT.forced} repli couleurs forcées. ${landscape ? 'Orientation paysage active.' : 'Orientation portrait active.'}`);

  setData(r.panel, 'e078Landscape', landscape ? '1' : '0');
  setData(r.panel, 'e078Height', String(viewportHeight));
  setData(r.panel, 'e078Short', court ? '1' : '0');
  setData(r.panel, 'e078Ellipsis', String(CSS_AUDIT.ellipsisClip));
  setData(r.panel, 'e078Nowrap', String(CSS_AUDIT.normalSpace));
  setData(r.panel, 'e078Clip', String(CSS_AUDIT.noMaxHeight));
  setData(r.panel, 'e078Tools', String(CSS_AUDIT.toolsWrap));
  setData(r.panel, 'e078Frise', String(CSS_AUDIT.scrollPadding));
  setData(r.panel, 'e078Safearea', String(CSS_AUDIT.safeArea));
  setData(r.panel, 'e078Targets', String(CSS_AUDIT.target44));
  setData(r.panel, 'e078Renders', String(installs));
}

/* E078-01 : suivi réactif de l'orientation par un unique écouteur « change »,
   sans minuteur ni sondage. La garde orientationBound évite toute fuite sur
   les rendus successifs ; la hauteur est relue à chaque changement. */
function bindOrientation() {
  if (orientationBound) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const query = window.matchMedia('(orientation: landscape)');
  const onChange = (event) => {
    landscape = Boolean(event && typeof event.matches === 'boolean' ? event.matches : query.matches);
    viewportHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
    paint();
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  else return false;
  orientationBound = true;
  return true;
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e078-row');
  const dt = make('dt', 'v2e078-key', key);
  const dd = make('dd', 'v2e078-val');
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

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e078-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e078-title', 'Paysage sans troncature');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e078-lede', 'Ce panneau décrit les mesures qui évitent de couper le contenu quand l’écran est tourné en paysage. L’information est portée par le texte et le CSS : aucun mouvement, aucune région live, aucun contrôle ajouté.');

  const list = make('dl', 'v2e078-list');
  const orientation = addRow(list, make, 'Orientation', ORIENTATION_ID);
  const height = addRow(list, make, 'Hauteur utile', HEIGHT_ID);
  const ellipsis = addRow(list, make, 'Ellipsis neutralisés', ELLIPSIS_ID);
  const nowrap = addRow(list, make, 'Étiquettes non coupées', NOWRAP_ID);
  const clip = addRow(list, make, 'Hauteur non tronquée', CLIP_ID);
  const tools = addRow(list, make, 'Barre d’outils en flux', TOOLS_ID);
  const frise = addRow(list, make, 'Frise défilement borné', FRISE_ID);
  const safearea = addRow(list, make, 'Marges de sécurité', SAFEAREA_ID);
  const targets = addRow(list, make, 'Cibles tactiles', TARGETS_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  const bilan = make('p', 'v2e078-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, bilan);

  landscape = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? Boolean(window.matchMedia('(orientation: landscape)').matches)
    : false;
  viewportHeight = typeof window !== 'undefined' && typeof window.innerHeight === 'number'
    ? window.innerHeight
    : 0;
  refs = {
    panel, orientation, height, ellipsis, nowrap, clip, tools,
    frise, safearea, targets, renders, bilan,
  };
  paint();

  bindOrientation();
}

register('E078', install);
