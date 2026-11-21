import { register } from './registry.js';

/* Lentille E061 — passe V2, domaine G (performance & rendu).
 * Thème : « boucle rAF unique (ou nulle) et pause document.hidden ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E061.md — chantiers E061-01 à E061-10.
 * Fichier possédé : src/views/chronology/v2/E061.js uniquement. Aucun fichier
 * partagé n'est modifié : ni registry.js, ni index.js, ni styles.css, ni
 * src/views/chronology.js, ni la passe 1, ni une autre lentille V2.
 *
 * Contrat exploité : contexte { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion(). Une
 * seule feuille CSS : ctx.css('chronology-v2-e061', CSS). Tous les IDs DOM sont
 * préfixés chronology-v2-e061- et protégés par une garde d'existence.
 *
 * Invariants :
 * - un seul register('E061', …), un seul ctx.css, un seul écouteur
 *   'visibilitychange' installé sous garde module ;
 * - zéro requestAnimationFrame : la boucle est NULLE, pas « unique ». Il n'y a
 *   donc aucune frame à accélérer ni à suspendre quand le document est masqué ;
 * - zéro minuteur, zéro sondage : l'état est piloté par l'événement de
 *   visibilité, jamais par un intervalle qui sonderait document.hidden ;
 * - aucune journalisation, aucun réseau, aucun aléa, aucun HTML brut, aucune
 *   région live supplémentaire, aucun vol de focus, aucun preventDefault ;
 * - l'écouteur est purement observationnel : il ne modifie aucun nœud existant
 *   de la vue et n'écrit que dans son propre panneau.
 */

const CSS_ID = 'chronology-v2-e061';
const PANEL_ID = 'chronology-v2-e061-panel';
const TITLE_ID = 'chronology-v2-e061-title';
const STATE_ID = 'chronology-v2-e061-state';
const RAFS_ID = 'chronology-v2-e061-rafs';
const LISTENER_ID = 'chronology-v2-e061-listener';
const LOOP_ID = 'chronology-v2-e061-loop';
const RESUMES_ID = 'chronology-v2-e061-resumes';
const CHANGES_ID = 'chronology-v2-e061-changes';
const POLL_ID = 'chronology-v2-e061-poll';
const CONTRAST_ID = 'chronology-v2-e061-contrast';
const RENDERS_ID = 'chronology-v2-e061-renders';
const INTRUSION_ID = 'chronology-v2-e061-intrusion';
const BILAN_ID = 'chronology-v2-e061-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E061-01, E061-04, E061-06, E061-08 : feuille unique. Les seules mentions de
   « animation » et « transition » sont des neutralisations défensives, jamais
   des mouvements créés : le compteur d'animations propres reste à zéro. Le
   panneau est un bloc en flux normal : il n'ajoute aucun arrêt Tab, ne recouvre
   ni la frise ni la fiche, et ne porte pas de tabindex. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  /* E061-04 : l'état « masqué » change la lisière, jamais par une transition :
     aucune animation n'est déclenchée par ce changement d'attribut. */
  #${PANEL_ID}[data-e061-hidden="1"] { border-left-color: var(--muted-2); }
  #${PANEL_ID} .v2e061-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e061-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e061-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e061-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e061-key { flex: 0 0 152px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e061-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e061-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e061-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e061-key { flex-basis: 100%; }
  }
  /* Neutralisation défensive d'un mouvement éventuellement hérité de la coque :
     E061 ne crée aucune animation, aucune transition et aucun défilement fluide. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  /* E061-08 : l'état reste lisible en couleurs forcées par le texte et la
     bordure, sans dépendre de la teinte dorée ni d'un quelconque mouvement. */
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID}[data-e061-hidden="1"] { border-left-color: CanvasText; }
    #${PANEL_ID} .v2e061-title,
    #${PANEL_ID} .v2e061-key,
    #${PANEL_ID} .v2e061-val,
    #${PANEL_ID} .v2e061-bilan { color: CanvasText; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* E061-01, E061-06 et E061-08 : audit de la feuille unique, calculé une fois
   depuis sa chaîne source. Aucun chiffre affiché n'est codé en dur dans les
   libellés : chaque mesure dérive de cette analyse ou d'un compteur module. */
