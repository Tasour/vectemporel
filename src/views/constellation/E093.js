import { register } from './registry.js';

/* Lentille E093 — contraste visuel appliqué au champ d'étoiles de la vue
 * Constellation. Module autonome et tolérant : aucune dépendance réseau,
 * aucune source d'aléa, aucun appel de débogage, aucun minuteur ni boucle
 * d'animation propre. Aucun fichier partagé n'est modifié ; seul le layout
 * transmis par ctx est complété, après une garde d'entrée systématique.
 * Les étoiles de fond sont positionnées par des formules arithmétiques
 * déterministes, sans aucune source de hasard, reproductibles d'un rendu à l'autre.
 */

const STYLE_ID = 'constellation-e093';
const STARS_ID = 'e093-stars';
const PANEL_ID = 'e093-panel';
const TOGGLE_ID = 'e093-toggle';
const METRIC_ID = 'e093-metric';
const HELP_ID = 'e093-help';
const SVG_NS = 'http://www.w3.org/2000/svg';

const CSS = `
/* E093-01 — fond de champ à dégradé contrasté. */
.constellation-field.e093-field{
  background:radial-gradient(circle at 50% 42%,#1c2433 0%,#0b0f17 58%,#05070c 100%);
}
/* E093-02 — voile de lisibilité posé derrière les nœuds. */
.constellation-field.e093-field::before{
  content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(0,0,0,.30),rgba(0,0,0,0) 42%,rgba(0,0,0,.36));
}
/* E093-08 — accentuation du voile au survol ou au focus du champ. */
.constellation-field.e093-field[data-e093-focus="1"]::before{
  background:linear-gradient(180deg,rgba(0,0,0,.52),rgba(0,0,0,.08) 42%,rgba(0,0,0,.58));
}
/* E093-03 — couche d'étoiles déterministes, derrière les arêtes. */
.e093-stars{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.e093-star{fill:var(--e093-star-ink,#cfd8e6)}
/* E093-04 — opacité de l'encre calculée selon la magnitude. */
.e093-star[data-e093-tone="vif"]{opacity:.95}
.e093-star[data-e093-tone="discret"]{opacity:.55}
/* E093-05 — arêtes rehaussées pour se détacher du champ. */
.constellation-edges.e093-edges line{stroke:rgba(244,214,158,.30)}
.constellation-edges.e093-edges line.is-path{stroke:rgba(255,226,170,.90);stroke-width:1.9}
.constellation-edges.e093-edges line.is-moon{stroke:rgba(198,160,240,.55)}
.constellation-edges.e093-edges line.is-moon.is-path{stroke:rgba(206,176,247,.95)}
/* E093-06 — liseré des nœuds indépendant de leur couleur d'ère. */
.constellation-field .e093-node.const-sun,
.constellation-field .e093-node.const-planet{
  box-shadow:0 0 0 1px rgba(0,0,0,.85),0 0 10px rgba(0,0,0,.70);
}
.constellation-field .e093-node.const-moon{
  box-shadow:0 0 0 1px rgba(255,255,255,.35),0 0 8px rgba(0,0,0,.75);
}
/* E093-09 — mode nuit maximal et panneau de commande. */
.constellation-field.e093-field[data-e093-max="1"]{
  background:radial-gradient(circle at 50% 42%,#111724 0%,#05070c 55%,#000000 100%);
}
.constellation-field.e093-field[data-e093-max="1"] .e093-star{opacity:1}
#e093-panel{position:absolute;top:8px;right:8px;z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding:6px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.90);pointer-events:auto}
#e093-toggle{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
#e093-toggle[aria-pressed="true"]{border-color:#f0cf8f;background:rgba(240,207,143,.16);color:#f5e6c4}
#e093-toggle:focus-visible{outline:2px solid #f0cf8f;outline-offset:2px}
#e093-metric{max-width:230px;color:#cbd5e1;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;text-align:right}
/* E093-07 — texte réservé aux technologies d'assistance. */
.e093-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){#e093-panel{top:6px;right:6px;padding:4px}#e093-metric{max-width:150px;font-size:9px}}
`;

/* Exécution tolérante : un échec local ne doit jamais interrompre la lentille. */
function safe(fn) {
  try { return fn(); }
  catch { return null; }
}

