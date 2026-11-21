import { register } from './registry.js';

/* Lentille V2 E030 — vue GEOGRAPHIE.
 * Thème : vents dominants et alizés, circulation idéalisée à trois cellules.
 *
 * Les dix chantiers E030-01 … E030-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction + limite falsifiable (lisible sans JS)
 *  02 tableau des ceintures de vents dominants
 *  03 sélecteur d'hémisphère en radiogroup à choix unique
 *  04 curseur de latitude signée et calcul de ceinture
 *  05 coupe méridienne canvas calculée par formules déterministes
 *  06 grandeurs chiffrées comparées à une référence (readout live)
 *  07 boucle rAF unique + pause sur document.hidden
 *  08 codes visuels non chromatiques (traits + formes + libellés)
 *  09 badge textuel sur la carte existante, garde anti-doublon
 *  10 accessibilité, mouvement réduit et robustesse d'état
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire, aucun journal.
 * Le contenu pédagogique est du texte sémantique inséré dans le DOM : il reste
 * lisible et indexable même sans animation ni interaction. Le canvas n'est
 * qu'un laboratoire dont chaque grandeur est aussi écrite en toutes lettres.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e030';
const P = 'geography-v2-e030';

const OMEGA = 7.292e-5; /* rad/s : vitesse angulaire de la Terre (référence physique). */
const V_REF = 10;       /* m/s : vent modéré (force 5 de Beaufort), référence affichée. */
const SEED = 0xE030;    /* graine fixe et affichée, zéro tirage aléatoire. */

/* Ceintures idéalisées : le style de trait est un repère non chromatique. */
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
  visBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- E030-05 : générateur déterministe (mulberry32, graine affichée) ---------- */

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
  } · vent ${windText(S.lat)}. Le trait et la forme identifient la ceinture, indépendamment de la couleur. Graine ${SEED} (${SEED.toString(16)}, ${SEED.toString(10)}).`;
}

/* ---------- E030-03 / 04 / 08 / 10 : feuille de style unique ---------- */

const CSS = `
#${P}-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${P}-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${P}-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${P}-panel p{margin:5px 0;max-width:68ch}
#${P}-panel .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${P}-panel .${P}-limite{
  margin:6px 0;padding-left:9px;border-left:2px dashed var(--muted,#9a938a);
}
#${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${P}-table th,#${P}-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${P}-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-hemi{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${P}-hemi legend{padding:0 4px;color:var(--muted)}
#${P}-panel .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${P}-panel .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${P}-lat{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${P}-lat-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${P}-legend{font-size:10px;color:var(--muted)}
#${P}-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${P}-readout strong{color:var(--gold-bright,#f4d69e)}
#${P}-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${P}-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${P}-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${P}-panel[data-${P}-reduced="1"] button,
#${P}-panel[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${P}-panel button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${P}-panel{font-size:10px;padding:9px}
  #${P}-canvas{height:190px}
  #${P}-panel .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

/* Fabrique locale miroir de ctx.el, disponible aussi dans les fonctions
 * statiques qui ne reçoivent pas le contexte. */
function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* E030-01 : trois faits + une limite falsifiable, textes réels dans le DOM. */
function staticFacts() {
  const wrap = mk('div');
  const faits = [
    'Un alizé est un vent d’est soutenu qui souffle des subtropicales vers l’équateur : '
      + 'du nord-est dans l’hémisphère nord, du sud-est dans l’hémisphère sud. Il appartient '
      + 'à la cellule de Hadley et converge vers la zone de convergence intertropicale (ZCIT), '
      + 'où l’air monte.',
    'La direction des vents dominants vient de la force de Coriolis : f = 2 Ω sin φ, avec '
      + 'Ω = 7,292 × 10⁻⁵ rad/s. L’air est dévié vers la droite dans l’hémisphère nord et vers '
      + 'la gauche dans l’hémisphère sud ; à l’équateur, f = 0.',
    'Trois ceintures se succèdent des pôles vers l’équateur : vents polaires d’est au-delà de '
      + '60°, vents d’ouest entre 30° et 60°, alizés entre 0° et 30°. Ce modèle est idéalisé : '
      + 'les vents réels varient avec les saisons, les continents et la topographie.',
  ];
  faits.forEach((texte) => wrap.appendChild(mk('p', P + '-fait', texte)));
  wrap.appendChild(mk('p', P + '-limite',
    'Limite falsifiable : ce schéma prédit un alizé de nord-est à 15° N. Si une série de mesures '
    + 'montre un vent d’ouest persistant à cette latitude, c’est le modèle à trois cellules qui '
    + 'est en défaut, non la mesure : moussons, jets et reliefs échappent à cette idéalisation.'));
  return wrap;
}

