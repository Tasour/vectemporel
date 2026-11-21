/* Drapeau dans le contour du pays + transition de zoom vers la vue suivante.
 * Tout est local : la découpe vient de `public/globe-pick.png` (palette figée),
 * le drapeau de `public/flags/<code>.svg`. Aucun réseau, aucun aléa.
 *
 * Contrat : attachReveal(scene) -> { hover(country), leave(), reveal(country, done) }
 * - hover : affiche le drapeau découpé dans le contour du pays ;
 * - reveal : zoome dans ce contour pendant que la vue suivante apparaît,
 *   puis appelle `done()` immédiatement (l'état change sans attendre l'animation).
 */

const PALETTE = Object.freeze({
  FR: [184, 64, 104],
  GB: [184, 184, 184],
  US: [64, 184, 104],
  DE: [144, 224, 24],
  IT: [184, 104, 64],
  ES: [184, 24, 224],
  CN: [104, 104, 104],
  IN: [104, 144, 64],
  JP: [104, 184, 24],
  EG: [24, 104, 64],
});
const TOLERANCE = 18;
const PADDING = 3;
const MIN_PIXELS = 8;
const MAX_MASKS = 16;
const PICK_URL = './public/globe-pick.png';
const STYLE_ID = 'globe-reveal-css';
const OVERLAY_ID = 'globe-reveal';

let pickImage = null;
let pickPromise = null;
const masks = new Map();
let overlay = null;
let anchor = null;
let anchorNode = null;
let figure = null;
let flagLayer = null;
let pageLayer = null;
let caption = null;
let hoverToken = 0;
let activeCountry = null;
let activeAnimation = null;
let revealing = false;