function ensureNode(doc, id, tag, className, parent, factory) {
  let node = doc.getElementById(id);
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Lecture hexadécimale stricte pour le calcul WCAG des couleurs du champ. */
function hexToRgb(value) {
  if (typeof value !== 'string') return null;
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  const raw = match[1];
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

/* Luminance relative WCAG (coefficients 0,2126 / 0,7152 / 0,0722). */
function luminance(rgb) {
  if (!rgb) return null;
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(light, dark) {
  if (light == null || dark == null) return null;
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

register('E093', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout) return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.createElement !== 'function') return;

  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = doc.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Une seule feuille de style pour toute la lentille. */
  ctx.css(STYLE_ID, CSS);

  /* E093-01 — le fond contrasté est posé sur le champ lui-même. */
  safe(() => field.classList.add('e093-field'));

  /* E093-02 — le voile de lisibilité est mémorisé par un attribut. */
  safe(() => { field.dataset.e093Veil = '1'; });

  /* E093-03 — couche d'étoiles déterministes (formules entières, zéro aléa). */
  let stars = safe(() => field.querySelector('#' + STARS_ID));
  if (!stars && typeof doc.createElementNS === 'function') {
    stars = safe(() => {
      const svg = doc.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('id', STARS_ID);
      svg.setAttribute('class', 'e093-stars');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      field.insertBefore(svg, field.firstChild);
      return svg;
    });
  }
  if (stars && typeof stars.appendChild === 'function') {
    safe(() => {
      if (stars.childElementCount) return;
      const count = 48;
      for (let i = 0; i < count; i += 1) {
        const magnitude = ((i * 29 + 7) % 100) / 100;
        const circle = doc.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('class', 'e093-star');
        circle.setAttribute('cx', (((i * 37 + 11) % 97) + 1).toFixed(2));
        circle.setAttribute('cy', (((i * 61 + 29) % 97) + 1).toFixed(2));
        circle.setAttribute('r', (0.18 + magnitude * 0.32).toFixed(2));
        circle.setAttribute('data-e093-magnitude', magnitude.toFixed(2));
        stars.appendChild(circle);
      }
    });
  }

  /* E093-04 — l'encre de chaque étoile est déduite de sa magnitude calculée. */
  const starEls = stars && typeof stars.querySelectorAll === 'function'
    ? Array.from(stars.querySelectorAll('.e093-star'))
    : [];
  starEls.forEach((circle) => {
    const magnitude = parseFloat(circle.getAttribute('data-e093-magnitude')) || 0;
    const vivid = magnitude >= 0.5;
    safe(() => circle.style.setProperty('--e093-star-ink', vivid ? '#f5f1e6' : '#9fb0c8'));
    circle.setAttribute('data-e093-tone', vivid ? 'vif' : 'discret');
  });

  /* E093-05 — les arêtes du SVG reçoivent des traits plus contrastés. */
  safe(() => {
    const edges = field.querySelector('.constellation-edges');
    if (edges) edges.classList.add('e093-edges');
  });

  /* E093-06 — un liseré détache chaque nœud du champ d'étoiles. */
  safe(() => {
    const nodes = field.querySelectorAll('.const-sun, .const-planet, .const-moon');
    Array.from(nodes).forEach((node) => node.classList.add('e093-node'));
  });

  /* E093-07 — description vocale du code de contraste, fusion non destructive. */
  const help = safe(() => ensureNode(doc, HELP_ID, 'p', 'e093-sr', layout, factory));
  if (help) {
    help.textContent = 'Contraste du champ d’étoiles : un fond en dégradé sombre et un voile renforcent la lisibilité. Des étoiles de fond, fixes et numérotées par magnitude, sont claires ou discrètes. Les arêtes et les nœuds portent un liseré ; le mode nuit maximal assombrit encore le fond.';
    safe(() => {
      const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (described.indexOf(HELP_ID) < 0) {
        described.push(HELP_ID);
        field.setAttribute('aria-describedby', described.join(' '));
      }
    });
  }

  /* E093-08 — survol et focus accentuent le voile, sans doublon d'écouteurs. */
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  safe(() => {
    field.dataset.e093Motion = reduced ? 'reduce' : 'full';
    if (field.dataset.e093Bound === '1') return;
    field.dataset.e093Bound = '1';
    const setFocus = (on) => { field.dataset.e093Focus = on ? '1' : '0'; };
    field.addEventListener('mouseenter', () => setFocus(true));
    field.addEventListener('mouseleave', () => setFocus(false));
    field.addEventListener('focusin', () => setFocus(true));
    field.addEventListener('focusout', () => setFocus(false));
  });

  /* E093-09 — bascule indépendante du mode nuit maximal. */
  const panel = safe(() => ensureNode(doc, PANEL_ID, 'div', null, field, factory));
  let toggle = null;
  let metric = null;
  if (panel) {
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Commandes de contraste du champ d’étoiles');
    toggle = safe(() => ensureNode(doc, TOGGLE_ID, 'button', null, panel, factory));
    metric = safe(() => ensureNode(doc, METRIC_ID, 'p', null, panel, factory));
    if (toggle && !toggle.textContent) {
      toggle.type = 'button';
      toggle.textContent = 'Mode nuit maximal';
      toggle.setAttribute('aria-pressed', 'false');
    }
    if (metric) {
      metric.setAttribute('role', 'status');
      metric.setAttribute('aria-live', 'polite');
    }
  }
  safe(() => {
    if (toggle) toggle.setAttribute('aria-pressed', field.dataset.e093Max === '1' ? 'true' : 'false');
  });

  /* E093-10 — mesure de contraste annoncée, référencée au seuil AA 4,5:1. */
  const paintMetric = () => {
    if (!metric) return;
    const maximal = field.dataset.e093Max === '1';
    const baseLum = luminance(hexToRgb(maximal ? '#000000' : '#05070c'));
    let min = Infinity;
    ['#f5f1e6', '#9fb0c8'].forEach((ink) => {
      const value = contrastRatio(luminance(hexToRgb(ink)), baseLum);
      if (value != null && value < min) min = value;
    });
    const shown = Number.isFinite(min) ? min.toFixed(1).replace('.', ',') : '—';
    metric.textContent = `${starEls.length} étoiles · ratio min ${shown}:1 (repère AA 4,5:1) · mode ${maximal ? 'nuit maximal' : 'standard'}`;
  };

  safe(() => {
    if (!toggle || toggle.dataset.e093Bound === '1') return;
    toggle.dataset.e093Bound = '1';
    toggle.addEventListener('click', () => {
      const on = field.dataset.e093Max !== '1';
      field.dataset.e093Max = on ? '1' : '0';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      paintMetric();
    });
  });
  paintMetric();
});
