import { register } from './registry.js';

/* Lentille E039 — vue GEOGRAPHIE.
 * Thème : cartographie historique et évolution des contours.
 *
 * Les dix chantiers E039-01 … E039-10 sont réellement implémentés dans CE seul
 * module. Aucun stub, aucune requête réseau, aucune graine aléatoire, aucune
 * console. Le texte pédagogique est du texte sémantique présent dans le DOM
 * (titres, paragraphes, tableau, liste) ; le canvas n'est qu'un laboratoire
 * schématique, jamais le seul support de l'information.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-e039-) ---------- */

const CSS_ID = 'geography-e039';
const PANEL_ID = 'geography-e039-panel';
const TITLE_ID = 'geography-e039-title';
const ERASET_ID = 'geography-e039-eraset';
const ERA_NAME = 'geography-e039-era';
const TABLE_ID = 'geography-e039-table';
const SEQUENCE_ID = 'geography-e039-sequence';
const SLIDER_ID = 'geography-e039-time';
const TIME_OUT_ID = 'geography-e039-time-value';
const OVERLAY_ID = 'geography-e039-overlay';
const CANVAS_ID = 'geography-e039-canvas';
const LEGEND_ID = 'geography-e039-legend';
const READOUT_ID = 'geography-e039-readout';
const PLAY_ID = 'geography-e039-play';
const RESET_ID = 'geography-e039-reset';
const BADGE_ID = 'geography-e039-badge';

/* ---------- E039-02 : quatre époques canoniques (contours schématiques) ---------- */

/* Chaque époque possède exactement N rayons, angulaires et ordonnés : deux
 * contours quelconques peuvent donc être interpolés sommet à sommet, sans
 * aléa. Les rayons croissent de l'Antiquité à l'époque contemporaine pour
 * figurer l'extension progressive d'un même territoire. Valeurs pédagogiques,
 * en unités schématiques (aucune prétention de relevé). */
const N = 12;
const ERAS = [
  {
    nom: 'Antiquité', periode: 'IIIe s. av. J.-C. — Ve s. apr. J.-C.',
    rayons: [16, 15, 17, 14, 16, 15, 17, 14, 16, 15, 14, 16],
  },
  {
    nom: 'Moyen Âge', periode: 'Ve — XVe s.',
    rayons: [21, 23, 19, 24, 21, 20, 23, 19, 22, 20, 18, 22],
  },
  {
    nom: 'Époque moderne', periode: 'XVIe — XVIIIe s.',
    rayons: [28, 30, 27, 33, 29, 28, 31, 27, 30, 28, 26, 30],
  },
  {
    nom: 'Époque contemporaine', periode: 'XIXe — XXIe s.',
    rayons: [36, 38, 35, 41, 37, 36, 39, 35, 38, 36, 34, 38],
  },
];
const REF = 0; // époque de référence : l'Antiquité sert de base de comparaison.

/* ---------- État de module (survit au `stage.innerHTML = ''` de la coque) ---------- */

