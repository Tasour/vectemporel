import { register } from './registry.js';

/*
 * Lentille E075 — rotation de la carte et orientation cardinale (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E075-01 … E075-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E075', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e075`.
 * Tous les identifiants DOM sont préfixés `geography-e075-*`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Thème : une carte est normalement orientée « nord en haut ». La faire tourner
 * d'un angle θ (positif = rotation horaire) ne change pas les caps géographiques
 * des lieux, mais change l'angle sous lequel ils apparaissent à l'écran. Si un
 * lieu a pour cap géographique β (mesuré dans le sens horaire depuis le nord),
 * il apparaît à l'angle écran α = β + θ (mod 360) ; réciproquement la direction
 * géographique qui se trouve en haut de l'écran a pour cap −θ (mod 360). La
 * rosace des points cardinaux tourne avec la carte : la flèche du nord pointe à
 * l'angle θ, l'est à θ + 90, le sud à θ + 180, l'ouest à θ + 270. Toutes ces
 * grandeurs sont recalculées depuis leur formule, jamais inventées.
 */

const CSS_ID = 'geography-e075';
const SECTION_ID = 'geography-e075-section';
const TITLE_ID = 'geography-e075-title';
const PRESET_ID = 'geography-e075-preset';
const ANGLE_ID = 'geography-e075-angle';
const ANGLE_OUT_ID = 'geography-e075-angle-value';
const CANVAS_ID = 'geography-e075-canvas';
const READOUT_ID = 'geography-e075-readout';
const PLAY_ID = 'geography-e075-play';
const LEGEND_ID = 'geography-e075-legend';
const BADGE_ID = 'geography-e075-badge';

const RAD = Math.PI / 180;
const NARROW = '\u202f'; // espace insécable fine (typographie française)
const LANDMARK_BEARING = 125; // cap géographique fixe d'un repère de démonstration

