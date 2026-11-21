import { register } from './registry.js';

/* Lentille M01 — Ombres et éclairage du globe (domaine A : rendu & moteur WebGL).
 * Aucun appel réseau, aucun aléa, aucun console.*, aucun fichier partagé modifié.
 * Le shader n'est pas touché : l'API publique du moteur n'expose pas uLightDir
 * (M01-04). Les calques ci-dessous sont des surimpositions non interactives,
 * posées dans le host persistant ; les commandes vivent dans la scène (le host
 * porte un gestionnaire de flèches global, globe.js:281).
 */

const CSS_ID = 'monde-m01';
const LAYERS_ID = 'monde-m01-layers';
const TERM_LAYER_ID = 'monde-m01-terminator-layer';
const SPEC_LAYER_ID = 'monde-m01-specular-layer';
const RIM_LAYER_ID = 'monde-m01-rim-layer';
const GROUND_ID = 'monde-m01-ground';
const DESC_ID = 'monde-m01-light-desc';
const CONTROLS_ID = 'monde-m01-controls';
const TERM_BTN_ID = 'monde-m01-terminator-btn';
const SPEC_BTN_ID = 'monde-m01-spec-btn';
const RIM_BTN_ID = 'monde-m01-rim-btn';
const AZIMUTH_ID = 'monde-m01-azimuth';
const METRIC_ID = 'monde-m01-metric';

/* Le disque mesure 78 % de la hauteur : 2 / (4.05 * tan(35°/2)) ≈ 0,783,
   d'après la caméra et le rayon de la sphère (globe-engine.js:130-131, 189). */
const CSS = `
.monde-m01-host canvas.globe-webgl{position:relative;z-index:1;filter:drop-shadow(0 14px 22px rgba(0,0,0,.55))}
.monde-m01-layers{position:absolute;inset:0;z-index:2;pointer-events:none;contain:paint}
.monde-m01-disc{position:absolute;inset:auto;left:50%;top:50%;height:78%;aspect-ratio:1/1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none}
.monde-m01-terminator,.monde-m01-specular,.monde-m01-rim{opacity:0;transition:opacity .18s linear}
.monde-m01-terminator.is-on,.monde-m01-specular.is-on,.monde-m01-rim.is-on{opacity:1}
.monde-m01-terminator{background:radial-gradient(130% 130% at var(--m01-lx,28%) var(--m01-ly,24%), rgba(1,3,8,0) 26%, rgba(1,3,8,.10) 48%, rgba(1,3,8,.40) 72%, rgba(1,3,8,.62) 100%)}
.monde-m01-specular{background:radial-gradient(9% 9% at var(--m01-lx,28%) var(--m01-ly,24%), rgba(255,244,214,.24), rgba(255,244,214,0) 72%)}
.monde-m01-rim{box-shadow:inset 0 0 44px rgba(255,214,140,.16),inset 0 0 9px rgba(255,236,196,.10)}
.monde-m01-ground{position:absolute;z-index:0;left:50%;bottom:4%;width:46%;height:10%;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(0,0,0,.55),rgba(0,0,0,0) 72%);pointer-events:none}
.monde-m01-host[data-m01-hover="1"] .monde-m01-specular.is-on{opacity:1}
.monde-m01-host[data-m01-hover="1"] .monde-m01-rim.is-on{box-shadow:inset 0 0 56px rgba(255,222,150,.24),inset 0 0 10px rgba(255,236,196,.14)}
.monde-m01-host[data-m01-reduced="1"][data-m01-hover="1"] .monde-m01-rim.is-on{box-shadow:inset 0 0 44px rgba(255,214,140,.16),inset 0 0 9px rgba(255,236,196,.10)}
.monde-m01-controls{position:absolute;right:16px;bottom:16px;z-index:5;display:flex;align-items:center;gap:6px;padding:6px;border:1px solid var(--line);border-radius:9px;background:rgba(8,11,16,.86)}
.monde-m01-controls button{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--ink-soft);font-size:12px;cursor:pointer}
.monde-m01-controls button[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
.monde-m01-controls input[type="range"]{width:112px;height:36px;accent-color:var(--gold);cursor:pointer}
.monde-m01-controls :is(button,input):focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.monde-m01-metric{color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.monde-m01-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:1000px){.monde-m01-controls{right:8px;bottom:64px;max-width:calc(100% - 16px);flex-wrap:wrap}}
@media (max-width:620px){.monde-m01-controls input[type="range"]{width:80px}.monde-m01-metric{display:none}.monde-m01-specular,.monde-m01-rim{display:none}}
@media (prefers-reduced-motion:reduce){.monde-m01-terminator,.monde-m01-specular,.monde-m01-rim{transition:none}}
.monde-m01-host[data-m01-reduced="1"] .monde-m01-terminator,
.monde-m01-host[data-m01-reduced="1"] .monde-m01-specular,
.monde-m01-host[data-m01-reduced="1"] .monde-m01-rim{transition:none}
`;

