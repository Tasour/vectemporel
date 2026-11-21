import { register } from './registry.js';

/* Lentille E040 (V2) — vue GEOGRAPHIE.
 * Thème : projections cartographiques et distorsion des aires.
 *
 * Les dix chantiers E040-01 … E040-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E040.md. Les dix sont réellement implémentés :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau, aucune
 * graine aléatoire, aucune journalisation, aucun fichier partagé modifié. Le contenu
 * pédagogique est du texte sémantique réel (titres, paragraphes, tableau,
 * radiogroupe, légende) présent dans le DOM même sans animation ; le canvas n'est
 * qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e040- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e040';

/* Identifiants, tous préfixés geography-v2-e040-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const PROJ_ID = P + '-projection';
const LAT_ID = P + '-latitude';
const LAT_OUT_ID = P + '-latitude-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const ANIM_ID = P + '-animate';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Constantes canoniques — aucune donnée fabriquée, tout découle des formules. */
const RAD = Math.PI / 180;
const LAT_MIN = 0;       /* équateur */
const LAT_MAX = 80;      /* au-delà, la distorsion sort du cadre pédagogique */
const REF_AREA = 1;      /* facteur d'aire de référence à l'équateur */
const SWEEP_STEP = 0.012;/* degrés par milliseconde pour le balayage animé */

/* Trois projections cylindriques : kx = échelle le long des parallèles,
 * ky = échelle le long des méridiens. L'aire se multiplie par kx · ky.
 * À l'équateur (φ = 0°), cos φ = 1 : kx = ky = 1 pour les trois. */
const PROJECTIONS = {
  plate: {
    label: 'Plate carrée (équidistante)',
    kx: () => 1,
    ky: () => 1,
    code: 'grille régulière — ni étirement ni aires déformées, mais angles non conservés',
    aria: 'Projection plate carrée : la grille reste régulière, les distances le long des méridiens sont conservées, les angles et les aires ne le sont pas.',
  },
  mercator: {
    label: 'Mercator (conforme)',
    kx: (lat) => 1 / Math.cos(lat * RAD),
    ky: (lat) => 1 / Math.cos(lat * RAD),
    code: 'cercle étiré en ellipse verticale — angles conservés, aires grossies',
    aria: 'Projection de Mercator : le cercle devient une ellipse étirée verticalement ; les angles sont conservés, les aires sont multipliées par secans au carré de la latitude.',
  },
  lambert: {
    label: 'Lambert cylindrique équivalente',
    kx: (lat) => 1 / Math.cos(lat * RAD),
    ky: (lat) => Math.cos(lat * RAD),
    code: 'ellipse étirée en largeur — aires conservées, formes déformées',
    aria: 'Projection cylindrique équivalente de Lambert : le cercle devient une ellipse étirée horizontalement ; les aires sont conservées, les angles ne le sont pas.',
  },
};
const ORDER = ['plate', 'mercator', 'lambert'];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  proj: 'mercator',
  lat: 45,
  animating: false,
  rafId: 0,
  lastTs: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmtLat = (lat) => String(Math.round(lat)) + '°';
const kx = (proj, lat) => PROJECTIONS[proj].kx(lat);
const ky = (proj, lat) => PROJECTIONS[proj].ky(lat);
const areaFactor = (proj, lat) => kx(proj, lat) * ky(proj, lat);
const ratioText = (r) => `${fmt2(r)} fois`;

