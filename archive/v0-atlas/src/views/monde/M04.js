import { register } from './registry.js';

/*
 * M04 — Boussole, recentrage et centrage (domaine A / WebGL).
 *
 * Périmètre : un seul greffon, aucun fichier partagé modifié. Le moteur
 * (public/globe-engine.js) possède l'état de rotation et son API publique
 * n'expose aucun setter d'orientation. M04 lit donc le cap réel via
 * debugPick(), et ne pilote la rotation que pour les commandes explicites
 * (Recentrer / Centrer le pays / double-clic), avec un pointeur virtuel dédié
 * (pointerId 9104) — jamais un pointerId réel.
 *
 * Pendant un glisser utilisateur, M04 ne touche à aucun événement : les
 * pointerdown / pointermove / pointerup vont intact au moteur, qui clôt le
 * geste, libère la capture et reprogramme la rotation auto. Aucune inertie
 * n'est rejouée : c'était elle qui, en réutilisant le pointerId réel et en
 * étouffant le pointerup, laissait le moteur en faux drag et faisait sauter
 * la sphère.
 *
 * Références moteur :
 *   :134     BASE_YAW = -2.18, BASE_PITCH = 0.16
 *   :377-378 glisser : rotation.y += dx*0.0042 ; rotation.x = clamp(...,-1.15,1.15)
 *   :386-412 releasePointer() / onPointerUp() : fin du geste + rotation auto
 *   :677-704 API publique (aucun setter d'orientation)
 */

const STYLE_ID = 'monde-m04';
const PANEL_ID = 'm04-panel';
const COMPASS_ID = 'm04-compass';
const NEEDLE_ID = 'm04-needle';
const ORIENT_ID = 'm04-orientation';
const RECENTER_ID = 'm04-recenter';
const CENTER_ID = 'm04-center';
const LIVE_ID = 'm04-live';

/* Constantes alignées sur le moteur — aucune valeur inventée. */
const BASE_YAW = -2.18;
const BASE_PITCH = 0.16;
const PITCH_LIMIT = 1.15;   // globe-engine.js:378
const SENS = 0.0042;        // globe-engine.js:377-378
const TAU = Math.PI * 2;

/* Constantes de M04 (choix de conception auditables). */
const TWEEN_MS = 420;       // ms, recentrage / centrage
const LIVE_THROTTLE_MS = 500;
const TAP_MS = 300;
const TAP_DIST = 12;
const SYNTHETIC_ID = 9104;  // pointeur virtuel dédié, jamais un pointerId réel

const CSS = `
#globe-canvas canvas.globe-webgl{cursor:grab;touch-action:none}
#globe-canvas.m04-dragging canvas.globe-webgl{cursor:grabbing}
#m04-panel{position:absolute;right:16px;bottom:16px;z-index:6;display:flex;
  flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}
#m04-panel>*{pointer-events:auto}
.m04-compass{position:relative;width:52px;height:52px;border-radius:50%;
  border:1px solid var(--line-strong);background:rgba(8,11,16,.86);
  box-shadow:0 4px 14px rgba(0,0,0,.4)}
.m04-compass .m04-ring{position:absolute;inset:8px;border:1px dashed rgba(230,185,111,.22);border-radius:50%}
.m04-compass .m04-card{position:absolute;font-size:9px;line-height:1;color:var(--muted)}
.m04-compass .m04-n{top:3px;left:50%;transform:translateX(-50%)}
.m04-compass .m04-s{bottom:3px;left:50%;transform:translateX(-50%)}
.m04-compass .m04-e{right:4px;top:50%;transform:translateY(-50%)}
.m04-compass .m04-w{left:4px;top:50%;transform:translateY(-50%)}
#m04-needle{position:absolute;left:50%;top:50%;width:2px;height:16px;margin-left:-1px;
  margin-top:-16px;transform-origin:50% 100%;
  background:linear-gradient(to top,transparent,var(--gold-bright))}
.m04-orientation{max-width:224px;margin:0;padding:6px 9px;border:1px solid var(--line);
  border-radius:8px;background:rgba(8,11,16,.86);color:var(--ink-soft);
  font-size:11px;font-variant-numeric:tabular-nums;text-align:right}
.m04-actions{display:flex;gap:6px}
.m04-btn{min-width:36px;min-height:36px;padding:6px 9px;border:1px solid var(--line);
  border-radius:9px;background:var(--surface-2);color:var(--ink-soft);
  font:inherit;font-size:11px;cursor:pointer;touch-action:manipulation}
.m04-btn:hover{border-color:var(--gold);color:var(--gold-bright)}
.m04-btn[aria-pressed="true"]{border-color:var(--gold);
  background:rgba(230,185,111,.12);color:var(--gold-bright)}
.m04-btn:disabled{opacity:.45;cursor:not-allowed}
.m04-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:620px){
  #m04-panel{right:8px;bottom:8px;gap:6px}
  .m04-compass{width:44px;height:44px}
  .m04-orientation{max-width:168px;font-size:10px}
  .m04-btn{min-width:36px;min-height:36px;padding:5px 7px;font-size:10px}
}
@media(prefers-reduced-motion:reduce){#m04-needle{transition:none}}
`;

