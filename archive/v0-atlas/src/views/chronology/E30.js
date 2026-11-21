import { register } from './registry.js';

/* E30 — Contraste et lisibilité des textes de la chronologie.
   Une seule lentille : elle injecte un bloc CSS unique, rehausse les textes
   secondaires (7–9 px) et les ornements transparents, renforce le focus et
   les modes à contraste renforcé / couleurs forcées, puis mesure le ratio
   WCAG réellement obtenu sur le DOM rendu. Aucune valeur n'est inventée :
   les ratios sont calculés depuis les couleurs calculées par le navigateur.
   Aucun réseau, aucun aléa, aucun timer, aucune boucle rAF, aucun journal. */

const CSS_ID = 'chronology-e30';
const READOUT_ID = 'contraste-chrono-lisible';
const SEUIL_TEXTE = 4.5; /* WCAG 2.2 AA, texte normal */
const SEUIL_ORNEMENT = 3; /* WCAG 1.4.11, objet graphique / ornement */
const FOND_REPLI = { r: 7, g: 10, b: 14, a: 1 }; /* --bg : #070a0e */

/* Sondes : le libellé, le sélecteur réel de la vue, le pseudo-élément
   éventuel et le seuil exigé. Les nœuds absents (données ou filtre) sont
   ignorés, jamais comptés comme conformes. */
const PROBES = [
  { label: 'aide clavier', selector: '.atlas-chrono-hint', min: SEUIL_TEXTE },
  { label: 'statut', selector: '.atlas-chrono-status', min: SEUIL_TEXTE },
  { label: 'plage d’ère', selector: '.atlas-chrono-era-range', min: SEUIL_TEXTE },
  { label: 'compteur', selector: '.atlas-chrono-count', min: SEUIL_TEXTE },
  { label: 'sous-titre de carte', selector: '.event-subtitle', min: SEUIL_TEXTE },
  { label: 'ère sur carte', selector: '.atlas-chrono-card-era', min: SEUIL_TEXTE },
  { label: 'thèmes', selector: '.atlas-chrono-tags', min: SEUIL_TEXTE },
  { label: 'crédit image', selector: '.aside-credit', min: SEUIL_TEXTE },
  { label: 'sources', selector: '.point-sources', min: SEUIL_TEXTE },
  { label: 'confiance', selector: '.confidence', min: SEUIL_TEXTE },
  { label: 'fil de situation', selector: '.nav-c2-trail-list', min: SEUIL_TEXTE },
  { label: 'progression', selector: '.nav-c2-progress', min: SEUIL_TEXTE },
  { label: 'séparateur (ornement)', selector: '.nav-c2-sep', min: SEUIL_ORNEMENT },
  { label: 'placeholder recherche', selector: '.atlas-chrono-search', pseudo: '::placeholder', min: SEUIL_TEXTE },
];

