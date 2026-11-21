import { register } from './registry.js';

/* Lentille M11 — qualité du masque de découpe du contour pays (domaine B).
 *
 * Le module de révélation (globe-reveal.js) construit son masque par comparaison
 * cubique sur une palette de dix codes figée, puis l'étire sur une figure 2:1.
 * Ce greffon fournit un pipeline de découpe corrigé, autonome et observable,
 * sans toucher au fichier partagé : palette complète, couleur la plus proche,
 * couverture continue, lissage, recadrage sur la composante dominante, repli
 * des pays minuscules, cache LRU et gardes de séquence.
 *
 * Zéro réseau (la texture locale est la seule ressource), zéro aléa, aucune
 * écriture de journal. CSS injecté une seule fois via ctx.css('monde-m11', regles).
 *
 * Rapport : UNIFIED_AUDIT/MONDE/views/M11-masque-decoupe.md (M11-01 a M11-10).
 */

const STYLE_ID = 'monde-m11';
const PANEL_ID = 'monde-m11-panel';
const STATUS_ID = 'monde-m11-status';
const PREVIEW_ID = 'monde-m11-preview';
const TOGGLE_ID = 'monde-m11-toggle';
const GROUP_ID = 'monde-m11-tolerance';
const BODY_ID = 'monde-m11-panel-body';
const PICK_URL = './public/globe-pick.png';

/* M11-01 : miroir exact et complet de public/globe-palette.json (196 codes),
 * sans fetch. La regle 24+40*(...) a ete verifiee sur les 196 entrees du JSON. */
const CODES = 'ZA DZ AO BJ BW BF BI CM KM CG CD CI DJ EG ER ET GA GM GH GN GQ GW MU CV KE LS LR LY MG MW ML MA MR MZ NA NE NG UG CF RW ST SN SC SL SO SD SS SZ TZ TD TG TN ZM ZW BZ CR GT HN NI PA SV CA US MX AR BO BR CL CO EC GY PY PE SR UY VE AF SA AM AZ BH BD BT MM BN KH CN KP KR AE GE IN ID IQ IR IL JP JO KZ KG KW LA LB MY MV MN NP OM UZ PK PS PH QA SG LK SY TJ TW TH TL TM TR VN YE AG BS BB CU DM GD HT JM DO KN VC LC TT AL DE AD AT BE BY BA BG CY VA HR DK ES EE FI FR GR HU IE IS IT LV LI LT LU MK MT MD MC ME NO NL PL PT RO GB RU SM RS SK SI SE CH CZ UA AU FJ MH SB KI FM NR NZ PW PG WS TO TV VU';
const CODE_LIST = CODES.split(' ');
const BASE = 24;
const STEP = 40;
const PER_G = 6;
const PER_R = 36;
const MIN_PIXELS = 24;
const CACHE_LIMIT = 12;
const PAD = 2;
const COMPONENT_SHARE = 0.02;
const MAX_COMPONENTS = 6;
const TOLERANCES = [8, 18, 28];

const PALETTE = new Map();
CODE_LIST.forEach((code, index) => {
  PALETTE.set(code, [
    BASE + STEP * Math.floor(index / PER_R),
    BASE + STEP * (Math.floor(index / PER_G) % PER_G),
    BASE + STEP * (index % PER_G),
  ]);
});