let installed = false;
let engine = null;
let host = null;
let scene = null;
let canvas = null;
let countries = [];
let store = null;
let reducedMotion = () => false;
let say = () => {};
let lastHover = null;
let liveLast = 0;

/* Une seule boucle rAFE, réservée au tween des commandes explicites. */
const loop = {
  raf: 0,
  mode: '',            // '' | 'tween'
  start: 0,
  fromYaw: 0,
  fromPitch: 0,
  toYaw: 0,
  toPitch: 0,
  appliedYaw: 0,
  appliedPitch: 0,
  label: '',
};

/* Suivi du glisser réel : aucun delta n'est rejoué. On ne garde que l'état
 * « geste en cours » pour empêcher tout pilotage virtuel concurrent. */
const pointer = {
  id: null,
  active: false,
};

/* Pilote synthétique : un seul "doigt" virtuel, réutilisé. Son pointerId est
 * toujours SYNTHETIC_ID, jamais un pointerId réel. */
const synthetic = {
  active: false,
  id: SYNTHETIC_ID,
  x: 0, y: 0,
};

const taps = { t: 0, x: 0, y: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapPi(angle) {
  let value = (angle + Math.PI) % TAU;
  if (value < 0) value += TAU;
  return value - Math.PI;
}

function shortest(from, to) {
  return wrapPi(to - from);
}

function onGlobeView() {
  return !store || store.view === 'globe';
}

function isFrozen() {
  try {
    return !!(reducedMotion() || document.hidden || !onGlobeView());
  } catch {
    return false;
  }
}

function findCanvas() {
  if (canvas && canvas.isConnected) return canvas;
  if (!host) return null;
  canvas = host.querySelector('canvas.globe-webgl') || host.querySelector('canvas');
  return canvas;
}

function liveNode() {
  let node = document.getElementById(LIVE_ID);
  if (!node) {
    node = document.createElement('p');
    node.id = LIVE_ID;
    node.className = 'm04-sr';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
  }
  return node;
}

function announce(text) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - liveLast < LIVE_THROTTLE_MS) return;
  liveLast = now;
  const node = liveNode();
  if (node) node.textContent = text;
}

/* Le cap est lu sur le point avant de la sphère : debugPick(centre) renvoie
 * (-sin(yaw)cos(pitch), sin(pitch), cos(yaw)cos(pitch)) en local.
 * D'où pitch = asin(y) et yaw = atan2(-x, z) — sans accès aux objets THREE. */
function readOrientation() {
  if (!engine || typeof engine.debugPick !== 'function') return null;
  const element = findCanvas();
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  try {
    const info = engine.debugPick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!info || !info.local) return null;
    const x = Number(info.local[0]);
    const y = Number(info.local[1]);
    const z = Number(info.local[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    const pitch = Math.asin(clamp(y, -1, 1));
    const yaw = Math.atan2(-x, z);
    if (!Number.isFinite(pitch) || !Number.isFinite(yaw)) return null;
    return { yaw: wrapPi(yaw), pitch: clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT) };
  } catch {
    return null;
  }
}

/* M04-05, M04-06 : le moteur n'expose pas de setter d'orientation. On ouvre un
 * glisser virtuel avec son propre pointerId, puis on lui envoie les mêmes
 * deltas qu'un doigt. setPointerCapture est neutralisé le temps du pointerdown
 * (un événement synthétique n'a pas de pointeur actif) puis restauré. */