/* E030-02 : ceintures de vents, référence = vent modéré 10 m/s (force 5). */
function staticTable() {
  const table = mk('table');
  table.id = P + '-table';
  table.appendChild(mk('caption', '',
    'Ceintures de vents dominants idéalisées (référence : vent modéré de 10 m/s, force 5 de Beaufort).'));

  const thead = mk('thead');
  const hr = mk('tr');
  ['Ceinture', 'Latitude', 'Vent au sol', 'Cellule'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = mk('tbody');
  const lignes = [
    ['Alizé (hémisphère Nord)', '0° – 30° N', 'Nord-est → sud-ouest', 'Hadley'],
    ['Alizé (hémisphère Sud)', '0° – 30° S', 'Sud-est → nord-ouest', 'Hadley'],
    ['Vent d’ouest', '30° – 60°', 'Sud-ouest → nord-est (N)', 'Ferrel'],
    ['Vent polaire d’est', '60° – 90°', 'Nord-est → sud-ouest (N)', 'Polaire'],
    ['ZCIT (référence f = 0)', '0° ± 2°', 'Vents faibles et variables', 'Convergence'],
  ];
  lignes.forEach((cells) => {
    const tr = mk('tr');
    cells.forEach((c, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const idPanel = P + '-panel';
  const existant = document.getElementById(idPanel);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radioByKey: {
        nord: document.getElementById(P + '-hemi-nord'),
        sud: document.getElementById(P + '-hemi-sud'),
      },
      lat: document.getElementById(P + '-lat'),
      latOut: document.getElementById(P + '-lat-value'),
      canvas: document.getElementById(P + '-canvas'),
      readout: document.getElementById(P + '-readout'),
      play: document.getElementById(P + '-play'),
      legend: document.getElementById(P + '-legend'),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = idPanel;
  panel.setAttribute('aria-labelledby', P + '-title');

  const title = ctx.el('h2', '', 'Vents dominants et alizés');
  title.id = P + '-title';
  const lead = ctx.el('p', '', 'Du nord-est ou du sud-est vers l’équateur, les alizés ne sont pas '
    + 'des caprices locaux : ils sont la branche au sol d’une circulation planétaire. Changer de '
    + 'latitude permet de voir basculer la ceinture de vent, le sens de la déviation de Coriolis '
    + 'et le paramètre f qui la mesure.');

  /* E030-03 : radiogroup natif, pas d'aria-pressed sur un choix unique. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = P + '-hemi';
  fieldset.setAttribute('role', 'radiogroup');
  const legendElt = mk('legend', '', 'Hémisphère observé (choix unique)');
  fieldset.appendChild(legendElt);
  const radioByKey = {};
  ORDER_HEMI.forEach((key) => {
    const lab = mk('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-hemi';
    radio.id = P + '-hemi-' + key;
    radio.value = key;
    radio.checked = S.hemi === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(key === 'nord' ? 'Nord' : 'Sud'));
    fieldset.appendChild(lab);
    radioByKey[key] = radio;
  });

  const sub = mk('h3', '', 'Explorer la latitude');
  const latRow = mk('p');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', P + '-lat');
  latLabel.appendChild(document.createTextNode('Latitude signée φ = '));
  const latOut = mk('span', '', fmtLat(S.lat));
  latOut.id = P + '-lat-value';
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  /* E030-04 : curseur couvrant les deux hémisphères, de −90° à +90°. */
  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = P + '-lat';
  lat.min = '-90';
  lat.max = '90';
  lat.step = '1';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label',
    'Latitude signée, de moins 90 degrés au pôle Sud à plus 90 degrés au pôle Nord');

  /* E030-05 / 08 : canvas accessible au clavier et étiqueté. */
  const canvas = document.createElement('canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe méridienne schématique des cellules de circulation. '
    + 'Flèches gauche et droite : latitude ; flèches haut et bas : changer de cellule ; Début : équateur.');

  const legendTextNode = mk('p', P + '-legend', legendText());
  legendTextNode.id = P + '-legend';

  /* E030-06 : grandeur textuelle annoncée aux technologies d'assistance. */
  const readout = mk('p', P + '-readout');
  readout.id = P + '-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = mk('button', '', S.playing ? '■ Arrêter la circulation' : '▶ Animer la circulation');
  play.type = 'button';
  play.id = P + '-play';
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false'); /* bascule indépendante. */

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, latRow, lat,
    canvas, legendTextNode, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radioByKey, lat, latOut, canvas, readout, play, legend: legendTextNode };
}

/* ---------- E030-05 : rendu du laboratoire (un seul canvas, un dessin/frame) ---------- */

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

/* ---------- E030-06 : grandeurs chiffrées comparées à une référence ---------- */

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
  n.appendChild(document.createTextNode(', vent ' + windText(S.lat) + '. Paramètre de Coriolis f = 2 Ω sin φ = '));
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

/* ---------- E030-07 : boucle rAF unique, pause sur document.hidden ---------- */

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

/* ---------- E030-10 : écouteurs globaux installés une seule fois ---------- */

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
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
        const panel = document.getElementById(P + '-panel');
        if (panel) panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
        if (S.reduced) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E030-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  const idBadge = P + '-badge';
  if (!map || document.getElementById(idBadge)) return;
  const badge = mk('div', P + '-badge',
    'Coupe méridienne schématique : les flèches illustrent la circulation idéalisée, '
    + 'ce ne sont pas des relevés de vent.');
  badge.id = idBadge;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique ---------- */

register('E030', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = reduced;
  S.nodes.panel.setAttribute('data-' + P + '-reduced', reduced ? '1' : '0');
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

  installGlobalListeners(ctx);
  if (S.playing && !S.reduced) startLoop();
});
