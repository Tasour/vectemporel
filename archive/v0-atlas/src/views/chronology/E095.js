import { register } from './registry.js';

/*
 * Lentille E095 — « mesure de lisibilité, score et indicateurs de lecture »
 * (rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E095.md).
 *
 * Dix chantiers (E095-01 … E095-10) implémentés dans CE seul module :
 * aucun fichier partagé n'est modifié. La vue reconstruisant son DOM à chaque
 * rendu (chronology.js:538-539), apply() réutilise ses nœuds par garde
 * d'existence et relit le contexte courant ; aucun écouteur global, aucune
 * boucle rAF, aucun timer.
 *
 * CSS unique : ctx.css('chronology-e095', …), cadré par [data-e095="on"] posé
 * sur .chronology-layout. Tous les IDs DOM sont préfixés `e095-`.
 * Zéro console, zéro réseau, zéro aléa, aucune librairie externe.
 *
 * Aucune donnée historique n'est inventée : la lentille ne produit que des
 * mesures dérivées du DOM réel (tailles de police, largeur de ligne, contraste,
 * titres, volume de texte, tabulation des chiffres) et des feuilles déjà
 * chargées. Les seuils (12 px, 60–75 caractères, 4,5:1, 200 mots/min) sont des
 * repères éditoriaux explicites, pas des faits sur les données.
 */

const CSS_ID = 'chronology-e095';
const FONT_FLOOR = 12;   // px — plancher de lisibilité retenu pour la vue
const CPL_MIN = 60;      // caractères par ligne — borne basse de la mesure
const CPL_MAX = 75;      // caractères par ligne — borne haute de la mesure
const CONTRAST_MIN = 4.5;// ratio WCAG AA pour du texte courant
const WPM = 200;         // mots par minute — cadence de lecture de référence

/* Sélecteurs ciblés : ils recouvrent exactement les nœuds de texte créés par
   chronology.js sans jamais toucher à un autre greffon ni à styles.css. */
const TYPO_SELECTORS = [
  '.view-lede', '.atlas-chrono-hint', '.atlas-chrono-status',
  '.nav-c2-progress', '.nav-c2-crumb', '.atlas-chrono-era-range',
  '.atlas-chrono-count', '.atlas-chrono-tag', '.atlas-chrono-card-era',
  '.point-sources', '.aside-credit', '.aside-kicker', '.event-subtitle',
  '.point-kind', '.confidence',
];
const LINE_SELECTORS = ['.view-lede', '.aside-summary', '.point p', '.atlas-chrono-empty'];
const CONTRAST_SELECTORS = [
  '.view-lede', '.atlas-chrono-hint', '.atlas-chrono-status',
  '.aside-summary', '.point p',
];
const TABULAR_SELECTORS = [
  '.atlas-chrono-era-range', '.atlas-chrono-count', '.nav-c2-progress',
  '.event-year', '.nav-c2-point-rank',
];

let renders = 0; // compteur de rendus : témoin de l'idempotence du greffon

/* ------------------------------------------------------------------------- *
 * Utilitaires purs (aucun effet de bord, aucun aléa).
 * ------------------------------------------------------------------------- */

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nodes(root, selectors) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const out = [];
  selectors.forEach((selector) => {
    try {
      const found = root.querySelectorAll(selector);
      for (let i = 0; i < found.length; i += 1) out.push(found[i]);
    } catch { /* sélecteur non reconnu : ignoré */ }
  });
  return out;
}

function hasText(node) {
  return Boolean(node && node.textContent && node.textContent.trim());
}

function styleOf(node) {
  try { return window.getComputedStyle(node); }
  catch { return null; }
}

function rgbParts(value) {
  if (!value) return null;
  const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function rgbAlpha(value) {
  if (!value) return 0;
  if (!/^rgba/i.test(value.trim())) return 1;
  const match = /rgba\([^)]*,\s*([\d.]+)\s*\)/i.exec(value);
  return match ? finite(match[1], 0) : 1;
}

function luminance(rgb) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const high = Math.max(l1, l2);
  const low = Math.min(l1, l2);
  return (high + 0.05) / (low + 0.05);
}