function beginDrive() {
  if (synthetic.active) return true;
  synthetic.id = SYNTHETIC_ID;
  const element = findCanvas();
  if (!element || typeof PointerEvent === 'undefined') return false;
  const rect = element.getBoundingClientRect();
  synthetic.x = rect.left + rect.width / 2;
  synthetic.y = rect.top + rect.height / 2;
  const hadOwn = Object.prototype.hasOwnProperty.call(element, 'setPointerCapture');
  const original = element.setPointerCapture;
  try {
    element.setPointerCapture = function () {};
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: synthetic.id,
      pointerType: 'mouse', button: 0, buttons: 1,
      clientX: synthetic.x, clientY: synthetic.y,
    }));
  } catch {
    return false;
  } finally {
    try {
      if (hadOwn) element.setPointerCapture = original;
      else delete element.setPointerCapture;
    } catch { /* repli : capture déjà libérée */ }
  }
  synthetic.active = true;
  return true;
}

function drive(dx, dy) {
  if (!synthetic.active || typeof PointerEvent === 'undefined') return false;
  const element = findCanvas();
  if (!element) return false;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  synthetic.x += dx;
  synthetic.y += dy;
  try {
    element.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, pointerId: synthetic.id,
      pointerType: 'mouse', button: 0, buttons: 1,
      clientX: synthetic.x, clientY: synthetic.y,
    }));
    return true;
  } catch {
    return false;
  }
}

function endDrive() {
  if (!synthetic.active) return;
  synthetic.active = false;
  const element = findCanvas();
  if (!element || typeof PointerEvent === 'undefined') return;
  try {
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: synthetic.id,
      pointerType: 'mouse', button: 0, buttons: 0,
      clientX: synthetic.x, clientY: synthetic.y,
    }));
  } catch { /* l'état moteur se stabilise au prochain open() */ }
}

function formatDeg(value, sign) {
  return `${value.toFixed(1)}° ${sign}`;
}

function updateAttitude(force) {
  const node = document.getElementById(ORIENT_ID);
  const needle = document.getElementById(NEEDLE_ID);
  if (!node) return;
  const orientation = readOrientation();
  if (!orientation) {
    node.textContent = 'Orientation indisponible';
    return;
  }
  // longitude au centre : yaw = π/2 − λ  ⇒  λ = π/2 − yaw
  const lon = wrapPi(Math.PI / 2 - orientation.yaw) * 180 / Math.PI;
  const lat = orientation.pitch * 180 / Math.PI;
  const text = `Centre du globe : ${formatDeg(Math.abs(lon), lon < 0 ? 'O' : 'E')} · ${formatDeg(Math.abs(lat), lat < 0 ? 'S' : 'N')}`;
  if (force || node.textContent !== text) node.textContent = text;
  if (needle) {
    const degrees = (-orientation.yaw * 180 / Math.PI).toFixed(1);
    needle.style.transform = `rotate(${degrees}deg)`;
  }
  announce(text);
}

function stopLoop() {
  loop.mode = '';
  loop.label = '';
  if (loop.raf) {
    cancelAnimationFrame(loop.raf);
    loop.raf = 0;
  }
  endDrive();
  updateAttitude(true);
}

function schedule() {
  if (!loop.raf) loop.raf = requestAnimationFrame(tick);
}

