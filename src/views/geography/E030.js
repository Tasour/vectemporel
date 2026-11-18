import { register } from './registry.js';

/* Lentille E030 — vue GEOGRAPHIE.
 * Thème : vents dominants et alizés.
 *
 * Les dix chantiers E030-01 … E030-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E030.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e030';
const PANEL_ID = 'geography-e030-panel';
const TITLE_ID = 'geography-e030-title';
const HEMI_ID = 'geography-e030-hemi';
const LAT_ID = 'geography-e030-lat';
const LAT_OUT_ID = 'geography-e030-lat-value';
const CANVAS_ID = 'geography-e030-canvas';
const READOUT_ID = 'geography-e030-readout';
const PLAY_ID = 'geography-e030-play';
const LEGEND_ID = 'geography-e030-legend';
const BADGE_ID = 'geography-e030-badge';
const TABLE_ID = 'geography-e030-table';

const OMEGA = 7.292e-5; /* rad/s : vitesse angulaire de la Terre (référence physique). */
const V_REF = 10;       /* m/s : vent modéré (force 5 de Beaufort), référence affichée. */
const SEED = 0xE030;    /* graine fixe et affichée, zéro tirage aléatoire. */

/* Ceintures idéalisées : style de trait = repère non chromatique. */
const ORDER_HEMI = ['nord', 'sud'];

const BELTS = {
  zcit: { label: 'ZCIT — convergence intertropicale', motif: 'trait continu', dash: [] },
  alize: { label: 'Alizé', motif: 'tirets longs', dash: [7, 5] },
  ouest: { label: 'Vent d’ouest', motif: 'pointillés', dash: [2, 4] },
  polaire: { label: 'Vent polaire d’est', motif: 'tiret-point', dash: [5, 2, 1, 2] },
};

/* Cellules méridiennes : surf = sens du vent au sol sur l'axe des latitudes
 * (1 vers le pôle nord / latitude croissante, -1 en sens inverse). */
const CELLS = [
  { from: -90, to: -60, surf: 1 },
  { from: -60, to: -30, surf: -1 },
  { from: -30, to: 0, surf: 1 },
  { from: 0, to: 30, surf: -1 },
  { from: 30, to: 60, surf: 1 },
  { from: 60, to: 90, surf: -1 },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  lat: 15,
  hemi: 'nord',
  playing: false,
  reduced: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARCELS = (() => {
  const r = mulberry32(SEED ^ 0x9E3779B9);
  return Array.from({ length: 20 }, () => ({ p: r(), s: 0.5 + r() * 1.5 }));
})();

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, digits = 2) => n.toFixed(digits).replace('.', ',');
const fmtLat = (lat) => `${lat > 0 ? '+' : lat < 0 ? '−' : ''}${Math.abs(lat)}°`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function beltOf(lat) {
  const a = Math.abs(lat);
  if (a < 2) return 'zcit';
  if (a < 30) return 'alize';
  if (a < 60) return 'ouest';
  return 'polaire';
}

/* Paramètre de Coriolis f = 2 Ω sin(φ), en s⁻¹ signé. */
function coriolis(lat) {
  return 2 * OMEGA * Math.sin((lat * Math.PI) / 180);
}

/* Vitesse schématique (m/s) : profil lisse, maximum au milieu de chaque
 * ceinture. Ce n'est pas un relevé de terrain, mais un modèle pédagogique. */
function speedOf(lat) {
  const key = beltOf(lat);
  const a = Math.abs(lat);
  if (key === 'zcit') return 2;
  if (key === 'alize') return 5 + 5 * Math.sin((Math.PI * a) / 30);
  if (key === 'ouest') return 6 + 4 * Math.sin((Math.PI * (a - 30)) / 30);
  return 4 + 2 * Math.sin((Math.PI * (a - 60)) / 30);
}

function measures(lat) {
  const speed = speedOf(lat);
  return {
    belt: beltOf(lat),
    f: coriolis(lat) * 1e5, /* en 10⁻⁵ s⁻¹, signé. */
    speed,
    pct: (speed / V_REF) * 100, /* comparaison au vent modéré de référence. */
    kmh: speed * 3.6,
  };
}

function shortWind(lat) {
  const key = beltOf(lat);
  const nord = !(lat < 0);
  if (key === 'zcit') return '↑ convergence';
  if (key === 'ouest') return nord ? 'SO → NE' : 'NO → SE';
  return nord ? 'NE → SO' : 'SE → NO'; /* alizés et vents polaires d'est. */
}