const CSS = `
.m11-panel{position:absolute;left:10px;bottom:10px;z-index:12;width:min(268px,48vw);
  box-sizing:border-box;padding:8px 10px;border-radius:10px;color:#f5e9d0;
  background:rgba(8,11,18,.9);border:1px solid rgba(230,185,111,.35);
  box-shadow:0 6px 20px rgba(0,0,0,.45);font:12px/1.45 system-ui,sans-serif}
.m11-toggle{display:block;width:100%;min-height:36px;min-width:36px;padding:6px 8px;
  border:1px solid rgba(230,185,111,.45);border-radius:6px;background:transparent;
  color:inherit;font:inherit;text-align:left;cursor:pointer}
.m11-toggle:hover{background:rgba(230,185,111,.12)}
.m11-toggle:focus-visible,.m11-tolerance button:focus-visible,.m11-preview:focus-visible{
  outline:2px solid #e6b96f;outline-offset:2px}
.m11-status{margin:6px 0 0;min-height:2.9em;color:#e6d3ad;overflow-wrap:anywhere}
.m11-body{margin-top:6px}
.m11-body[hidden]{display:none}
.m11-preview{display:block;width:100%;height:auto;max-height:96px;object-fit:contain;
  border:1px solid rgba(230,185,111,.25);border-radius:6px;background:rgba(0,0,0,.35)}
.m11-tol-label{margin:6px 0 2px;color:#cbb68d}
.m11-tolerance{display:flex;gap:6px}
.m11-tolerance button{flex:1;min-height:36px;min-width:36px;padding:4px;
  border:1px solid rgba(230,185,111,.35);border-radius:6px;background:transparent;
  color:inherit;font:inherit;cursor:pointer}
.m11-tolerance button[aria-checked="true"]{background:rgba(230,185,111,.22);
  border-color:#e6b96f;color:#fff}
@media (prefers-reduced-motion:reduce){.m11-panel *{transition:none}}
`;

let ctxRef = null;
let tolerance = 18;
let pickData = null;
let pickWidth = 0;
let pickHeight = 0;
let pickPromise = null;
let pickState = 'idle';
let scratch = null;
const cache = new Map();

let panelRef = null;
let statusNode = null;
let previewNode = null;
let toggleNode = null;
let groupNode = null;
let bodyNode = null;
let currentCode = null;
let currentStats = null;
let hoverSeq = 0;
let revealSeq = 0;
let frameQueued = false;
let announced = '';

function el(tag, className, text) {
  const node = ctxRef && typeof ctxRef.el === 'function'
    ? ctxRef.el(tag, className, text)
    : document.createElement(tag);
  if (!ctxRef || typeof ctxRef.el !== 'function') {
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
  }
  return node;
}

function countryName(code) {
  const list = ctxRef && Array.isArray(ctxRef.countries) ? ctxRef.countries : [];
  const found = list.find((item) => item && item.code === code);
  return found ? found.name : code;
}

function rgbFor(code) {
  const value = PALETTE.get(code);
  return value ? value.slice() : null;
}

/* M11-07 : la texture source est decodee une seule fois, l'etat d'echec est
 * conserve, aucun rechargement n'est rejoue sur un survol suivant. */