function tick(now) {
  loop.raf = 0;
  if (!loop.mode) return;
  try {
    if (isFrozen()) {
      stopLoop();
      return;
    }
    if (loop.mode === 'tween') {
      const t = clamp((now - loop.start) / TWEEN_MS, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const wantYaw = loop.fromYaw + shortest(loop.fromYaw, loop.toYaw) * eased;
      const wantPitch = loop.fromPitch + (loop.toPitch - loop.fromPitch) * eased;
      const deltaYaw = shortest(loop.appliedYaw, wantYaw);
      const deltaPitch = wantPitch - loop.appliedPitch;
      drive(deltaYaw / SENS, deltaPitch / SENS);
      loop.appliedYaw = wantYaw;
      loop.appliedPitch = wantPitch;
      if (t >= 1) {
        const label = loop.label;
        stopLoop();
        if (label) say(label);
        return;
      }
    }
    if (loop.mode) schedule();
  } catch {
    stopLoop();
  }
}

function applyInstant(yaw, pitch, label) {
  if (pointer.active) return; // jamais de pilotage virtuel pendant un vrai geste
  const current = readOrientation();
  if (!current || !beginDrive()) {
    if (label) say(`${label} : orientation indisponible.`);
    return;
  }
  const targetPitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
  drive(shortest(current.yaw, wrapPi(yaw)) / SENS, (targetPitch - current.pitch) / SENS);
  endDrive();
  updateAttitude(true);
  if (label) say(label);
}

function startTween(yaw, pitch, label) {
  if (pointer.active) return; // jamais de pilotage virtuel pendant un vrai geste
  if (reducedMotion()) {
    applyInstant(yaw, pitch, label);
    return;
  }
  const current = readOrientation();
  if (!current || !beginDrive()) {
    if (label) say(`${label} : orientation indisponible.`);
    return;
  }
  loop.fromYaw = loop.appliedYaw = current.yaw;
  loop.fromPitch = loop.appliedPitch = current.pitch;
  loop.toYaw = wrapPi(yaw);
  loop.toPitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
  loop.mode = 'tween';
  loop.start = performance.now();
  loop.label = label || '';
  schedule();
}

function recenter(label) {
  if (!onGlobeView()) return;
  startTween(BASE_YAW, BASE_PITCH, label || 'Vue recentrée sur l’orientation de référence.');
}

function selectedCountry() {
  const id = store && store.countryId;
  const found = id ? countries.find((country) => country.id === id) : null;
  return found || lastHover || null;
}

function centerOnCountry() {
  if (!onGlobeView()) return;
  const country = selectedCountry();
  if (!country || !country.bounds) {
    say('Aucun pays sélectionné : centrage indisponible.');
    return;
  }
  const b = country.bounds;
  if (![b.minLon, b.maxLon, b.minLat, b.maxLat].every(Number.isFinite)) {
    say('Coordonnées du pays indisponibles : centrage ignoré.');
    return;
  }
  const lon = (b.minLon + b.maxLon) / 2;
  const lat = (b.minLat + b.maxLat) / 2;
  // globe-engine.js:213-223 : λ_u = atan2(z,-x), et face caméra ⇒ yaw = π/2 − λ.
  const yaw = Math.PI / 2 - lon * Math.PI / 180;
  const pitch = clamp(lat * Math.PI / 180, -PITCH_LIMIT, PITCH_LIMIT);
  startTween(yaw, pitch, `Globe centré sur ${country.name}.`);
}

function syncButtons() {
  const centerButton = document.getElementById(CENTER_ID);
  if (centerButton) centerButton.disabled = !selectedCountry();
}

function onClick(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  if (target.closest(`#${RECENTER_ID}`)) recenter();
  else if (target.closest(`#${CENTER_ID}`)) centerOnCountry();
}

function onKeyDown(event) {
  if (event.key !== '0' || event.ctrlKey || event.altKey || event.metaKey) return;
  const active = document.activeElement;
  if (!active || !((host && (active === host || host.contains(active))) ||
      (scene && scene.contains(active)))) return;
  event.preventDefault();
  recenter();
}

/* Capture sur l'ancêtre : les écouteurs du moteur sont sur le canvas (cible),
 * donc la phase de capture de #globe-canvas les précède toujours. Les gestes
 * réels traversent M04 sans être altérés : aucun stopPropagation, aucun delta
 * rejoué, aucun pointerId réel réutilisé. */
function onDown(event) {
  if (event.pointerId === SYNTHETIC_ID) return;
  if (host.classList && typeof host.classList.add === 'function') {
    host.classList.add('m04-dragging');
  }
  // Un vrai geste reprend la main : on clôt un éventuel tween avant que le
  // moteur ne voie ce pointerdown (phase capture).
  if (loop.mode) stopLoop();
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  pointer.id = event.pointerId;
  pointer.active = true;
}

function onUp(event) {
  if (event.pointerId === SYNTHETIC_ID) return;
  if (host.classList && typeof host.classList.remove === 'function') {
    host.classList.remove('m04-dragging');
  }
  if (!pointer.active || event.pointerId !== pointer.id) return;
  pointer.active = false;
  pointer.id = null;
  const now = event.timeStamp || performance.now();

  /* M04-09 : double-clic / double-tap → recentrage (geste conventionnel). */
  if (now - taps.t < TAP_MS && Math.hypot(event.clientX - taps.x, event.clientY - taps.y) < TAP_DIST) {
    taps.t = 0;
    requestAnimationFrame(() => recenter());
    return;
  }
  taps.t = now;
  taps.x = event.clientX;
  taps.y = event.clientY;

  /* Le pointerup suit son cours vers le moteur : c'est lui qui clôt le geste,
   * libère la capture et reprogramme la rotation auto. Rien n'est rejoué. */
  updateAttitude(true);
}

function onDblClick(event) {
  event.preventDefault();
  recenter();
}

function installUI(ctx) {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('div', 'm04-panel');
    panel.id = PANEL_ID;

    const compass = ctx.el('div', 'm04-compass');
    compass.id = COMPASS_ID;
    compass.setAttribute('aria-hidden', 'true');
    compass.appendChild(ctx.el('span', 'm04-ring'));
    const directions = [['m04-n', 'N'], ['m04-e', 'E'], ['m04-s', 'S'], ['m04-w', 'O']];
    directions.forEach(([className, letter]) => {
      compass.appendChild(ctx.el('span', `m04-card ${className}`, letter));
    });
    const needle = ctx.el('span', '');
    needle.id = NEEDLE_ID;
    compass.appendChild(needle);

    const orientation = ctx.el('p', 'm04-orientation', 'Orientation : chargement…');
    orientation.id = ORIENT_ID;

    const actions = ctx.el('div', 'm04-actions');
    const recenterButton = ctx.el('button', 'm04-btn', 'Recentrer');
    recenterButton.id = RECENTER_ID;
    recenterButton.type = 'button';
    recenterButton.setAttribute('aria-label', 'Recentrer la vue sur l’orientation de référence');
    recenterButton.setAttribute('aria-keyshortcuts', '0');

    const centerButton = ctx.el('button', 'm04-btn', 'Centrer le pays');
    centerButton.id = CENTER_ID;
    centerButton.type = 'button';
    centerButton.setAttribute('aria-label', 'Centrer le globe sur le pays sélectionné');

    actions.append(recenterButton, centerButton);
    panel.append(compass, orientation, actions);
    (scene || document.body).appendChild(panel);
  }
  liveNode();
  syncButtons();
}

