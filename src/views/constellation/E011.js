import { register } from './registry.js';

/* Lentille E011 — Accessibilité clavier appliquée aux planètes de la vue
   Constellation. Dix chantiers (E011-01 à E011-10), tous implémentés ici.
   Greffon tolérant : zéro réseau, zéro aléa, zéro console, aucun timer ni
   boucle rAF propre. Aucun fichier partagé n'est modifié. Le panneau ajouté
   est indexable et tous ses identifiants sont préfixés `e011-`. */

const STYLE_ID = 'constellation-e011';
const CONTAINER_ID = 'e011-keyboard';
const LIVE_ID = 'e011-live';
const HELP_ID = 'e011-help';

/* État module — une seule installation d'écouteurs, quel que soit le nombre
   de rendus successifs (100 lentilles × N interactions clavier). */
let listenersInstalled = false;
let lastAnnounced = '';

const CSS = `
  /* E011-05 — anneau de focus non porté par la seule couleur. */
  .constellation-layout .const-planet:focus-visible {
    outline: 3px solid var(--gold-bright, #f0c880);
    outline-offset: 3px;
    box-shadow: 0 0 0 6px rgba(240, 200, 128, .20);
    border-radius: 50%;
    z-index: 5;
  }
  /* E011-05 — inhibition des transitions quand le mouvement est réduit. */
  .constellation-layout.e011-no-motion .const-planet { transition: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout .const-planet { transition: none !important; }
  }
  /* E011-09 — cible de focus agrandie sans déplacer le point visible. */
  .constellation-layout .const-planet::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    pointer-events: auto;
  }
  /* E011-06 / E011-07 — panneau d'aide et région d'annonce. */
  #${CONTAINER_ID} {
    margin-top: 8px; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .55);
    color: var(--muted-2); font-size: 9px; line-height: 1.5;
  }
  #${CONTAINER_ID} p { margin: 0; }
  #${LIVE_ID} { color: var(--gold); }
  @media (max-width: 620px) {
    #${CONTAINER_ID} { font-size: 8px; }
  }
`;

/* Fabrique d'élément tolérante : ctx.el fourni par le contrat, repli local. */
function makeEl(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E011-01 / E011-02 / E011-07 / E011-08 — attributs sur le groupe et les
   planètes. Recalculés à chaque rendu : la coque reconstruit le DOM. */
function enhancePlanets(ctx) {
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const layer = layout.querySelector('.const-layer-planets');
  const planets = Array.from(layout.querySelectorAll('.const-planet'));
  if (!planets.length) return;

  /* E011-01 — sémantique de sélection unique : radiogroup + aria-checked. */
  if (layer && typeof layer.setAttribute === 'function') {
    layer.setAttribute('role', 'radiogroup');
  }
  const activeIndex = Math.max(0, planets.findIndex((p) => p.classList && p.classList.contains('is-active')));
  planets.forEach((planet) => {
    if (typeof planet.setAttribute !== 'function') return;
    planet.setAttribute('role', 'radio');
    planet.setAttribute('aria-checked', planet.classList.contains('is-active') ? 'true' : 'false');

    /* E011-02 — tabindex itinérant : un seul point d'entrée Tab dans le groupe. */
    planet.setAttribute('tabindex', planets.indexOf(planet) === activeIndex ? '0' : '-1');

    /* E011-07 — raccourcis et description associés à chaque planète. */
    planet.setAttribute('aria-keyshortcuts',
      'ArrowLeft ArrowRight Home End PageUp PageDown Escape');
    planet.setAttribute('aria-describedby', HELP_ID);

    /* E011-08 — nom accessible enrichi de la position et du total. */
    if (planet.dataset && planet.dataset.e011Labelled === '1') return;
    const base = planet.getAttribute('aria-label') || planet.getAttribute('data-label')
      || `Repère ${planets.indexOf(planet) + 1}`;
    planet.setAttribute('aria-label',
      `${base} — repère ${planets.indexOf(planet) + 1} sur ${planets.length} · flèches pour naviguer`);
    if (planet.dataset) planet.dataset.e011Labelled = '1';
  });
}

/* E011-06 / E011-07 — panneau d'annonce live + aide clavier, reconstruit à
   chaque rendu car le layout est recréé par la coque. */
function ensureContainer(ctx) {
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (layout.querySelector(`#${CONTAINER_ID}`)) return;

  const container = makeEl(ctx, 'div', 'e011-keyboard-panel');
  container.id = CONTAINER_ID;

  /* E011-06 — région d'annonce pour lecteur d'écran. */
  const live = makeEl(ctx, 'p', 'e011-live',
    'Navigation clavier active sur les repères de la constellation.');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  container.appendChild(live);

  /* E011-07 — aide clavier indexable, cible de aria-describedby. */
  const help = makeEl(ctx, 'p', 'e011-help',
    'Sur un repère : ← → naviguer · Home/End première/dernière planète · '
    + 'PageUp/PageDown changer de couche (ère, repère, point) · Échap quitter le champ.');
  help.id = HELP_ID;
  container.appendChild(help);

  layout.appendChild(container);
}

/* E011-03 / E011-04 / E011-10 — activation d'une planète atteinte au clavier. */
function moveTo(node) {
  if (!node) return;
  if (typeof node.focus === 'function') node.focus({ preventScroll: true });
  if (typeof node.click === 'function') node.click();
}

/* E011-03 / E011-04 / E011-10 — écouteur délégué unique sur document : il
   survit au innerHTML de la coque et n'agit que dans la vue Constellation. */
function onKeyDown(event) {
  if (!event || event.defaultPrevented || !event.key) return;
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  const planet = target.closest('.const-planet');
  if (!planet) return;
  const layout = planet.closest('.constellation-layout');
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const planets = Array.from(layout.querySelectorAll('.const-planet'));
  const index = planets.indexOf(planet);
  if (index < 0) return;

  /* E011-03 — flèches ← → : planète voisine, repli en boucle, pas de scroll. */
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    moveTo(planets[(index + step + planets.length) % planets.length]);
    return;
  }

  /* E011-04 — Home / End : première / dernière planète. */
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    moveTo(planets[event.key === 'Home' ? 0 : planets.length - 1]);
  }
}

