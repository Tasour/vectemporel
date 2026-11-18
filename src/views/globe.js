/* Porte d'entrée : globe 3D local, sans service externe.
 * Audit atlas-globe : cycle de vie WebGL, équivalence clavier/lecteur d'écran,
 * cohérence avec l'état partagé et budget de rendu.
 * Refonte navigation C2 : repères de situation — voir
 * UNIFIED_AUDIT/NAVIGATION/views/c2-orientation-atlas.md (C2-01 à C2-10). */
import { DATASET } from '../data/dataset.js';
import { state, subscribe, countryByCode, selectCountry } from '../domain/store.js';
import { attachReveal } from './globe-reveal.js';
import { runMondeEnhancements, flushMondeReady, notifyMondeHover, notifyMondeLeave, mondeDiagnostics } from './monde/index.js';

let host = null;
let initialized = false;
let engine = null;

/* État local de la vue : rien n'est permanent, tout est dérivé du store. */
let inView = true;          //IntersectionObserver (ATLAS-GLOBE-01)
let engineRunning = false;  //miroir de open()/close() (ATLAS-GLOBE-01, 06)
let paused = true;          //rotation off par défaut, activation explicite seulement (ATLAS-GLOBE-06)
let currentCode = null;     //pays issu de state.countryId (ATLAS-GLOBE-09)
let hoverIndex = -1;        //index du pays mis en évidence au clavier (ATLAS-GLOBE-03)
let lastFocusIndex = null;  //focus à restaurer après re-render (ATLAS-GLOBE-05)
let statusNode = null;
let readoutNode = null;
let liveNode = null;
let pauseButton = null;
let reveal = null;        // drapeau dans le contour + zoom de transition

const NAV_STYLE_ID = 'nav-c2b';
const GLOBE_LIVE_ID = 'globe-live';
const GLOBE_HELP_ID = 'globe-help';

/* Rotation automatique désactivée par défaut : activation exclusivement
   explicite via le bouton « Rotation » (M24 : touche v). `paused` est la
   source de vérité ; le mouvement réduit ne peut que confirmer l'arrêt. */
paused = true;
document.documentElement.dataset.globeActive = '0';

/* ATLAS-GLOBE-04, 06, 10 : CSS injecté, aucun fichier partagé modifié. */
const CSS = `
  .globe-view .globe-host:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: -3px; }
  .globe-country:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }
  .globe-country[aria-current="true"] { border-color: var(--gold); background: rgba(230,185,111,.12); color: var(--gold-bright); }
  .globe-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;

function injectCSS() {
  if (document.getElementById('atlas-globe-css')) return;
  const style = document.createElement('style');
  style.id = 'atlas-globe-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* C2 : style des repères de situation, injecté une seule fois, sans styles.css. */
function injectNavStyle() {
  if (document.getElementById(NAV_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = NAV_STYLE_ID;
  style.textContent = `
