import { register } from './registry.js';

/* Lentille E033 — vue GEOGRAPHIE.
 * Thème : isobares et pression atmosphérique.
 *
 * Les dix chantiers E033-01 … E033-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E033.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e033';
const PANEL_ID = 'geography-e033-panel';
const TITLE_ID = 'geography-e033-title';
const FACTS_ID = 'geography-e033-facts';
const TABLE_ID = 'geography-e033-table';
const SYSTEM_ID = 'geography-e033-system';
const ALT_ID = 'geography-e033-altitude';
const ALT_OUT_ID = 'geography-e033-altitude-value';
const SPACING_ID = 'geography-e033-spacing';
const SPACING_OUT_ID = 'geography-e033-spacing-value';
const CANVAS_ID = 'geography-e033-canvas';
const LEGEND_ID = 'geography-e033-legend';
const READOUT_ID = 'geography-e033-readout';
const PLAY_ID = 'geography-e033-play';
const BADGE_ID = 'geography-e033-badge';

/* ---------- Grandeurs canoniques : tout est recalculé, rien n'est fabriqué ---------- */

const P0 = 1013.25;          /* hPa — pression de référence au niveau de la mer (atmosphère normale) */
const R_GAS = 8.314462618;   /* J·mol⁻¹·K⁻¹ — constante des gaz parfaits */
const T0 = 288.15;           /* K — température de l'atmosphère standard au sol */
const M_AIR = 0.0289644;     /* kg·mol⁻¹ — masse molaire de l'air sec */
const G0 = 9.80665;          /* m·s⁻² — gravité standard */
const H_SCALE = (R_GAS * T0) / (M_AIR * G0);  /* ≈ 8 434,66 m — hauteur d'échelle */
const HALF_ALT = H_SCALE * Math.LN2;          /* ≈ 5 846 m — altitude de demi-pression */
const OMEGA = 7.2921159e-5;  /* rad·s⁻¹ — rotation terrestre */
const LATITUDE = 45;         /* degrés — hémisphère Nord */
const CORIOLIS = 2 * OMEGA * Math.sin((LATITUDE * Math.PI) / 180); /* ≈ 1,0313 × 10⁻⁴ s⁻¹ */
const RHO = 1.2;             /* kg·m⁻³ — densité de l'air au sol (hypothèse affichée) */
const DP = 4;                /* hPa — intervalle entre deux isobares */
const SPACING_REF = 400;     /* km — espacement de référence pour le vent */
const ALT_MAX = 6000;        /* m — borne haute du curseur d'altitude */

const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const RING_FRACTIONS = [0.18, 0.30, 0.42, 0.54, 0.66, 0.78, 0.90];
const RING_VALUES = {
  cyclone: [996, 1000, 1004, 1008, 1012, 1016, 1020],     /* centre bas, valeurs croissantes vers l'extérieur */
  anticyclone: [1024, 1020, 1016, 1012, 1008, 1004, 1000], /* centre haut, valeurs décroissantes vers l'extérieur */
};
const GRADIENT_VALUES = [996, 1000, 1004, 1008, 1012, 1016, 1020]; /* nord (bas) → sud (haut) en pression */