function resetFigure() {
  if (activeAnimation) {
    try { activeAnimation.cancel(); } catch { /* déjà terminée */ }
    activeAnimation = null;
  }
  if (figure) {
    figure.style.transform = '';
    figure.style.opacity = '';
  }
}

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function injectCSS() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  #globe-reveal{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:60;
    opacity:0;transition:opacity .22s ease;overflow:hidden}
  #globe-reveal.is-visible{opacity:1}
  /* Ancre unique : le point d'accroche suit la scène du globe, la figure reste
     libre de s'animer au clic sans écraser cette translation. */
  #globe-reveal .gr-anchor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    display:grid;place-items:center;width:max-content;height:max-content}
  #globe-reveal.is-anchored .gr-anchor{left:var(--gr-x,50%);top:var(--gr-y,50%)}
  #globe-reveal .gr-figure{position:relative;width:min(40vw,320px);aspect-ratio:2/1;
    filter:drop-shadow(0 12px 32px rgba(0,0,0,.55));will-change:transform,opacity}
  #globe-reveal .gr-flag{position:absolute;inset:0;background-size:cover;background-position:center}
  #globe-reveal .gr-page{position:absolute;inset:0;display:flex;flex-direction:column;
    justify-content:center;align-items:center;gap:6px;text-align:center;padding:8%;
    background:rgba(8,11,18,.72);color:#f5e9d0;opacity:0;transition:opacity .35s ease;
    font-family:inherit}
  #globe-reveal.is-revealing .gr-page{opacity:1}
  #globe-reveal .gr-page strong{font-size:clamp(16px,3vw,28px);letter-spacing:.02em}
  #globe-reveal .gr-page span{font-size:clamp(11px,1.6vw,14px);opacity:.85}
  #globe-reveal .gr-caption{position:absolute;bottom:-26px;left:50%;transform:translateX(-50%);
    white-space:nowrap;font-size:13px;letter-spacing:.06em;
    text-transform:uppercase;color:#f5e9d0;text-shadow:0 2px 8px #000}
  @media (max-width:700px){#globe-reveal .gr-figure{width:min(62vw,260px)}}
  @media (prefers-reduced-motion:reduce){#globe-reveal,#globe-reveal .gr-page{transition:none}}
  `;
  document.head.appendChild(style);
}

function loadPick() {
  if (pickPromise) return pickPromise;
  pickPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { pickImage = image; resolve(image); };
    image.onerror = () => { pickPromise = null; pickImage = null; reject(new Error('pick')); };
    image.src = PICK_URL;
  });
  return pickPromise;
}

/* Composante 4-connexe la plus étendue : les territoires d'outre-mer et les
 * résidus d'anti-aliasing étireraient sinon la boîte à tout le monde. */
function mainComponent(matches, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let best = null;
  for (let seed = 0; seed < matches.length; seed += 1) {
    if (!matches[seed] || seen[seed]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    seen[seed] = 1;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;
    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      area += 1;
      if (x > 0) { const n = p - 1; if (matches[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; } }
      if (x < width - 1) { const n = p + 1; if (matches[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; } }
      if (y > 0) { const n = p - width; if (matches[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; } }
      if (y < height - 1) { const n = p + width; if (matches[n] && !seen[n]) { seen[n] = 1; queue[tail++] = n; } }
    }
    if (!best || area > best.area) best = { minX, minY, maxX, maxY, area };
  }
  return best;
}

/* Construit un masque PNG recadré sur le pays : alpha opaque sur les pixels
 * retenus, transparent ailleurs. Le filtre s'applique à la texture locale
 * équirectangulaire ; la découpe est centrée dans la figure avec `contain`. */
async function maskFor(code) {
  if (masks.has(code)) {
    const cached = masks.get(code);
    masks.delete(code);
    masks.set(code, cached);
    return cached;
  }
  const rgb = PALETTE[code];
  if (!rgb) return null;
  let image;
  try {
    image = await loadPick();
  } catch {
    return null;
  }
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);
  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const matches = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    if (Math.abs(pixels[i] - rgb[0]) <= TOLERANCE
      && Math.abs(pixels[i + 1] - rgb[1]) <= TOLERANCE
      && Math.abs(pixels[i + 2] - rgb[2]) <= TOLERANCE) matches[p] = 1;
  }
  const best = mainComponent(matches, width, height);
  if (!best || best.area < MIN_PIXELS) return null;
  const x0 = Math.max(0, best.minX - PADDING);
  const y0 = Math.max(0, best.minY - PADDING);
  const x1 = Math.min(width - 1, best.maxX + PADDING);
  const y1 = Math.min(height - 1, best.maxY + PADDING);
  const cropW = x1 - x0 + 1;
  const cropH = y1 - y0 + 1;
  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const outCtx = out.getContext('2d');
  const mask = outCtx.createImageData(cropW, cropH);
  const target = mask.data;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!matches[y * width + x]) continue;
      const o = ((y - y0) * cropW + (x - x0)) * 4;
      target[o] = 255;
      target[o + 1] = 255;
      target[o + 2] = 255;
      target[o + 3] = 255;
    }
  }
  outCtx.putImageData(mask, 0, 0);
  const url = out.toDataURL('image/png');
  masks.delete(code);
  masks.set(code, url);
  while (masks.size > MAX_MASKS) masks.delete(masks.keys().next().value);
  return url;
}

function ensureOverlay(scene) {
  injectCSS();
  if (scene) anchorNode = scene;
  if (overlay && overlay.isConnected) return overlay;
  overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = el('div', 'globe-reveal');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-hidden', 'true');
    anchor = el('div', 'gr-anchor');
    figure = el('div', 'gr-figure');
    flagLayer = el('div', 'gr-flag');
    pageLayer = el('div', 'gr-page');
    caption = el('span', 'gr-caption');
    figure.append(flagLayer, pageLayer);
    anchor.append(figure, caption);
    overlay.append(anchor);
    /* Fixé au body : la transition survit au re-render de la coque quand la
       vue suivante remplace le globe. */
    document.body.appendChild(overlay);
  } else {
    anchor = overlay.querySelector('.gr-anchor');
    figure = overlay.querySelector('.gr-figure');
    flagLayer = overlay.querySelector('.gr-flag');
    pageLayer = overlay.querySelector('.gr-page');
    caption = overlay.querySelector('.gr-caption');
    if (!anchor) {
      anchor = el('div', 'gr-anchor');
      if (figure) anchor.appendChild(figure);
      if (caption) anchor.appendChild(caption);
      overlay.appendChild(anchor);
    }
    if (!figure) {
      figure = el('div', 'gr-figure');
      anchor.appendChild(figure);
    }
    if (!flagLayer) { flagLayer = el('div', 'gr-flag'); figure.prepend(flagLayer); }
    if (!pageLayer) { pageLayer = el('div', 'gr-page'); figure.appendChild(pageLayer); }
    if (!caption) { caption = el('span', 'gr-caption'); anchor.appendChild(caption); }
  }
  return overlay;
}

/* Accroche le drapeau au centre de la scène du globe. La translation reste sur
   l'ancre : l'animation de zoom au clic ne la écrase pas. */
function updateAnchor() {
  if (!overlay || !anchor) return;
  /* Si la scène vient d'être remplacée par le re-render du clic, on conserve
     la dernière position connue pour que le zoom reste accroché au globe. */
  if (!anchorNode || !anchorNode.isConnected) return;
  const rect = anchorNode.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  overlay.style.setProperty('--gr-x', `${Math.round(rect.left + rect.width / 2)}px`);
  overlay.style.setProperty('--gr-y', `${Math.round(rect.top + rect.height / 2)}px`);
  overlay.classList.add('is-anchored');
}

function applyMask(url) {
  if (!figure) return;
  const value = url ? `url("${url}")` : 'none';
  figure.style.webkitMaskImage = value;
  figure.style.maskImage = value;
  figure.style.webkitMaskSize = 'contain';
  figure.style.maskSize = 'contain';
  figure.style.webkitMaskRepeat = 'no-repeat';
  figure.style.maskRepeat = 'no-repeat';
  figure.style.webkitMaskPosition = 'center';
  figure.style.maskPosition = 'center';
}

function show(country, phase) {
  if (!overlay || !country) return;
  resetFigure();
  updateAnchor();
  flagLayer.style.backgroundImage = `url("./public/flags/${country.code}.svg")`;
  caption.textContent = country.name;
  pageLayer.replaceChildren();
  if (phase === 'reveal') {
    const next = el('strong', '', 'Chronologie');
    const detail = el('span', '', `${country.name} · ${country.eras.length} ères · ${country.events.length} repères`);
    pageLayer.append(next, detail);
  }
  overlay.classList.add('is-visible');
  overlay.classList.toggle('is-revealing', phase === 'reveal');
}

export function attachReveal(scene) {
  ensureOverlay(scene);

  function hover(country) {
    /* Le drapeau du survol est dessiné par le shader du globe, directement
       dans le contour du pays. L'overlay DOM n'est plus utilisé qu'au clic
       pour la transition de zoom vers la vue suivante. */
    hoverToken += 1;
    activeCountry = country || null;
    overlay.classList.remove('is-visible');
  }

  function leave() {
    hoverToken += 1;
    activeCountry = null;
    overlay.classList.remove('is-visible');
  }

  function reveal(country, done) {
    if (typeof done === 'function') done();
    if (!country || !PALETTE[country.code] || reducedMotion()) return Promise.resolve();
    revealing = true;
    hoverToken += 1;
    maskFor(country.code).then((url) => {
      if (!url) { revealing = false; leave(); return; }
      applyMask(url);
      show(country, 'reveal');
      activeAnimation = figure.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(7)', opacity: 0 },
        ],
        { duration: 720, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
      );
      activeAnimation.finished.then(() => { revealing = false; leave(); }).catch(() => { revealing = false; leave(); });
    }).catch(() => { revealing = false; leave(); });
    return Promise.resolve();
  }

  return {
    hover,
    leave,
    reveal,
    current: () => activeCountry,
    isRevealing: () => revealing,
  };
}