function loadPick() {
  if (pickData) {
    pickState = 'ready';
    return Promise.resolve(pickData);
  }
  if (pickPromise) return pickPromise;
  pickState = 'loading';
  pickPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 2048;
      canvas.height = image.naturalHeight || 1024;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      pickData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      pickWidth = canvas.width;
      pickHeight = canvas.height;
      const count = pickWidth * pickHeight;
      scratch = { seen: new Uint8Array(count), stack: new Uint32Array(count) };
      pickState = 'ready';
      resolve(pickData);
    };
    image.onerror = () => {
      pickState = 'error';
      reject(new Error('Texture de picking indisponible'));
    };
    image.src = PICK_URL;
  });
  return pickPromise;
}

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cachePut(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

/* M11-02 : la palette est une grille 6x6x6 ; l'arrondi sur chaque canal donne
 * la couleur la plus proche en O(1). Les 20 points de grille sans code ne
 * correspondent a aucun pays et ne sont donc jamais acceptes. */
function nearestIndex(r, g, b) {
  const ir = Math.min(5, Math.max(0, Math.round((r - BASE) / STEP)));
  const ig = Math.min(5, Math.max(0, Math.round((g - BASE) / STEP)));
  const ib = Math.min(5, Math.max(0, Math.round((b - BASE) / STEP)));
  const index = ir * PER_R + ig * PER_G + ib;
  return CODE_LIST[index] ? index : -1;
}

/* M11-05 : une seule passe 4-connexe, tableaux de travail reutilises. */
function components(alpha, width, height) {
  const seen = scratch.seen;
  const stack = scratch.stack;
  seen.fill(0);
  const list = [];
  const total = alpha.length;
  for (let id = 0; id < total; id += 1) {
    if (seen[id] || alpha[id] === 0) continue;
    let count = 0;
    let minx = width;
    let miny = height;
    let maxx = -1;
    let maxy = -1;
    let sp = 0;
    stack[sp] = id;
    sp += 1;
    seen[id] = 1;
    while (sp > 0) {
      sp -= 1;
      const q = stack[sp];
      const qy = Math.floor(q / width);
      const qx = q - qy * width;
      count += 1;
      if (qx < minx) minx = qx;
      if (qx > maxx) maxx = qx;
      if (qy < miny) miny = qy;
      if (qy > maxy) maxy = qy;
      if (qx > 0) {
        const k = q - 1;
        if (!seen[k] && alpha[k] > 0) { seen[k] = 1; stack[sp] = k; sp += 1; }
      }
      if (qx < width - 1) {
        const k = q + 1;
        if (!seen[k] && alpha[k] > 0) { seen[k] = 1; stack[sp] = k; sp += 1; }
      }
      if (qy > 0) {
        const k = q - width;
        if (!seen[k] && alpha[k] > 0) { seen[k] = 1; stack[sp] = k; sp += 1; }
      }
      if (qy < height - 1) {
        const k = q + width;
        if (!seen[k] && alpha[k] > 0) { seen[k] = 1; stack[sp] = k; sp += 1; }
      }
    }
    list.push({ count, minx, miny, maxx, maxy });
  }
  list.sort((a, b) => b.count - a.count);
  return list;
}

/* M11-03 : flou separable 3x3, noyau [1,2,1]/4, rayon d'un pixel. */
function blurMask(source, width, height) {
  const tmp = new Uint8Array(source.length);
  const out = new Uint8Array(source.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const left = source[row + Math.max(0, x - 1)];
      const center = source[row + x];
      const right = source[row + Math.min(width - 1, x + 1)];
      tmp[row + x] = (left + 2 * center + right) >> 2;
    }
  }
  for (let y = 0; y < height; y += 1) {
    const up = Math.max(0, y - 1) * width;
    const mid = y * width;
    const down = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x += 1) {
      const value = (tmp[up + x] + 2 * tmp[mid + x] + tmp[down + x]) >> 2;
      out[mid + x] = source[mid + x] === 255 ? 255 : Math.min(value, 220);
    }
  }
  return out;
}

/* M11-06 : pastille radiale pour les pays dont le masque est vide. */
function disc(size) {
  const out = new Uint8Array(size * size);
  const center = (size - 1) / 2;
  const radius = size / 2 - 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - center, y - center);
      out[y * size + x] = d >= radius ? 0 : Math.max(1, Math.round(255 * (1 - d / radius)));
    }
  }
  return out;
}