/* Premier fond opaque trouvé en remontant l'arbre, sinon repli sombre. */
function backdropOf(node) {
  let current = node;
  while (current && current.nodeType === 1) {
    const style = styleOf(current);
    const bg = style ? style.backgroundColor : 'transparent';
    if (rgbAlpha(bg) > 0.5) {
      const parts = rgbParts(bg);
      if (parts) return parts;
    }
    current = current.parentElement;
  }
  return [8, 10, 16];
}

/* ------------------------------------------------------------------------- *
 * Mesures — E095-02 à E095-08. Chaque mesure est autonome et défensive.
 * ------------------------------------------------------------------------- */

function measureTypography(root) {
  let min = Infinity;
  let small = 0;
  let total = 0;
  let worst = '';
  nodes(root, TYPO_SELECTORS).forEach((node) => {
    if (!hasText(node)) return;
    const style = styleOf(node);
    if (!style) return;
    const size = finite(parseFloat(style.fontSize), 0);
    if (size <= 0) return;
    total += 1;
    if (size < min) { min = size; worst = node.className || node.tagName; }
    if (size < FONT_FLOOR) small += 1;
  });
  return { min: Number.isFinite(min) ? min : 0, small, total, worst };
}

function measureLineLength(root) {
  const values = nodes(root, LINE_SELECTORS).map((node) => {
    if (!hasText(node)) return 0;
    const width = node.clientWidth || (node.getBoundingClientRect ? node.getBoundingClientRect().width : 0);
    if (!width) return 0;
    const style = styleOf(node);
    const size = style ? finite(parseFloat(style.fontSize), 14) : 14;
    return Math.round(width / (Math.max(size, 8) * 0.52));
  }).filter((value) => value > 0);
  if (!values.length) return { cpl: 0, samples: 0, inRange: 0 };
  const inRange = values.filter((v) => v >= CPL_MIN && v <= CPL_MAX).length;
  return {
    cpl: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    samples: values.length,
    inRange,
  };
}

function measureContrast(root) {
  let min = Infinity;
  let below = 0;
  let total = 0;
  nodes(root, CONTRAST_SELECTORS).forEach((node) => {
    if (!hasText(node)) return;
    const style = styleOf(node);
    if (!style) return;
    const fg = rgbParts(style.color);
    if (!fg) return;
    const ratio = contrastRatio(fg, backdropOf(node));
    total += 1;
    if (ratio < min) min = ratio;
    if (ratio < CONTRAST_MIN) below += 1;
  });
  return { min: Number.isFinite(min) ? Math.round(min * 100) / 100 : 0, below, total };
}

function measureHeadings(root) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return { h1: 0, h2: 0, h3: 0, ok: false };
  }
  const h1 = root.querySelectorAll('h1').length;
  const h2 = root.querySelectorAll('h2').length;
  const h3 = root.querySelectorAll('h3').length;
  return { h1, h2, h3, ok: h1 === 1 && h2 >= 1 && h3 >= 1 };
}

