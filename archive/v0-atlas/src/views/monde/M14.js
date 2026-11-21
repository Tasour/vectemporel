import { register } from './registry.js';

/* Lentille M14 — Survol au pointeur (domaine B : drapeau & révélation).
 *
 * Greffon strictement local : aucun fichier partagé modifié, zéro réseau,
 * zéro aléa, zéro console. Le module n'appelle jamais reveal.hover() : il
 * observé uniquement les événements du registre (onHover/onLeave/onReady)
 * après que globe.js a piloté le masque. Toutes ses écritures DOM sont
 * coalescées en une seule frame rAF et protégées contre les événements
 * périmés (hazard buffering) — cf. les chantiers M14-01 à M14-10.
 */

const CSS_ID = 'monde-m14';
const CHIP_ID = 'monde-m14-chip';
const RAIL_ID = 'monde-m14-rail';
const MAX_RAIL = 3;

/* État de module : survit aux re-renders de la coque (shell.js). */
let latest = null;        // ctx le plus récent (références fraîches)
let listenerAttached = false;
let chip = null;
let rail = null;
let pending = null;       // payload en attente de la prochaine frame
let raf = 0;              // 0 = aucune frame planifiée
let seq = 0;              // séquence monotone des événements
let appliedSeq = -1;      // dernier événement appliqué
let currentCode = null;   // code pays actuellement affiché
let pointerX = -1;
let pointerY = -1;
let havePointer = false;
const railCodes = [];

const CSS = `
  #${CHIP_ID}{
    position:fixed;top:0;left:0;z-index:61;pointer-events:none;
    max-width:min(260px,72vw);padding:6px 10px;border-radius:8px;
    background:rgba(8,11,18,.88);color:#f5e9d0;border:1px solid rgba(230,185,111,.45);
    font:600 12px/1.35 system-ui,sans-serif;letter-spacing:.01em;
    opacity:0;transform:translate3d(0,0,0);
    box-shadow:0 8px 24px rgba(0,0,0,.45);
    transition:opacity .12s linear;will-change:transform,opacity
  }
  #${CHIP_ID}.is-on{opacity:1}
  #${CHIP_ID} b{color:#e6b96f;font-weight:700}
  #${RAIL_ID}{
    position:fixed;right:10px;bottom:10px;z-index:61;pointer-events:none;
    display:flex;gap:6px;align-items:center;
    font:11px/1 system-ui,sans-serif;color:#cbb98f;opacity:.85
  }
  #${RAIL_ID} span{
    padding:4px 7px;border-radius:6px;background:rgba(8,11,18,.72);
    border:1px solid rgba(230,185,111,.25)
  }
  @media (prefers-reduced-motion:reduce){#${CHIP_ID}{transition:none}}
`;

/* M14-07 : création idempotente, body persistant, IDs uniques. */
function elOrGet(id, tag, className) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
    document.body.appendChild(node);
  }
  return node;
}

function ensureDom() {
  chip = elOrGet(CHIP_ID, 'div', 'monde-m14-chip');
  rail = elOrGet(RAIL_ID, 'div', 'monde-m14-rail');
  /* M14-06 : le HUD est purement visuel ; #globe-live annonce déjà le pays
     au clavier. Un second live region provoquerait des doublons. */
  if (chip && chip.getAttribute('aria-hidden') !== 'true') {
    chip.setAttribute('aria-hidden', 'true');
  }
  if (rail && rail.getAttribute('aria-hidden') !== 'true') {
    rail.setAttribute('aria-hidden', 'true');
  }
}

/* M14-05 : position borne au viewport, sans débordement ni reflow de page. */
function positionChip() {
  if (!chip) return;
  let x;
  let y;
  if (!havePointer) {
    x = Math.max(8, window.innerWidth - 280);
    y = 12;
  } else {
    const w = chip.offsetWidth || 160;
    const h = chip.offsetHeight || 34;
    x = Math.min(Math.max(8, pointerX + 14), Math.max(8, window.innerWidth - w - 8));
    y = Math.min(Math.max(8, pointerY + 14), Math.max(8, window.innerHeight - h - 8));
  }
  chip.style.transform = `translate3d(${x}px,${y}px,0)`;
}

