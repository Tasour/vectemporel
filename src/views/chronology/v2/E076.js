import { register } from './registry.js';

/* Lentille E076 — passe V2, domaine H (responsive & mobile).
 * Thème : « safe-area insets (iPhone) ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E076.md — chantiers E076-01 à E076-10.
 * Fichier possédé : src/views/chronology/v2/E076.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e076', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e076- et protégés par une garde d'existence pour
 * le nœud racine ; les enfants sont reconstruits par replaceChildren.
 *
 * Invariants :
 * - un seul register('E076', install) ;
 * - aucune valeur d'inset codée en dur : chaque chiffre affiché dérive de
 *   getComputedStyle() ou du comptage de la feuille CSS elle-même ;
 * - aucun minuteur, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut, aucune région live supplémentaire ;
 * - un seul écouteur « change » sur l'orientation, sous garde module ;
 * - le panneau est un bloc en flux normal : il n'ajoute aucun arrêt Tab et ne
 *   recouvre ni la frise ni la fiche.
 */

const CSS_ID = 'chronology-v2-e076';
const PANEL_ID = 'chronology-v2-e076-panel';
const TITLE_ID = 'chronology-v2-e076-title';
const SUPPORT_ID = 'chronology-v2-e076-support';
const TOP_ID = 'chronology-v2-e076-top';
const BOTTOM_ID = 'chronology-v2-e076-bottom';
const SIDE_L_ID = 'chronology-v2-e076-side-left';
const SIDE_R_ID = 'chronology-v2-e076-side-right';
const FALLBACK_ID = 'chronology-v2-e076-fallback';
const OWNER_ID = 'chronology-v2-e076-owner';
const STICKY_ID = 'chronology-v2-e076-sticky';
const SCROLL_ID = 'chronology-v2-e076-scroll';
const LANDSCAPE_ID = 'chronology-v2-e076-landscape';
const MEASURE_ID = 'chronology-v2-e076-measure';
const BILAN_ID = 'chronology-v2-e076-bilan';
const RENDERS_ID = 'chronology-v2-e076-renders';
const ZONE_ID = 'chronology-v2-e076-zone';
const TOP_DEMO_ID = 'chronology-v2-e076-top-demo';
const BOTTOM_DEMO_ID = 'chronology-v2-e076-bottom-demo';
const SIDE_L_DEMO_ID = 'chronology-v2-e076-left-demo';
const SIDE_R_DEMO_ID = 'chronology-v2-e076-right-demo';
const STICKY_DEMO_ID = 'chronology-v2-e076-sticky-demo';
const SCROLL_DEMO_ID = 'chronology-v2-e076-scroll-demo';
const HOST_ID = 'atlas-chrono-main';

