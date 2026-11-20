import { register } from './registry.js';

/* Lentille V2 E003 — audit du contraste des soleils de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni
   source aléatoire. Le module reste passif : ni minuteur ni boucle propre. */

const STYLE_ID = 'constellation-v2-e003';
const PANEL_ID = 'v2e003-console';
const VISION_KEY = '__v2e003_vision';

const CSS = `
/* Teinte, motif et halo sont sélectionnés par le mode de vision courant. */
.const-sun.v2e003-audit{color:var(--v2e003-ink-normale,#fff5e0);border-style:var(--v2e003-pattern-normale,solid);filter:var(--v2e003-halo-normale,none)}
.constellation-field[data-v2e003-vision="protanopie"] .const-sun.v2e003-audit{color:var(--v2e003-ink-protanopie,#fff5e0);border-style:var(--v2e003-pattern-protanopie,solid);filter:var(--v2e003-halo-protanopie,none)}
.constellation-field[data-v2e003-vision="deuteranopie"] .const-sun.v2e003-audit{color:var(--v2e003-ink-deuteranopie,#fff5e0);border-style:var(--v2e003-pattern-deuteranopie,solid);filter:var(--v2e003-halo-deuteranopie,none)}
.constellation-field[data-v2e003-vision="tritanopie"] .const-sun.v2e003-audit{color:var(--v2e003-ink-tritanopie,#fff5e0);border-style:var(--v2e003-pattern-tritanopie,solid);filter:var(--v2e003-halo-tritanopie,none)}
/* Signal de contraste faible : un chiffre « ! », jamais une couleur seule. */
.v2e003-warn{display:none;position:absolute;right:-10px;bottom:-10px;min-width:16px;height:16px;place-items:center;border:2px solid #0b0f16;border-radius:50%;background:#fff2d4;color:#0b0f16;font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 0 0 2px rgba(11,15,22,.55)}
.constellation-field[data-v2e003-vision="normale"] .v2e003-warn[data-v2e003-mode="normale"]{display:grid}
.constellation-field[data-v2e003-vision="protanopie"] .v2e003-warn[data-v2e003-mode="protanopie"]{display:grid}
.constellation-field[data-v2e003-vision="deuteranopie"] .v2e003-warn[data-v2e003-mode="deuteranopie"]{display:grid}
.constellation-field[data-v2e003-vision="tritanopie"] .v2e003-warn[data-v2e003-mode="tritanopie"]{display:grid}
/* Encre de l'étiquette calculée sur la pastille opaque. */
.const-sun.v2e003-audit.v2e003-labelled::after{color:var(--v2e003-label-ink,#e8dcc4)}
/* Console d'audit, ancrée dans le champ, sans couvrir les soleils. */
#v2e003-console{position:absolute;left:8px;bottom:8px;z-index:6;display:flex;flex-direction:column;gap:6px;max-width:min(340px,94%);padding:8px;border:1px solid rgba(230,185,111,.4);border-radius:8px;background:rgba(7,11,18,.95);color:#e8dcc4;font-size:10px;pointer-events:auto}
.v2e003-visions{display:flex;flex-wrap:wrap;gap:4px}
.v2e003-vision{min-width:36px;min-height:36px;padding:0 8px;border:1px solid #5b6472;border-radius:6px;background:#141a24;color:#cfd8e6;font-size:10px;cursor:pointer}
.v2e003-vision:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.v2e003-vision[aria-checked="true"]{border-color:#e6b96f;background:rgba(230,185,111,.18);color:#fff2d4;font-weight:700}
.v2e003-bar{height:10px;border:1px solid #5b6472;border-radius:6px;background:#0b0f16;overflow:hidden}
.v2e003-bar>i{display:block;height:100%;background:#e6b96f}
.v2e003-metric{margin:0;color:#cbd5e1;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.v2e003-scroll{max-height:150px;overflow:auto}
.v2e003-table{border-collapse:collapse;width:100%;font:9px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:#cbd5e1}
.v2e003-table caption{text-align:left;padding-bottom:4px;color:#e8dcc4;font-size:10px}
.v2e003-table th,.v2e003-table td{border:1px solid #3a4150;padding:2px 4px;text-align:left;white-space:nowrap}
.v2e003-table th{color:#f5e6c4}
@media (max-width:620px){#v2e003-console{max-width:96%;padding:6px}.v2e003-table{font-size:8px}}
@media (prefers-reduced-motion: reduce){.const-sun.v2e003-audit{transition:none!important}}
`;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/* Lecture tolérante des couleurs livrées par la vue (#rgb, #rrggbb, rgb(...)). */
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