function buildMask(code, rgb, tol) {
  const width = pickWidth;
  const height = pickHeight;
  const total = width * height;
  const alpha = new Uint8Array(total);
  const core = Math.max(2, Math.round(tol * 0.45));
  const core2 = core * core;
  const limit = tol * tol;
  let nearMiss = 0;
  for (let i = 0, p = 0; i < total; i += 1, p += 4) {
    const sourceAlpha = pickData[p + 3];
    if (sourceAlpha < 8) continue;
    const r = pickData[p];
    const g = pickData[p + 1];
    const b = pickData[p + 2];
    const dr = r - rgb[0];
    const dg = g - rgb[1];
    const db = b - rgb[2];
    /* M11-02 : la boîte ±tol est l'ancienne règle ; on la teste d'abord pour
     * que nearMiss mesure bien les pixels qu'elle attribuerait à tort, puis
     * on exige la couleur de palette la plus proche et la distance euclidienne.
     * Ordre inverse : le filtre euclidien éliminait tout nearMiss possible. */
    if (Math.abs(dr) > tol || Math.abs(dg) > tol || Math.abs(db) > tol) continue;
    const nearest = nearestIndex(r, g, b);
    if (CODE_LIST[nearest] !== code) {
      if (nearest >= 0) nearMiss += 1;
      continue;
    }
    const d2 = dr * dr + dg * dg + db * db;
    if (d2 > limit) continue;
    const coverage = d2 <= core2
      ? 255
      : Math.max(1, Math.round(255 * (1 - (Math.sqrt(d2) - core) / (tol - core))));
    const value = Math.round(coverage * (sourceAlpha / 255));
    alpha[i] = value > 255 ? 255 : value;
  }

  const parts = components(alpha, width, height);
  const main = parts.length ? parts[0].count : 0;
  const minArea = Math.max(MIN_PIXELS, Math.floor(main * COMPONENT_SHARE));
  const kept = parts.filter((part) => part.count >= minArea).slice(0, MAX_COMPONENTS);
  const tiny = main < MIN_PIXELS;
  let minx = width;
  let miny = height;
  let maxx = -1;
  let maxy = -1;
  let pixels = 0;
  for (const part of kept) {
    pixels += part.count;
    if (part.minx < minx) minx = part.minx;
    if (part.miny < miny) miny = part.miny;
    if (part.maxx > maxx) maxx = part.maxx;
    if (part.maxy > maxy) maxy = part.maxy;
  }

  let buffer;
  let cw;
  let ch;
  if (tiny || !kept.length) {
    cw = 28;
    ch = 28;
    buffer = disc(28);
    if (!kept.length) { minx = 0; miny = 0; maxx = 0; maxy = 0; }
  } else {
    const x0 = Math.max(0, minx - PAD);
    const y0 = Math.max(0, miny - PAD);
    const x1 = Math.min(width - 1, maxx + PAD);
    const y1 = Math.min(height - 1, maxy + PAD);
    cw = x1 - x0 + 1;
    ch = y1 - y0 + 1;
    const cropped = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y += 1) {
      for (let x = 0; x < cw; x += 1) {
        cropped[y * cw + x] = alpha[(y0 + y) * width + (x0 + x)];
      }
    }
    buffer = blurMask(cropped, cw, ch);
  }

  return {
    buffer,
    width: cw,
    height: ch,
    stats: {
      code,
      tolerance: tol,
      pixels,
      components: parts.length,
      kept: kept.length,
      ignored: parts.length - kept.length,
      nearMiss,
      tiny,
      fallback: tiny || !kept.length,
      bbox: [minx, miny, maxx, maxy],
      crop: [cw, ch],
      cached: false,
    },
  };
}

function buildFor(code, tol) {
  const key = code + '|' + tol;
  const cached = cacheGet(key);
  if (cached) {
    cached.stats.cached = true;
    return Promise.resolve(cached);
  }
  const rgb = PALETTE.get(code);
  if (!rgb) return Promise.resolve(null);
  return loadPick().then(() => {
    if (!pickData) return null;
    const built = buildMask(code, rgb, tol);
    cachePut(key, built);
    return built;
  }).catch(() => {
    pickState = 'error';
    return null;
  });
}

function currentSeq(kind) {
  return kind === 'reveal' ? revealSeq : hoverSeq;
}

function updateRadios() {
  if (!groupNode) return;
  const buttons = groupNode.querySelectorAll('button[data-m11-tol]');
  buttons.forEach((button) => {
    button.setAttribute('aria-checked', String(Number(button.dataset.m11Tol) === tolerance));
  });
}

function setError() {
  pickState = 'error';
  if (statusNode) statusNode.textContent = 'Texture de picking indisponible : liste des pays utilisable.';
  if (ctxRef && ctxRef.host) ctxRef.host.dataset.m11 = 'error';
  if (announced !== 'error') {
    announced = 'error';
    if (ctxRef && typeof ctxRef.say === 'function') {
      ctxRef.say('Texture de picking indisponible : utilisez la liste des pays.');
    }
  }
}

function announce(mask) {
  const stats = mask.stats;
  const key = stats.fallback ? 'fallback' : 'ok';
  if (announced === key) return;
  announced = key;
  if (key === 'fallback' && ctxRef && typeof ctxRef.say === 'function') {
    ctxRef.say('Masque de repli pour ' + countryName(stats.code)
      + ' : contour trop petit pour etre decoupe.');
  }
}

