import { register } from './registry.js';

/*
 * Lentille E099 — échelles de couleurs continues (palettes perceptuelles)
 * pour les grandeurs cartographiques (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E099-01 … E099-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E099', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e099`.
 * Tous les identifiants DOM sont préfixés `geography-e099-*`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Thème : comment coder une grandeur cartographique par une couleur sans
 * mentir ? La lentille greffe à la vue GEOGRAPHIE un panneau qui enseigne une
 * chaîne déterministe complète : interpolation dans l'espace perceptuel Oklab
 * (E099-03), luminance et ordre monotone (E099-04), palettes séquentielle,
 * divergente et piège arc-en-ciel (E099-05), distance perceptuelle ΔE et
 * écart juste perceptible (E099-06), redondance en niveaux de gris pour le
 * daltonisme (E099-07), barre de couleurs légendée et tableau d'échantillons
 * (E099-08), contrôles accessibles et équivalent clavier (E099-09), enfin une
 * boucle rAF unique et une limite falsifiable en cinq temps (E099-10). Toutes
 * les grandeurs sont recalculées depuis des formules et des constantes choisies
 * — aucune mesure de terrain n'est inventée, aucun tirage aléatoire.
 */

const CSS_ID = 'geography-e099';
const SECTION_ID = 'geography-e099-section';
const BAR_W = 900;                  // largeur du cadre du laboratoire, unités
const BAR_H = 250;                  // hauteur du cadre du laboratoire, unités
const V_MIN = 0;                    // borne basse de la grandeur schématique
const V_MAX = 1000;                 // borne haute de la grandeur schématique
const N_SAMPLES = 100;              // échantillons pour les intégrations
const JND = 0.02;                   // écart juste perceptible : ~0,02 en ΔE Oklab
const SWEEP_MS = 8000;              // période du balayage continu
const WCAG_AA = 4.5;                // seuil de contraste AA (référence d'accessibilité)
const NARROW = '\u202f';            // espace insécable fine (typographie française)
const MINUS = '\u2212';             // signe moins typographique

/* E099-03 / E099-05 — palettes définies par des points d'ancrage en Oklab
   (L = clarté perceptuelle, a/b = axes de couleur). L'interpolation est
   linéaire par morceaux entre ancrages : le résultat est déterministe et
   l'écart perceptuel entre ancrages est directement lisible. Les valeurs sont
   choisies, jamais tirées au hasard. */