const S = {
  t: 0, // position continue dans la séquence, de 0 à ERAS.length - 1
  overlay: false,
  playing: false,
  lastTs: 0,
  rafId: 0,
  lastShown: -1,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Utilitaires déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* E039-06 : interpolation linéaire des sommets — un morphing reproductible. */
function contourPoints(t) {
  const i0 = Math.max(0, Math.min(ERAS.length - 1, Math.floor(t)));
  const i1 = Math.min(ERAS.length - 1, i0 + 1);
  const f = Math.max(0, Math.min(1, t - i0));
  const r0 = ERAS[i0].rayons;
  const r1 = ERAS[i1].rayons;
  const pts = [];
  for (let k = 0; k < N; k += 1) {
    const angle = (k / N) * Math.PI * 2 - Math.PI / 2;
    const rayon = r0[k] + (r1[k] - r0[k]) * f;
    pts.push([50 + rayon * Math.cos(angle), 50 + rayon * Math.sin(angle)]);
  }
  return pts;
}

/* E039-07 : grandeurs calculées depuis la géométrie, jamais écrites en dur. */
function aire(poly) {
  let somme = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    somme += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(somme) / 2;
}
function perimetre(poly) {
  let somme = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    somme += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return somme;
}
const AIRE_REF = aire(contourPoints(REF));

function mesures(t) {
  const poly = contourPoints(t);
  const a = aire(poly);
  return { aire: a, perimetre: perimetre(poly), rapport: (a / AIRE_REF) * 100 };
}

/* ---------- E039-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une carte historique ne se superpose pas à une carte actuelle : les contours, les noms et les échelles varient avec les régimes, les traités et les relevés. Comparer deux époques, c’est comparer deux conventions. (Référence : principes généraux de cartographie historique.)',
    'Avant les relevés géodésiques modernes (triangulation, WGS 84), une frontière était souvent décrite par des accidents naturels — fleuve, crête, détroit — plutôt que mesurée. Sa trace dépendait donc de la source. (Référence : histoire de la géodésie.)',
    'Un même territoire voit son contour révisé par un traité ou une conquête : l’évolution du tracé n’est pas seulement un changement de mesure, mais le reflet d’un changement politique. (Référence : atlas d’histoire des frontières.)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e039-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E039-01 / E039-04 : tableau et séquence sémantiques ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Superficie et périmètre schématiques par époque (unités du modèle). Le rapport compare chaque époque à l’Antiquité, prise pour référence à 100 %.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Époque', 'Superficie', 'Périmètre', 'Rapport / référence'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ERAS.forEach((era, i) => {
    const m = mesures(i);
    const tr = document.createElement('tr');
    tr.dataset.geographyE039Era = String(i);
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = era.nom;
    const tdA = document.createElement('td');
    tdA.textContent = `${fmt(m.aire)} u²`;
    const tdP = document.createElement('td');
    tdP.textContent = `${fmt(m.perimetre)} u`;
    const tdR = document.createElement('td');
    tdR.textContent = i === REF ? '100 % (référence)' : `${fmt(m.rapport)} %`;
    tr.append(th, tdA, tdP, tdR);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticSequence() {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = 'Séquence d’évolution du contour';
  const ol = document.createElement('ol');
  ol.id = SEQUENCE_ID;
  const etapes = [
    'Noyau compact, peu de marges extérieures : le tracé reste resserré autour du centre.',
    'Extension médiévale : des saillies apparaissent, le périmètre croît plus vite que la superficie.',
    'Époque moderne : le contour s’étend en lobes réguliers, la surface progresse nettement.',
    'Époque contemporaine : emprise maximale, le tracé atteint ses marges les plus larges.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.append(h, ol);
  return wrap;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e039-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e039-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e039-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e039-panel p{margin:5px 0;max-width:68ch}
#geography-e039-panel .geography-e039-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e039-eraset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e039-eraset legend{padding:0 4px;color:var(--muted)}
#geography-e039-panel .geography-e039-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#geography-e039-panel .geography-e039-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e039-time{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e039-time-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e039-panel .geography-e039-overlay{
  display:inline-flex;align-items:center;gap:6px;min-height:36px;margin:6px 6px 0 0;cursor:pointer;
}
#geography-e039-overlay input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e039-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e039-legend{font-size:10px;color:var(--muted)}
#geography-e039-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e039-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e039-table th,#geography-e039-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e039-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e039-table tr[data-geography-e039-era="0"] td{font-weight:600}
#geography-e039-sequence{margin:6px 0 6px 0;padding-left:18px}
#geography-e039-sequence li{margin:2px 0}
#geography-e039-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e039-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e039-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e039-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e039-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e039-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e039-panel[data-geography-e039-reduced="1"] button,
#geography-e039-panel[data-geography-e039-reduced="1"] .geography-e039-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e039-panel button,.geography-e039-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e039-panel{font-size:10px;padding:9px}
  #geography-e039-canvas{height:200px}
  #geography-e039-panel .geography-e039-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: ERAS.map((_, i) => document.getElementById(`${ERA_NAME}-${i}`)),
      slider: document.getElementById(SLIDER_ID),
      timeOut: document.getElementById(TIME_OUT_ID),
      overlay: document.getElementById(OVERLAY_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      legend: document.getElementById(LEGEND_ID),
      table: document.getElementById(TABLE_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e039-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Cartographie historique et évolution des contours');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un même territoire n’a pas toujours le même tracé. Choisissez une époque, faites glisser le curseur pour voir le contour se déformer, puis superposez les époques : la carte change, les mesures se recalculent, la géographie documentée reste la même.');

  /* E039-03 : sélecteur d'époque — choix unique → radiogroupe. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ERASET_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Époque de référence (choix unique)';
  fieldset.appendChild(legend);
  ERAS.forEach((era, i) => {
    const lab = ctx.el('label', 'geography-e039-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e039-epoque';
    radio.id = `${ERA_NAME}-${i}`;
    radio.value = String(i);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(era.nom));
    fieldset.appendChild(lab);
  });

  /* E039-06 : curseur de temps continu. */
  const timeRow = ctx.el('p', '');
  const timeLabel = document.createElement('label');
  timeLabel.setAttribute('for', SLIDER_ID);
  timeLabel.appendChild(document.createTextNode('Position dans la séquence : '));
  const timeOut = document.createElement('span');
  timeOut.id = TIME_OUT_ID;
  timeLabel.appendChild(timeOut);
  timeRow.appendChild(timeLabel);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = SLIDER_ID;
  slider.min = '0';
  slider.max = String(ERAS.length - 1);
  slider.step = '0.01';
  slider.value = String(S.t);
  slider.setAttribute('aria-label', 'Position continue entre les quatre époques, de 0 à 3');

  /* E039-08 : bascule indépendante de surimposition. */
  const overlayLabel = ctx.el('label', 'geography-e039-overlay');
  const overlay = document.createElement('input');
  overlay.type = 'checkbox';
  overlay.id = OVERLAY_ID;
  overlay.checked = S.overlay;
  overlayLabel.appendChild(overlay);
  overlayLabel.appendChild(document.createTextNode(' Superposer les quatre époques'));

  /* E039-05 : laboratoire canvas. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Contour schématique d’un territoire à travers quatre époques. Flèches haut et bas : changer d’époque ; flèches gauche et droite : avancer dans la séquence ; touche S : superposer les époques ; touche R : réinitialiser.');

  const legendText = ctx.el('p', 'geography-e039-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e039-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter l’évolution' : '▶ Animer l’évolution');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const reset = ctx.el('button', '', '↺ Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  panel.append(title, lead, staticFacts(), fieldset, staticTable(), staticSequence(),
    timeRow, slider, overlayLabel, canvas, legendText, readout, play, reset);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: ERAS.map((_, i) => document.getElementById(`${ERA_NAME}-${i}`)),
    slider, timeOut, overlay, canvas, readout, play, reset,
    legend: legendText, table: document.getElementById(TABLE_ID),
  };
}

/* ---------- E039-05 : rendu du laboratoire (un seul canvas) ---------- */

function traceContour(g, poly, px, opt) {
  g.beginPath();
  poly.forEach((p, i) => {
    const xy = px(p[0], p[1]);
    if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
  });
  g.closePath();
  if (opt.fill) { g.fillStyle = opt.fill; g.fill(); }
  g.setLineDash(opt.dash || []);
  g.lineWidth = opt.width || 1;
  g.strokeStyle = opt.stroke;
  g.stroke();
  g.setLineDash([]);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (x, y) => [pad + (x / 100) * iw, pad + (y / 100) * ih];

  /* Canevas et graticule (repère de lecture, sans ressource externe). */
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.16)';
  for (let v = 20; v <= 80; v += 20) {
    const a = px(v, 0); const b = px(v, 100);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    const c = px(0, v); const d = px(100, v);
    g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke();
  }

  /* E039-08 : surimposition — motifs de trait DISTINCTS, pas la couleur seule. */
  if (S.overlay) {
    const dashing = [[], [6, 3], [2, 3], [8, 2, 1, 2]];
    const teintes = ['rgba(244,214,158,.65)', 'rgba(150,200,240,.65)',
      'rgba(150,220,170,.65)', 'rgba(230,160,160,.65)'];
    ERAS.forEach((_, i) => {
      traceContour(g, contourPoints(i), px, {
        stroke: teintes[i], dash: dashing[i], width: 1.2,
      });
    });
  }

  /* Contour courant (interpolé), toujours au-dessus et repérable. */
  traceContour(g, contourPoints(S.t), px, {
    fill: 'rgba(230,185,111,.18)', stroke: 'rgba(244,214,158,.98)', width: 2.2,
  });

  const m = mesures(S.t);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${eraProche(S.t).nom} · ${fmt(m.aire)} u² · ${fmt(m.rapport)} % de la référence`, pad + 2, pad + 12);
}

/* ---------- E039-06 : libellés, mesures et légende ---------- */

function eraProche(t) {
  return ERAS[Math.max(0, Math.min(ERAS.length - 1, Math.round(t)))];
}

function updateTimeDisplay() {
  if (S.nodes.timeOut) {
    const pct = Math.round((S.t / (ERAS.length - 1)) * 100);
    S.nodes.timeOut.textContent = `${eraProche(S.t).nom} · ${pct} % du chemin`;
  }
  if (S.nodes.slider) S.nodes.slider.value = String(S.t);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = mesures(S.t);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Mesures du contour courant : superficie '));
  n.appendChild(fort(`${fmt(m.aire)} u²`));
  n.appendChild(document.createTextNode(' · périmètre '));
  n.appendChild(fort(`${fmt(m.perimetre)} u`));
  n.appendChild(document.createTextNode(' · soit '));
  n.appendChild(fort(`${fmt(m.rapport)} %`));
  n.appendChild(document.createTextNode(` de la superficie de référence (Antiquité = 100 %, ${fmt(AIRE_REF)} u²). Époque la plus proche : `));
  n.appendChild(fort(eraProche(S.t).nom));
  n.appendChild(document.createTextNode('.'));
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  if (S.overlay) {
    n.textContent = 'Surimposition active : trait plein = Antiquité ; tirets longs = Moyen Âge ; points = Époque moderne ; tirets courts + points = Époque contemporaine. Le motif du trait distingue les époques, indépendamment de la couleur.';
  } else {
    n.textContent = 'Trait plein doré : contour courant, interpolé sommet à sommet entre les époques. Activez la surimposition pour comparer les quatre tracés par leurs motifs de trait.';
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((r) => { if (r) r.checked = Number(r.value) === Math.round(S.t); });
  if (n.overlay) n.overlay.checked = S.overlay;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’évolution' : '▶ Animer l’évolution';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateTimeDisplay();
  updateReadout();
  updateLegend();
  drawLab();
}

/* ---------- E039-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (S.lastTs && S.playing && !reducedNow()) {
    const dt = Math.min(80, ts - S.lastTs);
    S.t += dt * 0.00025; // séquence complète en ~12 s, sans aléa.
    if (S.t > ERAS.length - 1) S.t = 0;
    updateTimeDisplay();
    const shown = Math.round(S.t * 100);
    if (shown !== S.lastShown) {
      S.lastShown = shown;
      updateReadout();
    }
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

/* ---------- Garde-fou visibilité et préférence de mouvement ---------- */

function installGlobalListeners() {
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
        if (panel) panel.dataset.geographyE039Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.playing = false; stopLoop(); }
        const bouton = document.getElementById(PLAY_ID);
        if (bouton) {
          bouton.textContent = S.playing ? '■ Arrêter l’évolution' : '▶ Animer l’évolution';
          bouton.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E039-10 : badge de nature schématique sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e039-badge', 'Contours et mesures schématiques : traits pédagogiques, non des relevés cartographiques.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- E039-10 : point d'entrée unique, idempotent ---------- */

register('E039', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = reducedNow();
  S.nodes.panel.dataset.geographyE039Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.t = Number(radio.value);
        syncControls();
      });
    });
    n.slider.addEventListener('input', () => {
      S.t = Math.max(0, Math.min(ERAS.length - 1, Number(n.slider.value)));
      updateTimeDisplay();
      updateReadout();
      drawLab();
    });
    n.overlay.addEventListener('change', () => {
      S.overlay = !!n.overlay.checked;
      updateLegend();
      drawLab();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.t = ERAS.length - 1;
        S.playing = false;
        stopLoop();
        syncControls();
        if (n.readout) n.readout.textContent = 'Mouvement réduit : évolution affichée instantanément à la dernière époque.';
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.t = 0;
      S.overlay = false;
      S.playing = false;
      stopLoop();
      syncControls();
      if (n.readout) n.readout.textContent = 'Réinitialisation : retour à l’Antiquité, référence à 100 %, sans surimposition.';
    });
    /* E039-10 : équivalents clavier du canvas. */
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 1 : -1;
        S.t = Math.max(0, Math.min(ERAS.length - 1, Math.round(S.t) + pas));
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const pas = event.key === 'ArrowRight' ? 0.25 : -0.25;
        S.t = Math.max(0, Math.min(ERAS.length - 1, Math.round(S.t * 4 + pas) / 4));
      } else if (event.key === 's' || event.key === 'S') {
        S.overlay = !S.overlay;
      } else if (event.key === 'r' || event.key === 'R') {
        S.t = 0;
        S.overlay = false;
        S.playing = false;
        stopLoop();
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
  if (S.playing && !reduced) startLoop();
});