.globe-list .globe-title{font-size:30px}
.globe-orientation{display:block}
.globe-here{font-size:12px}
.globe-progress{font-size:12px}
.globe-country{min-height:86px}
@media (max-width:900px){.globe-country{min-height:66px}}
`;
  document.head.appendChild(style);
}

/* C2-06 : région live locale unique, hors de #app pour survivre au innerHTML
   de la coque (shell.js:330) et rester annonçable après chaque rendu. */
function ensureLiveNode() {
  if (liveNode && liveNode.isConnected) return liveNode;
  liveNode = document.getElementById(GLOBE_LIVE_ID);
  if (!liveNode) {
    liveNode = el('p', 'globe-sr-only');
    liveNode.id = GLOBE_LIVE_ID;
    liveNode.setAttribute('role', 'status');
    liveNode.setAttribute('aria-live', 'polite');
    liveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveNode);
  }
  return liveNode;
}

/* C2-03/-09 : fil de situation de la vue Monde, avec au plus un pays courant. */
function buildGlobeTrail(selected) {
  const nav = el('nav', 'nav-c2-trail');
  nav.id = 'nav-c2b-trail';
  nav.setAttribute('aria-label', 'Situation — Monde');
  const ol = el('ol', 'nav-c2-trail-list');
  const crumbs = selected ? ['Monde', selected.name] : ['Monde'];
  crumbs.forEach((label, index) => {
    const li = el('li', 'nav-c2-trail-item');
    if (index) {
      const sep = el('span', 'nav-c2-sep', '›');
      sep.setAttribute('aria-hidden', 'true');
      li.appendChild(sep);
    }
    const node = el('span', `nav-c2-crumb${index === crumbs.length - 1 ? ' is-current' : ''}`, label);
    if (index === crumbs.length - 1) node.setAttribute('aria-current', 'location');
    li.appendChild(node);
    ol.appendChild(li);
  });
  nav.appendChild(ol);
  return nav;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function describe(country) {
  if (!country) return 'Survol : aucun pays sous le pointeur';
  const eras = country.eras.length;
  const points = (country.points || []).length;
  return `${country.name} · ${eras} ères · ${points} points`;
}

function countryMeta(country) {
  const years = [country.domain[0], country.domain[1]];
  const points = (country.points || []).length;
  const domains = new Set((country.points || []).map((point) => point.domain)).size;
  return {
    range: `${formatYear(years[0])} → ${formatYear(years[1])}`,
    line: `${country.eras.length} ères · ${country.events.length} repères · ${points} points`,
    cover: `${domains}/14 domaines`,
  };
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* ATLAS-GLOBE-08 : statut auditable, idempotent (init() appelle onError puis rejette). */
function setStatus(message, kind) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.dataset.kind = kind || 'info';
  if (host) host.setAttribute('aria-busy', kind === 'busy' ? 'true' : 'false');
  if (kind === 'error') say(message);
}

function say(message) {
  if (liveNode) liveNode.textContent = message;
}

/* Rotation : répercute `paused` sur le moteur. setAutoRotate(false) coupe
   aussi la reprise interne ; publie l'état pour le garde de M07. */
function syncAutoRotate() {
  if (host) host.dataset.globeRotation = paused ? '0' : '1';
  if (!engine || !engine.ready || typeof engine.setAutoRotate !== 'function') return;
  engine.setAutoRotate(!paused);
}

/* ATLAS-GLOBE-01 et 06 : unique point de décision open()/close(). */
function syncEngine() {
  if (!engine || !engine.ready) return;
  syncAutoRotate();
  // Le moteur reste ouvert dès que la vue est visible : c'est lui qui porte
  // les interactions (drag, zoom, picking). `paused` ne commande plus que la
  // rotation automatique, via syncAutoRotate().
  const want = inView && state.view === 'globe';
  document.documentElement.dataset.globeActive = want ? '1' : '0';
  if (host) {
    host.dataset.globeActive = want ? '1' : '0';
    host.dataset.globeSelected = currentCode || '';
  }
  if (want === engineRunning) return;
  if (want) {
    engine.open(currentCode || undefined);
    if (currentCode) engine.setSelected(currentCode);
  } else {
    engine.close();
  }
  engineRunning = want;
}

/* ATLAS-GLOBE-06 : une seule frame statique puis arrêt, en mouvement réduit. */
function drawStaticFrame() {
  if (!engine || !engine.ready) return;
  syncAutoRotate();
  if (!engineRunning) {
    engine.open(currentCode || undefined);
    engineRunning = true;
  }
}

/* ATLAS-GLOBE-03 : parcours des pays, miroir visuel setHover et annonce live. */
function highlight(index) {
  const countries = DATASET.countries;
  const country = countries[index];
  if (!country) return;
  hoverIndex = index;
  if (engine && engine.ready) engine.setHover(country.code);
  if (reveal) reveal.hover(country);
  if (country) notifyMondeHover(country, country.code); else notifyMondeLeave();
  if (readoutNode) readoutNode.textContent = describe(country);
  if (host) {
    host.setAttribute('aria-label',
      `Globe local : ${country.name} mis en évidence (${index + 1} sur ${countries.length}). Flèches pour changer, Entrée pour ouvrir.`);
  }
  say(`${country.name}, ${country.events.length} repères. Pays ${index + 1} sur ${countries.length}. Entrée pour ouvrir.`);
}

function onHostKeyDown(event) {
  const countries = DATASET.countries;
  if (!countries.length) return;
  let index = hoverIndex >= 0 ? hoverIndex : countries.findIndex((c) => c.code === currentCode);
  if (index < 0) index = 0;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault(); index = (index + 1) % countries.length; break;
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault(); index = (index - 1 + countries.length) % countries.length; break;
    case 'Home':
      event.preventDefault(); index = 0; break;
    case 'End':
      event.preventDefault(); index = countries.length - 1; break;
    case 'Enter': {
      event.preventDefault();
      const country = countries[index];
      highlight(index);
      if (reveal) reveal.reveal(country, () => selectCountry(country.id));
      else selectCountry(country.id);
      return;
    }
    default:
      return; //1-5, ?, Échap restent gérés par le routeur unique.
  }
  highlight(index);
}

/* ATLAS-GLOBE-03 : flèches aussi sur la liste (barre d'outils), Entrée natif. */
function onChoicesKeyDown(event) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...event.currentTarget.querySelectorAll('button')];
  if (!buttons.length) return;
  const current = buttons.indexOf(document.activeElement);
  let next = current < 0 ? 0 : current;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (next + 1) % buttons.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (next - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  buttons[next].focus();
}

/* ATLAS-GLOBE-10 : zoom au clavier/tactile via un WheelEvent synthétique. */
function zoom(delta) {
  const canvas = host ? (host.querySelector('canvas.globe-webgl') || host.querySelector('canvas')) : null;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new WheelEvent('wheel', {
    deltaY: delta,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true,
  }));
  if (paused && engine && engine.ready) drawStaticFrame();
  say(delta < 0 ? 'Zoom avant.' : 'Zoom arrière.');
}

function ensure() {
  if (host) return host;
  host = document.createElement('div');
  host.className = 'globe-host';
  host.id = 'globe-canvas';
  host.tabIndex = 0;
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', 'Globe local des pays documentés. Flèches pour parcourir les pays, Entrée pour ouvrir.');
  /* C2-06 : description stable, distincte de la région live transitoire. */
  if (!host.querySelector(`#${GLOBE_HELP_ID}`)) {
    const help = el('p', 'globe-sr-only');
    help.id = GLOBE_HELP_ID;
    help.textContent = 'Globe local des pays documentés. Flèches : parcourir les pays. Entrée : ouvrir le pays sélectionné. Échap : revenir au monde. Le même accès est offert par la liste des pays.';
    host.appendChild(help);
  }
  host.setAttribute('aria-describedby', GLOBE_HELP_ID);
  host.dataset.globeActive = '0';
  host.dataset.globeSelected = '';
  host.dataset.globeRotation = paused ? '0' : '1';
  host.addEventListener('keydown', onHostKeyDown);
  host.addEventListener('pointerleave', () => { if (reveal) reveal.leave(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      inView = entry.isIntersecting && entry.intersectionRatio > 0;
      syncEngine();
    }, { threshold: [0, 0.01] });
    observer.observe(host);
  }
  return host;
}