/* ---------- E040-01 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PROJ_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PROJ_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${LAT_ID}{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${LAT_ID}::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${LAT_ID}::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${LAT_ID}::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${LAT_ID}::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);
  border-radius:50%;background:var(--gold,#e6b96f);
}
#${LAT_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E040-01 : section sémantique, lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Toute projection cartographique transforme la surface courbe de la Terre en un plan : le théorème de Tissot garantit qu’aucune ne peut conserver à la fois les aires, les angles et les distances. Une déformation est inévitable et dépend de la latitude.',
    'Les projections cylindriques usuelles ont un facteur d’échelle de 1,00 à l’équateur : c’est la référence. En s’éloignant vers les pôles, l’échelle le long des parallèles vaut 1 / cos φ, où φ est la latitude.',
    'Mercator est conforme : elle conserve les angles mais multiplie les aires par 1 / cos² φ. La projection cylindrique équivalente de Lambert conserve les aires en compensant par un facteur cos φ le long des méridiens, au prix des formes.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E040-02 : tableau comparatif recalculé par formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Facteur d’aire selon la latitude (référence : équateur = 1,00). Valeurs recalculées par aire = kx · ky. Les colonnes « Aire » donnent le rapport à la surface réelle.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Latitude φ', 'Plate carrée — aire', 'Mercator — aire', 'Lambert — aire'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  [0, 30, 45, 60, 75].forEach((lat) => {
    const tr = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = fmtLat(lat);
    tr.appendChild(label);
    ORDER.forEach((key) => {
      const cell = document.createElement('td');
      cell.textContent = fmt2(areaFactor(key, lat));
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        plate: document.getElementById(P + '-proj-plate'),
        mercator: document.getElementById(P + '-proj-mercator'),
        lambert: document.getElementById(P + '-proj-lambert'),
      },
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      anim: document.getElementById(ANIM_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Projections cartographiques et distorsion des aires');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une carte ne peut pas tout conserver : choisir une projection, c’est choisir ce que l’on sacrifie. Ce laboratoire compare trois cylindriques et mesure, à une latitude donnée, combien un cercle étiré voit son aire multipliée par rapport à l’équateur.');

  /* E040-03 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PROJ_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Projection cartographique (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Projection cartographique (choix unique)';
  fieldset.appendChild(legend);
  const radios = {};
  ORDER.forEach((key) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-proj';
    radio.id = P + '-proj-' + key;
    radio.value = key;
    radio.checked = S.proj === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(PROJECTIONS[key].label));
    fieldset.appendChild(lab);
    radios[key] = radio;
  });

  /* E040-04 : curseur de latitude borné, degrés entiers. */
  const sub = ctx.el('h3', '', 'Observer la déformation');
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude φ : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = String(LAT_MIN);
  lat.max = String(LAT_MAX);
  lat.step = '1';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude, de 0 degré à l’équateur à 80 degrés');
  lat.setAttribute('aria-valuetext', fmtLat(S.lat));

  /* E040-05 / E040-08 : canvas lab, focalisable et doublé en texte. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', PROJECTIONS[S.proj].aria + ` Latitude ${fmtLat(S.lat)}. Flèches gauche et droite : changer de projection ; flèches haut et bas : changer la latitude.`);

  const legendText = ctx.el('p', P + '-legend');
  legendText.id = LEGEND_ID;

  /* E040-06 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const anim = ctx.el('button', '', S.animating ? '■ Arrêter le balayage' : '▶ Balayer les latitudes');
  anim.type = 'button';
  anim.id = ANIM_ID;
  anim.setAttribute('aria-pressed', S.animating ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, latRow, lat, canvas, legendText, readout, anim);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, radios, lat, latOut, canvas, readout, anim, legend: legendText };
}

/* ---------- E040-05 / E040-07 : dessin déterministe et codes non chromatiques ---------- */

function scenario(g, x, y, w, h, kxVal, kyVal, dashed, color) {
  const rx = Math.max(6, w / 2);
  const ry = Math.max(6, h / 2);
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 1.8;
  if (g.setLineDash) g.setLineDash(dashed ? [5, 4] : []);
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);
  /* Flèches d'axe : repères non chromatiques de l'étirement. */
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x - rx - 14, y); g.lineTo(x + rx + 14, y);
  g.moveTo(x, y - ry - 14); g.lineTo(x, y + ry + 14);
  g.stroke();
  g.fillStyle = color;
  g.font = '9px sans-serif';
  g.fillText('kx', x + rx + 4, y - 5);
  g.fillText('ky', x + 5, y - ry - 6);
  g.restore();
  return { rx, ry };
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
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
  const midY = pad + (cssH - 2 * pad) * 0.54;
  const refX = pad + (cssW - 2 * pad) * 0.27;
  const outX = pad + (cssW - 2 * pad) * 0.73;
  const r = Math.min((cssH - 2 * pad) * 0.26, (cssW - 2 * pad) * 0.16);

  /* Grille de fond schématique (traits pleins = méridiens, tirets = parallèles). */
  g.save();
  g.lineWidth = 1;
  for (let i = 1; i < 8; i += 1) {
    const gx = pad + ((cssW - 2 * pad) * i) / 8;
    g.strokeStyle = 'rgba(214,207,193,.12)';
    g.setLineDash([]);
    g.beginPath(); g.moveTo(gx, pad); g.lineTo(gx, cssH - pad); g.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    const gy = pad + ((cssH - 2 * pad) * i) / 5;
    g.strokeStyle = 'rgba(214,207,193,.12)';
    if (g.setLineDash) g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(cssW - pad, gy); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);
  g.restore();

  /* Cercle de référence à l'équateur : tirets, facteur 1,00. */
  scenario(g, refX, midY, 2 * r, 2 * r, 1, 1, true, 'rgba(214,207,193,.75)');
  /* Forme projetée à la latitude choisie : trait plein, kx · ky. */
  const shape = scenario(g, outX, midY, 2 * r * kx(S.proj, S.lat), 2 * r * ky(S.proj, S.lat),
    false, 'rgba(244,214,158,.95)');

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Équateur · référence 1,00', refX - r, cssH - pad + 4);
  g.fillText(`φ = ${fmtLat(S.lat)} · ${PROJECTIONS[S.proj].label}`, outX - r, cssH - pad + 4);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`aire × ${fmt2(areaFactor(S.proj, S.lat))}`, outX - r, pad + 2);
  /* Repère textuel de l'ellipse : l'axe le plus long est nommé. */
  g.fillStyle = 'rgba(214,207,193,.8)';
  const longAxis = shape.rx > shape.ry ? 'étirement horizontal' : (shape.ry > shape.rx ? 'étirement vertical' : 'cercle conservé');
  g.fillText(longAxis, outX - r, pad + 14);
}

