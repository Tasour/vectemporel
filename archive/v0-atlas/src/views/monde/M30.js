import { register } from './registry.js';

/* Lentille M30 — États vides du globe (domaine C : ergonomie & interaction).
 *
 * Un seul fichier possédé. Aucun fichier partagé modifié, aucune requête, aucun
 * aléa, aucune trace, aucune minuterie, aucune boucle d'animation propre. Le
 * greffon ne reçoit que { scene, host, countries, state, css, el, say } : il ne
 * pilote donc ni la révélation, ni la sélection, ni le moteur WebGL. Il observe
 * le DOM déjà rendu par globe.js via un unique MutationObserver (événementiel,
 * sans polling), dérive un état vide déterministe et priorisé, et n'annonce
 * qu'une transition d'état bloquant via ctx.say.
 *
 * UI/UX : chaque état porte un libellé de catégorie, un titre, une explication
 * courte et une consigne actionnable (préfixée par une flèche textuelle, jamais
 * portée par la seule couleur). Le panneau évite le HUD (haut) et les commandes
 * (bas gauche) : centré en bas sur grand écran, décalé à droite sous 1000 px.
 *
 * Les chantiers M30-01 à M30-10 sont détaillés dans
 * UNIFIED_AUDIT/MONDE/views/M30.md.
 */

const CSS_ID = 'monde-m30';
const PANEL_ID = 'monde-m30-empty';
const STATE_ATTR = 'm30State'; /* host.dataset.m30State -> data-m30-state */

/* M30-10 : seuls les états bloquants sont annoncés. Les états transitoires
   (loading, inactive, no-hover) restent visibles sans bruit live. */
const ANNOUNCED = new Set([
  'no-countries', 'stale-selection', 'no-canvas', 'webgl-unavailable', 'no-selection',
]);

/* M30-09 : options uniques, partagées entre l'armement initial et le
   réarmement. `data-globe-selected` n'est pas lu par M30 : on ne l'observe pas. */
const OBSERVER_OPTIONS = {
  attributes: true,
  attributeFilter: ['data-kind', 'data-globe-active'],
  characterData: true,
  childList: true,
  subtree: true,
};

let latest = null;        // ctx le plus récent (références fraîches après re-render)
let panel = null;         // panneau réutilisé / recréé selon les rendus
let observer = null;      // unique MutationObserver, réancré sur la scène courante
let lastKey = null;       // dernière clé d'état rendue
let lastAnnounced = null; // dernière clé annoncée via say

const CSS = `
  #${PANEL_ID}{
    position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:7;
    width:max-content;max-width:min(320px,84%);padding:12px 16px;
    text-align:center;pointer-events:none;
    border:1px solid var(--line);border-radius:10px;
    background:rgba(8,11,16,.9);color:var(--muted);
    font:inherit;line-height:1.4;
  }
  #${PANEL_ID}[hidden]{display:none}
  #${PANEL_ID} .m30-orbit{
    display:block;width:28px;height:28px;margin:0 auto 7px;
    border:1px dashed var(--gold);border-radius:50%;opacity:.55;
  }
  #${PANEL_ID} .m30-kicker{
    margin:0 0 3px;color:var(--gold);font-size:9px;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .m30-title{
    margin:0;color:var(--ink);font-family:var(--serif);
    font-size:15px;font-weight:600;line-height:1.25;
  }
  #${PANEL_ID} .m30-detail{margin:5px 0 0;font-size:11px;color:var(--muted)}
  #${PANEL_ID} .m30-action{
    margin:7px 0 0;padding-top:6px;border-top:1px solid var(--line);
    font-size:11px;font-weight:600;color:var(--ink-soft);
  }
  /* La flèche est un glyphe, non une couleur : la consigne reste lisible. */
  #${PANEL_ID} .m30-action::before{content:'→ ';color:var(--gold);font-weight:700}
  #${PANEL_ID}[data-state="no-countries"] .m30-orbit,
  #${PANEL_ID}[data-state="stale-selection"] .m30-orbit,
  #${PANEL_ID}[data-state="no-canvas"] .m30-orbit,
  #${PANEL_ID}[data-state="webgl-unavailable"] .m30-orbit{opacity:.9}
  /* Sous 1000 px la scène se resserre : décaler à droite pour ne pas
     recouvrir les commandes ancrées en bas à gauche. */
  @media (max-width:1000px){
    #${PANEL_ID}{left:auto;right:16px;bottom:16px;transform:none;max-width:min(280px,62%)}
  }
  @media (max-width:700px){
    #${PANEL_ID}{right:10px;bottom:10px;max-width:min(240px,64%);padding:9px 12px}
    #${PANEL_ID} .m30-orbit{width:22px;height:22px;margin-bottom:5px}
    #${PANEL_ID} .m30-title{font-size:14px}
    #${PANEL_ID} .m30-detail,#${PANEL_ID} .m30-action{font-size:max(11px,0.78rem)}
  }
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID} .m30-orbit{border-style:solid}
  }
`;

