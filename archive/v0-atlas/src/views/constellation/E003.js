import { register } from './registry.js';

/* Lentille E003 — contraste visuel appliqué aux soleils de la vue Constellation.
 * Module autonome et tolérant : aucune dépendance réseau, aucune source d'aléa,
 * aucun appel de débogage, aucun minuteur ni boucle d'animation propre. Aucun
 * fichier partagé n'est modifié ; seul le layout fourni par ctx est complété.
 */

const STYLE_ID = 'constellation-e003';
const PANEL_ID = 'e003-panel';
const LEGEND_ID = 'e003-legend';
const TOGGLE_ID = 'e003-toggle';
const METRIC_ID = 'e003-metric';
const HELP_ID = 'e003-help';

const CSS = `
/* E003-01 — disque et encre lisibles quelle que soit la couleur d'ère. */
.const-sun.e003-sun{
  border:1px solid rgba(7,11,18,.9);
  border-radius:50%;
  background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.24),rgba(0,0,0,.36) 82%),var(--era,#5b6472);
  box-shadow:0 2px 9px rgba(0,0,0,.55);
  font-weight:700;
  text-shadow:0 1px 2px rgba(0,0,0,.8);
}
/* E003-02 — anneau du soleil actif, transition et survol. */
.const-sun.e003-sun.e003-active{
  border:2px solid #f0cf8f;
  box-shadow:0 0 0 3px rgba(240,207,143,.22),0 0 14px rgba(0,0,0,.7);
}
.constellation-field[data-e003-reduced="0"] .const-sun.e003-sun{transition:box-shadow .18s linear,border-color .18s linear}
.constellation-field[data-e003-reduced="1"] .const-sun.e003-sun{transition:none}
.const-sun.e003-sun[data-e003-hover="1"]{box-shadow:0 0 0 3px rgba(240,207,143,.34),0 0 18px rgba(0,0,0,.75)}
/* E003-03 — l'encre calculée est appliquée au chiffre. */
.const-sun.e003-sun{color:var(--e003-ink,#fff5e0)}
/* E003-04 — étiquette sur pastille opaque. */
.const-sun.e003-sun.e003-labelled::after{
  position:absolute;
  padding:1px 5px;border:1px solid rgba(230,185,111,.28);border-radius:6px;
  background:rgba(7,11,18,.92);color:#e8dcc4;font-size:9px;
}
/* E003-06 — pastille de rang lue depuis l'attribut. */
.const-sun.e003-sun::before{
  position:absolute;top:-6px;right:-8px;min-width:14px;height:14px;
  display:grid;place-items:center;border-radius:50%;
  background:#0b0f16;color:#f5e6c4;border:1px solid #e6b96f;
  font-size:8px;line-height:1;content:attr(data-e003-rank);
}
/* E003-09 — mode contraste renforcé. */
.constellation-field[data-e003-boost="1"] .const-sun.e003-sun{
  border:2px solid #fff2d4;
  background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.30),rgba(0,0,0,.50) 82%),var(--era,#5b6472);
  box-shadow:0 0 0 4px rgba(0,0,0,.55),0 0 16px rgba(0,0,0,.8);
}
#e003-panel{position:absolute;top:8px;right:8px;z-index:5;display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding:6px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.88);pointer-events:auto}
#e003-toggle{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
#e003-toggle[aria-pressed="true"]{border-color:#e6b96f;background:rgba(230,185,111,.16);color:#f5e6c4}
#e003-toggle:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
#e003-metric{max-width:220px;color:#cbd5e1;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;text-align:right}
.e003-legend{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:8px;color:var(--muted,#93a0b4);font-size:9px}
.e003-swatch{display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:-2px;margin-right:4px}
.e003-swatch.active{border:2px solid #f0cf8f;background:#7b5bd6;box-shadow:0 0 0 2px rgba(240,207,143,.20)}
.e003-swatch.idle{border:1px solid rgba(7,11,18,.9);background:#3f4a5b}
.e003-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){#e003-panel{top:6px;right:6px;padding:4px}#e003-metric{max-width:150px;font-size:9px}.e003-legend{font-size:8px}}
`;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/* Luminance relative WCAG, utilisée pour choisir l'encre d'un soleil. */
function luminance(red, green, blue) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/* Lecture tolérante des couleurs livrées (#rgb, #rrggbb, rgb(...)). */
function parseColor(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return {
        r: parseInt(raw.charAt(0) + raw.charAt(0), 16),
        g: parseInt(raw.charAt(1) + raw.charAt(1), 16),
        b: parseInt(raw.charAt(2) + raw.charAt(2), 16),
      };
    }
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(text);
  if (rgb) {
    return {
      r: clamp(parseInt(rgb[1], 10), 0, 255),
      g: clamp(parseInt(rgb[2], 10), 0, 255),
      b: clamp(parseInt(rgb[3], 10), 0, 255),
    };
  }
  return null;
}