function renderPreview(mask, code) {
  if (!previewNode) return;
  previewNode.width = mask.width;
  previewNode.height = mask.height;
  const context = previewNode.getContext('2d');
  if (!context) return;
  const image = context.createImageData(mask.width, mask.height);
  const rgb = PALETTE.get(code) || [230, 185, 111];
  for (let i = 0, p = 0; i < mask.buffer.length; i += 1, p += 4) {
    image.data[p] = rgb[0];
    image.data[p + 1] = rgb[1];
    image.data[p + 2] = rgb[2];
    image.data[p + 3] = mask.buffer[i];
  }
  context.putImageData(image, 0, 0);
  previewNode.setAttribute('aria-label', 'Masque de ' + countryName(code) + ' : '
    + mask.width + ' sur ' + mask.height + ' pixels, ' + mask.stats.pixels + ' pixels opaques');
}

function publish(mask) {
  const stats = mask.stats;
  currentStats = stats;
  const mode = stats.fallback ? 'contour de repli' : 'contour recadre';
  if (statusNode) {
    statusNode.textContent = countryName(stats.code) + ' · ' + stats.pixels + ' px · '
      + stats.kept + '/' + stats.components + ' composantes · '
      + stats.crop[0] + 'x' + stats.crop[1] + ' · tol ' + stats.tolerance
      + (stats.tiny ? ' · pays minuscule' : '')
      + ' · ' + (stats.cached ? 'cache' : 'calcul') + ' · ' + mode;
  }
  if (ctxRef && ctxRef.host) {
    ctxRef.host.dataset.m11 = 'ready';
    ctxRef.host.dataset.m11Code = stats.code;
    ctxRef.host.dataset.m11Tiny = String(stats.tiny);
    ctxRef.host.dataset.m11Cache = String(cache.size);
  }
  renderPreview(mask, stats.code);
  announce(mask);
}

/* M11-08 : deux sequences independantes et une seule construction par frame. */
function schedule(kind) {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    frameQueued = false;
    const seq = currentSeq(kind);
    const code = currentCode;
    if (!code) return;
    buildFor(code, tolerance).then((mask) => {
      if (seq !== currentSeq(kind)) return;
      if (!mask) {
        if (statusNode) statusNode.textContent = 'Aucune couleur de picking pour ' + code + '.';
        return;
      }
      publish(mask);
    }).catch(setError);
  });
}

function setTolerance(next) {
  if (TOLERANCES.indexOf(next) < 0) return;
  tolerance = next;
  updateRadios();
  hoverSeq += 1;
  revealSeq += 1;
  if (currentCode) schedule('hover');
}

function bindPanel() {
  if (!panelRef || panelRef.dataset.m11Bound === '1') return;
  panelRef.dataset.m11Bound = '1';
  toggleNode.addEventListener('click', () => {
    const open = toggleNode.getAttribute('aria-expanded') !== 'true';
    toggleNode.setAttribute('aria-expanded', String(open));
    bodyNode.hidden = !open;
  });
  groupNode.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-m11-tol]');
    if (button) setTolerance(Number(button.dataset.m11Tol));
  });
  groupNode.addEventListener('keydown', (event) => {
    const index = TOLERANCES.indexOf(tolerance);
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (index + 1) % TOLERANCES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (index - 1 + TOLERANCES.length) % TOLERANCES.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = TOLERANCES.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    setTolerance(TOLERANCES[next]);
    const button = groupNode.querySelector('button[data-m11-tol="' + TOLERANCES[next] + '"]');
    if (button) button.focus();
  });
}

