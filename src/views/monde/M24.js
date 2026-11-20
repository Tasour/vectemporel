import { register } from './registry.js';

/* Lentille M24 — Raccourcis clavier du globe (domaine C : ergonomie & interaction).
 *
 * Une seule écoute `keydown`, posée une fois sur le host persistant (#globe-canvas).
 * Aucune touche déjà possédée n'est interceptée :
 *   - routeur unique (keyboard.js) : 1–6, m/c/r/g/s/p, ?, Échap, Entrée, Espace, flèches ;
 *   - globe.js : flèches, Home, End, Entrée sur le host ;
 *   - M05 : +, =, −, _, PageUp, PageDown (zoom) ;
 *   - M13 : Échap (survol clavier) ; M28 : aucune touche globale.
 * Ce module n'ajoute que trois touches libres : a, v, 0.
 * Zéro réseau, zéro aléa, zéro journalisation, aucun fichier partagé modifié.
 * Cf. UNIFIED_AUDIT/MONDE/views/M24.md (chantiers M24-01 à M24-10).
 */

const CSS_ID = 'monde-m24';
const LEGEND_ID = 'monde-m24-legend';

/* M24-04/05/06 : les seules touches possédées par cette lentille. */
const OWN = Object.freeze({
  a: 'Afficher ou masquer la légende des raccourcis',
  v: 'Basculer la rotation automatique',
  '0': 'Annoncer la situation courante',
});

/* M24-02 : liste statique des touches appartenant à un autre propriétaire.
 * Elle complète la garde dynamique lue sur le bus du routeur, indispensable
 * avant que `initKeyboard()` n'ait publié `VECTEMPOREL_KEYS`. */
const FOREIGN = new Set([
  '?', 'Escape', 'Enter', ' ', 'Tab',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
  '+', '=', '-', '_', 'PageUp', 'PageDown',
  'Backspace', 'Delete',
]);

/* M24-07 : légende visible, sémantique, non portée par la seule couleur.
 * Chaque entrée nomme son propriétaire en texte : aucune ambiguïté
 * d'orchestration, aucune information portée par la couleur seule.
 * Les touches sont des jetons distincts, rendus chacun dans un <kbd> lisible. */
const LEGEND = Object.freeze([
  { keys: ['←', '→', '↑', '↓'], desc: 'Parcourir les pays', owner: 'globe.js' },
  { keys: ['Home', 'End'], desc: 'Premier / dernier pays', owner: 'globe.js' },
  { keys: ['Entrée'], desc: 'Ouvrir le pays', owner: 'globe.js' },
  { keys: ['+', '−', 'PageUp', 'PageDown'], desc: 'Zoomer', owner: 'M05' },
  { keys: ['1–6', 'm', 'c', 'r', 'g', 's', 'p'], desc: 'Changer de vue', owner: 'routeur' },
  { keys: ['?'], desc: 'Aide générale', owner: 'routeur' },
  { keys: ['Échap'], desc: 'Fermer / revenir au monde', owner: 'routeur' },
  { keys: ['a'], desc: 'Afficher / masquer cette légende', owner: 'M24' },
  { keys: ['v'], desc: 'Basculer la rotation', owner: 'M24' },
  { keys: ['0'], desc: 'Annoncer la situation', owner: 'M24' },
]);

/* Placement : `.globe-controls` occupe left:16px/bottom:16px (colonne de
 * boutons, z-index:5). La légende se décale donc à sa droite sur grand écran,
 * puis passe en haut à droite dès que les commandes deviennent une rangée
 * horizontale (≤1000px). Fermée, elle est compacte ; ouverte, elle devient un
 * panneau scrollable qui ne peut ni déborder ni recouvrir tout l'écran. */