function contrastRatio(light, dark) {
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

function ensureNode(id, tag, className, parent, factory) {
  let node = document.getElementById(id);
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

register('E003', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout) return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  if (typeof ctx.css !== 'function') return;
  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Une seule feuille de style pour toute la lentille. */
  ctx.css(STYLE_ID, CSS);

  /* E003-02 — état de mouvement mémorisé sur le champ, sans Animation propre. */
  field.dataset.e003Reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '1' : '0';

  const suns = Array.from(field.querySelectorAll('.const-layer-suns .const-sun'));
  let lightCount = 0;
  let darkCount = 0;
  let minRatio = Infinity;

  suns.forEach((sun, index) => {
    /* E003-01 — le disque à fond contrasté est posé sur chaque soleil. */
    sun.classList.add('e003-sun');

    /* E003-02 — l'ère sélectionnée reçoit son anneau dédié. */
    if (sun.classList.contains('is-active')) sun.classList.add('e003-active');

    /* E003-03 — l'encre est choisie par luminance WCAG et mémorisée. */
    const color = parseColor(sun.dataset.era || sun.style.getPropertyValue('--era'));
    if (color) {
      const lum = luminance(color.r, color.g, color.b);
      const inkIsDark = lum > 0.179;
      sun.style.setProperty('--e003-ink', inkIsDark ? '#0b0f16' : '#fff5e0');
      sun.dataset.e003Tone = inkIsDark ? 'clair' : 'sombre';
      const value = contrastRatio(lum, inkIsDark ? 0.004 : 1);
      if (value < minRatio) minRatio = value;
      if (inkIsDark) lightCount += 1;
      else darkCount += 1;
    } else {
      sun.dataset.e003Tone = 'neutre';
    }

    /* E003-04 — l'étiquette est emballée dans une pastille opaque. */
    if (sun.dataset.label) sun.classList.add('e003-labelled');

    /* E003-06 — le rang alimente la pastille ::before à fort contraste. */
    sun.dataset.e003Rank = String(index + 1);

    /* E003-07 — chaque soleil référence la description vocale du contraste. */
    const described = (sun.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (described.indexOf(HELP_ID) < 0) {
      described.push(HELP_ID);
      sun.setAttribute('aria-describedby', described.join(' '));
    }

    /* E003-08 — survol et focus accentuent le contraste, sans doublon. */
    if (sun.dataset.e003Bound !== '1') {
      sun.dataset.e003Bound = '1';
      sun.addEventListener('mouseenter', () => { sun.dataset.e003Hover = '1'; });
      sun.addEventListener('mouseleave', () => { sun.dataset.e003Hover = '0'; });
      sun.addEventListener('focus', () => { sun.dataset.e003Hover = '1'; });
      sun.addEventListener('blur', () => { sun.dataset.e003Hover = '0'; });
    }
  });

  /* E003-05 — légende à deux pastilles, témoin visible du code de contraste. */
  const legend = ensureNode(LEGEND_ID, 'div', 'e003-legend', layout, factory);
  if (!legend.childElementCount) {
    const activeSwatch = factory('span', 'e003-swatch active');
    const idleSwatch = factory('span', 'e003-swatch idle');
    activeSwatch.setAttribute('aria-hidden', 'true');
    idleSwatch.setAttribute('aria-hidden', 'true');
    legend.append(
      factory('span', null, 'Contraste des soleils :'),
      activeSwatch,
      factory('span', null, 'ère active'),
      idleSwatch,
      factory('span', null, 'ère inactive')
    );
  }

  /* E003-07 — description sr_only référencée par aria-describedby. */
  const help = ensureNode(HELP_ID, 'p', 'e003-sr', layout, factory);
  help.textContent = 'Contraste des soleils : la couleur de l’ère est conservée, mais l’encre du chiffre est sombre sur ère claire et claire sur ère sombre. Un anneau doré marque l’ère sélectionnée et une pastille numérotée donne le rang. Le mode renforcé épaissit les contours.';

  /* E003-09 — bascule indépendante de contraste renforcé. */
  const panel = ensureNode(PANEL_ID, 'div', null, field, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Commandes de contraste des soleils');
  const toggle = ensureNode(TOGGLE_ID, 'button', null, panel, factory);
  if (!toggle.textContent) {
    toggle.type = 'button';
    toggle.textContent = 'Contraste renforcé';
    toggle.setAttribute('aria-pressed', 'false');
  }
  const metric = ensureNode(METRIC_ID, 'p', null, panel, factory);
  metric.setAttribute('role', 'status');
  metric.setAttribute('aria-live', 'polite');
  toggle.setAttribute('aria-pressed', field.dataset.e003Boost === '1' ? 'true' : 'false');

  /* E003-10 — mesure agrégée, annoncée, référencée au seuil AA de 4,5:1. */
  const paintMetric = () => {
    const reference = Number.isFinite(minRatio) ? minRatio.toFixed(2) : '—';
    const mode = field.dataset.e003Boost === '1' ? 'renforcé' : 'standard';
    metric.textContent = `${suns.length} soleil${suns.length > 1 ? 's' : ''} · ${lightCount} clair${lightCount > 1 ? 's' : ''}/${darkCount} sombre${darkCount > 1 ? 's' : ''} · ratio min ${reference}:1 (repère AA 4,5:1) · mode ${mode}`;
  };

  if (toggle.dataset.e003Bound !== '1') {
    toggle.dataset.e003Bound = '1';
    toggle.addEventListener('click', () => {
      const on = field.dataset.e003Boost !== '1';
      field.dataset.e003Boost = on ? '1' : '0';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      paintMetric();
    });
  }
  paintMetric();
});
