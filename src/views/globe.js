/* Porte d'entrée : globe 3D local, sans service externe.
 * Audit atlas-globe : cycle de vie WebGL, équivalence clavier/lecteur d'écran,
 * cohérence avec l'état partagé et budget de rendu.
 * Refonte navigation C2 : repères de situation — voir
 * UNIFIED_AUDIT/NAVIGATION/views/c2-orientation-atlas.md (C2-01 à C2-10). */
import { DATASET } from '../data/dataset.js';
import { state, subscribe, countryByCode, selectCountry } from '../domain/store.js';

let host = null;
let initialized = false;
let engine = null;

/* État local de la vue : rien n'est permanent, tout est dérivé du store. */
let inView = true;          //IntersectionObserver (ATLAS-GLOBE-01)
let engineRunning = false;  //miroir de open()/close() (ATLAS-GLOBE-01, 06)
let paused = false;         //mouvement réduit / pause explicite (ATLAS-GLOBE-06)
let currentCode = null;     //pays issu de state.countryId (ATLAS-GLOBE-09)
let hoverIndex = -1;        //index du pays mis en évidence au clavier (ATLAS-GLOBE-03)
let lastFocusIndex = null;  //focus à restaurer après re-render (ATLAS-GLOBE-05)
let statusNode = null;
let readoutNode = null;
let liveNode = null;
let pauseButton = null;

const NAV_STYLE_ID = 'nav-c2b';
const GLOBE_LIVE_ID = 'globe-live';
const GLOBE_HELP_ID = 'globe-help';

const REDUCED_MOTION = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
})();
paused = REDUCED_MOTION;
document.documentElement.dataset.globeActive = '0';

/* ATLAS-GLOBE-04, 06, 10 : CSS injecté, aucun fichier partagé modifié. */
const CSS = `
  .globe-view { position: relative; }
  .globe-view .globe-host:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: -3px; }
  .globe-view .globe-list button { min-height: 44px; font-size: 12px; }
  .globe-view .globe-list button[aria-current="true"] {
    border-color: var(--gold); background: rgba(230,185,111,.14);
    color: var(--gold-bright); font-weight: 600;
  }
  .globe-view .globe-list button:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 2px; }
  .globe-controls { position: absolute; top: 12px; left: 12px; z-index: 5; display: flex; flex-wrap: wrap; gap: 6px; max-width: calc(100% - 24px); }
  .globe-controls button { flex: 1 1 auto; width: auto; min-width: 44px; min-height: 44px; padding: 6px 8px; }
  .globe-status { margin: 0 0 12px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); font-size: 11px; line-height: 1.45; }
  .globe-status[data-kind="error"] { border-color: var(--red); color: var(--ink); }
  .globe-status[data-kind="ready"] { border-color: var(--line-strong); color: var(--ink-soft); }
  .globe-hover-readout { min-height: 18px; margin: 0 0 12px; color: var(--gold-bright); font-size: 11px; font-variant-numeric: tabular-nums; }
  .globe-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  @media (max-width: 620px) {
    .globe-view .globe-host { min-height: 45vh; }
    .globe-view .globe-list button { min-height: 48px; font-size: 13px; }
  }
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
.nav-c2-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.globe-list .nav-c2b-title{margin:0 0 8px;font-family:var(--serif);font-size:22px;font-weight:450}
.nav-c2-orientation{margin:0 0 14px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.nav-c2-here{margin:0 0 5px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;line-height:1.5}
.nav-c2-trail{margin:0}
.nav-c2-trail-list{display:flex;flex-wrap:wrap;gap:2px;margin:0;padding:0;list-style:none;color:var(--muted);font-size:10px;line-height:1.6}
.nav-c2-trail-item{display:flex;gap:3px;min-width:0}
.nav-c2-sep{color:rgba(255,255,255,.28)}
.nav-c2-crumb.is-current{color:var(--gold-bright);font-weight:600}
.nav-c2-progress{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.nav-c2-choice-list{list-style:none;margin:0;padding:0}
.nav-c2-choice-item{margin:0}
.nav-c2-choice-num{margin-right:6px;color:var(--gold);font-variant-numeric:tabular-nums}
@media (max-width:620px){.nav-c2-orientation{padding:7px 8px}.nav-c2-trail-list{font-size:9px}}`;
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
  return country ? `${country.name} · ${country.events.length} repères` : 'Aucun pays sous le pointeur';
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

/* ATLAS-GLOBE-01 et 06 : unique point de décision open()/close(). */
function syncEngine() {
  if (!engine || !engine.ready) return;
  const want = inView && !paused && state.view === 'globe';
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
  if (!engine || !engine.ready || !paused) return;
  engine.open(currentCode || undefined);
  engineRunning = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (paused) {
      engine.close();
      engineRunning = false;
      if (host) host.dataset.globeActive = '0';
    }
  }));
}

