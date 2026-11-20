import { register } from './registry.js';

/* Lentille E076 — passe V2, domaine H (responsive & mobile).
 * Thème : « safe-area insets (iPhone) — marges de sécurité mesurables ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E076.md — chantiers E076-01 à E076-10.
 * Fichier possédé : src/views/points/v2/E076.js uniquement. Ni la passe 1
 * (src/views/points/E076.js), ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js, _diagnostics.js) n'est modifié.
 *
 * Contrat exploité : viewId 'pointsv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille : ctx.css('points-v2-e076', CSS). Toutes les règles sont
 * préfixées par .points-v2-e076 ; tous les IDs par points-v2-e076- ; tout le
 * DOM est créé par ctx.el, jamais par innerHTML.
 *
 * Invariants :
 * - un seul register('E076', ctx => {...}) ;
 * - aucune valeur d'inset codée en dur : chaque chiffre affiché dérive de
 *   getComputedStyle() ou du comptage de la feuille CSS elle-même ;
 * - aucun minuteur, aucune boucle rAF, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut, aucune région live supplémentaire ;
 * - un seul écouteur « change » sur l'orientation, sous garde module ;
 * - le panneau est un bloc en flux normal, ajouté à .points-matrix quand elle
 *   existe : il ne modifie ni la matrice, ni le détail, ni les filtres.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e076';
const SCOPE = 'points-v2-e076';

const ID = Object.freeze({
  panel: 'points-v2-e076-panel',
  title: 'points-v2-e076-title',
  support: 'points-v2-e076-support',
  top: 'points-v2-e076-top',
  bottom: 'points-v2-e076-bottom',
  left: 'points-v2-e076-left',
  right: 'points-v2-e076-right',
  fallback: 'points-v2-e076-fallback',
  owner: 'points-v2-e076-owner',
  sticky: 'points-v2-e076-sticky',
  scroll: 'points-v2-e076-scroll',
  landscape: 'points-v2-e076-landscape',
  measure: 'points-v2-e076-measure',
  renders: 'points-v2-e076-renders',
  bilan: 'points-v2-e076-bilan',
  zone: 'points-v2-e076-zone',
  topDemo: 'points-v2-e076-top-demo',
  bottomDemo: 'points-v2-e076-bottom-demo',
  leftDemo: 'points-v2-e076-left-demo',
  rightDemo: 'points-v2-e076-right-demo',
  stickyDemo: 'points-v2-e076-sticky-demo',
  scrollDemo: 'points-v2-e076-scroll-demo',
});

/* Feuille unique. Chaque chantier possède sa déclaration observable : padding
   env() par axe, repli constant(), barre collante, scroll-padding, règle
   d'orientation. Aucune valeur d'inset n'est écrite en dur : seules les
   fonctions env() sont employées, avec 0px comme second argument. Toutes les
   règles sont préfixées par .points-v2-e076, y compris dans les @media. */