function windText(lat) {
  const key = beltOf(lat);
  const nord = !(lat < 0);
  if (key === 'zcit') return 'vents faibles et variables';
  if (key === 'alize') return nord ? 'du nord-est vers le sud-ouest' : 'du sud-est vers le nord-ouest';
  if (key === 'ouest') return nord ? 'du sud-ouest vers le nord-est' : 'du nord-ouest vers le sud-est';
  return nord ? 'du nord-est vers le sud-ouest' : 'du sud-est vers le nord-ouest';
}

function legendText() {
  const key = beltOf(S.lat);
  return `Ceinture ${BELTS[key].label} · flèches en ${BELTS[key].motif} · hémisphère ${
    S.hemi === 'nord' ? 'Nord (triangle vers le haut)' : 'Sud (triangle vers le bas)'
  } · vent ${windText(S.lat)}. Le trait et la forme identifient la ceinture, indépendamment de la couleur. Graine ${SEED} (${SEED.toString(16)}).`;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e030-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e030-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e030-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e030-panel p{margin:5px 0;max-width:68ch}
#geography-e030-panel .geography-e030-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e030-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e030-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e030-table th,#geography-e030-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e030-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e030-hemi{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e030-hemi legend{padding:0 4px;color:var(--muted)}
#geography-e030-panel .geography-e030-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e030-panel .geography-e030-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e030-lat{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e030-lat-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e030-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e030-legend{font-size:10px;color:var(--muted)}
#geography-e030-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e030-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e030-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e030-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e030-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e030-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e030-panel[data-geography-e030-reduced="1"] button,
#geography-e030-panel[data-geography-e030-reduced="1"] .geography-e030-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e030-panel button,.geography-e030-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e030-panel{font-size:10px;padding:9px}
  #geography-e030-canvas{height:190px}
  #geography-e030-panel .geography-e030-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un alizé est un vent d’est soutenu qui souffle des subtropicales vers l’équateur : du nord-est dans l’hémisphère nord, du sud-est dans l’hémisphère sud. Il appartient à la cellule de Hadley et converge vers la zone de convergence intertropicale (ZCIT), où l’air monte.',
    'La direction des vents dominants vient de la force de Coriolis : f = 2 Ω sin φ, avec Ω = 7,292 × 10⁻⁵ rad/s. L’air est dévié vers la droite dans l’hémisphère nord et vers la gauche dans l’hémisphère sud ; à l’équateur, f = 0.',
    'Trois ceintures se succèdent des pôles vers l’équateur : vents polaires d’est au-delà de 60°, vents d’ouest entre 30° et 60°, alizés entre 0° et 30°. Ce modèle est idéalisé : les vents réels varient avec les saisons, les continents et la topographie.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e030-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Ceintures de vents dominants idéalisées (référence : vent modéré de 10 m/s, force 5 de Beaufort).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Ceinture', 'Latitude', 'Vent au sol', 'Cellule'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Alizé (hémisphère Nord)', '0° – 30° N', 'Nord-est → sud-ouest', 'Hadley'],
    ['Alizé (hémisphère Sud)', '0° – 30° S', 'Sud-est → nord-ouest', 'Hadley'],
    ['Vent d’ouest', '30° – 60°', 'Sud-ouest → nord-est (N)', 'Ferrel'],
    ['Vent polaire d’est', '60° – 90°', 'Nord-est → sud-ouest (N)', 'Polaire'],
    ['ZCIT (référence f = 0)', '0° ± 2°', 'Vents faibles et variables', 'Convergence'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radioByKey: {
        nord: document.getElementById('geography-e030-hemi-nord'),
        sud: document.getElementById('geography-e030-hemi-sud'),
      },
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e030-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Vents dominants et alizés');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Du nord-est ou du sud-est vers l’équateur, les alizés ne sont pas des caprices locaux : ils sont la branche au sol d’une circulation planétaire. Changer de latitude permet de voir basculer la ceinture de vent, le sens de la déviation de Coriolis et le paramètre f qui la mesure.');

  /* E030-03 : choix unique natif, pas d'aria-pressed sur un radiogroupe. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = HEMI_ID;
  const legendElt = document.createElement('legend');
  legendElt.textContent = 'Hémisphère observé (choix unique)';
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  [['nord', 'Nord'], ['sud', 'Sud']].forEach(([key, label]) => {
    const lab = ctx.el('label', 'geography-e030-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e030-hemi';
    radio.id = 'geography-e030-hemi-' + key;
    radio.value = key;
    radio.checked = S.hemi === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
    radioByKey[key] = radio;
  });

  const sub = ctx.el('h3', '', 'Explorer la latitude');
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude signée φ = '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  /* E030-04 : curseur couvrant les deux hémisphères, de −90° à +90°. */
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '-90';
  lat.max = '90';
  lat.step = '1';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude signée, de moins 90 degrés au pôle Sud à plus 90 degrés au pôle Nord');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe méridienne schématique des cellules de circulation. Flèches gauche et droite : latitude ; flèches haut et bas : changer de cellule ; Début : équateur.');

  const legendTextNode = ctx.el('p', 'geography-e030-legend', legendText());
  legendTextNode.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e030-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la circulation' : '▶ Animer la circulation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, latRow, lat,
    canvas, legendTextNode, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radioByKey, lat, latOut, canvas, readout, play, legend: legendTextNode };
}