function ensurePanel(scene) {
  if (typeof getComputedStyle === 'function' && getComputedStyle(scene).position === 'static') {
    scene.style.position = 'relative';
  }
  panelRef = document.getElementById(PANEL_ID);
  if (panelRef) {
    if (panelRef.parentElement !== scene) scene.appendChild(panelRef);
    statusNode = document.getElementById(STATUS_ID);
    previewNode = document.getElementById(PREVIEW_ID);
    toggleNode = document.getElementById(TOGGLE_ID);
    groupNode = document.getElementById(GROUP_ID);
    bodyNode = document.getElementById(BODY_ID);
  } else {
    panelRef = el('section', 'm11-panel');
    panelRef.id = PANEL_ID;
    panelRef.setAttribute('aria-label', 'Laboratoire du masque de decoupe (M11)');

    toggleNode = el('button', 'm11-toggle', 'Masque · M11');
    toggleNode.id = TOGGLE_ID;
    toggleNode.type = 'button';
    toggleNode.setAttribute('aria-expanded', 'false');
    toggleNode.setAttribute('aria-controls', BODY_ID);

    statusNode = el('p', 'm11-status', 'Masque · en attente d’un pays');
    statusNode.id = STATUS_ID;
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');

    bodyNode = el('div', 'm11-body');
    bodyNode.id = BODY_ID;
    bodyNode.hidden = true;

    previewNode = el('canvas', 'm11-preview');
    previewNode.id = PREVIEW_ID;
    previewNode.setAttribute('role', 'img');
    previewNode.setAttribute('aria-describedby', STATUS_ID);
    previewNode.tabIndex = 0;

    const label = el('p', 'm11-tol-label', 'Tolérance du masque');
    groupNode = el('div', 'm11-tolerance');
    groupNode.id = GROUP_ID;
    groupNode.setAttribute('role', 'radiogroup');
    groupNode.setAttribute('aria-label', 'Tolérance du masque');
    TOLERANCES.forEach((value) => {
      const button = el('button', '', String(value));
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.dataset.m11Tol = String(value);
      groupNode.appendChild(button);
    });

    bodyNode.append(previewNode, label, groupNode);
    panelRef.append(toggleNode, statusNode, bodyNode);
    scene.appendChild(panelRef);
    bindPanel();
  }
  updateRadios();
}

const API = {
  paletteSize: CODE_LIST.length,
  rgbFor,
  state: () => ({
    tolerance,
    pick: pickState,
    cache: cache.size,
    code: currentCode,
    seq: hoverSeq + ':' + revealSeq,
    stats: currentStats ? { ...currentStats } : null,
  }),
  setTolerance,
  debug: (code, tol) => buildFor(code, tol || tolerance).then((mask) => {
    if (!mask) return null;
    return { ...mask.stats };
  }),
};

register('M11', (ctx) => {
  ctxRef = ctx;
  ctx.css(STYLE_ID, CSS);
  const scene = ctx.scene || ctx.stage;
  if (!scene) return;
  ensurePanel(scene);

  /* Le registre vide ses trois tableaux à chaque rendu (registry.js) : on
   * réarme exactement un onHover/onLeave/onReady par appel de register. Une
   * garde module perdrait le survol dès le second rendu de la coque. */
  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      const data = payload || {};
      const code = data.code || (data.country && data.country.code) || null;
      hoverSeq += 1;
      currentCode = code;
      if (ctxRef && ctxRef.host) ctxRef.host.dataset.m11Code = code || '';
      if (!code) {
        if (statusNode) statusNode.textContent = 'Masque · aucun pays survolé';
        return;
      }
      schedule('hover');
    });
  }
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      hoverSeq += 1;
      revealSeq += 1;
      currentCode = null;
      if (ctxRef && ctxRef.host) ctxRef.host.dataset.m11Code = '';
      if (statusNode) statusNode.textContent = 'Masque · aucun pays survolé';
    });
  }
  if (typeof ctx.onReady === 'function') {
    ctx.onReady(() => {
      if (ctxRef && ctxRef.host && !ctxRef.host.dataset.m11) {
        ctxRef.host.dataset.m11 = pickState === 'error' ? 'error' : 'idle';
      }
    });
  }

  if (!window.VECTEMPOREL_M11) window.VECTEMPOREL_M11 = API;
  if (ctx.host && !ctx.host.dataset.m11) {
    ctx.host.dataset.m11 = pickState === 'error' ? 'error' : 'idle';
  }
});