const SYSTEMS = {
  cyclone: {
    label: 'Dépression (cyclone)',
    dash: [5, 4],
    sens: 1,
    code: 'isobares en tirets, vent anti-horaire, air convergent et montant',
    aria: 'Dépression : isobares fermées en tirets, pression minimale au centre (996 hPa), valeurs croissantes vers l’extérieur, vent anti-horaire dans l’hémisphère Nord.',
    legende: 'Dépression (D), centre à 996 hPa : tirets, valeurs croissantes vers l’extérieur, vent anti-horaire ; convergence et air montant, temps souvent nuageux.',
  },
  anticyclone: {
    label: 'Anticyclone',
    dash: [],
    sens: -1,
    code: 'isobares en trait plein, vent horaire, air divergent et descendant',
    aria: 'Anticyclone : isobares fermées en trait plein, pression maximale au centre (1024 hPa), valeurs décroissantes vers l’extérieur, vent horaire dans l’hémisphère Nord.',
    legende: 'Anticyclone (A), centre à 1024 hPa : trait plein, valeurs décroissantes vers l’extérieur, vent horaire ; divergence et air descendant, temps souvent clair.',
  },
  gradient: {
    label: 'Isobares rectilignes (gradient)',
    dash: [1, 4],
    sens: 0,
    code: 'isobares en pointillés, vent vers l’est, dépression à gauche',
    aria: 'Gradient rectiligne : isobares parallèles en pointillés, 996 hPa au nord et 1020 hPa au sud, vent géostrophique vers l’est, dépression à gauche (loi de Buys Ballot).',
    legende: 'Gradient rectiligne : pointillés, 996 hPa au nord (haut) jusqu’à 1020 hPa au sud (bas) ; vent vers l’est, dépression à gauche (loi de Buys Ballot).',
  },
};
const ORDER = ['cyclone', 'anticyclone', 'gradient'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  system: 'cyclone',
  altitudeM: 1000,
  spacingKm: 200,       /* km — réglage par défaut, deux fois plus serré que la référence */
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes et formatage français ---------- */

const group = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const sup = (n) => String(n).split('').map((d) => SUP[d] || d).join('');
const pressureAt = (z) => P0 * Math.exp(-z / H_SCALE);
const ratioAt = (z) => Math.exp(-z / H_SCALE);
const metersPerHpa = () => H_SCALE / P0;
const gradientPaPerM = (spacingKm) => (DP * 100) / (spacingKm * 1000);
const gradientHpaPer100km = (spacingKm) => (DP * 100) / spacingKm;
const windMs = (spacingKm) => gradientPaPerM(spacingKm) / (RHO * CORIOLIS);
const windKmh = (spacingKm) => windMs(spacingKm) * 3.6;

function fmtPressure(hpa) {
  const parts = (Math.round(hpa * 100) / 100).toFixed(2).split('.');
  return `${group(parts[0])},${parts[1]}`;
}

function fmtSigned(hpa) {
  return `${hpa >= 0 ? '+' : '−'}${fmtPressure(Math.abs(hpa))}`;
}

function fmtSci(value, digits) {
  const exp = Math.floor(Math.log10(value));
  const mant = value / Math.pow(10, exp);
  return `${fmt2(mant)} × 10${sup(exp)}`;
}

/* ---------- E033-10 — feuille de style unique, contrôles et robustesse ---------- */

const CSS = `
#geography-e033-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e033-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e033-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e033-panel p{margin:5px 0;max-width:74ch}
#geography-e033-panel .geography-e033-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e033-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e033-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e033-table th,#geography-e033-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e033-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e033-system{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e033-system legend{padding:0 4px;color:var(--muted)}
#geography-e033-panel .geography-e033-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e033-panel .geography-e033-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e033-panel .geography-e033-reglage{margin:6px 0}
#geography-e033-panel .geography-e033-reglage label{display:inline-block;min-height:24px;color:var(--ink-soft,#d7d1c6)}
#geography-e033-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e033-panel .geography-e033-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e033-canvas{
  display:block;width:100%;height:280px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e033-legend{font-size:10px;color:var(--muted)}
#geography-e033-readout{
  min-height:64px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e033-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e033-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e033-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e033-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e033-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e033-panel[data-geography-e033-reduced="1"] button,
#geography-e033-panel[data-geography-e033-reduced="1"] .geography-e033-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e033-panel button,.geography-e033-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e033-panel{font-size:10px;padding:9px}
  #geography-e033-canvas{height:220px}
  #geography-e033-panel .geography-e033-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans animation) ---------- */

/* E033-01 — section sémantique d'introduction, lisible sans animation. */
function staticFacts(ctx) {
  const wrap = ctx.el('div', '', '');
  wrap.id = FACTS_ID;
  const faits = [
    'La pression atmosphérique est le poids de la colonne d’air qui s’exerce sur une unité de surface. La référence au niveau de la mer est de 1 013,25 hPa (une atmosphère normale) ; 1 hectopascal vaut 100 pascals.',
    'Une isobare relie les points de même pression, ramenée au niveau de la mer. Sur une carte, les isobares sont tracées tous les 4 hPa : plus elles sont serrées, plus le gradient de pression est fort et plus le vent géostrophique est rapide.',
    'Autour d’une dépression (D), l’air converge et monte : le temps est souvent nuageux ; autour d’un anticyclone (A), l’air descend et s’écarte : le temps est plus souvent clair. Dans l’hémisphère Nord, le vent tourne en sens anti-horaire autour d’une dépression et en sens horaire autour d’un anticyclone, en restant presque parallèle aux isobares (loi de Buys Ballot).',
  ];
  faits.forEach((texte) => {
    const p = ctx.el('p', 'geography-e033-fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

/* E033-02 — tableau pression–altitude recalculé par la formule barométrique. */
function staticTable(ctx) {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = `Pression estimée selon l’altitude par la formule barométrique p = p₀ · exp(−z/H), avec p₀ = ${fmtPressure(P0)} hPa et H = R·T/(M·g) ≈ ${group(Math.round(H_SCALE))} m. Référence : 0 m = ${fmtPressure(P0)} hPa, soit 1,00 fois.`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Altitude (m)', 'Pression (hPa)', 'Rapport à 0 m', 'Écart à p₀ (hPa)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const altitudes = [0, 1000, 2000, 3000, 5000, Math.round(HALF_ALT)];
  altitudes.forEach((z) => {
    const tr = document.createElement('tr');
    const p = pressureAt(z);
    const cells = [group(z), fmtPressure(p), fmt2(ratioAt(z)), fmtSigned(p - P0)];
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  void ctx;
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        cyclone: document.getElementById('geography-e033-system-cyclone'),
        anticyclone: document.getElementById('geography-e033-system-anticyclone'),
        gradient: document.getElementById('geography-e033-system-gradient'),
      },
      alt: document.getElementById(ALT_ID),
      altOut: document.getElementById(ALT_OUT_ID),
      spacing: document.getElementById(SPACING_ID),
      spacingOut: document.getElementById(SPACING_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e033-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Isobares et pression atmosphérique');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Lire une carte de pression, c’est relier la forme des isobares au vent et à l’altitude : la pression diminue avec la hauteur selon une loi exponentielle, et le vent souffle presque le long des isobares, d’autant plus fort qu’elles sont serrées.');

  /* E033-03 — sélecteur de configuration en choix unique (radiogroup natif). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = SYSTEM_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Configuration des isobares (choix unique)';
  fieldset.appendChild(legend);
  const radios = {};
  ORDER.forEach((key) => {
    const lab = ctx.el('label', 'geography-e033-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e033-system';
    radio.id = `geography-e033-system-${key}`;
    radio.value = key;
    radio.checked = S.system === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(SYSTEMS[key].label));
    fieldset.appendChild(lab);
    radios[key] = radio;
  });

  const sub = ctx.el('h3', '', 'Laboratoire — deux réglages deterministes');

  /* E033-04 — curseur d'altitude, pression par p = p₀·exp(−z/H). */
  const altRow = ctx.el('p', 'geography-e033-reglage');
  const altLabel = document.createElement('label');
  altLabel.setAttribute('for', ALT_ID);
  altLabel.appendChild(document.createTextNode('Altitude : '));
  const altOut = document.createElement('span');
  altOut.id = ALT_OUT_ID;
  altLabel.appendChild(altOut);
  altRow.appendChild(altLabel);

  const alt = document.createElement('input');
  alt.type = 'range';
  alt.id = ALT_ID;
  alt.min = '0';
  alt.max = String(ALT_MAX);
  alt.step = '100';
  alt.value = String(S.altitudeM);
  alt.setAttribute('aria-label', 'Altitude en mètres, de 0 à 6 000');

  /* E033-05 — curseur d'espacement, vent géostrophique V = |∇p|/(ρf). */
  const spaceRow = ctx.el('p', 'geography-e033-reglage');
  const spaceLabel = document.createElement('label');
  spaceLabel.setAttribute('for', SPACING_ID);
  spaceLabel.appendChild(document.createTextNode('Espacement entre isobares : '));
  const spacingOut = document.createElement('span');
  spacingOut.id = SPACING_OUT_ID;
  spaceLabel.appendChild(spacingOut);
  spaceRow.appendChild(spaceLabel);

  const spacing = document.createElement('input');
  spacing.type = 'range';
  spacing.id = SPACING_ID;
  spacing.min = '100';
  spacing.max = '500';
  spacing.step = '10';
  spacing.value = String(S.spacingKm);
  spacing.setAttribute('aria-label', 'Espacement entre deux isobares de 4 hPa, de 100 à 500 kilomètres');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique des isobares et profil vertical de pression. Flèches gauche et droite : changer de configuration ; flèches haut et bas : changer l’altitude ; Page précédente et Page suivante : changer l’espacement.');

  const legendText = ctx.el('p', 'geography-e033-legend');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e033-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’animation' : '▶ Animer le vent');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(ctx), staticTable(ctx), fieldset, sub,
    altRow, alt, spaceRow, spacing, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radios, alt, altOut, spacing, spacingOut, canvas, readout, play, legend: legendText };
}

/* ---------- Rendu du laboratoire (un seul canvas deterministe) ---------- */

function arrow(g, x1, y1, x2, y2, dash, color, width) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width || 2;
  if (g.setLineDash) g.setLineDash(dash || []);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const h = 7;
  if (g.setLineDash) g.setLineDash([]);
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5));
  g.lineTo(x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5));
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function drawCompass(g, geo) {
  const x = geo.L + 8;
  const y = geo.T + 14;
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x, y - 8); g.stroke();
  g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x - 3, y - 5); g.lineTo(x + 3, y - 5); g.closePath(); g.fill();
  g.font = '9px sans-serif';
  g.fillText('N', x - 3, y - 14);
  g.restore();
}

/* E033-06 — carte deterministe : isobares fermés ou rectilignes + profil vertical. */
function drawIsobars(g, geo) {
  const { L, mapR, T, B, cx, cy, rad } = geo;
  const sys = SYSTEMS[S.system];
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.78)';
  g.lineWidth = 1.2;
  if (g.setLineDash) g.setLineDash(sys.dash);
  g.font = '9px sans-serif';

  if (S.system === 'gradient') {
    const n = GRADIENT_VALUES.length;
    for (let i = 0; i < n; i += 1) {
      const y = T + 22 + (i * (B - T - 48)) / (n - 1);
      g.beginPath(); g.moveTo(L + 16, y); g.lineTo(mapR - 6, y); g.stroke();
      if (g.setLineDash) g.setLineDash([]);
      g.fillStyle = 'rgba(244,214,158,.9)';
      g.fillText(`${GRADIENT_VALUES[i]} hPa`, L + 18, y - 3);
      if (g.setLineDash) g.setLineDash(sys.dash);
    }
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText('Nord : basse pression', L + 18, T + 12);
    g.fillText('Sud : haute pression', L + 18, B - 6);
  } else {
    const values = RING_VALUES[S.system];
    for (let i = 0; i < RING_FRACTIONS.length; i += 1) {
      const r = rad * RING_FRACTIONS[i];
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      if (g.setLineDash) g.setLineDash([]);
      g.fillStyle = 'rgba(244,214,158,.9)';
      g.fillText(`${values[i]}`, cx + r * 0.70, cy - r * 0.70 - 2);
      if (g.setLineDash) g.setLineDash(sys.dash);
    }
    g.fillStyle = 'rgba(244,214,158,.98)';
    g.font = 'bold 15px sans-serif';
    g.fillText(S.system === 'cyclone' ? 'D' : 'A', cx - 4, cy + 5);
    g.font = '9px sans-serif';
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.fillText(S.system === 'cyclone' ? '996 hPa au centre' : '1 024 hPa au centre', cx - 38, cy + 20);
  }
  g.restore();
}

function drawWind(g, geo) {
  const { L, mapR, T, B, cx, cy, rad } = geo;
  const sys = SYSTEMS[S.system];
  const color = 'rgba(244,214,158,.92)';
  g.save();
  if (S.system === 'gradient') {
    for (let i = 0; i < GRADIENT_VALUES.length - 1; i += 1) {
      const y = T + 22 + (i * (B - T - 48)) / (GRADIENT_VALUES.length - 1) + (B - T - 48) / (2 * (GRADIENT_VALUES.length - 1));
      const x1 = L + (mapR - L) * 0.34;
      arrow(g, x1, y, x1 + Math.min(46, (mapR - L) * 0.30), y, [], color, 1.5);
    }
  } else {
    const r = rad * 0.54;
    for (let k = 0; k < 8; k += 1) {
      const a = (k * Math.PI) / 4;
      const x = cx + r * Math.cos(a);
      const y = cy - r * Math.sin(a);
      const dx = -Math.sin(a) * sys.sens;
      const dy = -Math.cos(a) * sys.sens;
      arrow(g, x - dx * 9, y - dy * 9, x + dx * 9, y + dy * 9, [], color, 1.5);
    }
  }
  g.restore();
}

function drawParticles(g, geo) {
  const { L, mapR, T, B, cx, cy, rad } = geo;
  const sys = SYSTEMS[S.system];
  g.save();
  g.fillStyle = 'rgba(230,185,111,.95)';
  if (S.system === 'gradient') {
    const span = mapR - L - 28;
    for (let i = 0; i < 12; i += 1) {
      const lane = i % (GRADIENT_VALUES.length - 1);
      const y = T + 22 + (lane * (B - T - 48)) / (GRADIENT_VALUES.length - 1) + (B - T - 48) / (2 * (GRADIENT_VALUES.length - 1));
      const t = ((i / 12) + S.phase) % 1;
      const x = L + 16 + t * span;
      g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
    }
  } else {
    for (let i = 0; i < 12; i += 1) {
      const r = rad * RING_FRACTIONS[1 + (i % (RING_FRACTIONS.length - 1))];
      const a = (i * Math.PI) / 6 + S.phase * sys.sens * Math.PI * 2;
      const x = cx + r * Math.cos(a);
      const y = cy - r * Math.sin(a);
      g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

function drawProfile(g, geo) {
  const { px, py, pw, ph } = geo;
  const top = py + 22;
  const bottom = py + ph - 18;
  g.save();
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(px, py, pw, ph);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '9px sans-serif';
  g.fillText('Profil vertical', px + 5, py + 12);
  g.beginPath(); g.moveTo(px + 12, top); g.lineTo(px + 12, bottom); g.stroke();
  [0, 2000, 4000, 6000].forEach((z) => {
    const y = bottom - (z / ALT_MAX) * (bottom - top);
    g.beginPath(); g.moveTo(px + 9, y); g.lineTo(px + 15, y); g.stroke();
    g.fillStyle = 'rgba(214,207,193,.8)';
    g.fillText(group(z), px + 18, y + 3);
  });
  const ym = bottom - (S.altitudeM / ALT_MAX) * (bottom - top);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.beginPath(); g.arc(px + 12, ym, 3, 0, Math.PI * 2); g.fill();
  g.fillText(`${group(S.altitudeM)} m`, px + 20, ym - 5);
  g.fillText(`${fmtPressure(pressureAt(S.altitudeM))} hPa`, px + 20, ym + 8);
  g.fillStyle = 'rgba(214,207,193,.8)';
  g.fillText('p = p₀·exp(−z/H)', px + 5, py + ph - 5);
  g.restore();
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 560;
  const cssH = cv.clientHeight || 280;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 12;
  const L = pad;
  const R = cssW - pad;
  const T = pad;
  const B = cssH - pad;
  const pw = Math.min(150, Math.max(88, (R - L) * 0.27));
  const px = R - pw;
  const py = T;
  const ph = B - T;
  const mapR = px - 10;
  const geo = {
    L, R, T, B, px, py, pw, ph, mapR,
    cx: L + (mapR - L) / 2,
    cy: T + (B - T) / 2,
    rad: Math.min((mapR - L) / 2, (B - T) / 2) * 0.92,
  };

  drawIsobars(g, geo);
  drawWind(g, geo);
  drawParticles(g, geo);
  drawCompass(g, geo);
  drawProfile(g, geo);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${SYSTEMS[S.system].label} — hémisphère Nord (${LATITUDE}°), ${DP} hPa entre isobares`, L + 2, B - 6);
}