/* ---------- Rendu du laboratoire (un seul canvas, un seul dessin/frame) ---------- */

function arrow(g, x1, y1, x2, y2, style, dash) {
  g.strokeStyle = style;
  g.fillStyle = style;
  g.lineWidth = 1.1;
  if (g.setLineDash) g.setLineDash(dash || []);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const h = 5;
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5));
  g.lineTo(x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5));
  g.closePath();
  g.fill();
  if (g.setLineDash) g.setLineDash([]);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const xOf = (lat) => pad + ((lat + 90) / 180) * iw;
  const yTop = pad + 16;
  const yAloft = pad + 26;
  const ySurf = pad + ih * 0.80;

  const key = beltOf(S.lat);
  const m = measures(S.lat);

  /* Cadre et axe des latitudes. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.font = '9px sans-serif';
  g.textAlign = 'center';
  [-90, -60, -30, 0, 30, 60, 90].forEach((lat) => {
    const x = xOf(lat);
    g.beginPath();
    g.moveTo(x, ySurf);
    g.lineTo(x, ySurf + 4);
    g.stroke();
    g.fillStyle = 'rgba(214,207,193,.75)';
    g.fillText(fmtLat(lat), x, ySurf + 14);
  });
  g.textAlign = 'left';
  g.fillStyle = 'rgba(214,207,193,.55)';
  g.fillText('altitude', pad + 2, yAloft - 6);
  g.fillText('sol', pad + 2, ySurf - 4);

  /* E030-05 : cellules méridiennes, flèches calculées depuis CELLS. */
  CELLS.forEach((cell) => {
    const actif = S.lat >= cell.from && S.lat <= cell.to;
    const style = actif ? 'rgba(244,214,158,.9)' : 'rgba(214,207,193,.34)';
    const dash = actif ? BELTS[key].dash : [];
    const xa = xOf(cell.from);
    const xb = xOf(cell.to);
    const sx = cell.surf > 0 ? xa : xb;
    const ex = cell.surf > 0 ? xb : xa;
    arrow(g, sx, ySurf - 3, ex, ySurf - 3, style, dash);       /* vent au sol. */
    arrow(g, ex, yAloft, sx, yAloft, style, dash);              /* retour en altitude. */
    arrow(g, ex, ySurf - 6, ex, yAloft + 3, style, []);         /* montée. */
    arrow(g, sx, yAloft + 3, sx, ySurf - 6, style, []);         /* descente. */
  });

  /* E030-07 : parcelles d'air, positions déterministes = f(graine, S.sweep). */
  let cell = CELLS.find((c) => S.lat >= c.from && S.lat <= c.to) || CELLS[3];
  if (S.lat === 0) cell = S.hemi === 'nord' ? CELLS[3] : CELLS[2];
  g.fillStyle = 'rgba(244,214,158,.95)';
  PARCELS.forEach((p) => {
    const frac = (p.p + S.sweep * p.s) % 1;
    const lat = cell.surf > 0
      ? cell.from + frac * (cell.to - cell.from)
      : cell.to - frac * (cell.to - cell.from);
    g.fillRect(xOf(lat), ySurf - 1.5, 2, 2);
  });

  /* Repère de latitude : trait vertical et triangle d'hémisphère (E030-08). */
  const mx = xOf(S.lat);
  g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.beginPath();
  g.moveTo(mx, yTop);
  g.lineTo(mx, ySurf + 4);
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  if (S.hemi === 'nord') {
    g.moveTo(mx, yTop - 7); g.lineTo(mx - 5, yTop + 2); g.lineTo(mx + 5, yTop + 2);
  } else {
    g.moveTo(mx, yTop + 8); g.lineTo(mx - 5, yTop - 1); g.lineTo(mx + 5, yTop - 1);
  }
  g.closePath();
  g.stroke();

  /* Flèche de vent au sol, style de trait = ceinture. */
  const cx = clamp(mx, pad + 24, pad + iw - 24);
  const ay = ySurf + 24;
  const nord = !(S.lat < 0);
  let ax1; let ay1; let ax2; let ay2;
  if (key === 'zcit') {
    ax1 = cx; ay1 = ay + 8; ax2 = cx; ay2 = ay - 9;
  } else if (key === 'ouest') {
    ax1 = cx - 20; ay1 = nord ? ay + 10 : ay - 10;
    ax2 = cx + 20; ay2 = nord ? ay - 10 : ay + 10;
  } else {
    ax1 = cx + 20; ay1 = nord ? ay - 10 : ay + 10;
    ax2 = cx - 20; ay2 = nord ? ay + 10 : ay - 10;
  }
  arrow(g, ax1, ay1, ax2, ay2, 'rgba(244,214,158,.95)', BELTS[key].dash);

  /* Libellés canvas, doublés par le texte DOM lisible. */
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(`${BELTS[key].label} · ${fmtLat(S.lat)} · ${shortWind(S.lat)}`, pad + 2, pad + 7);
  g.font = '9px sans-serif';
  g.fillText(`f = ${fmt(m.f, 2)} × 10⁻⁵ s⁻¹ · graine ${SEED}`, pad + 2, pad + ih - 4);
}