function stateOf(key, kicker, title, detail, action) {
  return { key, kicker, title, detail, action };
}

/* M30-03 : la sélection est adressée par id (store.js:92-94, 272-280),
   jamais par code réservé au picking. */
function selectedCountry(ctx) {
  const id = ctx.state && ctx.state.countryId;
  if (!id || !Array.isArray(ctx.countries)) return null;
  for (const country of ctx.countries) {
    if (country && country.id === id) return country;
  }
  return null;
}

/* M30-05, M30-06 : data-kind est posé par setStatus() (globe.js:139-146). */
function statusKind(ctx) {
  const scene = ctx.scene;
  const node = scene && typeof scene.querySelector === 'function'
    ? scene.querySelector('#globe-status') : null;
  return node ? (node.dataset.kind || 'info') : 'absent';
}

/* M30-09 : le texte initial est « Survol : aucun pays sous le pointeur »
   (globe.js:335-337). */
function hoverText(ctx) {
  const scene = ctx.scene;
  const node = scene && typeof scene.querySelector === 'function'
    ? scene.querySelector('#globe-hover-readout') : null;
  return node ? (node.textContent || '').trim() : '';
}

/* M30-04 : même recherche que globe.js:249 (canvas.globe-webgl puis canvas). */
function hasCanvas(ctx) {
  const host = ctx.host;
  if (!host || typeof host.querySelector !== 'function') return false;
  return !!(host.querySelector('canvas.globe-webgl') || host.querySelector('canvas'));
}

/* M30-02 à M30-09 : dérivation pure, sans effet de bord. L'ordre des tests
   est l'ordre de priorité figé du rapport (le plus bloquant d'abord).
   Chaque état associe une explication factuelle et une consigne actionnable. */
function derive(ctx) {
  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  const status = statusKind(ctx);

  if (countries.length === 0) {
    return stateOf('no-countries', 'Données', 'Aucun pays documenté',
      'Le jeu de données ne contient aucun pays : la liste est vide et aucune fiche ne peut être ouverte.',
      'Aucune sélection n’est possible ici ; le globe se remplira dès qu’un pays sera ajouté au jeu de données.');
  }

  const chosen = selectedCountry(ctx);
  if (ctx.state && ctx.state.countryId && !chosen) {
    return stateOf('stale-selection', 'Sélection', 'Sélection introuvable',
      'Le pays précédemment choisi n’est plus présent dans le jeu de données.',
      'Choisissez un pays dans la liste à droite pour ouvrir son système.');
  }

  /* La cause (moteur indisponible) prime sur le symptôme (canvas absent). */
  if (status === 'error') {
    return stateOf('webgl-unavailable', 'Rendu', 'Rendu 3D indisponible',
      'Le moteur 3D ne peut pas s’initialiser : la sphère ne peut pas être affichée.',
      'Utilisez la liste des pays à droite, ou Tab puis les flèches sur le globe.');
  }
  if (status === 'busy') {
    return stateOf('loading', 'Chargement', 'Chargement du globe',
      'Le globe local s’initialise avec ses textures stockées sur cet appareil.',
      'La liste des pays est déjà utilisable pendant ce temps.');
  }
  if (!hasCanvas(ctx)) {
    return stateOf('no-canvas', 'Rendu', 'Aucune sphère affichée',
      'Le moteur 3D n’a pas créé de surface de rendu dans cette scène.',
      'La liste des pays et les flèches au clavier restent disponibles.');
  }

  if (!chosen) {
    return stateOf('no-selection', 'Sélection', 'Aucun pays choisi',
      `${countries.length} pays sont documentés et prêts à être explorés.`,
      'Sélectionnez un pays dans la liste à droite, ou Tab puis Entrée sur le globe.');
  }

  /* M30-08 : lecture seule du marqueur posé par syncEngine() (globe.js:156). */
  if (!ctx.host || ctx.host.dataset.globeActive !== '1') {
    return stateOf('inactive', 'Lecture', 'Scène en pause',
      'Le globe ne rend aucune image animée ici (vue hors écran ou mouvement réduit).',
      'La liste des pays reste disponible pour poursuivre la navigation.');
  }

  const hover = hoverText(ctx);
  if (!hover || /^survol\s*:\s*aucun/i.test(hover)) {
    return stateOf('no-hover', 'Survol', 'Aucun pays survolé',
      'Aucun pays n’est mis en évidence sous le pointeur pour l’instant.',
      'Survolez la sphère, ou parcourez la liste avec les flèches pour afficher un nom.');
  }

  return stateOf('none', '', '', '', '');
}