const PALETTES = [
  {
    key: 'sequentielle',
    nom: 'Séquentielle — bleu perceptuel',
    nature: 'sequentielle',
    stops: [
      { t: 0,    L: 0.28, a: -0.03, b: -0.12 },
      { t: 0.5,  L: 0.58, a: -0.05, b: -0.07 },
      { t: 1,    L: 0.90, a: -0.02, b: 0.02 },
    ],
  },
  {
    key: 'divergente',
    nom: 'Divergente — froid / neutre / chaud',
    nature: 'divergente',
    stops: [
      { t: 0,   L: 0.45, a: -0.06, b: -0.14 },
      { t: 0.5, L: 0.88, a: 0.00,  b: 0.01 },
      { t: 1,   L: 0.52, a: 0.09,  b: 0.11 },
    ],
  },
  {
    key: 'arcenciel',
    nom: 'Arc-en-ciel — piège classique',
    nature: 'non perceptuelle',
    stops: [
      { t: 0,    L: 0.30, a: 0.00,  b: 0.00 },
      { t: 0.2,  L: 0.62, a: -0.10, b: -0.10 },
      { t: 0.4,  L: 0.52, a: -0.02, b: -0.18 },
      { t: 0.6,  L: 0.66, a: 0.10,  b: 0.02 },
      { t: 0.8,  L: 0.72, a: 0.05,  b: 0.16 },
      { t: 1,    L: 0.88, a: 0.00,  b: 0.02 },
    ],
  },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selectedPalette = 0;   // PALETTES[0] : séquentielle, par défaut
let selectedMode = 0;      // 0 = continu, 1 = discrète (choix unique)
let classes = 8;           // nombre de classes en mode discrété
let value = 500;           // grandeur schématique courante
let showGray = false;      // bascule indépendante : vue en niveaux de gris
let playing = false;
let renders = 0;

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v) => Math.max(0, Math.min(1, finite(v) ? v : 0));

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(v, digits) {
  if (!finite(v)) return '\u2014';
  const fixed = Math.abs(v).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${v < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* ------------------------------------------------------------------ */
/* E099-03 — espace perceptuel Oklab : conversions déterministes        */
/* ------------------------------------------------------------------ */

function srgbToLinear(c) {
  const x = clamp01(c);
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  const x = clamp01(c);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055;
}

/* sRGB (0..1) → Oklab (Björn Ottosson), constants publiques. */
function srgbToOklab(rgb) {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/* Oklab → RVB linéaire, puis sRGB encodé et borné. */
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

/* Interpolation perceptuelle : on interpole L, a, b entre deux ancrages. */
function oklabAt(palette, t) {
  const u = clamp01(t);
  const stops = palette.stops;
  let i = 0;
  while (i < stops.length - 2 && u > stops[i + 1].t) i += 1;
  const s0 = stops[i];
  const s1 = stops[i + 1] || s0;
  const span = s1.t - s0.t;
  const k = span > 0 ? clamp01((u - s0.t) / span) : 0;
  return {
    L: s0.L + (s1.L - s0.L) * k,
    a: s0.a + (s1.a - s0.a) * k,
    b: s0.b + (s1.b - s0.b) * k,
  };
}

function rgbAt(palette, t) {
  const lab = oklabAt(palette, t);
  return oklabToRgb(lab.L, lab.a, lab.b);
}

function cssRgb(rgb) {
  const c = rgb.map((x) => Math.round(clamp01(x) * 255));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/* E099-06 — distance perceptuelle euclidienne en Oklab (ΔE_ok). */
function deltaEOk(labA, labB) {
  return Math.sqrt((labA.L - labB.L) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2);
}

/* E099-04 — luminance relative WCAG d'un RVB encodé (0..1). */
function relLuminance(rgb) {
  return 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
}

function contrastRatio(rgbA, rgbB) {
  const a = relLuminance(rgbA);
  const b = relLuminance(rgbB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* E099-04 — longueur du chemin perceptuel : somme des ΔE sur N échantillons.
   Divisée par le JND, elle donne le nombre de classes réellement
   distinguables le long de la rampe. */
function pathLength(palette) {
  let total = 0;
  let previous = oklabAt(palette, 0);
  for (let i = 1; i <= N_SAMPLES; i += 1) {
    const lab = oklabAt(palette, i / N_SAMPLES);
    total += deltaEOk(previous, lab);
    previous = lab;
  }
  return total;
}

function distinguishableClasses(palette) {
  return pathLength(palette) / JND;
}

/* E099-04 / E099-05 — monotonie de la clarté L. On compte les changements de
   signe des pas successifs (tolérance pour ignorer les oscillations numériques).
   Une palette séquentielle doit donner 0 violation ; l'arc-en-ciel en donne. */
function monotonicity(palette) {
  let violations = 0;
  let previous = oklabAt(palette, 0).L;
  let previousSign = 0;
  let minStep = Infinity;
  let maxStep = -Infinity;
  const tol = 1e-6;
  for (let i = 1; i <= N_SAMPLES; i += 1) {
    const L = oklabAt(palette, i / N_SAMPLES).L;
    const d = L - previous;
    minStep = Math.min(minStep, d);
    maxStep = Math.max(maxStep, d);
    const sign = d > tol ? 1 : (d < -tol ? -1 : 0);
    if (sign !== 0) {
      if (previousSign !== 0 && sign !== previousSign) violations += 1;
      previousSign = sign;
    }
    previous = L;
  }
  return { violations, minStep, maxStep };
}

/* E099-07 — simulation de daltonisme « prudent » : on conserve la clarté
   perceptuelle L et on annule a/b. Ce n'est pas une matrice de Brettel, mais
   elle montre la propriété qui compte : si l'information survit en niveaux de
   gris, elle ne repose pas sur la seule teinte. */
function grayAt(palette, t) {
  const lab = oklabAt(palette, t);
  return oklabToRgb(lab.L, 0, 0);
}

/* E099-09 — discrétisation : on ramène la valeur au centre de sa classe. */
function discretizeT(t, n) {
  const count = Math.max(2, Math.min(24, Math.floor(n)));
  const index = Math.min(count - 1, Math.floor(clamp01(t) * count));
  return (index + 0.5) / count;
}

function valueToT(v) { return clamp01((v - V_MIN) / (V_MAX - V_MIN)); }
function tToValue(t) { return V_MIN + clamp01(t) * (V_MAX - V_MIN); }

/* ------------------------------------------------------------------ */
/* E099-02 — feuille de style unique, identifiants préfixés              */
/* ------------------------------------------------------------------ */
const RULES = `
.geo-layout[data-geography-e099="on"] .geography-e099-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e099="on"] .geography-e099-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e099="on"] .geography-e099-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e099="on"] .geography-e099-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e099="on"] .geography-e099-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e099="on"] .geography-e099-value { color: var(--ink); }
.geo-layout[data-geography-e099="on"] .geography-e099-list { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e099="on"] .geography-e099-list li { margin: 0 0 4px; }
.geo-layout[data-geography-e099="on"] .geography-e099-group {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e099="on"] .geography-e099-group.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.geo-layout[data-geography-e099="on"] .geography-e099-choice {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e099="on"] .geography-e099-choice:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e099="on"] .geography-e099-choice[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e099="on"] .geography-e099-range {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0;
}
.geo-layout[data-geography-e099="on"] .geography-e099-range label { flex: 0 0 auto; }
.geo-layout[data-geography-e099="on"] .geography-e099-range input[type="range"] {
  flex: 1 1 160px; min-height: 24px; accent-color: var(--gold); cursor: pointer;
}
.geo-layout[data-geography-e099="on"] .geography-e099-range output {
  color: var(--gold-bright); font-variant-numeric: tabular-nums; min-width: 92px;
}
.geo-layout[data-geography-e099="on"] .geography-e099-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e099="on"] .geography-e099-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e099="on"] .geography-e099-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 250;
  margin: 0 auto; touch-action: none; cursor: crosshair;
}
.geo-layout[data-geography-e099="on"] .geography-e099-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e099="on"] .geography-e099-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e099="on"] .geography-e099-toggle,
.geo-layout[data-geography-e099="on"] .geography-e099-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e099="on"] .geography-e099-toggle:hover,
.geo-layout[data-geography-e099="on"] .geography-e099-play:hover { border-color: var(--gold); }
.geo-layout[data-geography-e099="on"] .geography-e099-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e099="on"] .geography-e099-choice:focus-visible,
.geo-layout[data-geography-e099="on"] .geography-e099-canvas:focus-visible,
.geo-layout[data-geography-e099="on"] .geography-e099-toggle:focus-visible,
.geo-layout[data-geography-e099="on"] .geography-e099-play:focus-visible,
.geo-layout[data-geography-e099="on"] .geography-e099-range input:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e099="on"] .geography-e099-table {
  width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px;
}
.geo-layout[data-geography-e099="on"] .geography-e099-table caption {
  caption-side: top; text-align: left; color: var(--gold-bright); font-size: 11px; margin-bottom: 4px;
}
.geo-layout[data-geography-e099="on"] .geography-e099-table th,
.geo-layout[data-geography-e099="on"] .geography-e099-table td {
  border: 1px solid var(--line); padding: 4px 6px; text-align: left; font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e099="on"] .geography-e099-table thead th { color: var(--gold-bright); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e099="on"] .geography-e099-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e099="on"] .geography-e099-group,
  .geo-layout[data-geography-e099="on"] .geography-e099-group.two { grid-template-columns: 1fr; }
  .geo-layout[data-geography-e099="on"] .geography-e099-canvas { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e099="on"] .geography-e099-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/* E099-03 / E099-04 / E099-05 / E099-07 / E099-08 — laboratoire canvas */
/* Un seul canvas, DPR plafonné à 2. Le canevas n'est qu'une illustration :
   couleurs, valeurs, luminance et classes sont aussi écrites en texte.     */
function drawScene(canvas, scene) {
  if (!canvas || typeof canvas.getContext !== 'function' || !scene) return;
  const painter = canvas.getContext('2d');
  if (!painter) return;

  const cssW = Math.max(160, Math.min(320, canvas.clientWidth || 320));
  const cssH = cssW * (BAR_H / BAR_W);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(canvas) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const v = theme ? theme.getPropertyValue(name).trim() : '';
    return v || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f0d18c');
  const muted = color('--muted', '#9aa0a8');

  const sx = cssW / BAR_W;
  const sy = cssH / BAR_H;
  const X0 = 20, X1 = 880;         // bornes horizontales de la rampe
  const Y0 = 30, Y1 = 110;         // rampe principale
  const G0 = 160, G1 = 195;        // bande en niveaux de gris (redondance)

  const palette = PALETTES[scene.paletteIndex];
  const tOf = (x) => clamp01((x - X0) / (X1 - X0));

  /* Cadre. */
  painter.lineWidth = 1;
  painter.strokeStyle = muted;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E099-03 / E099-05 — rampe perceptuelle, échantillonnée sans aléa. En mode
     discrète, chaque classe est colorée par son centre : les frontières sont
     des traits visibles, pas une information portée par la couleur seule. */
  const segments = Math.max(120, Math.round(X1 - X0));
  for (let i = 0; i < segments; i += 1) {
    const a = X0 + (i / segments) * (X1 - X0);
    const b = X0 + ((i + 1) / segments) * (X1 - X0);
    const tMid = tOf((a + b) / 2);
    const tColor = scene.mode === 1 ? discretizeT(tMid, scene.classes) : tMid;
    const rgb = showGray ? grayAt(palette, tColor) : rgbAt(palette, tColor);
    painter.fillStyle = cssRgb(rgb);
    painter.fillRect(a * sx, Y0 * sy, (b - a) * sx + 1, (Y1 - Y0) * sy);
  }

  /* E099-07 — bande de luminance (niveaux de gris) toujours affichée : elle
     prouve que l'ordre des valeurs survit à la suppression de la teinte. */
  for (let i = 0; i < segments; i += 1) {
    const a = X0 + (i / segments) * (X1 - X0);
    const b = X0 + ((i + 1) / segments) * (X1 - X0);
    const tMid = tOf((a + b) / 2);
    const gray = grayAt(palette, scene.mode === 1 ? discretizeT(tMid, scene.classes) : tMid);
    painter.fillStyle = cssRgb(gray);
    painter.fillRect(a * sx, G0 * sy, (b - a) * sx + 1, (G1 - G0) * sy);
  }

  /* E099-08 — graduations chiffrées, régulières, avec valeurs en texte. */
  painter.strokeStyle = muted;
  painter.fillStyle = ink;
  painter.lineWidth = 1;
  painter.font = `${Math.max(8, Math.round(cssW * 0.03))}px sans-serif`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  ticks.forEach((t) => {
    const x = (X0 + t * (X1 - X0)) * sx;
    painter.beginPath();
    painter.moveTo(x, Y1 * sy);
    painter.lineTo(x, (Y1 + 8) * sy);
    painter.stroke();
    const label = `${num(tToValue(t), 0)}`;
    const w = painter.measureText(label).width;
    painter.fillText(label, x - w / 2, (Y1 + 20) * sy);
  });

  /* E099-08 — frontières de classes en mode discrète, distinctes par le trait. */
  if (scene.mode === 1) {
    painter.strokeStyle = ink;
    painter.lineWidth = 1;
    painter.setLineDash([2, 3]);
    for (let i = 1; i < scene.classes; i += 1) {
      const x = (X0 + (i / scene.classes) * (X1 - X0)) * sx;
      painter.beginPath();
      painter.moveTo(x, Y0 * sy);
      painter.lineTo(x, Y1 * sy);
      painter.stroke();
    }
    painter.setLineDash([]);
  }

  /* E099-09 — marqueur de la valeur courante : triangle + trait vertical,
     doublés par la valeur écrite dans la lecture et le paragraphe de valeur. */
  const shownT = scene.mode === 1 ? discretizeT(scene.valueT, scene.classes) : scene.valueT;
  const mx = (X0 + shownT * (X1 - X0)) * sx;
  painter.strokeStyle = bright;
  painter.fillStyle = bright;
  painter.lineWidth = 1.5;
  painter.beginPath();
  painter.moveTo(mx, (Y0 - 14) * sy);
  painter.lineTo(mx, (Y1 + 4) * sy);
  painter.stroke();
  painter.beginPath();
  painter.moveTo(mx, (Y0 - 16) * sy);
  painter.lineTo(mx - 6, (Y0 - 26) * sy);
  painter.lineTo(mx + 6, (Y0 - 26) * sy);
  painter.closePath();
  painter.fill();

  /* E099-07 — étiquette de la bande grise, redondance explicite. */
  painter.fillStyle = muted;
  painter.font = `${Math.max(7, Math.round(cssW * 0.026))}px sans-serif`;
  painter.fillText('Luminance (niveaux de gris) — même ordre, sans teinte', X0 * sx, (G0 - 6) * sy);
  painter.fillStyle = gold;
  painter.fillText('Rampe de couleur', X0 * sx, (Y0 - 30) * sy);
}

/* ------------------------------------------------------------------ */
/* E099-09 — région live unique : toute action est annoncée en toutes lettres */
function writeReadout(scene, cause) {
  if (!scene || !scene.readout) return;
  const palette = PALETTES[scene.paletteIndex];
  const shownT = scene.mode === 1 ? discretizeT(scene.valueT, scene.classes) : scene.valueT;
  const rgb = rgbAt(palette, shownT);
  const lab = oklabAt(palette, shownT);
  const dE = deltaEOk(oklabAt(palette, 0), lab);
  const cls = scene.mode === 1
    ? Math.min(scene.classes - 1, Math.floor(clamp01(scene.valueT) * scene.classes))
    : -1;
  const verbs = {
    balayage: 'Balayage en cours', clavier: 'Lecture au clavier', pointeur: 'Lecture au pointeur',
    palette: 'Palette modifiée', mode: 'Mode de graduation modifié', classes: 'Nombre de classes modifié',
    valeur: 'Valeur modifiée', gris: 'Vue en niveaux de gris', demarrage: 'Balayage lancé',
    arret: 'Balayage arrêté', initial: 'Lecture initiale',
  };
  scene.readout.textContent =
    `${verbs[cause] || 'Lecture'} · grandeur ${num(tToValue(scene.valueT), 0)} / ${num(V_MAX, 0)} · ` +
    `palette ${palette.nom} (${palette.nature}) · ` +
    (scene.mode === 1 ? `classe ${num(cls + 1, 0)} sur ${num(scene.classes, 0)}` : 'graduation continue') +
    ` · couleur RVB ${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)} ` +
    `· clarté perceptuelle L ${num(lab.L, 3)} · ΔE depuis la borne basse ${num(dE, 3)}.`;
}

/* E099-04 / E099-05 / E099-06 — actualise les paragraphes et la liste de mesures. */
function refreshAnalysis(scene) {
  const palette = PALETTES[scene.paletteIndex];
  const path = pathLength(palette);
  const distinct = distinguishableClasses(palette);
  const mono = monotonicity(palette);
  const rgb0 = rgbAt(palette, 0);
  const rgb1 = rgbAt(palette, 1);
  const contrast = contrastRatio(rgb0, rgb1);
  const L0 = oklabAt(palette, 0).L;
  const L1 = oklabAt(palette, 1).L;

  if (scene.analysisPalette) {
    scene.analysisPalette.textContent =
      `${palette.nom} — nature ${palette.nature}. Ancrages Oklab aux positions ` +
      `${palette.stops.map((s) => num(s.t, 2)).join(', ')} : ` +
      `clarté L de ${num(palette.stops[0].L, 2)} à ${num(palette.stops[palette.stops.length - 1].L, 2)}. ` +
      `L’interpolation est linéaire par morceaux entre ancrages (aucun tirage aléatoire).`;
  }
  if (scene.analysisMono) {
    scene.analysisMono.textContent =
      `Clarté Oklab : L(${num(0, 0)}) = ${num(L0, 2)}, L(${num(1, 0)}) = ${num(L1, 2)}, ` +
      `amplitude ${num(Math.abs(L1 - L0), 2)}. ` +
      `Changements de sens du pas de clarté : ${num(mono.violations, 0)} ` +
      `(0 attendu pour une palette séquentielle). Pas minimal ${num(mono.minStep, 5)}, ` +
      `pas maximal ${num(mono.maxStep, 5)}.`;
  }
  if (scene.analysisDe) {
    scene.analysisDe.textContent =
      `Longueur du chemin perceptuel : ${num(path, 3)} en ΔE Oklab ; avec un écart juste perceptible ` +
      `de ${num(JND, 2)}, cela fait ${num(distinct, 0)} classes distinguables au plus. ` +
      `En mode discrète à ${num(scene.classes, 0)} classes, le pas moyen vaut ` +
      `${num(path / scene.classes, 3)} en ΔE, soit ${num(path / scene.classes / JND, 1)} JND.`;
  }

  const measures = [
    `Référence perceptuelle : 1 écart juste perceptible (JND) vaut ${num(JND, 2)} en ΔE Oklab ; ` +
    `la rampe ${palette.key} en contient ${num(distinct, 0)} sur toute sa longueur.`,
    `Amplitude de clarté perceptuelle : ${num(Math.abs(L1 - L0), 2)} (de ${num(L0, 2)} à ${num(L1, 2)}).`,
    `Contraste WCAG borne à borne : ${num(contrast, 1)}:1, comparé au seuil d’accessibilité ` +
    `AA de ${num(WCAG_AA, 1)}:1 pour le texte normal ` +
    `(${contrast >= WCAG_AA ? 'seuil franchi' : 'seuil non franchi'}).`,
    `Monotonie : ${num(mono.violations, 0)} violation(s) de sens pour ${palette.nom}.`,
    `Pas perceptuel entre classes (${num(scene.classes, 0)} classes) : ` +
    `${num(path / scene.classes, 3)} en ΔE, soit ${num(path / scene.classes / JND, 1)} fois le JND.`,
  ];
  measures.forEach((text, i) => {
    if (scene.measureItems[i]) scene.measureItems[i].textContent = text;
  });
}

/* E099-08 — tableau captioné d'échantillons : texte sémantique, lisible sans
   le canvas, avec RVB, clarté et ΔE recalculés pour cinq positions. */
function refreshTable(scene) {
  if (!scene.tableBody) return;
  const palette = PALETTES[scene.paletteIndex];
  const ts = [0, 0.25, 0.5, 0.75, 1];
  ts.forEach((t, i) => {
    const rgb = rgbAt(palette, t);
    const lab = oklabAt(palette, t);
    const dE = deltaEOk(oklabAt(palette, 0), lab);
    const row = scene.tableBody.children[i];
    if (!row) return;
    const cells = row.children;
    cells[0].textContent = num(t, 2);
    cells[1].textContent = num(tToValue(t), 0);
    cells[2].textContent = `${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}`;
    cells[3].textContent = num(lab.L, 3);
    cells[4].textContent = num(dE, 3);
  });
}

function refresh(scene, cause) {
  if (!scene) return;
  const palette = PALETTES[scene.paletteIndex];
  scene.valueOutput.textContent = `${num(tToValue(scene.valueT), 0)} / ${num(V_MAX, 0)}`;
  scene.classesOutput.textContent = `${num(scene.classes, 0)} classes`;
  scene.paletteSummary.textContent =
    `Palette sélectionnée : ${palette.nom} — ${palette.nature}.`;
  scene.paletteChoices.forEach((btn, i) => {
    btn.setAttribute('aria-checked', i === scene.paletteIndex ? 'true' : 'false');
    btn.tabIndex = i === scene.paletteIndex ? 0 : -1;
  });
  scene.modeChoices.forEach((btn, i) => {
    btn.setAttribute('aria-checked', i === scene.mode ? 'true' : 'false');
    btn.tabIndex = i === scene.mode ? 0 : -1;
  });
  scene.grayBtn.setAttribute('aria-pressed', showGray ? 'true' : 'false');
  scene.grayBtn.textContent = showGray ? 'Niveaux de gris : activés' : 'Niveaux de gris : désactivés';
  refreshAnalysis(scene);
  refreshTable(scene);
  drawScene(scene.canvas, scene);
  writeReadout(scene, cause);
}

/* E099-01 — construction de la fiche sémantique complète (texte lisible sans
   interaction : titres, paragraphes, liste de mesures et tableau captioné). */
function buildSection(ctx, layout) {
  const previous = layout.querySelector(`#${SECTION_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = layout.querySelector('.geo-panel') || layout;
  const section = ctx.el('section', 'geography-e099-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Échelles de couleurs continues et palettes perceptuelles');
  section.setAttribute('data-sim', 'echelles-couleurs-perceptuelles');
  section.appendChild(ctx.el('h2', '', 'Échelles de couleurs perceptuelles — coder une grandeur cartographique'));

  const intro = ctx.el('p', 'geography-e099-line');
  intro.id = 'geography-e099-intro';
  intro.appendChild(ctx.el('strong', '', 'E099-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Une carte thématique code une grandeur par une couleur. Pour que la lecture soit juste, ' +
    'l’écart de couleur doit refléter l’écart de valeur : c’est la définition d’une palette perceptuelle. ' +
    'On interpole la couleur dans un espace perceptuel (Oklab), on contrôle la luminance, ' +
    'on mesure les écarts en ΔE et on vérifie que l’information survit en niveaux de gris. ' +
    'Toutes les valeurs ci-dessous sont aussi écrites en texte : la couleur n’est jamais le seul support.'
  ));
  section.appendChild(intro);

  /* E099-03 — interpolation perceptuelle, formules explicites. */
  const p3 = ctx.el('p', 'geography-e099-line');
  p3.id = 'geography-e099-interpolation';
  p3.appendChild(ctx.el('strong', '', 'E099-03 · Interpolation perceptuelle. '));
  p3.appendChild(document.createTextNode(
    'On convertit le sRGB en Oklab (L, a, b), on interpole L, a, b linéairement entre deux ancrages, ' +
    'puis on revient au sRGB. L’espace Oklab est construit pour que la distance euclidienne entre ' +
    'deux points corresponde à un écart perçu : un pas de 0,02 en ΔE est à peine visible (1 JND).'
  ));
  section.appendChild(p3);

  /* E099-04 — luminance monotone. */
  const p4 = ctx.el('p', 'geography-e099-line');
  p4.id = 'geography-e099-luminance';
  p4.appendChild(ctx.el('strong', '', 'E099-04 · Luminance et ordre. '));
  const monoValue = ctx.el('span', 'geography-e099-value', '');
  monoValue.id = 'geography-e099-analysis-mono';
  p4.appendChild(monoValue);
  section.appendChild(p4);

  /* E099-05 — familles de palettes. */
  const p5 = ctx.el('p', 'geography-e099-line');
  p5.id = 'geography-e099-familles';
  p5.appendChild(ctx.el('strong', '', 'E099-05 · Trois familles. '));
  p5.appendChild(document.createTextNode(
    'Séquentielle : la clarté augmente sans jamais redescendre (pour une grandeur qui croît). ' +
    'Divergente : deux rampes autour d’un centre clair (pour un écart signé, froid → neutre → chaud). ' +
    'Arc-en-ciel : beaucoup de teintes, mais une clarté qui monte et descend — le piège classique.'
  ));
  section.appendChild(p5);
  const summary = ctx.el('p', 'geography-e099-line');
  summary.id = 'geography-e099-palette-summary';
  section.appendChild(summary);

  /* E099-06 — distance perceptuelle, paragraphe dynamique. */
  const p6 = ctx.el('p', 'geography-e099-line');
  p6.id = 'geography-e099-distance';
  p6.appendChild(ctx.el('strong', '', 'E099-06 · Distance perceptuelle ΔE. '));
  const deValue = ctx.el('span', 'geography-e099-value', '');
  deValue.id = 'geography-e099-analysis-de';
  p6.appendChild(deValue);
  section.appendChild(p6);

  /* E099-04 / E099-06 — liste de mesures, dont une comparée à une référence. */
  const measures = ctx.el('ul', 'geography-e099-list');
  measures.id = 'geography-e099-mesures';
  const measureItems = [];
  for (let i = 0; i < 5; i += 1) {
    const item = ctx.el('li', '', '');
    item.id = `geography-e099-mesure-${i}`;
    measures.appendChild(item);
    measureItems.push(item);
  }
  section.appendChild(measures);

  /* E099-05 — radiogroupe de palettes (choix unique). */
  const paletteGroup = ctx.el('div', 'geography-e099-group');
  paletteGroup.id = 'geography-e099-palettes';
  paletteGroup.setAttribute('role', 'radiogroup');
  paletteGroup.setAttribute('aria-label', 'Choisir la famille de palette');
  PALETTES.forEach((p, i) => {
    const btn = ctx.el('button', 'geography-e099-choice', `${p.nom} — ${p.nature}`);
    btn.type = 'button';
    btn.id = `geography-e099-palette-${i}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', i === selectedPalette ? 'true' : 'false');
    btn.tabIndex = i === selectedPalette ? 0 : -1;
    paletteGroup.appendChild(btn);
  });
  section.appendChild(paletteGroup);
  const analysisPalette = ctx.el('p', 'geography-e099-line', '');
  analysisPalette.id = 'geography-e099-analysis-palette';
  section.appendChild(analysisPalette);

  /* E099-09 — radiogroupe de mode (choix unique : continu / discrète). */
  const modeGroup = ctx.el('div', 'geography-e099-group two');
  modeGroup.id = 'geography-e099-modes';
  modeGroup.setAttribute('role', 'radiogroup');
  modeGroup.setAttribute('aria-label', 'Choisir le mode de graduation');
  ['Continue', 'Discrète (classes)'].forEach((label, i) => {
    const btn = ctx.el('button', 'geography-e099-choice', label);
    btn.type = 'button';
    btn.id = `geography-e099-mode-${i}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', i === selectedMode ? 'true' : 'false');
    btn.tabIndex = i === selectedMode ? 0 : -1;
    modeGroup.appendChild(btn);
  });
  section.appendChild(modeGroup);

  /* E099-09 — curseurs de valeur et de nombre de classes. */
  const valueRow = ctx.el('div', 'geography-e099-range');
  const valueLabel = ctx.el('label', '', 'Grandeur cartographique');
  valueLabel.id = 'geography-e099-value-label';
  valueLabel.htmlFor = 'geography-e099-value-input';
  const valueInput = ctx.el('input');
  valueInput.type = 'range';
  valueInput.min = String(V_MIN);
  valueInput.max = String(V_MAX);
  valueInput.step = '10';
  valueInput.value = String(Math.round(tToValue(valueToT(value))));
  valueInput.id = 'geography-e099-value-input';
  valueInput.setAttribute('aria-describedby', 'geography-e099-value-output');
  const valueOutput = ctx.el('output', '', `${num(value, 0)} / ${num(V_MAX, 0)}`);
  valueOutput.id = 'geography-e099-value-output';
  valueRow.append(valueLabel, valueInput, valueOutput);
  section.appendChild(valueRow);

  const classesRow = ctx.el('div', 'geography-e099-range');
  const classesLabel = ctx.el('label', '', 'Nombre de classes');
  classesLabel.id = 'geography-e099-classes-label';
  classesLabel.htmlFor = 'geography-e099-classes-input';
  const classesInput = ctx.el('input');
  classesInput.type = 'range';
  classesInput.min = '2';
  classesInput.max = '12';
  classesInput.step = '1';
  classesInput.value = String(classes);
  classesInput.id = 'geography-e099-classes-input';
  classesInput.setAttribute('aria-describedby', 'geography-e099-classes-output');
  const classesOutput = ctx.el('output', '', `${num(classes, 0)} classes`);
  classesOutput.id = 'geography-e099-classes-output';
  classesRow.append(classesLabel, classesInput, classesOutput);
  section.appendChild(classesRow);

  /* E099-09 — région live unique. */
  const readout = ctx.el('p', 'geography-e099-readout', '');
  readout.id = 'geography-e099-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E099-03 / E099-07 / E099-08 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', 'geography-e099-figure');
  figure.id = 'geography-e099-figure';
  const canvas = ctx.el('canvas', 'geography-e099-canvas');
  canvas.id = 'geography-e099-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de couleurs : une rampe perceptuelle légendée de 0 à 1 000, une bande de luminance en niveaux de gris, ' +
    'des graduations et un marqueur de valeur. Flèches pour déplacer la valeur, Début/Fin pour les bornes, ' +
    '1 2 3 pour changer de palette, D pour le mode, G pour les niveaux de gris, Espace pour le balayage. ' +
    'Toutes les valeurs sont aussi écrites en texte dans le panneau.');
  canvas.setAttribute('aria-describedby', 'geography-e099-clavier');
  const caption = ctx.el('figcaption', 'geography-e099-caption',
    'Rampe schématique de 0 à 1 000 unités. Les graduations portent leurs valeurs, la bande inférieure ' +
    'donne la même grandeur en niveaux de gris : l’ordre des valeurs ne dépend donc pas de la teinte.');
  caption.id = 'geography-e099-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E099-08 — tableau captioné d'échantillons (texte sémantique). */
  const table = ctx.el('table', 'geography-e099-table');
  table.id = 'geography-e099-table';
  table.appendChild(ctx.el('caption', '', 'Échantillons de la palette courante (valeur, RVB, clarté, ΔE)'));
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Position t', 'Valeur', 'RVB (sRGB)', 'Clarté L', 'ΔE depuis 0'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = ctx.el('tbody');
  for (let i = 0; i < 5; i += 1) {
    const tr = ctx.el('tr');
    tr.id = `geography-e099-echantillon-${i}`;
    const th = ctx.el('th', '', num([0, 0.25, 0.5, 0.75, 1][i], 2));
    th.scope = 'row';
    tr.appendChild(th);
    ['', '', '', ''].forEach(() => tr.appendChild(ctx.el('td', '', '')));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);

  /* E099-09 — bascule indépendante (aria-pressed légitime) et balayage. */
  const actions = ctx.el('div', 'geography-e099-actions');
  const grayBtn = ctx.el('button', 'geography-e099-toggle',
    showGray ? 'Niveaux de gris : activés' : 'Niveaux de gris : désactivés');
  grayBtn.type = 'button';
  grayBtn.id = 'geography-e099-gray';
  grayBtn.setAttribute('aria-pressed', showGray ? 'true' : 'false');
  grayBtn.setAttribute('aria-controls', 'geography-e099-canvas');
  actions.appendChild(grayBtn);

  const play = ctx.el('button', 'geography-e099-play', playing ? 'Arrêter le balayage' : 'Lancer le balayage');
  play.type = 'button';
  play.id = 'geography-e099-play';
  play.setAttribute('aria-controls', 'geography-e099-readout');
  actions.appendChild(play);
  section.appendChild(actions);

  /* E099-09 — aide clavier. */
  const clavier = ctx.el('p', 'geography-e099-line',
    'E099-09 · Clavier : Tab atteint les palettes, les modes, les curseurs, le canevas puis les boutons. ' +
    'Sur le canevas, ← → déplacent la valeur de 10 unités, Début et Fin vont aux bornes, ' +
    '1 / 2 / 3 choisissent la palette, D bascule le mode, G bascule les niveaux de gris, ' +
    'Espace lance ou arrête le balayage. Le pointeur sur la rampe fait le même travail que les flèches.');
  clavier.id = 'geography-e099-clavier';
  section.appendChild(clavier);

  /* E099-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', 'geography-e099-line',
    'E099-10 · Limite et vérification : 1) prédire que la palette séquentielle a une clarté strictement croissante ' +
    '(0 violation de monotonie) et un nombre de classes distinguables supérieur à 20 ; ' +
    '2) régler la palette arc-en-ciel et 10 classes ; ' +
    '3) attendre des violations de monotonie et un pas perceptuel inégal malgré un chemin plus long ; ' +
    '4) falsifier si, à un endroit de la rampe, le ΔE entre classes adjacentes passe sous 1 JND (0,02) ' +
    'ou si la bande en niveaux de gris inverse l’ordre de deux valeurs — l’hypothèse est alors réfutée ; ' +
    '5) débrief : une palette n’est pas « bonne » parce qu’elle a beaucoup de teintes, mais parce que ' +
    'sa luminance est monotone et ses pas réguliers ; la grandeur est portée par la légende et le texte, ' +
    'jamais par la couleur seule.'
  );
  limite.id = 'geography-e099-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  return {
    section, canvas, readout, grayBtn, play, valueInput, classesInput,
    valueOutput, classesOutput, paletteSummary, paletteChoices:
      Array.from(paletteGroup.querySelectorAll('.geography-e099-choice')),
    modeChoices: Array.from(modeGroup.querySelectorAll('.geography-e099-choice')),
    measureItems, tableBody: tbody,
    analysisPalette, analysisMono: monoValue, analysisDe: deValue,
    paletteIndex: selectedPalette, mode: selectedMode, classes, valueT: valueToT(value),
  };
}

/* ------------------------------------------------------------------ */
/* E099-10 — boucle rAF unique, pause sur document.hidden                */
/* ------------------------------------------------------------------ */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran

  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const phase = (scene.elapsed / SWEEP_MS) * Math.PI * 2;
    /* Courbe déterministe : sin/cos du temps écoulé, aucun tirage aléatoire. */
    scene.valueT = clamp01(0.5 + 0.5 * Math.sin(phase));
    scene.valueInput.value = String(Math.round(tToValue(scene.valueT)));
    refresh(scene, 'balayage');
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer le balayage';
    }
  }
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (latest && latest.playing && !latest.reduced()) ensureLoop();
      else if (latest) refresh(latest, 'initial');
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      if (latest) latest.last = null;
    }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', () => {
        if (latest && latest.playing && latest.reduced()) {
          playing = false;
          latest.playing = false;
          if (latest.play) latest.play.textContent = 'Lancer le balayage';
        }
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        if (latest) refresh(latest, 'initial');
      });
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