/* ---------- Grandeurs chiffrées comparées à une référence (E030-06) ---------- */

function updateReadout() {
  const m = measures(S.lat);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Latitude '));
  n.appendChild(fort(fmtLat(S.lat)));
  n.appendChild(document.createTextNode(` (hémisphère ${S.hemi === 'nord' ? 'Nord' : 'Sud'}) · ceinture `));
  n.appendChild(fort(BELTS[m.belt].label));
  n.appendChild(document.createTextNode(`, vent ${windText(S.lat)}. Paramètre de Coriolis f = 2 Ω sin φ = `));
  n.appendChild(fort(`${fmt(m.f, 2)} × 10⁻⁵ s⁻¹`));
  n.appendChild(document.createTextNode(' (Ω = 7,292 × 10⁻⁵ rad/s ; référence : f = 0 à l’équateur). Vitesse schématique '));
  n.appendChild(fort(`${fmt(m.speed, 1)} m/s`));
  n.appendChild(document.createTextNode(', soit '));
  n.appendChild(fort(`${Math.round(m.pct)} %`));
  n.appendChild(document.createTextNode(' du vent modéré de référence (10 m/s, force 5 de Beaufort), ou '));
  n.appendChild(fort(`${fmt(m.kmh, 1)} km/h`));
  n.appendChild(document.createTextNode('.'));
}

function syncControls() {
  const n = S.nodes;
  ORDER_HEMI.forEach((k) => {
    const radio = n.radioByKey && n.radioByKey[k];
    if (radio) radio.checked = k === S.hemi;
  });
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = fmtLat(S.lat);
  if (n.legend) n.legend.textContent = legendText();
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la circulation' : '▶ Animer la circulation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden (E030-07) ---------- */

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
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !S.reduced) S.sweep = (S.sweep + dt * 0.00035) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE030Reduced = S.reduced ? '1' : '0';
        if (S.reduced) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel sur la carte existante (E030-09) ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e030-badge',
    'Coupe méridienne schématique : les flèches illustrent la circulation idéalisée, ce ne sont pas des relevés de vent.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E030', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.dataset.geographyE030Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER_HEMI.forEach((key) => {
      const radio = n.radioByKey[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.hemi = key;
        S.lat = key === 'nord' ? 15 : -15;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value)), -90, 90);
      if (S.lat > 0) S.hemi = 'nord';
      else if (S.lat < 0) S.hemi = 'sud';
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
        const step = event.key === 'ArrowRight' ? 5 : -5;
        S.lat = clamp(S.lat + step, -90, 90);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 15 : -15;
        S.lat = clamp(S.lat + step, -90, 90);
      } else if (event.key === 'Home') {
        S.lat = 0;
      } else {
        used = false;
      }
      if (used) {
        if (S.lat > 0) S.hemi = 'nord';
        else if (S.lat < 0) S.hemi = 'sud';
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