/* M30-01 : un seul panneau, retrouvé par ID, réancré sur la scène courante. */
function ensurePanel(ctx) {
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = ctx.el('div', 'monde-m30-empty');
    node.id = PANEL_ID;
    /* M30-10 : pas de région live ici ; ctx.say est l'unique canal d'annonce. */
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', 'État vide du globe');
    node.hidden = true;

    const orbit = ctx.el('span', 'm30-orbit');
    orbit.setAttribute('aria-hidden', 'true');
    const kicker = ctx.el('p', 'm30-kicker', '');
    const title = ctx.el('p', 'm30-title', '');
    const detail = ctx.el('p', 'm30-detail', '');
    const action = ctx.el('p', 'm30-action', '');
    node.append(orbit, kicker, title, detail, action);
  }
  if (ctx.scene && node.parentNode !== ctx.scene) ctx.scene.appendChild(node);
  panel = node;
  return node;
}

/* M30-10 : toute écriture est conditionnée à une différence réelle, afin que
   les mutations générées par le greffon n'entretiennent pas l'observateur. */
function render(ctx) {
  const derived = derive(ctx);
  const key = derived.key || 'none';
  const changed = key !== lastKey;
  lastKey = key;

  if (ctx.host && ctx.host.dataset[STATE_ATTR] !== key) {
    ctx.host.dataset[STATE_ATTR] = key;
  }

  const node = ensurePanel(ctx);
  if (node.dataset.state !== key) node.dataset.state = key;

  const hidden = key === 'none';
  if (node.hidden !== hidden) node.hidden = hidden;
  if (!hidden) {
    const kicker = node.querySelector('.m30-kicker');
    const title = node.querySelector('.m30-title');
    const detail = node.querySelector('.m30-detail');
    const action = node.querySelector('.m30-action');
    if (kicker && kicker.textContent !== derived.kicker) kicker.textContent = derived.kicker;
    if (title && title.textContent !== derived.title) title.textContent = derived.title;
    if (detail && detail.textContent !== derived.detail) detail.textContent = derived.detail;
    if (action && action.textContent !== derived.action) action.textContent = derived.action;
  }

  if (changed && ANNOUNCED.has(key)) {
    if (lastAnnounced !== key) {
      lastAnnounced = key;
      if (typeof ctx.say === 'function') {
        ctx.say(`${derived.title}. ${derived.detail} ${derived.action}`);
      }
    }
  } else if (changed) {
    lastAnnounced = null; /* réannonce possible au retour d'un état bloquant */
  }
}

/* M30-09 : un seul observateur événementiel, réancré à chaque rendu.
   Le couplage est rompu sur deux plans : (1) le callback se déconnecte avant
   d'écrire, donc les mutations du panneau ne sont jamais observées ; (2) le
   réarmement lit `latest.scene` au moment du microtask, jamais la scène figée
   dans la closure, et ignore un observateur déjà remplacé. Aucune boucle. */
function ensureObserver(ctx) {
  if (typeof MutationObserver === 'undefined' || !ctx.scene) return;
  if (observer) observer.disconnect();
  const self = new MutationObserver(() => {
    if (!latest || observer !== self) return;
    self.disconnect();
    render(latest);
    queueMicrotask(() => {
      const scene = latest && latest.scene && latest.scene.isConnected ? latest.scene : null;
      if (observer === self && scene) self.observe(scene, OBSERVER_OPTIONS);
    });
  });
  observer = self;
  self.observe(ctx.scene, OBSERVER_OPTIONS);
}

register('M30', (ctx) => {
  if (!ctx) return;
  latest = ctx;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  /* Le registre rejoue le greffon à chaque rendu : le panneau est réancré,
     l'état est dérivé immédiatement, puis l'observateur est réarmé. */
  ensurePanel(ctx);
  render(ctx);
  ensureObserver(ctx);
});