/* Quatre orientations de référence (choix unique). */
const PRESETS = [
  { key: 'nord', label: 'Nord en haut (0°)', angle: 0 },
  { key: 'ne', label: 'Nord-Est en haut (45°)', angle: 45 },
  { key: 'est', label: 'Est en haut (90°)', angle: 90 },
  { key: 'sud', label: 'Sud en haut (180°)', angle: 180 },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  angle: 0,
  preset: 'nord',
  playing: false,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules deterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const mod360 = (d) => ((d % 360) + 360) % 360;

/* Cap géographique β → angle écran α (rotation horaire θ). */
function screenAngle(bearing, rotation) {
  return mod360(bearing + rotation);
}

/* Angle écran α → cap géographique β. */
function geographicBearing(screen, rotation) {
  return mod360(screen - rotation);
}

/* Cap géographique β et distance r → décalage écran (x à droite, y vers le bas). */
function vector(bearing, rotation, radius, cx, cy) {
  const a = (bearing + rotation) * RAD;
  return { x: cx + radius * Math.sin(a), y: cy - radius * Math.cos(a) };
}

/* Toutes les grandeurs affichées sont dérivées de ces trois formules. */
function measures(rotation) {
  const beta = LANDMARK_BEARING;
  return {
    rotation: mod360(rotation),
    landmarkBearing: beta,
    landmarkScreen: screenAngle(beta, rotation),
    topBearing: geographicBearing(0, rotation),
    delta: screenAngle(beta, rotation) - beta,
    northScreen: screenAngle(0, rotation),
  };
}

function orientationLabel(angle) {
  const a = mod360(angle);
  if (a === 0) return 'Nord en haut';
  if (a === 45) return 'Nord-Est en haut';
  if (a === 90) return 'Est en haut';
  if (a === 180) return 'Sud en haut';
  if (a === 270) return 'Ouest en haut';
  return `Rotation de ${fmt(a)}°`;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e075-section{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e075-section h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e075-section h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e075-section p{margin:5px 0;max-width:68ch}
#geography-e075-section .geography-e075-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e075-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e075-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e075-table th,#geography-e075-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e075-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e075-preset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e075-preset legend{padding:0 4px;color:var(--muted)}
#geography-e075-section .geography-e075-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e075-section .geography-e075-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e075-angle{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e075-angle-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e075-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e075-legend{font-size:10px;color:var(--muted)}
#geography-e075-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e075-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e075-section button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e075-section button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e075-section :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e075-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e075-section[data-geography-e075-reduced="1"] button,
#geography-e075-section[data-geography-e075-reduced="1"] .geography-e075-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e075-section button,.geography-e075-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e075-section{font-size:10px;padding:9px}
  #geography-e075-canvas{height:190px}
  #geography-e075-section .geography-e075-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une carte est dite « nord en haut » quand le haut de l’écran correspond au nord géographique : c’est une convention, pas une propriété du territoire.',
    'Faire tourner la carte d’un angle θ (positif dans le sens des aiguilles d’une montre) ne change aucun cap géographique : les lieux gardent leur direction réelle, mais leur angle à l’écran devient β + θ.',
    'La rosace tourne avec la carte : la flèche du nord pointe à θ, l’est à θ + 90°, le sud à θ + 180° et l’ouest à θ + 270°. En sens inverse, le cap géographique en haut de l’écran vaut −θ.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e075-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e075-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Points cardinaux : cap géographique et angle à l’écran. Référence : nord en haut (rotation 0°).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Point cardinal', 'Cap géographique', 'Angle écran (rotation 0°)', 'Angle écran (rotation 90°)'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Nord', '0°', '0°', '90°'],
    ['Est', '90°', '90°', '180°'],
    ['Sud', '180°', '180°', '270°'],
    ['Ouest', '270°', '270°', '0°'],
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
  const existant = document.getElementById(SECTION_ID);
  if (existant && existant.isConnected) {
    return {
      section: existant,
      fresh: false,
      presets: PRESETS.map((p) => document.getElementById(`geography-e075-preset-${p.key}`)),
      angle: document.getElementById(ANGLE_ID),
      angleOut: document.getElementById(ANGLE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const section = ctx.el('section', 'geography-e075-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Rotation de la carte et orientation cardinale');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Tourner une carte change l’angle des lieux à l’écran, jamais leur cap géographique. Ce laboratoire sépare les deux repères et montre comment on passe de l’un à l’autre.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = PRESET_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Orientation de la carte (choix unique)';
  fieldset.appendChild(legend);
  PRESETS.forEach((p) => {
    const lab = ctx.el('label', 'geography-e075-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e075-preset';
    radio.id = `geography-e075-preset-${p.key}`;
    radio.value = p.key;
    radio.checked = S.preset === p.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(p.label));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Faire tourner la carte');
  const angleRow = ctx.el('p', '');
  const angleLabel = document.createElement('label');
  angleLabel.setAttribute('for', ANGLE_ID);
  angleLabel.appendChild(document.createTextNode('Rotation θ (sens horaire) : '));
  const angleOut = document.createElement('span');
  angleOut.id = ANGLE_OUT_ID;
  angleLabel.appendChild(angleOut);
  angleRow.appendChild(angleLabel);

  const angle = document.createElement('input');
  angle.type = 'range';
  angle.id = ANGLE_ID;
  angle.min = '0';
  angle.max = '360';
  angle.step = '5';
  angle.value = String(S.angle);
  angle.setAttribute('aria-label', 'Angle de rotation de la carte, de 0 à 360 degrés');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rosace des points cardinaux tournée de l’angle choisi. Flèches gauche et droite : changer la rotation de cinq degrés ; Début : revenir au nord en haut. La flèche marquée N indique le nord géographique, le carré marqué R est un repère de cap 125 degrés.');

  const legendText = ctx.el('p', 'geography-e075-legend', 'La lettre et la forme distinguent chaque repère, indépendamment de la couleur : N flèche, E/S/O traits, R carré.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e075-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  section.append(title, lead, staticFacts(), staticTable(), fieldset, sub, angleRow, angle, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(section, aside.firstChild);

  return {
    section, fresh: true,
    presets: PRESETS.map((p) => document.getElementById(`geography-e075-preset-${p.key}`)),
    angle, angleOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (une seule grille, un seul canvas) ---------- */

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

  const cx = cssW / 2;
  const cy = cssH / 2 + 6;
  const R = Math.max(24, Math.min(cssW, cssH) / 2 - 34);
  const theta = S.angle;

  /* Cercle de la rosace et graduations tous les 30°, plus longues aux cardinaux. */
  g.strokeStyle = 'rgba(255,255,255,.20)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  for (let d = 0; d < 360; d += 30) {
    const long = d % 90 === 0;
    const a = (d + theta) * RAD;
    const r1 = long ? R - 8 : R - 4;
    g.beginPath();
    g.moveTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
    g.lineTo(cx + (R + 1) * Math.sin(a), cy - (R + 1) * Math.cos(a));
    g.stroke();
  }

  /* Repère fixe du haut de l'écran (triangle creux) : référence visuelle. */
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(cx, 8);
  g.lineTo(cx - 6, 19);
  g.lineTo(cx + 6, 19);
  g.closePath();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = '10px sans-serif';
  g.textAlign = 'center';
  g.fillText('Haut écran', cx, 31);

  /* Points cardinaux : le nord est une flèche pleine, les autres des traits. */
  const cardinaux = [
    { b: 0, lettre: 'N' },
    { b: 90, lettre: 'E' },
    { b: 180, lettre: 'S' },
    { b: 270, lettre: 'O' },
  ];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  cardinaux.forEach((c) => {
    const p = vector(c.b, theta, R, cx, cy);
    const pBase = vector(c.b, theta, R - 16, cx, cy);
    if (c.b === 0) {
      /* Flèche pleine pointant vers le nord géographique. */
      const a = (c.b + theta) * RAD;
      const side = 5;
      const px = Math.cos(a);
      const py = Math.sin(a);
      g.fillStyle = 'rgba(244,214,158,.98)';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(pBase.x + px * side, pBase.y + py * side);
      g.lineTo(pBase.x - px * side, pBase.y - py * side);
      g.closePath();
      g.fill();
    } else {
      g.strokeStyle = 'rgba(214,207,193,.92)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(pBase.x, pBase.y);
      g.lineTo(p.x, p.y);
      g.stroke();
    }
    const lp = vector(c.b, theta, R + 12, cx, cy);
    g.fillStyle = c.b === 0 ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.92)';
    g.font = 'bold 12px sans-serif';
    g.fillText(c.lettre, lp.x, lp.y);
  });

  /* Repère géographique fixe R (cap 125°) : carré + ligne pointillée. */
  const rep = vector(LANDMARK_BEARING, theta, R * 0.72, cx, cy);
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(rep.x, rep.y);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillRect(rep.x - 5, rep.y - 5, 10, 10);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = 'bold 11px sans-serif';
  g.fillText('R', rep.x, rep.y - 13);

  /* Centre et libellé d'orientation. */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fill();
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.fillText(orientationLabel(theta), 8, cssH - 8);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.fillText(`θ = ${fmt(theta)}°`, 8, 16);
}

function updateReadout() {
  const m = measures(S.angle);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Rotation ${fort(`${fmt(m.rotation)}°`)} (référence : 0° = nord en haut). `));
  n.appendChild(document.createTextNode('Repère R : cap géographique '));
  n.appendChild(fort(`${fmt(m.landmarkBearing)}°`));
  n.appendChild(document.createTextNode(' ; angle à l’écran α = β + θ = '));
  n.appendChild(fort(`${fmt(m.landmarkScreen)}°`));
  n.appendChild(document.createTextNode('. Cap géographique en haut de l’écran : −θ = '));
  n.appendChild(fort(`${fmt(m.topBearing)}°`));
  n.appendChild(document.createTextNode('. Écart angle écran − cap = '));
  n.appendChild(fort(`${fmt(m.delta)}°`));
  n.appendChild(document.createTextNode(' : il est nul quand la carte est orientée nord en haut.'));
}

function syncControls() {
  const n = S.nodes;
  PRESETS.forEach((p, i) => {
    const radio = n.presets[i];
    if (radio) radio.checked = S.preset === p.key;
  });
  if (n.angle) n.angle.value = String(S.angle);
  if (n.angleOut) n.angleOut.textContent = `${fmt(S.angle)}°`;
  if (n.legend) n.legend.textContent = 'La lettre et la forme distinguent chaque repère, indépendamment de la couleur : N flèche, E/S/O traits, R carré.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
  updateBadge();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) {
      S.angle = mod360(S.angle + dt * 0.012);
      S.preset = '';
    }
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
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
        const section = document.getElementById(SECTION_ID);
        if (section) section.dataset.geographyE075Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge d'orientation sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e075-badge', orientationLabel(S.angle));
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

function updateBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.textContent = orientationLabel(S.angle) + ' · θ = ' + fmt(S.angle) + '°';
}

/* ---------- Point d'entrée ---------- */

register('E075', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.section.dataset.geographyE075Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.presets.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        stopLoop();
        S.playing = false;
        S.preset = PRESETS[i].key;
        S.angle = PRESETS[i].angle;
        syncControls();
      });
    });
    n.angle.addEventListener('input', () => {
      stopLoop();
      S.playing = false;
      S.angle = mod360(Math.round(Number(n.angle.value) / 5) * 5);
      S.preset = PRESETS.find((p) => p.angle === S.angle)?.key || '';
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
        stopLoop();
        S.playing = false;
        S.angle = mod360(S.angle + step);
        S.preset = PRESETS.find((p) => p.angle === S.angle)?.key || '';
      } else if (event.key === 'Home') {
        stopLoop();
        S.playing = false;
        S.angle = 0;
        S.preset = 'nord';
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
  if (S.playing) startLoop();
});