const CSS = `
  .points-v2-e076 {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e076 .points-v2-e076-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e076 .points-v2-e076-lede { margin: 0 0 8px; color: var(--muted); }
  .points-v2-e076 .points-v2-e076-list { margin: 0; padding: 0; }
  .points-v2-e076 .points-v2-e076-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  .points-v2-e076 .points-v2-e076-key { flex: 0 0 168px; margin: 0; color: var(--muted); }
  .points-v2-e076 .points-v2-e076-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  .points-v2-e076 .points-v2-e076-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }

  /* E076-01 : la prise en charge de env() colore la ligne d'état. */
  @supports (padding: env(safe-area-inset-top, 0px)) {
    .points-v2-e076 .points-v2-e076-support { color: var(--gold-bright); }
  }
  @supports not (padding: env(safe-area-inset-top, 0px)) {
    .points-v2-e076 .points-v2-e076-support { color: var(--muted); }
  }

  /* E076-02, E076-03, E076-04 : un axe, un propriétaire, une marge de sécurité. */
  .points-v2-e076 .points-v2-e076-axis-top { padding-top: env(safe-area-inset-top, 0px); }
  .points-v2-e076 .points-v2-e076-axis-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .points-v2-e076 .points-v2-e076-axis-left { padding-left: env(safe-area-inset-left, 0px); }
  .points-v2-e076 .points-v2-e076-axis-right { padding-right: env(safe-area-inset-right, 0px); }

  /* E076-05 : repli historique constant() pour les iOS antérieurs à 11.2. */
  @supports not (padding: env(safe-area-inset-top, 0px)) {
    .points-v2-e076 .points-v2-e076-axis-top { padding-top: constant(safe-area-inset-top); }
    .points-v2-e076 .points-v2-e076-axis-bottom { padding-bottom: constant(safe-area-inset-bottom); }
  }

  /* E076-06 : le conteneur ne porte aucun inset, évitant la double application. */
  .points-v2-e076 .points-v2-e076-zone { padding: 0; }
  .points-v2-e076 .points-v2-e076-zone .points-v2-e076-demo { min-height: 12px; }

  /* E076-07 : barre collante décalée de l'encoche supérieure. */
  .points-v2-e076 .points-v2-e076-axis-sticky {
    position: sticky; top: env(safe-area-inset-top, 0px);
  }

  /* E076-08 : la zone défilante réserve la place du home indicator. */
  .points-v2-e076 .points-v2-e076-axis-scroll {
    overflow: auto; max-height: 88px;
    scroll-padding-top: env(safe-area-inset-top, 0px);
    scroll-padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* E076-09 : en paysage, l'encoche passe sur les côtés. */
  @media (orientation: landscape) {
    .points-v2-e076 .points-v2-e076-zone .points-v2-e076-demo { font-size: 10px; }
    .points-v2-e076 .points-v2-e076-key { flex-basis: 150px; }
  }

  /* E076-10 : les mesures restent alignées, sans dépendre d'un mouvement. */
  .points-v2-e076 .points-v2-e076-measure { font-variant-numeric: tabular-nums; }

  @media (max-width: 620px) {
    .points-v2-e076 .points-v2-e076-row { flex-wrap: wrap; gap: 1px 8px; }
    .points-v2-e076 .points-v2-e076-key { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e076, .points-v2-e076 * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e076 {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    .points-v2-e076 .points-v2-e076-title,
    .points-v2-e076 .points-v2-e076-key,
    .points-v2-e076 .points-v2-e076-val,
    .points-v2-e076 .points-v2-e076-bilan { color: CanvasText; }
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
  panel: null, support: null, top: null, bottom: null, left: null,
  right: null, fallback: null, owner: null, sticky: null, scroll: null,
  landscape: null, measure: null, bilan: null, renders: null,
  supported: false, topValue: '—', bottomValue: '—', leftValue: '—',
  rightValue: '—', stickyPosition: '—', stickyTop: '—', scrollTop: '—',
  scrollBottom: '—', landscapeActive: false,
};

/* E076-10 : garde d'existence pour le seul nœud racine. La coque reconstruisant
   le stage, un nœud du rendu précédent est détaché : on le réutilise et on le
   déplace dans le parent courant plutôt que d'en créer un doublon. */
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

  r.topValue = readPx(document.getElementById(ID.topDemo), 'paddingTop');
  r.bottomValue = readPx(document.getElementById(ID.bottomDemo), 'paddingBottom');
  r.leftValue = readPx(document.getElementById(ID.leftDemo), 'paddingLeft');
  r.rightValue = readPx(document.getElementById(ID.rightDemo), 'paddingRight');

  const sticky = document.getElementById(ID.stickyDemo);
  if (sticky && typeof getComputedStyle === 'function') {
    const style = getComputedStyle(sticky);
    r.stickyPosition = style.position || '—';
    r.stickyTop = style.top || '—';
  }

  const scroller = document.getElementById(ID.scrollDemo);
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
  write(r.left, `Inset gauche : ${r.leftValue} — sollicité en paysage, encoche à gauche.`);
  write(r.right, `Inset droit : ${r.rightValue} — sollicité en paysage, encoche à droite.`);
  write(r.fallback, `Replis : ${INSET_AUDIT.fallbackZeros} valeurs 0px, ${INSET_AUDIT.legacyConstants} déclaration constant() historique, ${INSET_AUDIT.supportsBlocks} blocs @supports.`);
  write(r.owner, `Un propriétaire par axe : conteneur à padding:0, ${INSET_AUDIT.envDeclarations} déclarations env() portées uniquement par les zones dédiées — aucune double application.`);
  write(r.sticky, `Barre collante : position ${r.stickyPosition}, décalage ${r.stickyTop} depuis le bord haut.`);
  write(r.scroll, `Zone défilante : réserve haute ${r.scrollTop}, basse ${r.scrollBottom} avant le home indicator.`);
  write(r.landscape, r.landscapeActive
    ? `Orientation paysage détectée : ${INSET_AUDIT.orientationBlocks} règle @media dédiée active.`
    : `Orientation portrait : ${INSET_AUDIT.orientationBlocks} règle @media dédiée prête pour le paysage.`);
  write(r.measure, `Mesures publiées — haut ${r.topValue} · bas ${r.bottomValue} · gauche ${r.leftValue} · droite ${r.rightValue}.`);
  write(r.renders, String(installs));
  write(r.bilan, `Bilan safe-area : ${INSET_AUDIT.envDeclarations} déclarations env(), ${INSET_AUDIT.fallbackZeros} replis 0px, ${INSET_AUDIT.legacyConstants} repli constant(), ${INSET_AUDIT.orientationBlocks} règle paysage. ${r.supported ? 'Le navigateur applique les vraies marges ; les valeurs affichées proviennent de getComputedStyle().' : 'Sans env(), les marges reviennent à 0px et le texte le signale sans inventer de valeur.'}`);

  setData(r.panel, 'pointsV2E076Supported', r.supported ? '1' : '0');
  setData(r.panel, 'pointsV2E076Top', r.topValue);
  setData(r.panel, 'pointsV2E076Bottom', r.bottomValue);
  setData(r.panel, 'pointsV2E076Left', r.leftValue);
  setData(r.panel, 'pointsV2E076Right', r.rightValue);
  setData(r.panel, 'pointsV2E076Fallback', String(INSET_AUDIT.fallbackZeros));
  setData(r.panel, 'pointsV2E076Owner', 'one-per-axis');
  setData(r.panel, 'pointsV2E076Sticky', r.stickyPosition);
  setData(r.panel, 'pointsV2E076Scroll', r.scrollBottom);
  setData(r.panel, 'pointsV2E076Landscape', r.landscapeActive ? '1' : '0');
  setData(r.panel, 'pointsV2E076Renders', String(installs));
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

function addRow(list, make, key, id, className) {
  const row = make('div', 'points-v2-e076-row');
  const dt = make('dt', 'points-v2-e076-key', key);
  const dd = make('dd', 'points-v2-e076-val' + (className ? ' ' + className : ''));
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

/* E076-10 : hôte préféré .points-matrix (le panneau y est en flux normal et
   n'est pas marqué comme panneau de diagnostic), repli sur stage puis layout. */
function hostOf(ctx) {
  const layout = ctx.layout;
  const matrix = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.points-matrix') : null;
  if (matrix && typeof matrix.appendChild === 'function') return matrix;
  if (ctx.stage && typeof ctx.stage.appendChild === 'function') return ctx.stage;
  return layout && typeof layout.appendChild === 'function' ? layout : null;
}

register('E076', (ctx) => {
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  const make = ctx.el;
  if (typeof make !== 'function' || typeof ctx.css !== 'function') return;
  const host = hostOf(ctx);
  if (!host) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);
  if (ctx.layout && typeof ctx.layout.setAttribute === 'function') {
    ctx.layout.setAttribute('data-points-v2-e076-scope', '1');
  }

  const panel = ensureNode(make, ID.panel, 'section', SCOPE, host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', ID.title);

  const title = make('h2', 'points-v2-e076-title', 'Safe-area insets — marges de sécurité iPhone');
  title.id = ID.title;
  const lede = make('p', 'points-v2-e076-lede', 'Ce panneau rend mesurables les marges de sécurité de l’écran : encoche, home indicator et bords latéraux en paysage. Il ne modifie ni la matrice des points ni le détail et ne crée aucun mouvement.');

  const list = make('dl', 'points-v2-e076-list');
  const support = addRow(list, make, 'Prise en charge env()', ID.support, 'points-v2-e076-support');
  const top = addRow(list, make, 'Inset supérieur', ID.top, 'points-v2-e076-measure');
  const bottom = addRow(list, make, 'Inset inférieur', ID.bottom, 'points-v2-e076-measure');
  const left = addRow(list, make, 'Inset latéral gauche', ID.left, 'points-v2-e076-measure');
  const right = addRow(list, make, 'Inset latéral droit', ID.right, 'points-v2-e076-measure');
  const fallback = addRow(list, make, 'Repli sans env()', ID.fallback, '');
  const owner = addRow(list, make, 'Propriétaire de l’inset', ID.owner, '');
  const sticky = addRow(list, make, 'Barre collante', ID.sticky, '');
  const scroll = addRow(list, make, 'Zone défilante', ID.scroll, '');
  const landscape = addRow(list, make, 'Orientation', ID.landscape, '');
  const measureRow = addRow(list, make, 'Mesures publiées', ID.measure, 'points-v2-e076-measure');
  const renders = addRow(list, make, 'Rendus du greffon', ID.renders, '');

  /* Zone d'essai : chaque enfant porte exactement un inset, sur un axe distinct. */
  const zone = make('div', 'points-v2-e076-zone');
  zone.id = ID.zone;
  const topDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-top', 'Haut');
  topDemo.id = ID.topDemo;
  const bottomDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-bottom', 'Bas');
  bottomDemo.id = ID.bottomDemo;
  const leftDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-left', 'Gauche');
  leftDemo.id = ID.leftDemo;
  const rightDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-right', 'Droite');
  rightDemo.id = ID.rightDemo;
  const stickyDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-sticky', 'Collant');
  stickyDemo.id = ID.stickyDemo;
  const scrollDemo = make('div', 'points-v2-e076-demo points-v2-e076-axis-scroll', 'Défilement');
  scrollDemo.id = ID.scrollDemo;
  zone.append(topDemo, bottomDemo, leftDemo, rightDemo, stickyDemo, scrollDemo);

  const bilan = make('p', 'points-v2-e076-bilan');
  bilan.id = ID.bilan;

  /* replaceChildren plutôt que innerHTML : les nœuds du rendu précédent sont
     détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, zone, bilan);

  const supported = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? Boolean(CSS.supports('padding', 'env(safe-area-inset-top, 0px)'))
    : false;
  const landscapeActive = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? Boolean(window.matchMedia('(orientation: landscape)').matches)
    : false;

  refs = {
    panel, support, top, bottom, left, right, fallback, owner, sticky, scroll,
    landscape, measure: measureRow, bilan, renders,
    supported, topValue: '—', bottomValue: '—', leftValue: '—',
    rightValue: '—', stickyPosition: '—', stickyTop: '—', scrollTop: '—',
    scrollBottom: '—', landscapeActive,
  };
  measure();
  paint();

  bindOrientation();
  measure();
  paint();

  /* Le contrat fournit reducedMotion() : l'état est consigné, sans qu'aucun
     mouvement ne soit créé ni neutralisé de façon active par le module. */
  let reduced = false;
  try {
    reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  } catch {
    reduced = false;
  }
  if (!reduced && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      reduced = Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      reduced = false;
    }
  }
  setData(panel, 'pointsV2E076Reduced', reduced ? '1' : '0');
});