/* E076-02 à E076-09 : feuille unique. Chaque chantier possède sa déclaration
   observable : padding env() par axe, repli constant(), barre collante,
   scroll-padding, règle d'orientation et neutralisation reduced-motion. Aucune
   valeur d'inset n'est écrite en dur : seules les fonctions env() sont utilisées. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e076-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e076-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e076-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e076-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e076-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e076-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e076-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }

  /* E076-01 : la prise en charge de env() change la couleur de la ligne. */
  @supports (padding: env(safe-area-inset-top, 0px)) {
    #${SUPPORT_ID} { color: var(--gold-bright); }
  }
  @supports not (padding: env(safe-area-inset-top, 0px)) {
    #${SUPPORT_ID} { color: var(--muted); }
  }

  /* E076-02, E076-03, E076-04 : un axe, un propriétaire, une marge de sécurité. */
  #${TOP_DEMO_ID} { padding-top: env(safe-area-inset-top, 0px); }
  #${BOTTOM_DEMO_ID} { padding-bottom: env(safe-area-inset-bottom, 0px); }
  #${SIDE_L_DEMO_ID} { padding-left: env(safe-area-inset-left, 0px); }
  #${SIDE_R_DEMO_ID} { padding-right: env(safe-area-inset-right, 0px); }

  /* E076-05 : repli historique constant() pour les iOS antérieurs à 11.2. */
  @supports not (padding: env(safe-area-inset-top, 0px)) {
    #${TOP_DEMO_ID} { padding-top: constant(safe-area-inset-top); }
    #${BOTTOM_DEMO_ID} { padding-bottom: constant(safe-area-inset-bottom); }
  }

  /* E076-06 : le conteneur ne porte aucun inset, évitant la double application. */
  #${ZONE_ID} { padding: 0; }
  #${ZONE_ID} .v2e076-demo { min-height: 12px; }

  /* E076-07 : barre collante décalée de l'encoche supérieure. */
  #${STICKY_DEMO_ID} { position: sticky; top: env(safe-area-inset-top, 0px); }

  /* E076-08 : la zone défilante réserve la place du home indicator. */
  #${SCROLL_DEMO_ID} {
    overflow: auto; max-height: 88px;
    scroll-padding-top: env(safe-area-inset-top, 0px);
    scroll-padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* E076-09 : en paysage, l'encoche passe sur les côtés. */
  @media (orientation: landscape) {
    #${ZONE_ID} .v2e076-demo { font-size: 10px; }
    #${PANEL_ID} .v2e076-key { flex-basis: 150px; }
  }

  /* E076-10 : les mesures restent alignées, sans dépendre d'un mouvement. */
  #${MEASURE_ID} { font-variant-numeric: tabular-nums; }

  @media (max-width: 620px) {
    #${PANEL_ID} .v2e076-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e076-key { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e076-title, #${PANEL_ID} .v2e076-key,
    #${PANEL_ID} .v2e076-val, #${PANEL_ID} .v2e076-bilan { color: CanvasText; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E076-01, E076-05, E076-06, E076-09 : audit de la feuille unique, calculé une
   fois depuis sa chaîne source. Aucun chiffre n'est saisi manuellement dans les
   libellés : tout dérive de cette mesure ou de getComputedStyle(). */
const INSET_AUDIT = Object.freeze({
  envDeclarations: occurrences(/env\(safe-area-inset-/g),
  fallbackZeros: occurrences(/env\(safe-area-inset-[a-z]+,\s*0px\)/g),
  legacyConstants: occurrences(/constant\(safe-area-inset-/g),
  supportsBlocks: occurrences(/@supports/g),
  orientationBlocks: occurrences(/@media\s*\(orientation:\s*landscape\)/g),
});

let installs = 0;
let orientationBound = false;
let refs = {
  panel: null, support: null, top: null, bottom: null, sideL: null,
  sideR: null, fallback: null, owner: null, sticky: null, scroll: null,
  landscape: null, measure: null, bilan: null, renders: null,
  supported: false, topValue: '—', bottomValue: '—', sideLValue: '—',
  sideRValue: '—', stickyPosition: '—', stickyTop: '—', scrollTop: '—',
  scrollBottom: '—', landscapeActive: false,
};

/* E076-10 : garde d'existence pour le seul nœud racine. La coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché : on le réutilise et on
   le déplace dans le parent courant plutôt que d'en créer un doublon. */
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

function readPx(node, property) {
  if (!node || typeof getComputedStyle !== 'function') return '—';
  try {
    return getComputedStyle(node)[property] || '0px';
  } catch {
    return '—';
  }
}

/* E076-01 à E076-10 : toutes les mesures sont relevées en lecture seule sur le
   DOM réel. La fonction ne modifie ni le style, ni le focus, ni le défilement. */
function measure() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  r.topValue = readPx(document.getElementById(TOP_DEMO_ID), 'paddingTop');
  r.bottomValue = readPx(document.getElementById(BOTTOM_DEMO_ID), 'paddingBottom');
  r.sideLValue = readPx(document.getElementById(SIDE_L_DEMO_ID), 'paddingLeft');
  r.sideRValue = readPx(document.getElementById(SIDE_R_DEMO_ID), 'paddingRight');

  const sticky = document.getElementById(STICKY_DEMO_ID);
  if (sticky && typeof getComputedStyle === 'function') {
    const style = getComputedStyle(sticky);
    r.stickyPosition = style.position || '—';
    r.stickyTop = style.top || '—';
  }

  const scroller = document.getElementById(SCROLL_DEMO_ID);
  if (scroller && typeof getComputedStyle === 'function') {
    const style = getComputedStyle(scroller);
    r.scrollTop = style.scrollPaddingTop || '—';
    r.scrollBottom = style.scrollPaddingBottom || '—';
  }
}

/* E076-01 et E076-09 : état affiché en texte visible ordinaire, sans région
   live et sans écriture redondante. Les compteurs sont dérivés, jamais inventés. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  write(r.support, r.supported
    ? 'Fonction env() reconnue : oui — les marges de sécurité s’appliquent.'
    : 'Fonction env() reconnue : non — repli 0px activé.');
  write(r.top, `Inset haut : ${r.topValue} — dégage l’encoche ou le Dynamic Island.`);
  write(r.bottom, `Inset bas : ${r.bottomValue} — dégage le home indicator.`);
  write(r.sideL, `Inset gauche : ${r.sideLValue} — sollicité en paysage, encoche à gauche.`);
  write(r.sideR, `Inset droit : ${r.sideRValue} — sollicité en paysage, encoche à droite.`);
  write(r.fallback, `Replis : ${INSET_AUDIT.fallbackZeros} valeurs 0px, ${INSET_AUDIT.legacyConstants} déclaration constant() historique, ${INSET_AUDIT.supportsBlocks} blocs @supports.`);
  write(r.owner, `Un propriétaire par axe : conteneur à padding:0, ${INSET_AUDIT.envDeclarations} déclarations env() portées uniquement par les zones dédiées — aucune double application.`);
  write(r.sticky, `Barre collante : position ${r.stickyPosition}, décalage ${r.stickyTop} depuis le bord haut.`);
  write(r.scroll, `Zone défilante : réserve haute ${r.scrollTop}, basse ${r.scrollBottom} avant le home indicator.`);
  write(r.landscape, r.landscapeActive
    ? `Orientation paysage détectée : ${INSET_AUDIT.orientationBlocks} règle @media dédiée active.`
    : `Orientation portrait : ${INSET_AUDIT.orientationBlocks} règle @media dédiée prête pour le paysage.`);
  write(r.measure, `Mesures publiées — haut ${r.topValue} · bas ${r.bottomValue} · gauche ${r.sideLValue} · droite ${r.sideRValue}.`);
  write(r.renders, String(installs));
  write(r.bilan, `Bilan safe-area : ${INSET_AUDIT.envDeclarations} déclarations env(), ${INSET_AUDIT.fallbackZeros} replis 0px, ${INSET_AUDIT.legacyConstants} repli constant(), ${INSET_AUDIT.orientationBlocks} règle paysage. ${r.supported ? 'Le navigateur applique les vraies marges ; les valeurs affichées proviennent de getComputedStyle().' : 'Sans env(), les marges reviennent à 0px et le texte le signale sans inventer de valeur.'}`);

  setData(r.panel, 'e076Supported', r.supported ? '1' : '0');
  setData(r.panel, 'e076Top', r.topValue);
  setData(r.panel, 'e076Bottom', r.bottomValue);
  setData(r.panel, 'e076Left', r.sideLValue);
  setData(r.panel, 'e076Right', r.sideRValue);
  setData(r.panel, 'e076Fallback', String(INSET_AUDIT.fallbackZeros));
  setData(r.panel, 'e076Owner', 'one-per-axis');
  setData(r.panel, 'e076Sticky', r.stickyPosition);
  setData(r.panel, 'e076Scroll', r.scrollBottom);
  setData(r.panel, 'e076Landscape', r.landscapeActive ? '1' : '0');
  setData(r.panel, 'e076Renders', String(installs));
}

/* E076-09 : suivi de l'orientation par un unique écouteur « change », sans
   minuteur ni sondage. La garde orientationBound évite toute fuite au re-render. */
function bindOrientation() {
  if (orientationBound) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const query = window.matchMedia('(orientation: landscape)');
  const onChange = (event) => {
    refs.landscapeActive = Boolean(event && typeof event.matches === 'boolean' ? event.matches : query.matches);
    paint();
  };
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
  else return;
  orientationBound = true;
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e076-row');
  const dt = make('dt', 'v2e076-key', key);
  const dd = make('dd', 'v2e076-val');
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

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e076-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e076-title', 'Safe-area insets — marges de sécurité iPhone');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e076-lede', 'Ce panneau rend mesurables les marges de sécurité de l’écran : encoche, home indicator et bords latéraux en paysage. Il ne modifie ni la frise ni la fiche et ne crée aucun mouvement.');

  const list = make('dl', 'v2e076-list');
  const support = addRow(list, make, 'Prise en charge env()', SUPPORT_ID);
  const top = addRow(list, make, 'Inset supérieur', TOP_ID);
  const bottom = addRow(list, make, 'Inset inférieur', BOTTOM_ID);
  const sideL = addRow(list, make, 'Inset latéral gauche', SIDE_L_ID);
  const sideR = addRow(list, make, 'Inset latéral droit', SIDE_R_ID);
  const fallback = addRow(list, make, 'Repli sans env()', FALLBACK_ID);
  const owner = addRow(list, make, 'Propriétaire de l’inset', OWNER_ID);
  const sticky = addRow(list, make, 'Barre collante', STICKY_ID);
  const scroll = addRow(list, make, 'Zone défilante', SCROLL_ID);
  const landscape = addRow(list, make, 'Orientation', LANDSCAPE_ID);
  const measure = addRow(list, make, 'Mesures publiées', MEASURE_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  /* Zone d'essai : chaque enfant porte exactement un inset, sur un axe distinct. */
  const zone = make('div', 'v2e076-zone');
  zone.id = ZONE_ID;
  const topDemo = make('div', 'v2e076-demo', 'Haut');
  topDemo.id = TOP_DEMO_ID;
  const bottomDemo = make('div', 'v2e076-demo', 'Bas');
  bottomDemo.id = BOTTOM_DEMO_ID;
  const sideLDemo = make('div', 'v2e076-demo', 'Gauche');
  sideLDemo.id = SIDE_L_DEMO_ID;
  const sideRDemo = make('div', 'v2e076-demo', 'Droite');
  sideRDemo.id = SIDE_R_DEMO_ID;
  const stickyDemo = make('div', 'v2e076-demo', 'Collant');
  stickyDemo.id = STICKY_DEMO_ID;
  const scrollDemo = make('div', 'v2e076-demo', 'Défilement');
  scrollDemo.id = SCROLL_DEMO_ID;
  zone.append(topDemo, bottomDemo, sideLDemo, sideRDemo, stickyDemo, scrollDemo);

  const bilan = make('p', 'v2e076-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, zone, bilan);

  const supported = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? Boolean(CSS.supports('padding', 'env(safe-area-inset-top, 0px)'))
    : false;
  const landscapeActive = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? Boolean(window.matchMedia('(orientation: landscape)').matches)
    : false;

  refs = {
    panel, support, top, bottom, sideL: sideL, sideR: sideR, fallback,
    owner, sticky, scroll, landscape, measure, bilan, renders,
    supported, topValue: '—', bottomValue: '—', sideLValue: '—',
    sideRValue: '—', stickyPosition: '—', stickyTop: '—', scrollTop: '—',
    scrollBottom: '—', landscapeActive,
  };
  measure();
  paint();

  bindOrientation();
  measure();
  paint();

  /* Le contrat fournit reducedMotion() : l'état est consigné, sans qu'aucun
     mouvement ne soit créé ni neutralisé de façon active par le module. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'e076Reduced', reduced ? '1' : '0');
}

register('E076', install);