function luminance(red, green, blue) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(light, dark) {
  const high = Math.max(light, dark);
  const low = Math.min(light, dark);
  return (high + 0.05) / (low + 0.05);
}

/* Matrices de simulation de daltonisme, appliquées en RVB linéaire approché. */
const MATRICES = {
  normale: null,
  protanopie: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopie: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopie: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

const MODES = [
  ['normale', 'Normale'],
  ['protanopie', 'Protanopie'],
  ['deuteranopie', 'Déutéranopie'],
  ['tritanopie', 'Tritanopie'],
];

const INK_DARK = '#0b0f16';
const INK_LIGHT = '#fff5e0';
const INK_DARK_LUM = luminance(11, 15, 22);
const INK_LIGHT_LUM = luminance(255, 245, 224);

function ensureNode(id, tag, className, parent, factory) {
  let node = document.getElementById(id);
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

register('E003', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;
  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  css(STYLE_ID, CSS);

  const suns = Array.from(field.querySelectorAll('.const-layer-suns .const-sun'));
  if (!suns.length) return;

  const panel = ensureNode(PANEL_ID, 'div', null, field, factory);
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Audit du contraste des soleils');

  let vision = 'normale';
  try {
    if (typeof window !== 'undefined' && MATRICES[window[VISION_KEY]]) vision = window[VISION_KEY];
  } catch (erreur) {
    vision = 'normale';
  }
  field.dataset.v2e003Vision = vision;

  /* E003-01 — Luminance du fond de champ, relevée une fois et référencée. */
  const computed = typeof window !== 'undefined' && window.getComputedStyle
    ? window.getComputedStyle(field) : null;
  const fieldColor = computed ? parseColor(computed.backgroundColor) : null;
  const fieldLum = fieldColor
    ? luminance(fieldColor.r, fieldColor.g, fieldColor.b)
    : luminance(11, 15, 22);
  field.dataset.v2e003FieldLum = fieldLum.toFixed(4);

  /* E003-02 — Mesure déterministe : ratio, grade AA/AAA et motif par mode. */
  function measure(color, mode) {
    const matrix = MATRICES[mode];
    const seen = matrix && color
      ? {
          r: clamp(matrix[0] * color.r + matrix[1] * color.g + matrix[2] * color.b, 0, 255),
          g: clamp(matrix[3] * color.r + matrix[4] * color.g + matrix[5] * color.b, 0, 255),
          b: clamp(matrix[6] * color.r + matrix[7] * color.g + matrix[8] * color.b, 0, 255),
        }
      : color;
    const seenLum = seen
      ? luminance(seen.r, seen.g, seen.b)
      : luminance(92, 100, 114);
    const dark = seenLum > 0.179;
    const inkLum = dark ? INK_DARK_LUM : INK_LIGHT_LUM;
    const ratio = contrastRatio(seenLum, inkLum);
    let grade = 'insuffisant';
    if (ratio >= 7) grade = 'AAA';
    else if (ratio >= 4.5) grade = 'AA';
    else if (ratio >= 3) grade = 'AA large';
    let pattern = 'solid';
    if (seenLum < 0.12) pattern = 'double';
    else if (seenLum < 0.33) pattern = 'dotted';
    else if (seenLum < 0.66) pattern = 'dashed';
    return { seenLum, ink: dark ? INK_DARK : INK_LIGHT, ratio, grade, pattern };
  }

  /* E003-03 — Signal textuel des soleils sous 4,5:1, jamais par la couleur. */
  function markLow(sun, mode, low) {
    let warn = sun.querySelector('.v2e003-warn[data-v2e003-mode="' + mode + '"]');
    if (low && !warn) {
      warn = factory('span', 'v2e003-warn', '!');
      warn.setAttribute('data-v2e003-mode', mode);
      warn.setAttribute('aria-hidden', 'true');
      sun.appendChild(warn);
    }
    if (!low && warn && warn.parentNode) warn.parentNode.removeChild(warn);
  }

  /* E003-04 — Encre simulée par mode et commande de vision à choix unique. */
  function setInk(sun, mode, ink) {
    sun.style.setProperty('--v2e003-ink-' + mode, ink);
  }
  const group = ensureNode('v2e003-visions', 'div', 'v2e003-visions', panel, factory);
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Simulation de vision pour le contraste');
  const buttons = MODES.map((entry) => {
    const mode = entry[0];
    let button = group.querySelector('button[data-v2e003-vision="' + mode + '"]');
    if (!button) {
      button = factory('button', 'v2e003-vision', entry[1]);
      button.type = 'button';
      button.setAttribute('data-v2e003-vision', mode);
      group.appendChild(button);
    }
    button.setAttribute('role', 'radio');
    return button;
  });
  function selectMode(index) {
    vision = MODES[index][0];
    if (typeof window !== 'undefined') {
      try { window[VISION_KEY] = vision; } catch (erreur) { /* stockage indisponible */ }
    }
    field.dataset.v2e003Vision = vision;
    buttons.forEach((button, i) => {
      button.setAttribute('aria-checked', i === index ? 'true' : 'false');
      button.tabIndex = i === index ? 0 : -1;
    });
  }
  selectMode(Math.max(0, MODES.findIndex(entry => entry[0] === vision)));
  if (group.dataset.v2e003Bound !== '1') {
    group.dataset.v2e003Bound = '1';
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => selectMode(index));
      button.addEventListener('keydown', (event) => {
        if (!event || event.altKey || event.ctrlKey || event.metaKey) return;
        let next = -1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        else return;
        event.preventDefault();
        event.stopPropagation();
        selectMode(next);
        buttons[next].focus({ preventScroll: true });
      });
    });
  }

  /* E003-05 — Motif de bordure distinct, lisible sans la couleur d'ère. */
  function setPattern(sun, mode, pattern) {
    sun.style.setProperty('--v2e003-pattern-' + mode, pattern);
    sun.setAttribute('data-v2e003-pattern-' + mode, pattern);
  }

  /* E003-06 — Contraste du badge de rang vérifié sur son fond sombre. */
  const rankRatio = contrastRatio(INK_LIGHT_LUM, luminance(11, 15, 22));
  field.dataset.v2e003RankRatio = rankRatio.toFixed(2);

  /* E003-07 — Halo d'isolement adaptatif au contraste disque / champ. */
  function setHalo(sun, mode, seenLum) {
    const fieldRatio = contrastRatio(Math.max(seenLum, fieldLum), Math.min(seenLum, fieldLum));
    sun.setAttribute('data-v2e003-field-ratio-' + mode, fieldRatio.toFixed(2));
    const halo = fieldRatio < 3
      ? 'drop-shadow(0 0 3px ' + (fieldLum > seenLum ? INK_DARK : INK_LIGHT) + ')'
      : 'none';
    sun.style.setProperty('--v2e003-halo-' + mode, halo);
  }

  /* E003-08 — Encre de l'étiquette recalculée sur la pastille opaque. */
  function setLabelInk(sun) {
    const pillLum = luminance(7, 11, 18);
    const pillInk = pillLum > 0.179 ? INK_DARK : INK_LIGHT;
    if (sun.dataset.label) sun.classList.add('v2e003-labelled');
    sun.style.setProperty('--v2e003-label-ink', pillInk);
    sun.setAttribute('data-v2e003-label-ratio',
      contrastRatio(pillLum, pillInk === INK_DARK ? INK_DARK_LUM : INK_LIGHT_LUM).toFixed(2));
  }

  const tableRows = [];
  let conformes = 0;
  let worst = Infinity;
  suns.forEach((sun, index) => {
    sun.classList.add('v2e003-audit');
    const color = parseColor(sun.dataset.era || sun.style.getPropertyValue('--era'));
    const baseLabel = sun.getAttribute('aria-label') || '';
    sun.setAttribute('data-v2e003-base-label', baseLabel);
    setLabelInk(sun);
    const cells = [];
    const lowModes = [];
    MODES.forEach((entry) => {
      const mode = entry[0];
      const m = measure(color, mode);
      setInk(sun, mode, m.ink);
      setPattern(sun, mode, m.pattern);
      setHalo(sun, mode, m.seenLum);
      markLow(sun, mode, m.ratio < 4.5);
      sun.setAttribute('data-v2e003-ratio-' + mode, m.ratio.toFixed(2));
      sun.setAttribute('data-v2e003-grade-' + mode, m.grade);
      if (m.ratio >= 4.5) conformes += 1;
      else lowModes.push(entry[1]);
      if (m.ratio < worst) worst = m.ratio;
      cells.push(m.ratio.toFixed(2) + ':1 ' + m.grade);
    });
    const suffix = lowModes.length
      ? ' — contraste sous 4,5:1 en vision ' + lowModes.join(', ') + '.'
      : '';
    sun.setAttribute('aria-label', baseLabel + suffix);
    sun.setAttribute('data-v2e003-index', String(index + 1));
    tableRows.push([
      String(index + 1) + ' · ' + (sun.dataset.label || ''),
    ].concat(cells));
  });

  /* E003-09 — Barre de conformité AA, référencée au seuil 4,5:1. */
  const bar = ensureNode('v2e003-bar', 'div', 'v2e003-bar', panel, factory);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Conformité AA du contraste des soleils');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(suns.length * MODES.length));
  bar.setAttribute('aria-valuenow', String(conformes));
  bar.setAttribute('aria-valuetext',
    conformes + ' cas conformes sur ' + (suns.length * MODES.length) + ' au seuil AA 4,5:1');
  let fill = bar.firstElementChild;
  if (!fill) {
    fill = factory('i', null);
    bar.appendChild(fill);
  }
  fill.style.width = Math.round((conformes / (suns.length * MODES.length)) * 100) + '%';

  const metric = ensureNode('v2e003-metric', 'p', 'v2e003-metric', panel, factory);
  metric.setAttribute('role', 'status');
  metric.setAttribute('aria-live', 'polite');
  metric.setAttribute('aria-atomic', 'true');
  metric.textContent = conformes + '/' + (suns.length * MODES.length)
    + ' conformes AA · ratio min ' + (Number.isFinite(worst) ? worst.toFixed(2) : '—')
    + ':1 (repère 4,5:1) · fond ' + fieldLum.toFixed(3)
    + ' · badge de rang ' + rankRatio.toFixed(2) + ':1';

  /* E003-10 — Tableau de synthèse : chaque mode, chaque soleil, par texte. */
  const scroll = ensureNode('v2e003-scroll', 'div', 'v2e003-scroll', panel, factory);
  const table = ensureNode('v2e003-table', 'table', 'v2e003-table', scroll, factory);
  if (!table.querySelector('caption')) {
    const caption = factory('caption', null,
      'Contraste des soleils par vision — seuils AA 4,5:1 et AAA 7:1');
    table.appendChild(caption);
    const head = factory('thead', null);
    const headRow = factory('tr', null);
    ['Ère', 'Normale', 'Protanopie', 'Déutéranopie', 'Tritanopie'].forEach((name) => {
      headRow.appendChild(factory('th', null, name));
    });
    head.appendChild(headRow);
    table.appendChild(head);
  }
  let body = table.querySelector('tbody');
  if (!body) {
    body = factory('tbody', null);
    table.appendChild(body);
  }
  while (body.firstChild) body.removeChild(body.firstChild);
  tableRows.forEach((row) => {
    const tr = factory('tr', null);
    row.forEach((value) => tr.appendChild(factory('td', null, value)));
    body.appendChild(tr);
  });
});