/* E011-10 — saut entre couches et retour au champ, dans le même écouteur. */
function onLayerKey(event) {
  if (!event || event.defaultPrevented || !event.key) return;
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  const planet = target.closest('.const-planet');
  if (!planet) return;
  const layout = planet.closest('.constellation-layout');
  if (!layout || typeof layout.querySelector !== 'function') return;

  if (event.key === 'PageDown' || event.key === 'PageUp') {
    event.preventDefault();
    const node = layout.querySelector(event.key === 'PageDown' ? '.const-moon' : '.const-sun');
    if (node && typeof node.focus === 'function') {
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
      node.focus({ preventScroll: true });
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    const field = layout.querySelector('.constellation-field');
    if (field && typeof field.focus === 'function') {
      if (!field.hasAttribute('tabindex')) field.setAttribute('tabindex', '-1');
      field.focus({ preventScroll: true });
    }
  }
}

/* E011-06 — annonce de la planète focalisée dans la région live. */
function onFocusIn(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== 'function') return;
  const planet = target.closest('.const-planet');
  if (!planet) return;
  const layout = planet.closest('.constellation-layout');
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const planets = Array.from(layout.querySelectorAll('.const-planet'));
  const index = planets.indexOf(planet);
  const live = document.getElementById(LIVE_ID);
  if (index < 0 || !live) return;
  const label = planet.getAttribute('aria-label') || planet.getAttribute('data-label') || 'Repère';
  const message = `Repère ${index + 1} sur ${planets.length} : ${label}`;
  if (message !== lastAnnounced) {
    live.textContent = message;
    lastAnnounced = message;
  }
}

/* Installation idempotente des trois écouteurs délégués. */
function installListeners() {
  if (listenersInstalled || typeof document === 'undefined') return;
  listenersInstalled = true;
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keydown', onLayerKey, true);
  document.addEventListener('focusin', onFocusIn, true);
}

register('E011', (ctx) => {
  /* Garde obligatoire : vérifier ctx.layout avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  try {
    /* Une seule injection de style, sous l'identifiant imposé. */
    if (typeof ctx.css === 'function') ctx.css(STYLE_ID, CSS);

    /* E011-05 — classe d'inhibition des transitions en mouvement réduit. */
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      ctx.layout.classList.add('e011-no-motion');
    }

    enhancePlanets(ctx);
    ensureContainer(ctx);
    installListeners();
  } catch {
    /* Greffon tolérant : neutralisé sans interrompre le rendu de la vue. */
  }
});