/* E099-05 / E099-09 — actions, toutes recalculées depuis les constantes. */
function setPalette(index, scene, cause) {
  selectedPalette = Math.max(0, Math.min(PALETTES.length - 1, index));
  scene.paletteIndex = selectedPalette;
  refresh(scene, cause || 'palette');
}

function setMode(index, scene) {
  selectedMode = index === 1 ? 1 : 0;
  scene.mode = selectedMode;
  refresh(scene, 'mode');
}

function setClasses(raw, scene) {
  const n = Number(raw);
  classes = Number.isFinite(n) ? Math.max(2, Math.min(12, Math.round(n))) : 8;
  scene.classes = classes;
  scene.classesInput.value = String(classes);
  refresh(scene, 'classes');
}

function setValue(raw, scene, cause) {
  const n = Number(raw);
  const v = Number.isFinite(n) ? Math.max(V_MIN, Math.min(V_MAX, n)) : V_MIN;
  value = v;
  scene.valueT = valueToT(v);
  scene.valueInput.value = String(Math.round(v));
  refresh(scene, cause || 'valeur');
}

function toggleGray(scene) {
  showGray = !showGray;
  refresh(scene, 'gris');
}

function togglePlay(scene) {
  if (scene.reduced()) {
    scene.valueT = clamp01(scene.valueT < 0.5 ? 0.9 : 0.1);
    scene.valueInput.value = String(Math.round(tToValue(scene.valueT)));
    refresh(scene, 'clavier');
    return;
  }
  playing = !playing;
  scene.playing = playing;
  scene.play.textContent = playing ? 'Arrêter le balayage' : 'Lancer le balayage';
  if (playing) {
    scene.last = null;
    scene.elapsed = 0;
    ensureLoop();
    writeReadout(scene, 'demarrage');
  } else if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
    scene.last = null;
    writeReadout(scene, 'arret');
  }
}