function wordsOf(root) {
  return nodes(root, LINE_SELECTORS.concat(['.event-card strong']))
    .map((node) => node.textContent || '')
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function measureReading(root) {
  const words = wordsOf(root);
  return { words, minutes: Math.max(1, Math.round(words / WPM)) };
}

function measureDensity(root) {
  const paragraphs = nodes(root, ['.point p']).filter(hasText);
  const chars = paragraphs.reduce((sum, node) => sum + (node.textContent || '').trim().length, 0);
  const points = paragraphs.length;
  const cards = nodes(root, ['.event-card']).length;
  return {
    points,
    cards,
    perPoint: points ? Math.round(chars / points) : 0,
  };
}

function measureTabular(root) {
  let withTabular = 0;
  let total = 0;
  nodes(root, TABULAR_SELECTORS).forEach((node) => {
    if (!hasText(node)) return;
    const style = styleOf(node);
    if (!style) return;
    total += 1;
    if (String(style.fontVariantNumeric || '').indexOf('tabular-nums') !== -1) withTabular += 1;
  });
  return { withTabular, total };
}

/* ------------------------------------------------------------------------- *
 * Score global — E095-01 et E095-09. Agrégation pondérée, déterministe.
 * ------------------------------------------------------------------------- */

function scoreAll(m) {
  const typography = clamp(Math.round(100 - (FONT_FLOOR - m.typo.min) * 12), 0, 100);
  const mid = (CPL_MIN + CPL_MAX) / 2;
  const lines = m.lines.cpl
    ? clamp(Math.round(100 - Math.abs(m.lines.cpl - mid) * 2), 0, 100)
    : 50;
  const contrast = m.contrast.min
    ? clamp(Math.round((m.contrast.min / CONTRAST_MIN) * 100), 0, 100)
    : 50;
  const headings = m.headings.ok ? 100 : 40;
  const tabular = m.tabular.total
    ? Math.round((m.tabular.withTabular / m.tabular.total) * 100)
    : 50;
  const global = Math.round(
    typography * 0.30 + lines * 0.20 + contrast * 0.25 + headings * 0.15 + tabular * 0.10
  );
  return { typography, lines, contrast, headings, tabular, global: clamp(global, 0, 100) };
}

/* ------------------------------------------------------------------------- *
 * DOM — nœuds à ID unique, réutilisés d'un rendu à l'autre (E095-10).
 * ------------------------------------------------------------------------- */

function ensureNode(id, tag, className, parent, make) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function ensureLine(parent, make, id, label) {
  const line = ensureNode(id, 'p', 'e095-line', parent, make);
  const key = ensureNode(`${id}-key`, 'span', 'e095-key', line, make);
  const value = ensureNode(`${id}-val`, 'span', 'e095-val', line, make);
  key.textContent = label;
  return value;
}

function buildPanel(root, make) {
  const host = (root && root.querySelector ? root.querySelector('#atlas-chrono-main') : null) || root;
  const panel = ensureNode('e095-panel', 'details', 'e095-panel', host, make);
  const summary = ensureNode('e095-summary', 'summary', 'e095-summary', panel, make);
  const body = ensureNode('e095-body', 'div', 'e095-body', panel, make);
  return {
    panel,
    summary,
    score: ensureLine(body, make, 'e095-score', 'Score global'),
    typography: ensureLine(body, make, 'e095-typography', 'Typographie'),
    small: ensureLine(body, make, 'e095-small', 'Sous le plancher'),
    lines: ensureLine(body, make, 'e095-lines', 'Longueur de ligne'),
    contrast: ensureLine(body, make, 'e095-contrast', 'Contraste'),
    headings: ensureLine(body, make, 'e095-headings', 'Hiérarchie des titres'),
    reading: ensureLine(body, make, 'e095-reading', 'Temps de lecture'),
    density: ensureLine(body, make, 'e095-density', 'Densité'),
    tabular: ensureLine(body, make, 'e095-tabular', 'Chiffres tabulés'),
    state: ensureLine(body, make, 'e095-state', 'État du greffon'),
  };
}

/* ------------------------------------------------------------------------- *
 * Feuille de style unique — toute règle est cadrée par [data-e095="on"].
 * Le panneau est un <details> refermé : aucun texte nouveau dans la lecture
 * ordinaire, mais un témoin visible à la demande et pilotable au clavier.
 * ------------------------------------------------------------------------- */

const RULES = `
.chronology-layout[data-e095="on"] .e095-panel {
  margin: 18px 0 4px; padding: 0 10px; border: 1px solid var(--line);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.5;
}
.chronology-layout[data-e095="on"] .e095-summary {
  min-height: 30px; padding: 6px 2px; cursor: pointer;
  color: var(--gold); font-size: 11px; font-weight: 600;
}
.chronology-layout[data-e095="on"] .e095-summary:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.chronology-layout[data-e095="on"] .e095-body {
  padding: 4px 2px 10px; font-variant-numeric: tabular-nums;
}
.chronology-layout[data-e095="on"] .e095-line {
  display: flex; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 4px;
}
.chronology-layout[data-e095="on"] .e095-key { flex: 0 0 132px; color: var(--muted-2); }
.chronology-layout[data-e095="on"] .e095-val { flex: 1 1 180px; color: var(--ink-soft); }
.chronology-layout[data-e095="on"] .e095-scoreline .e095-val {
  color: var(--gold-bright); font-weight: 600;
}
@media (prefers-reduced-motion:reduce) {
  .chronology-layout[data-e095="on"] .e095-panel,
  .chronology-layout[data-e095="on"] .e095-summary { transition: none !important; }
}`;

/* ------------------------------------------------------------------------- *
 * Point d'entrée du registre.
 * ------------------------------------------------------------------------- */

function apply(ctx) {
  if (!ctx || !ctx.layout) return;
  const layout = ctx.layout;
  const make = typeof ctx.el === 'function' ? ctx.el : null;
  if (!make) return;

  let reduced = false;
  try { reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion()); }
  catch { reduced = false; }

  renders += 1;
  ctx.css(CSS_ID, RULES);
  layout.dataset.e095 = 'on';
  layout.dataset.e095Reduced = reduced ? '1' : '0';
  layout.dataset.e095Renders = String(renders);

  const ui = buildPanel(layout, make);

  const m = {
    typo: measureTypography(layout),
    lines: measureLineLength(layout),
    contrast: measureContrast(layout),
    headings: measureHeadings(layout),
    reading: measureReading(layout),
    density: measureDensity(layout),
    tabular: measureTabular(layout),
  };
  const score = scoreAll(m);

  layout.dataset.e095Score = String(score.global);
  layout.dataset.e095MinFont = String(m.typo.min);
  layout.dataset.e095SmallCount = String(m.typo.small);
  layout.dataset.e095Cpl = String(m.lines.cpl);
  layout.dataset.e095Contrast = String(m.contrast.min);
  layout.dataset.e095Headings = m.headings.ok ? 'ok' : 'ko';
  layout.dataset.e095Readtime = String(m.reading.minutes);
  layout.dataset.e095Density = String(m.density.perPoint);
  layout.dataset.e095Tabular = String(m.tabular.withTabular);

  ui.panel.className = 'e095-panel' + (score.global < 60 ? ' is-low' : '');
  ui.summary.textContent = `Qualité de lecture · ${score.global}/100`;
  ui.score.parentNode.className = 'e095-line e095-scoreline';
  ui.score.setAttribute('role', 'status');
  ui.score.setAttribute('aria-live', 'polite');
  ui.score.textContent = `${score.global}/100 (typo ${score.typography} · lignes ${score.lines} · contraste ${score.contrast} · titres ${score.headings} · chiffres ${score.tabular})`;
  ui.typography.textContent = `Police minimale mesurée : ${m.typo.min} px sur ${m.typo.total} nœuds (plancher ${FONT_FLOOR} px)`;
  ui.small.textContent = `${m.typo.small} nœud(s) sous ${FONT_FLOOR} px${m.typo.worst ? ` · le plus fin : ${String(m.typo.worst).split(' ')[0]}` : ''}`;
  ui.lines.textContent = `${m.lines.cpl || '—'} caractères/ligne estimés (${m.lines.samples} blocs, ${m.lines.inRange} dans ${CPL_MIN}–${CPL_MAX})`;
  ui.contrast.textContent = `Ratio minimal : ${m.contrast.min || '—'}:1 (${m.contrast.below} sous ${CONTRAST_MIN}:1 sur ${m.contrast.total} mesurés)`;
  ui.headings.textContent = `h1 ${m.headings.h1} · h2 ${m.headings.h2} · h3 ${m.headings.h3} — ${m.headings.ok ? 'hiérarchie conforme' : 'hiérarchie à corriger'}`;
  ui.reading.textContent = `${m.reading.words} mots · environ ${m.reading.minutes} min à ${WPM} mots/min`;
  ui.density.textContent = `${m.density.points} point(s), ${m.density.cards} carte(s), ${m.density.perPoint} caractères/point`;
  ui.tabular.textContent = `${m.tabular.withTabular}/${m.tabular.total} valeurs en chiffres tabulés`;
  ui.state.textContent = `Rendu n° ${renders} · mouvement réduit ${reduced ? 'actif' : 'inactif'} · nœuds réutilisés, aucun timer ni rAF`;
}

register('E095', apply);