/* ATLAS-GLOBE-05 : l'abonnement du module est enregistré avant celui de app.js. */
subscribe(() => {
  syncEngine();
  if (reveal && state.view !== 'globe' && !reveal.isRevealing()) reveal.leave();
  if (state.view === 'globe' && lastFocusIndex !== null) {
    const index = lastFocusIndex;
    requestAnimationFrame(() => {
      if (state.view !== 'globe') return;
      const choices = document.getElementById('globe-choices');
      const buttons = choices ? choices.querySelectorAll('button') : [];
      const target = buttons[index];
      if (target) target.focus({ preventScroll: true });
    });
  }
});

export function renderGlobe(stage) {
  injectCSS();
  injectNavStyle();
  const selected = DATASET.countries.find((country) => country.id === state.countryId) || null;
  const wrapper = el('div', 'globe-view');

  /* Scène spatiale : le globe occupe toute la colonne, le HUD flotte dessus. */
  const scene = el('div', 'globe-scene');
  const hostNode = ensure();
  scene.appendChild(hostNode);
  reveal = attachReveal(scene);

  const hud = el('div', 'globe-hud');
  const ready = engine?.ready;
  const statusText = ready
    ? 'Globe local chargé · textures et palette locales, aucun service externe.'
    : initialized && !window.THREE
      ? 'Moteur 3D indisponible : utilisez la liste des pays.'
      : 'Chargement du globe local…';
  statusNode = el('p', 'globe-status', statusText);
  statusNode.id = 'globe-status';
  statusNode.dataset.kind = ready ? 'ready' : initialized && !window.THREE ? 'error' : 'busy';
  statusNode.setAttribute('role', 'status');
  hud.appendChild(statusNode);

  readoutNode = el('p', 'globe-hover-readout', 'Survol : aucun pays sous le pointeur');
  readoutNode.id = 'globe-hover-readout';
  hud.appendChild(readoutNode);
  scene.appendChild(hud);

  const controls = el('div', 'globe-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Commandes du globe');
  const zoomIn = el('button', 'globe-control', 'Zoom +');
  zoomIn.type = 'button';
  zoomIn.setAttribute('aria-label', 'Zoomer sur le globe');
  zoomIn.addEventListener('click', () => zoom(-240));
  const zoomOut = el('button', 'globe-control', 'Zoom −');
  zoomOut.type = 'button';
  zoomOut.setAttribute('aria-label', 'Dézoomer sur le globe');
  zoomOut.addEventListener('click', () => zoom(240));
  pauseButton = el('button', 'globe-control', paused ? 'Rotation inactive' : 'Rotation active');
  pauseButton.type = 'button';
  pauseButton.setAttribute('aria-label', paused ? 'Activer la rotation' : 'Mettre la rotation en pause');
  pauseButton.setAttribute('aria-pressed', String(!paused));
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    syncAutoRotate();
    pauseButton.textContent = paused ? 'Rotation inactive' : 'Rotation active';
    pauseButton.setAttribute('aria-label', paused ? 'Activer la rotation' : 'Mettre la rotation en pause');
    pauseButton.setAttribute('aria-pressed', String(!paused));
    syncEngine();
    say(paused ? 'Rotation en pause.' : 'Rotation automatique active.');
  });
  controls.append(zoomIn, zoomOut, pauseButton);
  scene.appendChild(controls);
  wrapper.appendChild(scene);

  /* Panneau de décision : une seule orientation, puis les dix pays en grille. */
  ensureLiveNode();
  const list = el('div', 'globe-list');
  const title = el('h1', 'globe-title', 'Choisir un pays');
  title.id = 'globe-title';
  list.appendChild(title);
  list.appendChild(el('p', 'globe-subtitle', 'Dix histoires documentées, 784 cellules de couverture vérifiées. Sélectionnez un pays pour entrer dans son système.'));

  const orientation = el('div', 'globe-orientation');
  orientation.appendChild(el('p', 'globe-here', selected
    ? `Sélection courante : ${selected.name}`
    : 'Aucun pays sélectionné'));
  orientation.appendChild(el('p', 'globe-progress',
    `${DATASET.countries.length} pays · ${DATASET.meta.events} repères · ${DATASET.meta.validatedPoints || 0} points d’audit validés`));
  list.appendChild(orientation);

  const choices = el('ol', 'globe-choices');
  choices.id = 'globe-choices';
  choices.setAttribute('aria-label', 'Choisir un pays documenté');
  choices.addEventListener('keydown', onChoicesKeyDown);
  choices.addEventListener('focusin', (event) => {
    const buttons = [...choices.querySelectorAll('button')];
    const index = buttons.indexOf(event.target);
    if (index >= 0) lastFocusIndex = index;
  });
  const current = selected;
  currentCode = current ? current.code : null;
  hostNode.dataset.globeSelected = currentCode || '';
  const ordered = [...DATASET.countries].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  ordered.forEach((country) => {
    const index = DATASET.countries.indexOf(country);
    const meta = countryMeta(country);
    const li = el('li');
    const button = el('button', 'globe-country');
    button.type = 'button';
    button.dataset.index = String(index);
    button.tabIndex = index === (current ? DATASET.countries.indexOf(current) : 0) ? 0 : -1;
    const top = el('span', 'globe-country-top');
    const num = el('span', 'globe-country-num', String(index + 1).padStart(2, '0'));
    num.setAttribute('aria-hidden', 'true');
    const flag = el('span', 'globe-country-flag', country.flag || '');
    flag.setAttribute('aria-hidden', 'true');
    const name = el('span', 'globe-country-name', country.name);
    top.append(num, flag, name);
    button.appendChild(top);
    button.appendChild(el('span', 'globe-country-meta', meta.line));
    button.appendChild(el('span', 'globe-country-cover', meta.cover));
    if (current && current.id === country.id) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => {
      if (reveal) reveal.reveal(country, () => selectCountry(country.id));
      else selectCountry(country.id);
    });
    button.addEventListener('focus', () => highlight(index));
    button.addEventListener('pointerleave', () => { if (reveal) reveal.leave(); });
    li.appendChild(button);
    choices.appendChild(li);
  });
  list.appendChild(choices);
  list.appendChild(el('p', 'globe-help', 'Au clavier : Tab jusqu’au globe ou à la liste, flèches pour parcourir les pays, Entrée pour ouvrir. Survolez la sphère pour voir le nom d’un pays.'));
  wrapper.appendChild(list);
  stage.appendChild(wrapper);

  if (current && engine && engine.ready) engine.setSelected(current.code);

  /* 50 lentilles d'amélioration : chacune possède son module, aucune n'écrit
     dans les fichiers partagés. Le registre neutralise une lentille défaillante. */
  const mondeCtx = {
    stage, scene, host: hostNode, selected, countries: DATASET.countries,
    state, selectCountry, reveal,
    reducedMotion: () => {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch { return false; }
    },
    say,
  };
  runMondeEnhancements(mondeCtx);

  if (!initialized && window.THREE && window.VECTEMPOREL_GLOBE) {
    initialized = true;
    engine = window.VECTEMPOREL_GLOBE;
    hostNode.setAttribute('aria-busy', 'true');
    engine.init(hostNode, {
      onHover: (code) => {
        const country = code ? countryByCode(code) : null;
        if (reveal) {
          if (country) reveal.hover(country);
          else reveal.leave();
        }
        if (country) notifyMondeHover(country, country.code); else notifyMondeLeave();
        if (readoutNode) readoutNode.textContent = describe(country);
      },
      onSelect: (code) => {
        const country = countryByCode(code);
        if (country) {
          if (reveal) reveal.reveal(country, () => selectCountry(country.id));
          else selectCountry(country.id);
        }
      },
      onReady: () => {
        setStatus('Globe local chargé · textures et palette locales, aucun service externe.', 'ready');
        flushMondeReady({ engine, host: hostNode, selected });
      },
      onError: () => setStatus('Globe 3D indisponible : utilisez la liste des pays ou les flèches au clavier.', 'error'),
    }).then(() => {
      if (typeof engine.registerCountries === 'function') {
        engine.registerCountries(DATASET.countries);
      }
      if (paused) drawStaticFrame();
      else syncEngine();
      const live = document.getElementById(GLOBE_LIVE_ID);
      if (live) live.textContent = '';
    }).catch(() => {
      setStatus('Globe 3D indisponible : utilisez la liste des pays ou les flèches au clavier.', 'error');
    });
  } else if (!initialized) {
    initialized = true;
    setStatus('Moteur 3D non disponible : sélection par la liste des pays.', 'error');
  } else if (engine && engine.ready) {
    syncEngine();
    const live = document.getElementById(GLOBE_LIVE_ID);
    if (live) live.textContent = '';
  }
}