register('E099', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e099', 'on');

  const scene = buildSection(ctx, layout);
  layout.setAttribute('data-geography-e099-render', String(renders));
  layout.setAttribute('data-geography-e099-palette', PALETTES[selectedPalette].key);
  layout.setAttribute('data-geography-e099-mode', selectedMode === 1 ? 'discrete' : 'continue');

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
  scene.playing = playing;
  scene.elapsed = 0;
  scene.last = null;

  /* E099-09 — clavier sur les radiogroupes et le canevas. */
  scene.section.addEventListener('keydown', (event) => {
    const target = event.target;
    const isPalette = target && target.classList && target.classList.contains('geography-e099-choice')
      && target.parentNode === scene.paletteChoices[0].parentNode;
    const isMode = target && target.classList && target.classList.contains('geography-e099-choice')
      && target.parentNode === scene.modeChoices[0].parentNode;
    if (isPalette && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
      setPalette((selectedPalette + dir + PALETTES.length) % PALETTES.length, scene, 'clavier');
      scene.paletteChoices[selectedPalette].focus();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isMode && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      setMode(selectedMode === 1 ? 0 : 1, scene);
      scene.modeChoices[selectedMode].focus();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (target !== scene.canvas) return;
    const step = 10;
    const v = tToValue(scene.valueT);
    if (event.key === 'ArrowRight') setValue(v + step, scene, 'clavier');
    else if (event.key === 'ArrowLeft') setValue(v - step, scene, 'clavier');
    else if (event.key === 'Home') setValue(V_MIN, scene, 'clavier');
    else if (event.key === 'End') setValue(V_MAX, scene, 'clavier');
    else if (event.key === '1') setPalette(0, scene, 'clavier');
    else if (event.key === '2') setPalette(1, scene, 'clavier');
    else if (event.key === '3') setPalette(2, scene, 'clavier');
    else if (event.key === 'd' || event.key === 'D') setMode(selectedMode === 1 ? 0 : 1, scene);
    else if (event.key === 'g' || event.key === 'G') toggleGray(scene);
    else if (event.key === ' ' || event.key === 'Spacebar') togglePlay(scene);
    else return;
    event.preventDefault();
    event.stopPropagation();
  });

  scene.paletteChoices.forEach((btn, i) => {
    btn.addEventListener('click', () => setPalette(i, scene, 'palette'));
  });
  scene.modeChoices.forEach((btn, i) => {
    btn.addEventListener('click', () => setMode(i, scene));
  });

  /* E099-09 — curseurs. */
  scene.valueInput.addEventListener('input', () => setValue(scene.valueInput.value, scene, 'valeur'));
  scene.classesInput.addEventListener('input', () => setClasses(scene.classesInput.value, scene));

  /* E099-09 — pointeur sur la rampe : même relation que les flèches. */
  let drag = null;
  const movePointer = (event) => {
    if (!drag) return;
    const rect = scene.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const X0 = 20, X1 = 880, BAR = 900;
    const x = ((event.clientX - rect.left) / rect.width) * BAR;
    const t = clamp01((x - X0) / (X1 - X0));
    setValue(tToValue(t), scene, 'pointeur');
  };
  scene.canvas.addEventListener('pointerdown', (event) => {
    drag = true;
    try { scene.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
    movePointer(event);
  });
  scene.canvas.addEventListener('pointermove', movePointer);
  const endDrag = () => { drag = false; };
  scene.canvas.addEventListener('pointerup', endDrag);
  scene.canvas.addEventListener('pointercancel', endDrag);

  scene.grayBtn.addEventListener('click', () => toggleGray(scene));
  scene.play.addEventListener('click', () => togglePlay(scene));

  latest = scene;
  install();
  layout.setAttribute('data-geography-e099-distinct',
    String(Math.round(distinguishableClasses(PALETTES[selectedPalette]))));
  refresh(scene, 'initial');
});