/* ATLAS-GLOBE-03 : parcours des pays, miroir visuel setHover et annonce live. */
function highlight(index) {
  const countries = DATASET.countries;
  const country = countries[index];
  if (!country) return;
  hoverIndex = index;
  if (engine && engine.ready) engine.setHover(country.code);
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
    case 'Enter':
      event.preventDefault(); highlight(index); selectCountry(countries[index].id); return;
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
  host.addEventListener('keydown', onHostKeyDown);
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
  const hostNode = ensure();
  wrapper.appendChild(hostNode);

  /* ATLAS-GLOBE-02 + C2-06 : région live persistante et statut visible sans
     role=status, pour éviter les annonces doublées avec shell.js:73. */
  ensureLiveNode();

  statusNode = el('p', 'globe-status', 'Chargement du globe local…');
  statusNode.id = 'globe-status';
  statusNode.dataset.kind = 'busy';
  wrapper.appendChild(statusNode);

  const list = el('div', 'globe-list');
  const listTitle = el('h1', 'nav-c2b-title', `Monde · ${DATASET.countries.length} pays documentés`);
  listTitle.id = 'nav-c2b-title';
  list.appendChild(listTitle);

  /* C2-03/-05/-09 : situation textuelle et compteurs réels du jeu de données,
     lisibles sans couleur, sans survol, sans WebGL et sans annonce vocale. */
  const orientation = el('div', 'nav-c2-orientation');
  const here = el('p', 'nav-c2-here', selected
    ? `Vous êtes ici : Monde › ${selected.name}`
    : 'Vous êtes ici : Monde · aucun pays sélectionné — choisissez un pays dans la liste ou sur le globe.');
  here.id = 'nav-c2b-here';
  orientation.appendChild(here);
  orientation.appendChild(buildGlobeTrail(selected));
  const progress = el('p', 'nav-c2-progress');
  progress.id = 'nav-c2b-progress';
  progress.textContent = `${DATASET.countries.length} pays · ${DATASET.meta.events} repères · ${DATASET.meta.points} points référencés dans le jeu de données local.`
    + (selected ? ` Sélection : ${selected.name} · ${selected.events.length} repères.` : ' Aucun pays sélectionné.');
  orientation.appendChild(progress);
  list.appendChild(orientation);

  list.appendChild(el('p', '',
    'Tournez le globe à la souris ou au doigt. Au clavier : Tab jusqu au globe, flèches pour parcourir les pays, Entrée pour ouvrir. La liste ci-dessous offre le même accès.'));

  /* ATLAS-GLOBE-07 : retour textuel du survol (jamais la seule couleur). */
  readoutNode = el('p', 'globe-hover-readout', 'Survol : aucun pays sous le pointeur.');
  readoutNode.id = 'globe-hover-readout';
  list.appendChild(readoutNode);

  /* ATLAS-GLOBE-06 et 10 : commandes visibles, cibles >= 44 px. */
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
  pauseButton = el('button', 'globe-control', paused ? 'Activer la rotation' : 'Mettre la rotation en pause');
  pauseButton.type = 'button';
  pauseButton.setAttribute('aria-label', pauseButton.textContent);
  pauseButton.setAttribute('aria-pressed', String(!paused));
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? 'Activer la rotation' : 'Mettre la rotation en pause';
    pauseButton.setAttribute('aria-label', pauseButton.textContent);
    pauseButton.setAttribute('aria-pressed', String(!paused));
    syncEngine();
    say(paused ? 'Rotation en pause.' : 'Rotation automatique active.');
  });
  controls.append(zoomIn, zoomOut, pauseButton);
  wrapper.appendChild(controls);

  /* ATLAS-GLOBE-04, 05, 09 : liste = barre d'outils reflétant l'état partagé. */
  const choices = el('ol', 'globe-choices nav-c2-choice-list');
  choices.id = 'globe-choices';
  choices.setAttribute('role', 'toolbar');
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
  DATASET.countries.forEach((country, index) => {
    const li = el('li', 'nav-c2-choice-item');
    const button = el('button', '', `${country.flag || ''} ${country.name} · ${country.events.length} repères`);
    button.type = 'button';
    button.dataset.index = String(index);
    /* C2-05 : position visible dans une liste ordonnée, sans JS d'annonce. */
    const number = el('span', 'nav-c2-choice-num', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    button.prepend(number, document.createTextNode(' '));
    if (current && current.id === country.id) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => selectCountry(country.id));
    button.addEventListener('focus', () => highlight(index));
    li.appendChild(button);
    choices.appendChild(li);
  });
  list.appendChild(choices);
  wrapper.appendChild(list);
  stage.appendChild(wrapper);

  if (current && engine && engine.ready) engine.setSelected(current.code);

  /* ATLAS-GLOBE-08 : chargement, callbacks complets et repli sans écraser le host. */
  if (!initialized && window.THREE && window.VECTEMPOREL_GLOBE) {
    initialized = true;
    engine = window.VECTEMPOREL_GLOBE;
    hostNode.setAttribute('aria-busy', 'true');
    engine.init(hostNode, {
      onHover: (code) => {
        const country = code ? countryByCode(code) : null;
        if (readoutNode) readoutNode.textContent = describe(country);
      },
      onSelect: (code) => {
        const country = countryByCode(code);
        if (country) selectCountry(country.id);
      },
      onReady: () => setStatus('Globe local chargé : textures et palette locales, aucun service externe.', 'ready'),
      onError: () => setStatus('Globe 3D indisponible : utilisez la liste des pays ou les flèches au clavier.', 'error'),
    }).then(() => {
      if (paused) drawStaticFrame();
      else syncEngine();
    }).catch(() => {
      setStatus('Globe 3D indisponible : utilisez la liste des pays ou les flèches au clavier.', 'error');
    });
  } else if (!initialized) {
    initialized = true;
    setStatus('Moteur 3D non disponible : sélection par la liste des pays.', 'error');
  } else if (engine && engine.ready) {
    syncEngine();
  }
}