const CSS = `
  #${LEGEND_ID}{
    position:absolute;left:72px;bottom:16px;z-index:7;
    width:max-content;max-width:min(330px,calc(100vw - 96px));
    border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.94);color:var(--muted);
    box-shadow:0 6px 22px rgba(0,0,0,.4);
    font-size:11px;line-height:1.45;
  }
  #${LEGEND_ID}[open]{
    width:min(330px,calc(100vw - 96px));
    max-height:min(70vh,440px);overflow-y:auto;
  }
  #${LEGEND_ID} summary{
    display:flex;align-items:center;gap:8px;
    min-height:36px;padding:7px 10px;
    cursor:pointer;color:var(--gold-bright);font-weight:600;
    list-style:none;
  }
  #${LEGEND_ID} summary::marker{content:""}
  #${LEGEND_ID} summary::-webkit-details-marker{display:none}
  #${LEGEND_ID} summary:hover{background:rgba(230,185,111,.08)}
  #${LEGEND_ID} summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #${LEGEND_ID} ul{
    margin:0;padding:8px 10px 10px;list-style:none;
    border-top:1px solid var(--line);
  }
  #${LEGEND_ID} li{
    display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr);
    gap:10px;align-items:baseline;margin-top:6px;
  }
  #${LEGEND_ID} li:first-child{margin-top:0}
  #${LEGEND_ID} .monde-m24-keys{display:flex;flex-wrap:wrap;gap:3px;align-items:center}
  #${LEGEND_ID} .monde-m24-desc{color:var(--ink-soft)}
  #${LEGEND_ID} .monde-m24-owner{color:var(--muted)}
  #${LEGEND_ID} kbd{
    display:inline-flex;align-items:center;justify-content:center;
    min-width:22px;padding:2px 6px;
    border:1px solid var(--line-strong);border-radius:5px;
    background:rgba(230,185,111,.08);
    box-shadow:inset 0 -1px 0 rgba(0,0,0,.45);
    color:var(--gold-bright);
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    font-size:11px;line-height:1.3;white-space:nowrap;
  }
  #${LEGEND_ID} .monde-m24-summary-key{font-size:10px;min-width:20px}
  @media (max-width:1000px){
    #${LEGEND_ID}{left:auto;right:8px;bottom:64px;max-width:min(330px,calc(100vw - 16px))}
    #${LEGEND_ID}[open]{width:min(330px,calc(100vw - 16px))}
  }
  @media (max-width:620px){
    #${LEGEND_ID} li{grid-template-columns:1fr;gap:2px}
    #${LEGEND_ID} .monde-m24-desc{font-size:10px}
    #${LEGEND_ID}[open]{max-height:min(62vh,380px)}
  }
  @media (forced-colors:active){
    #${LEGEND_ID},#${LEGEND_ID} kbd{border:1px solid CanvasText;background:Canvas;color:CanvasText}
  }
`;

let ctxRef = null;
let host = null;
let scene = null;
let legend = null;
let attached = false;
let lastSituation = '';
const stats = { handled: 0, ignored: 0, conflictsAvoided: 0 };

/* M24-02 : le bus du routeur est la source unique des touches de vue. S'il est
 * publié et qu'une de nos touches y figure, on renonce immédiatement. */
function routerMap() {
  const bus = window.VECTEMPOREL_KEYS;
  return bus && bus.map && typeof bus.map === 'object' ? bus.map : null;
}

function ownerOf(key) {
  const map = routerMap();
  if (map && Object.prototype.hasOwnProperty.call(map, key)) return 'keyboard.js';
  if (FOREIGN.has(key)) return 'domaine voisin';
  return null;
}