const CSS = `
/* E30 — scope strict à la vue chronologie, aucun styles.css modifié. */
.chronology-layout {
  --e30-texte-2: #b9b2a8;      /* ≈ 8,7:1 sur --surface-2 (au lieu de ≈ 5,5:1) */
  --e30-texte-3: #cfc9be;      /* palier renforcé pour les 7–8 px */
  --e30-bordure: rgba(230, 185, 111, .42);
}
.chronology-layout :is(
  .atlas-chrono-hint, .atlas-chrono-status, .atlas-chrono-era-range,
  .atlas-chrono-count, .atlas-chrono-card-era, .event-subtitle,
  .atlas-chrono-tags, .aside-credit, .point-sources, .confidence,
  .nav-c2-trail-list, .nav-c2-progress
) { color: var(--e30-texte-2); }
.chronology-layout .nav-c2-sep { color: rgba(255, 255, 255, .62); }
.chronology-layout .atlas-chrono-search::placeholder {
  color: var(--e30-texte-2); opacity: 1;
}
/* Bordures des badges et des états : le texte porte déjà l'information,
   la bordure ne fait que renforcer, sans couleur seule. */
.chronology-layout :is(.point-kind, .confidence, .atlas-chrono-tag) {
  border-color: var(--e30-bordure);
  color: var(--e30-texte-3);
}
.chronology-layout :is(.era-band, .event-card, .atlas-chrono-tag)[aria-current="true"],
.chronology-layout .atlas-chrono-tag[aria-pressed="true"] {
  border-color: var(--gold-bright);
}
/* Focus visible : anneau clair + liseré sombre, lisible sur fond clair. */
.chronology-layout :is(
  .era-band, .event-card, .atlas-chrono-tag, .atlas-chrono-search,
  .nav-c2-back, .aside-actions button, .atlas-chrono-empty button
):focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(7, 10, 14, .9);
}
/* Readout : discret, non intrusif, jamais porteur de la seule couleur. */
#${READOUT_ID} {
  margin: 12px 0 0; padding: 6px 9px;
  border: 1px dashed var(--e30-bordure); border-radius: 8px;
  color: var(--e30-texte-2); font-size: 10px; line-height: 1.45;
}
#${READOUT_ID}[data-contraste-ok="false"] {
  border-style: solid; border-color: var(--gold-bright); color: var(--gold-bright);
}
/* Préférence système : contraste renforcé. */
@media (prefers-contrast: more) {
  .chronology-layout { --e30-texte-2: var(--ink); --e30-texte-3: var(--ink); --e30-bordure: var(--ink); }
  .chronology-layout :is(
    .atlas-chrono-hint, .atlas-chrono-status, .atlas-chrono-era-range,
    .atlas-chrono-count, .atlas-chrono-card-era, .event-subtitle,
    .atlas-chrono-tags, .aside-credit, .point-sources, .confidence,
    .nav-c2-trail-list, .nav-c2-progress, .nav-c2-sep
  ) { color: var(--ink) !important; }
  .chronology-layout :is(
    .chronology-aside, .era-band, .event-card, .nav-c2-orientation,
    .atlas-chrono-search, .atlas-chrono-empty
  ) { background-color: var(--bg) !important; }
  .chronology-layout :is(
    .era-band, .event-card, .atlas-chrono-tag, .point,
    .aside-actions button, .atlas-chrono-empty button
  ) { border-color: var(--ink) !important; }
  .chronology-layout .atlas-chrono-search::placeholder { color: var(--ink) !important; }
}
/* Couleurs forcées (Windows High Contrast) : couleurs système uniquement. */
@media (forced-colors: active) {
  .chronology-layout { --e30-texte-2: CanvasText; --e30-texte-3: CanvasText; --e30-bordure: CanvasText; }
  .chronology-layout :is(
    .atlas-chrono-hint, .atlas-chrono-status, .atlas-chrono-era-range,
    .atlas-chrono-count, .atlas-chrono-card-era, .event-subtitle,
    .atlas-chrono-tags, .aside-credit, .point-sources, .confidence,
    .nav-c2-trail-list, .nav-c2-progress, .nav-c2-sep
  ) { color: CanvasText; }
  .chronology-layout .atlas-chrono-search::placeholder { color: CanvasText; opacity: 1; }
  .chronology-layout :is(
    .era-band, .event-card, .atlas-chrono-tag, .point,
    .aside-actions button, .atlas-chrono-empty button, #${READOUT_ID}
  ) { border: 1px solid CanvasText; }
  .chronology-layout [aria-current="true"],
  .chronology-layout [aria-pressed="true"] { border-width: 2px; outline: 1px solid Highlight; }
  .chronology-layout :is(.era-band, .event-card, .atlas-chrono-tag, .atlas-chrono-search):focus-visible {
    outline: 2px solid Highlight;
  }
  #${READOUT_ID}[data-contraste-ok="false"] { border-color: Highlight; color: Highlight; }
}
`;

/* Analyse d'une couleur CSS calculée : rgb()/rgba(), notation moderne
   `rgb(r g b / a)`, retour {r,g,b,a} ou null. Aucune interpolation hasardeuse. */