/* ---------- E040-06 : readout, région live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const kxVal = kx(S.proj, S.lat);
  const kyVal = ky(S.proj, S.lat);
  const area = areaFactor(S.proj, S.lat);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const debut = `Projection ${PROJECTIONS[S.proj].label}, latitude ${fmtLat(S.lat)}. Échelle le long des parallèles kx = `;
  const apresKx = ` ; le long des méridiens ky = `;
  const apresKy = `. Le cercle devient une ellipse dont l’aire est multipliée par `;
  const apresArea = `, contre ${fmt2(REF_AREA)} à l’équateur (référence). `;
  const fin = PROJECTIONS[S.proj].code + '.';
  const plain = debut + fmt2(kxVal) + apresKx + fmt2(kyVal) + apresKy + fmt2(area) + apresArea + fin;
  if (n.textContent === plain) return;
  n.textContent = '';
  n.appendChild(document.createTextNode(debut));
  n.appendChild(fort(fmt2(kxVal)));
  n.appendChild(document.createTextNode(apresKx));
  n.appendChild(fort(fmt2(kyVal)));
  n.appendChild(document.createTextNode(apresKy));
  n.appendChild(fort(ratioText(area)));
  n.appendChild(document.createTextNode(apresArea + fin));
}

/* ---------- Synchronisation des contrôles et du laboratoire ---------- */

function syncControls() {
  const n = S.nodes;
  ORDER.forEach((key) => {
    if (n.radios && n.radios[key]) n.radios[key].checked = S.proj === key;
  });
  if (n.lat) {
    n.lat.value = String(Math.round(S.lat));
    n.lat.setAttribute('aria-valuetext', fmtLat(S.lat));
  }
  if (n.latOut) n.latOut.textContent = fmtLat(S.lat);
  if (n.legend) {
    n.legend.textContent = `${PROJECTIONS[S.proj].label} — ${PROJECTIONS[S.proj].code} ; aire = kx · ky = ${fmt2(kx(S.proj, S.lat))} × ${fmt2(ky(S.proj, S.lat))} = ${fmt2(areaFactor(S.proj, S.lat))} fois l’aire réelle.`;
  }
  if (n.anim) {
    n.anim.textContent = S.animating ? '■ Arrêter le balayage' : '▶ Balayer les latitudes';
    n.anim.setAttribute('aria-pressed', S.animating ? 'true' : 'false');
  }
  if (n.canvas) n.canvas.setAttribute('aria-label', PROJECTIONS[S.proj].aria + ` Latitude ${fmtLat(S.lat)}. Facteur d’aire ${fmt2(areaFactor(S.proj, S.lat))} fois la référence. Flèches gauche et droite : changer de projection ; flèches haut et bas : changer la latitude.`);
  updateReadout();
  drawLab();
}

/* ---------- E040-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.lastTs && S.animating && !reduced) {
    const dt = Math.min(80, ts - S.lastTs);
    S.lat += dt * SWEEP_STEP;
    if (S.lat > LAT_MAX) S.lat = LAT_MIN;
  }
  S.lastTs = ts;
  syncControls();
  if (S.animating && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E040-10 : mouvement réduit, garde-fous d'écouteurs ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
      if (document.hidden) stopLoop();
      else if (S.animating && !reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(REDUCED_ATTR, mq.matches ? '1' : '0');
        if (mq.matches) { S.animating = false; stopLoop(); syncControls(); }
        else if (S.animating) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E040-10 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', 'Schéma de projection : ellipse de Tissot simplifiée, non à l’échelle. Les facteurs kx, ky et l’aire sont calculés par formule.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E040', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E040-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) { S.animating = false; stopLoop(); }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDER.forEach((key) => {
      const radio = n.radios[key];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.proj = key;
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(LAT_MIN, Math.min(LAT_MAX, Math.round(Number(n.lat.value))));
      syncControls();
    });
    n.anim.addEventListener('click', () => {
      S.animating = !S.animating;
      if (!S.animating) stopLoop();
      else if (!(typeof ctxReduced === 'function' && ctxReduced())) startLoop();
      syncControls();
    });
    /* E040-08 : équivalent clavier du laboratoire. */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ORDER.indexOf(S.proj);
        S.proj = ORDER[(i + step + ORDER.length) % ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.lat = Math.max(LAT_MIN, Math.min(LAT_MAX, Math.round(S.lat) + step * 5));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.animating && !reduced) startLoop();
});