function editable(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/* M24-03 : gel de modale aligné sur T2-01 du routeur, via son bus quand il
 * existe, sinon via l'état du store exposé dans ctx. */
function modalOpen() {
  const bus = window.VECTEMPOREL_KEYS;
  if (bus && typeof bus.modalState === 'function') {
    const modal = bus.modalState();
    return !!(modal && (modal.help || modal.detail));
  }
  const state = ctxRef && ctxRef.state;
  return !!(state && (state.helpOpen || state.detailOpen));
}

function inGlobe() {
  const state = ctxRef && ctxRef.state;
  return !!(state && state.view === 'globe');
}

function say(text) {
  if (ctxRef && typeof ctxRef.say === 'function') ctxRef.say(text);
}

/* M24-04 / M24-07 : <details> natif — aucune seconde écoute pour l'ouvrir ou le
 * fermer. Recréé/collé à nouveau si la coque a remplacé la scène. */
function ensureLegend() {
  if (legend && legend.isConnected) return legend;
  const existing = document.getElementById(LEGEND_ID);
  if (existing) {
    legend = existing;
    if (scene && scene.isConnected && legend.parentElement !== scene) {
      scene.appendChild(legend);
    }
    return legend;
  }
  legend = ctxRef.el('details', 'monde-m24-legend');
  legend.id = LEGEND_ID;
  legend.setAttribute('aria-label', 'Légende des raccourcis clavier du globe');
  const summary = ctxRef.el('summary', 'monde-m24-summary');
  summary.appendChild(ctxRef.el('span', 'monde-m24-summary-label', 'Raccourcis clavier'));
  summary.appendChild(ctxRef.el('kbd', 'monde-m24-summary-key', 'a'));
  legend.appendChild(summary);
  const list = ctxRef.el('ul', 'monde-m24-list');
  LEGEND.forEach(({ keys, desc, owner }) => {
    const item = ctxRef.el('li', 'monde-m24-item');
    const keyGroup = ctxRef.el('span', 'monde-m24-keys');
    keys.forEach((key) => keyGroup.appendChild(ctxRef.el('kbd', 'monde-m24-key', key)));
    const label = ctxRef.el('span', 'monde-m24-desc', desc);
    label.appendChild(ctxRef.el('span', 'monde-m24-owner', ` · ${owner}`));
    item.append(keyGroup, label);
    list.appendChild(item);
  });
  legend.appendChild(list);
  const parent = scene && scene.isConnected ? scene : (host && host.isConnected ? host : null);
  if (parent) parent.appendChild(legend);
  return legend;
}

/* M24-08 : annonce globale d'accessibilité complétée sans écraser une valeur
 * déjà posée par une autre lentille (le host est une ressource partagée). */
function markHost() {
  if (!host) return;
  const current = (host.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
  const merged = current.slice();
  Object.keys(OWN).forEach((key) => {
    if (!merged.includes(key)) merged.push(key);
  });
  if (merged.join(' ') !== current.join(' ')) {
    host.setAttribute('aria-keyshortcuts', merged.join(' '));
  }
}

/* M24-05 : le bouton de pause est le seul contrôle du globe à porter
 * aria-pressed. On clique dessus : globe.js reste l'unique pilote de la
 * rotation et annonce déjà le nouvel état dans #globe-live. */
function toggleRotation() {
  const controls = scene && scene.querySelector('.globe-controls');
  const buttons = controls ? controls.querySelectorAll('button[aria-pressed]') : [];
  if (buttons.length !== 1) {
    say('Rotation : commande indisponible.');
    return;
  }
  buttons[0].click();
}

/* M24-06 : situation annoncée dans la région live unique du globe, sans créer
 * de second aria-live (M08/M14 documents). Cache anti-bavardage. */
function situation() {
  const countries = Array.isArray(ctxRef.countries) ? ctxRef.countries : [];
  const current = ctxRef.selected;
  const base = current ? `Situation : ${current.name}.` : 'Situation : aucun pays sélectionné.';
  const text = `${base} ${countries.length} pays documentés. Raccourcis : a, v, 0.`;
  if (text !== lastSituation) {
    lastSituation = text;
    say(text);
  }
  if (host) host.dataset.m24Situation = '1';
}

/* M24-01 / M24-02 / M24-03 : l'unique écouteur. Les touches étrangères
 * sortent avant tout preventDefault ; le routeur (capture) a déjà eu sa chance
 * et T2-10 lui fait ignorer un évènement consommé. */
function onKeyDown(event) {
  if (event.defaultPrevented) { stats.ignored += 1; return; }
  if (event.ctrlKey || event.metaKey || event.altKey) { stats.ignored += 1; return; }
  if (editable(event.target)) { stats.ignored += 1; return; }
  if (ownerOf(event.key)) { stats.conflictsAvoided += 1; return; }
  if (modalOpen() || !inGlobe()) { stats.ignored += 1; return; }
  if (!Object.prototype.hasOwnProperty.call(OWN, event.key)) { stats.ignored += 1; return; }

  event.preventDefault();
  stats.handled += 1;
  if (event.key === 'a') {
    const node = ensureLegend();
    node.open = !node.open;
  } else if (event.key === 'v') {
    toggleRotation();
  } else {
    situation();
  }
}

function attachOnce() {
  if (attached || !host) return;
  attached = true;
  host.addEventListener('keydown', onKeyDown);
}

/* M24-09 : surface de diagnostic pour l'agent maître, sans journalisation. */
function expose() {
  window.VECTEMPOREL_M24 = {
    map: () => ({ ...OWN }),
    reserved: () => Array.from(FOREIGN),
    owners: () => [
      { key: '← → ↑ ↓ · Home End · Entrée', owner: 'globe.js' },
      { key: '+ = − _ · PageUp PageDown', owner: 'M05' },
      { key: '1–6 · m c r g s p · ? · Échap · Espace', owner: 'keyboard.js' },
      { key: 'Échap (survol clavier)', owner: 'M13' },
      { key: 'a · v · 0', owner: 'M24' },
    ],
    stats: () => ({ ...stats }),
    chantiers: () => [
      'M24-01', 'M24-02', 'M24-03', 'M24-04', 'M24-05',
      'M24-06', 'M24-07', 'M24-08', 'M24-09', 'M24-10',
    ],
    ready: () => attached,
  };
}

register('M24', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  ctxRef = ctx;
  if (ctx.host && ctx.host.isConnected) host = ctx.host;
  if (ctx.scene && ctx.scene.isConnected) scene = ctx.scene;
  ctx.css(CSS_ID, CSS);
  ensureLegend();
  markHost();
  attachOnce();
  expose();
});