function watchMotion() {
  try {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => {
      if (event && event.matches) stopLoop();
      syncButtons();
    };
    if (query.addEventListener) query.addEventListener('change', handler);
    else if (query.addListener) query.addListener(handler);
  } catch { /* matchMedia indisponible */ }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
  });
}

register('M04', (ctx) => {
  try {
    ctx.css(STYLE_ID, CSS);
    host = ctx.host || null;
    scene = ctx.scene || null;
    countries = ctx.countries || [];
    store = ctx.state || null;
    reducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
    say = typeof ctx.say === 'function' ? ctx.say : () => {};
    engine = window.VECTEMPOREL_GLOBE || null;

    installUI(ctx);

    if (!installed) {
      installed = true;
      ctx.onHover((info) => {
        const next = info && info.country ? info.country : null;
        if (next && next !== lastHover) {
          lastHover = next;
          syncButtons();
        }
      });
      ctx.onLeave(() => {
        if (lastHover) {
          lastHover = null;
          syncButtons();
        }
      });
      document.addEventListener('click', onClick);
      if (host) {
        host.addEventListener('keydown', onKeyDown);
        host.addEventListener('pointerdown', onDown, true);
        host.addEventListener('pointerup', onUp, true);
      }
      watchMotion();
    }
    syncButtons();
    updateAttitude();
  } catch {
    /* Le registre neutralise déjà la lentille : on ne propage aucune erreur. */
  }

  ctx.onReady((payload) => {
    try {
      if (payload && payload.engine) engine = payload.engine;
      else engine = window.VECTEMPOREL_GLOBE || engine;
      if (payload && payload.host) host = payload.host;
      canvas = null;
      findCanvas();
      if (canvas && !canvas.dataset.m04Dbl) {
        canvas.addEventListener('dblclick', onDblClick);
        canvas.dataset.m04Dbl = '1';
      }
      syncButtons();
      updateAttitude();
    } catch { /* rendu sans attitude : repli sur la liste des pays */ }
  });
});