function parseColor(value) {
  if (!value) return null;
  const match = String(value).match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].replace('/', ' ').trim().split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.length < 3 || nums.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  const byte = (n) => Math.min(255, Math.max(0, n));
  return {
    r: byte(nums[0]),
    g: byte(nums[1]),
    b: byte(nums[2]),
    a: nums.length > 3 && Number.isFinite(nums[3]) ? Math.min(1, Math.max(0, nums[3])) : 1,
  };
}

/* Composition du texte sur son fond (les couleurs à alpha < 1 sont réelles
   dans la vue : `--line`, `--line-strong`, `.nav-c2-sep`). */
function over(foreground, background) {
  if (!foreground) return background;
  if (!background) return foreground;
  const alpha = foreground.a;
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  };
}

/* Luminance relative WCAG : linearisation sRGB puis pondération. */
function luminance(color) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrast(foreground, background) {
  const light = luminance(foreground);
  const dark = luminance(background);
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

/* Fond effectif : premier ancêtre à fond opaque, sinon repli --bg. */
function backgroundOf(node, view) {
  let current = node;
  while (current && current.nodeType === 1) {
    const color = parseColor(view.getComputedStyle(current).backgroundColor);
    if (color && color.a > 0) return color;
    current = current.parentElement;
  }
  return FOND_REPLI;
}

function measure(probe, doc, view) {
  const node = doc.querySelector(probe.selector);
  if (!node) return null;
  const color = parseColor(view.getComputedStyle(node, probe.pseudo || null).color);
  if (!color) return null;
  const background = backgroundOf(node, view) || FOND_REPLI;
  const value = contrast(over(color, background), background);
  return {
    label: probe.label,
    value,
    min: probe.min,
    ok: value + 0.005 >= probe.min,
  };
}

function french(value) {
  return value.toFixed(2).replace('.', ',');
}

let lastText = '';

register('E30', (ctx) => {
  const doc = ctx.stage && ctx.stage.ownerDocument ? ctx.stage.ownerDocument : document;
  const view = doc.defaultView;
  if (!doc || !view || !ctx.layout) return;

  /* Une seule feuille dans <head>, gardée par id dans registry.js. */
  ctx.css(CSS_ID, CSS);

  const results = PROBES.map((probe) => measure(probe, doc, view)).filter(Boolean);
  const ok = results.filter((result) => result.ok).length;
  const total = results.length;
  const min = total ? Math.min(...results.map((result) => result.value)) : 0;
  const allOk = total > 0 && ok === total;

  /* Le nœud vit dans un layout reconstruit à chaque rendu : aucun doublon
     possible, mais garde d'identifiant pour le cas d'un greffon rejoué. */
  const main = ctx.layout.querySelector('.chronology-main') || ctx.layout;
  let readout = doc.getElementById(READOUT_ID);
  if (!readout) {
    readout = ctx.el('p', 'contraste-chrono-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
  }
  readout.className = 'contraste-chrono-readout';
  readout.dataset.contrasteOk = String(allOk);
  readout.dataset.contrasteCouples = `${ok}/${total}`;
  readout.dataset.contrasteMin = min.toFixed(3);
  /* appendChild déplace un nœud existant : un seul id dans le document. */
  if (main && readout.parentNode !== main) main.appendChild(readout);

  const worst = results.length
    ? results.reduce((a, b) => (a.value <= b.value ? a : b))
    : null;
  const text = total
    ? `Contraste : ${ok}/${total} couples conformes · ratio minimal ${french(min)}:1`
      + (worst ? ` (${worst.label}).` : '.')
    : 'Contraste : aucun texte à mesurer dans cette vue.';
  /* Une seule écriture par rendu ; le contenu est identique d'un rendu à
     l'autre, donc aucune annonce live parasite sur les changements d'état. */
  if (readout.textContent !== text || text !== lastText) {
    readout.textContent = text;
    lastText = text;
  }
});