const CSS_AUDIT = Object.freeze({
  animations: occurrences(/animation-name\s*:/g),
  transitions: occurrences(/transition-property\s*:/g),
  hiddenRules: occurrences(/\[data-e061-hidden="1"\]/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
});

/* E061-01, E061-04 et E061-06 : faits structurels vérifiables par relecture du
   présent fichier : ni rAF, ni minuteur, ni boucle d'intervalle, ni sonde. */
const PROGRAMMED = Object.freeze({ raf: 0, timers: 0, intervals: 0, loops: 0 });

let installs = 0;
let visibilityBound = false;
let hidden = false;
let changes = 0;
let resumes = 0;
let reduced = false;
let refs = {
  panel: null, state: null, rafs: null, listener: null, loop: null,
  resumes: null, changes: null, poll: null, contrast: null,
  renders: null, intrusion: null, bilan: null, following: false,
};

/* E061-09 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédente est détaché : on le réutilise et on le déplace dans le parent
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

/* E061-03, E061-04, E061-05, E061-07 et E061-10 : l'état est affiché en texte
   visible ordinaire, sans région live et sans écriture redondante. Un seul
   rafraîchissement est effectué à chaque rendu et à chaque retour au visible. */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  write(r.state, hidden
    ? 'Document masqué : aucune frame n’est demandée.'
    : 'Document visible : aucune frame n’est demandée.');
  write(r.rafs, `${PROGRAMMED.raf} rAF · ${CSS_AUDIT.animations} animation propre · ${CSS_AUDIT.transitions} transition propre`);
  write(r.listener, r.following
    ? 'Un écouteur « visibilitychange » installé, sous garde module.'
    : 'Aucun écouteur disponible : seul l’état initial est connu.');
  write(r.loop, hidden
    ? 'Pause : aucune boucle en cours, aucun rAF ni minuteur armé pendant le masque.'
    : 'Aucune boucle à suspendre : la boucle est nulle, pas unique.');
  write(r.resumes, String(resumes));
  write(r.changes, String(changes));
  write(r.poll, `${PROGRAMMED.timers} minuteur · ${PROGRAMMED.intervals} intervalle · ${PROGRAMMED.loops} boucle : aucun sondage de document.hidden.`);
  write(r.contrast, `État porté par le texte et la bordure, jamais par la seule couleur (repli forced-colors : ${CSS_AUDIT.forced}; règles d'état : ${CSS_AUDIT.hiddenRules}).`);
  write(r.renders, String(installs));
  write(r.intrusion, 'Aucun preventDefault, aucun stopPropagation, aucun focus() : écoute purement observationnelle.');
  write(r.bilan, `Bilan boucle : ${PROGRAMMED.raf} rAF, ${PROGRAMMED.timers} minuteur, ${changes} changement de visibilité, ${resumes} reprise. Mouvement réduit : ${reduced ? 'oui' : 'non'} — le module ne crée aucun mouvement dans les deux cas.`);

  setData(r.panel, 'e061Hidden', hidden ? '1' : '0');
  setData(r.panel, 'e061Raf', String(PROGRAMMED.raf));
  setData(r.panel, 'e061Listener', r.following ? 'visibilitychange' : 'none');
  setData(r.panel, 'e061Loop', hidden ? 'paused' : 'none');
  setData(r.panel, 'e061Resumes', String(resumes));
  setData(r.panel, 'e061Changes', String(changes));
  setData(r.panel, 'e061Poll', String(PROGRAMMED.timers + PROGRAMMED.intervals));
  setData(r.panel, 'e061Contrast', 'text+border');
  setData(r.panel, 'e061Renders', String(installs));
  setData(r.panel, 'e061Intrusion', 'none');
}

/* E061-02 et E061-05 : suivi réactif de la visibilité par un unique écouteur,
   sans minuteur ni sondage. La garde visibilityBound évite toute fuite sur les
   rendus successifs ; un seul paint() est appelé au retour au visible. */
function bindVisibility() {
  if (visibilityBound) return true;
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return false;
  const onChange = () => {
    const wasHidden = hidden;
    hidden = typeof document.hidden === 'boolean' ? document.hidden : Boolean(document.hidden);
    changes += 1;
    if (wasHidden && !hidden) resumes += 1;
    paint();
  };
  document.addEventListener('visibilitychange', onChange);
  visibilityBound = true;
  return true;
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e061-row');
  const dt = make('dt', 'v2e061-key', key);
  const dd = make('dd', 'v2e061-val');
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

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e061-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e061-title', 'Boucle de rendu et visibilité du document');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e061-lede', 'Ce panneau décrit le contrat de rendu de cette vue. Il n’instancie aucune boucle d’animation : la boucle est nulle, il n’y a donc rien à accélérer ni à suspendre quand le document est masqué.');

  const list = make('dl', 'v2e061-list');
  const state = addRow(list, make, 'État du document', STATE_ID);
  const rafs = addRow(list, make, 'Animations propres', RAFS_ID);
  const listener = addRow(list, make, 'Écoute de visibilité', LISTENER_ID);
  const loop = addRow(list, make, 'Pause / reprise', LOOP_ID);
  const resumeVal = addRow(list, make, 'Reprises au retour', RESUMES_ID);
  const changeVal = addRow(list, make, 'Changements observés', CHANGES_ID);
  const poll = addRow(list, make, 'Sondage / minuteurs', POLL_ID);
  const contrast = addRow(list, make, 'Couleur / contraste', CONTRAST_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);
  const intrusion = addRow(list, make, 'Non-intrusion', INTRUSION_ID);

  const bilan = make('p', 'v2e061-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, bilan);

  hidden = typeof document !== 'undefined' && Boolean(document.hidden);
  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, state, rafs, listener, loop,
    resumes: resumeVal, changes: changeVal, poll, contrast,
    renders, intrusion, bilan, following: false,
  };
  paint();

  refs.following = bindVisibility();
  paint();
}

register('E061', ctx => {
  install(ctx);
});