/* E033-07 — grandeurs chiffrées comparées à une référence (région de statut). */
function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const p = pressureAt(S.altitudeM);
  const ratio = ratioAt(S.altitudeM);
  const grad = gradientHpaPer100km(S.spacingKm);
  const vms = windMs(S.spacingKm);
  const vref = windMs(SPACING_REF);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${group(S.altitudeM)} m, la pression vaut `));
  n.appendChild(fort(`${fmtPressure(p)} hPa`));
  n.appendChild(document.createTextNode(`, soit ${fmt2(ratio)} fois la référence de ${fmtPressure(P0)} hPa au niveau de la mer. Près du sol, la pression perd 1 hPa tous les ${fmt1(metersPerHpa())} m et se réduit de moitié vers ${group(Math.round(HALF_ALT))} m (hauteur d’échelle ${fmtSci(H_SCALE, 2)} m). `));
  n.appendChild(document.createTextNode(`Avec un espacement de ${group(S.spacingKm)} km entre isobares de ${DP} hPa, le gradient est de `));
  n.appendChild(fort(`${fmt2(grad)} hPa/100 km`));
  n.appendChild(document.createTextNode(` (${fmtSci(gradientPaPerM(S.spacingKm), 2)} Pa/m) et le vent géostrophique théorique atteint `));
  n.appendChild(fort(`${fmt1(vms)} m/s (${fmt1(vms * 3.6)} km/h)`));
  n.appendChild(document.createTextNode(`, contre ${fmt1(vref)} m/s (${fmt1(vref * 3.6)} km/h) pour la référence de ${group(SPACING_REF)} km. Hypothèses : air à ${fmt1(RHO)} kg/m³, latitude ${LATITUDE}°, frottement négligé ; le vent réel s’écarte un peu des isobares.`));
}

function syncControls() {
  const n = S.nodes;
  ORDER.forEach((key) => {
    if (n.radios && n.radios[key]) n.radios[key].checked = S.system === key;
  });
  if (n.alt) {
    n.alt.value = String(S.altitudeM);
    n.alt.setAttribute('aria-valuetext', `${group(S.altitudeM)} mètres, ${fmtPressure(pressureAt(S.altitudeM))} hectopascals`);
  }
  if (n.altOut) n.altOut.textContent = `${group(S.altitudeM)} m → ${fmtPressure(pressureAt(S.altitudeM))} hPa`;
  if (n.spacing) {
    n.spacing.value = String(S.spacingKm);
    n.spacing.setAttribute('aria-valuetext', `${group(S.spacingKm)} kilomètres pour 4 hectopascals`);
  }
  if (n.spacingOut) n.spacingOut.textContent = `${group(S.spacingKm)} km → ${fmt2(gradientHpaPer100km(S.spacingKm))} hPa/100 km`;
  if (n.legend) {
    n.legend.textContent = `${SYSTEMS[S.system].legende} Écart de ${DP} hPa entre isobares ; hémisphère Nord (${LATITUDE}°). ${SYSTEMS[S.system].code}.`;
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le vent';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.canvas) {
    n.canvas.setAttribute('aria-label', SYSTEMS[S.system].aria + ` À ${group(S.altitudeM)} m la pression est de ${fmtPressure(pressureAt(S.altitudeM))} hPa ; isobares espacées de ${group(S.spacingKm)} km pour ${DP} hPa, vent de ${fmt1(windMs(S.spacingKm))} m/s. Flèches gauche et droite : changer de configuration ; flèches haut et bas : changer l’altitude ; Page précédente et Page suivante : changer l’espacement.`);
  }
  updateReadout();
  drawLab();
}

/* ---------- E033-08 — boucle rAF unique, pause sur document.hidden ---------- */

let ctxReduced = null;

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  ctxReduced = ctx.reducedMotion;
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE033Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { stopLoop(); drawLab(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E033-09 — badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e033-badge', 'Cartouche pédagogique — isobares schématiques ramenés au niveau de la mer, écart de 4 hPa. Vent géostrophique idéalisé : frottement négligé, carte non à l’échelle.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E033', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE033Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radios[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.system = key;
        syncControls();
      });
    });
    n.alt.addEventListener('input', () => {
      S.altitudeM = Math.max(0, Math.min(ALT_MAX, Math.round(Number(n.alt.value) / 100) * 100));
      syncControls();
    });
    n.spacing.addEventListener('input', () => {
      S.spacingKm = Math.max(100, Math.min(500, Math.round(Number(n.spacing.value) / 10) * 10));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.system);
        S.system = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 100 : -100;
        S.altitudeM = Math.max(0, Math.min(ALT_MAX, S.altitudeM + step));
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const step = event.key === 'PageUp' ? 10 : -10;
        S.spacingKm = Math.max(100, Math.min(500, S.spacingKm + step));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing && !reduced) startLoop();
});