let currentHost = null;
let currentSay = () => {};
let hoverBound = false;
let readyBound = false;
let motionBound = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* Une seule boucle rAF dans l'app : ce module n'en ajoute aucune. */
function ensureNode(id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function azimuthText(degrees) {
  if (degrees === 0) return 'Azimut 0 degré : accent en haut à gauche, direction de la lumière du moteur';
  if (degrees < 0) return `Azimut moins ${Math.abs(degrees)} degrés : accent décalé vers la droite`;
  return `Azimut plus ${degrees} degrés : accent décalé vers la gauche`;
}

function toggleButton(id, text, ariaLabel) {
  const button = ensureNode(id, 'button', null, document.getElementById(CONTROLS_ID));
  if (!button.textContent) {
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', ariaLabel);
    button.setAttribute('aria-pressed', 'false');
  }
  return button;
}

function bindToggle(button, key, layer, onText, offText) {
  if (!button || button.dataset.m01Bound === '1') return;
  button.dataset.m01Bound = '1';
  button.addEventListener('click', () => {
    const on = currentHost.dataset[key] !== '1';
    currentHost.dataset[key] = on ? '1' : '0';
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (layer) layer.classList.toggle('is-on', on);
    currentSay(on ? onText : offText);
  });
}

function syncToggle(button, layer, flag) {
  if (!button) return;
  const on = flag === '1';
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (layer) layer.classList.toggle('is-on', on);
}

register('M01', (ctx) => {
  const host = ctx.host;
  const scene = ctx.scene;
  if (!host || !scene) return;
  currentHost = host;
  if (typeof ctx.say === 'function') currentSay = ctx.say;

  ctx.css(CSS_ID, CSS);
  host.classList.add('monde-m01-host');

  if (host.dataset.m01Init !== '1') {
    host.dataset.m01Init = '1';
    host.dataset.m01Terminator = '0';
    host.dataset.m01Specular = '0';
    host.dataset.m01Rim = '0';
    host.dataset.m01Azimuth = '0';
    host.dataset.m01Hover = '0';
    host.style.setProperty('--m01-lx', '28%');
    host.style.setProperty('--m01-ly', '24%');
  }
  host.dataset.m01Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';

  const layers = ensureNode(LAYERS_ID, 'div', 'monde-m01-layers', host);
  const termLayer = ensureNode(TERM_LAYER_ID, 'div', 'monde-m01-disc monde-m01-terminator', layers);
  const specLayer = ensureNode(SPEC_LAYER_ID, 'div', 'monde-m01-disc monde-m01-specular', layers);
  const rimLayer = ensureNode(RIM_LAYER_ID, 'div', 'monde-m01-disc monde-m01-rim', layers);
  ensureNode(GROUND_ID, 'div', 'monde-m01-ground', host);

  const desc = ensureNode(DESC_ID, 'p', 'monde-m01-sr', host);
  desc.textContent = 'Éclairage du globe : une lumière directionnelle unique, venant du haut à gauche. Le moteur ne calcule pas d’ombres portées. Les commandes Terminateur, Reflet et Contour ajustent des calques de lecture au-dessus du globe.';
  const described = (host.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(DESC_ID) < 0) {
    described.push(DESC_ID);
    host.setAttribute('aria-describedby', described.join(' '));
  }

  const controls = ensureNode(CONTROLS_ID, 'div', 'monde-m01-controls', scene);
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Éclairage et ombres du globe');
  if (!controls.childElementCount) {
    const label = document.createElement('label');
    label.className = 'monde-m01-sr';
    label.htmlFor = AZIMUTH_ID;
    label.textContent = 'Azimut de l’accent lumineux, de moins 25 à plus 25 degrés';
    const azimuth = document.createElement('input');
    azimuth.id = AZIMUTH_ID;
    azimuth.type = 'range';
    azimuth.min = '-25';
    azimuth.max = '25';
    azimuth.step = '5';
    azimuth.value = '0';
    azimuth.setAttribute('aria-valuetext', azimuthText(0));
    const metric = document.createElement('span');
    metric.id = METRIC_ID;
    metric.className = 'monde-m01-metric';
    metric.textContent = 'Éclairage : métrique en attente';
    controls.append(
      toggleButton(TERM_BTN_ID, 'Terminateur', 'Activer le terminateur nocturne'),
      azimuth,
      toggleButton(SPEC_BTN_ID, 'Reflet', 'Activer le reflet spéculaire'),
      toggleButton(RIM_BTN_ID, 'Contour', 'Activer le halo de contour'),
      metric,
      label
    );
  }

  const termBtn = document.getElementById(TERM_BTN_ID);
  const specBtn = document.getElementById(SPEC_BTN_ID);
  const rimBtn = document.getElementById(RIM_BTN_ID);
  const azimuth = document.getElementById(AZIMUTH_ID);
  const metric = document.getElementById(METRIC_ID);

  syncToggle(termBtn, termLayer, host.dataset.m01Terminator);
  syncToggle(specBtn, specLayer, host.dataset.m01Specular);
  syncToggle(rimBtn, rimLayer, host.dataset.m01Rim);

  bindToggle(termBtn, 'm01Terminator', termLayer, 'Terminateur activé.', 'Terminateur désactivé.');
  bindToggle(specBtn, 'm01Specular', specLayer, 'Reflet spéculaire activé.', 'Reflet spéculaire désactivé.');
  bindToggle(rimBtn, 'm01Rim', rimLayer, 'Halo de contour activé.', 'Halo de contour désactivé.');

  if (azimuth && azimuth.dataset.m01Bound !== '1') {
    azimuth.dataset.m01Bound = '1';
    azimuth.addEventListener('input', () => {
      const degrees = clamp(Number(azimuth.value) || 0, -25, 25);
      currentHost.dataset.m01Azimuth = String(degrees);
      currentHost.style.setProperty('--m01-lx', `${clamp(28 - degrees * 0.6, 8, 48)}%`);
      currentHost.style.setProperty('--m01-ly', `${clamp(24 + degrees * 0.25, 10, 40)}%`);
      azimuth.setAttribute('aria-valuetext', azimuthText(degrees));
    });
    azimuth.addEventListener('change', () => {
      currentSay(azimuth.getAttribute('aria-valuetext'));
    });
  }

  if (!hoverBound) {
    hoverBound = true;
    ctx.onHover(() => { if (currentHost) currentHost.dataset.m01Hover = '1'; });
    ctx.onLeave(() => { if (currentHost) currentHost.dataset.m01Hover = '0'; });
  }

  if (!readyBound) {
    readyBound = true;
    ctx.onReady((payload) => {
      const engine = payload && payload.engine;
      if (!engine || typeof engine.getInfo !== 'function') return;
      const info = engine.getInfo();
      if (!info || !currentHost) return;
      currentHost.dataset.m01DrawCalls = String(info.calls);
      currentHost.dataset.m01Triangles = String(info.triangles);
      currentHost.dataset.m01PixelRatio = String(info.pixelRatio);
      const node = document.getElementById(METRIC_ID);
      if (node) {
        node.textContent = `${info.calls} draw call${info.calls === 1 ? '' : 's'} · ${info.triangles} triangles · DPR ${info.pixelRatio}`;
      }
    });
  }

  if (!motionBound) {
    motionBound = true;
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        if (currentHost) currentHost.dataset.m01Reduced = event.matches ? '1' : '0';
      };
      if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
      else if (typeof query.addListener === 'function') query.addListener(onChange);
    } catch {
      /* Préférence non observable : l'état initial lu via ctx.reducedMotion() reste. */
    }
  }
});