function pushRail(code) {
  if (!rail) return;
  const at = railCodes.indexOf(code);
  if (at >= 0) railCodes.splice(at, 1);
  railCodes.unshift(code);
  if (railCodes.length > MAX_RAIL) railCodes.length = MAX_RAIL;
  rail.replaceChildren();
  for (const c of railCodes) {
    const node = document.createElement('span');
    node.textContent = c;
    rail.appendChild(node);
  }
}

function isRevealing() {
  const reveal = latest && latest.reveal;
  return !!(reveal && typeof reveal.isRevealing === 'function' && reveal.isRevealing());
}

/* M14-01/02/03/04 : unique point d'écriture, une frame au plus, séquence
   monotone, dedup par code, suspension pendant la révélation du masque. */
function apply() {
  raf = 0;
  const item = pending;
  pending = null;
  if (!item) return;
  if (item.seq < appliedSeq) return;   // événement périmé
  appliedSeq = item.seq;

  if (item.type === 'leave') {
    /* Le masque de révélation reste maître : un leave ne touche jamais le
       masque, seulement notre HUD. On le masque donc toujours (pas de résidu). */
    currentCode = null;
    if (chip) chip.classList.remove('is-on');
    return;
  }

  const code = item.code;
  const country = item.country;
  if (!code || !country) return;

  if (isRevealing()) {
    /* M14-04 : le zoom 720 ms de globe-reveal.js est en cours ; on ne pose
       pas notre couche par-dessus et on réinitialise le dedup pour qu'un
       survol postérieur réaffiche le libellé. */
    currentCode = null;
    if (chip) chip.classList.remove('is-on');
    return;
  }

  if (code === currentCode) return;    // M14-03 : rien à re-rendre
  currentCode = code;

  if (chip) {
    chip.replaceChildren();
    const name = document.createElement('b');
    name.textContent = country.name;
    const count = (country.events || []).length;
    chip.append(name, document.createTextNode(` · ${count} repères`));
    positionChip();
    chip.classList.add('is-on');
  }
  pushRail(code);
}

/* M14-01 : coalescence — plusieurs onHover par frame n'écrivent qu'une fois. */
function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(apply);
}

function onHover(payload) {
  pending = {
    type: 'hover',
    code: payload && payload.code,
    country: payload && payload.country,
    seq: ++seq,
  };
  schedule();
}

function onLeave() {
  pending = { type: 'leave', seq: ++seq };
  schedule();
}

function reset() {
  currentCode = null;
  appliedSeq = -1;
  pending = null;
  if (chip) chip.classList.remove('is-on');
}

register('M14', (ctx) => {
  latest = ctx;                         // toujours frais, même après re-render
  if (ctx.css) ctx.css(CSS_ID, CSS);
  ensureDom();

  /* M14-05 : une seule écoute passive au document, gardée une fois. Aucune
     écriture ici : on mémorise seulement la dernière position du pointeur. */
  if (!listenerAttached) {
    listenerAttached = true;
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      havePointer = true;
    }, { passive: true });
  }

  /* M14-07 (révisé) : runMondeEnhancements() vide les tableaux à chaque rendu
     (registry.js). On réarme donc un onHover/onLeave/onReady par appel sans
     garde module ; la garde ancienne faisait taire le HUD au second rendu. */
  if (typeof ctx.onHover === 'function') ctx.onHover(onHover);
  if (typeof ctx.onLeave === 'function') ctx.onLeave(onLeave);
  /* M14-10 : remise à zéro propre quand le moteur WebGL devient prêt. */
  if (typeof ctx.onReady === 'function') ctx.onReady(reset);
});
