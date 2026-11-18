import { register } from './registry.js';

/* Lentille E013 — vue GEOGRAPHIE.
 * Thème : lacs et plans d'eau (temps de séjour, bilan hydrologique,
 * stratification thermique, trophie et retrait des rives).
 *
 * Les dix chantiers E013-01 … E013-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E013.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune sortie de débogage, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau, légendes) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre des formules
 * déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e013';
const PANEL_ID = 'geography-e013-panel';
const TITLE_ID = 'geography-e013-title';
const MODE_ID = 'geography-e013-mode';
const SLIDER_A_ID = 'geography-e013-a';
const SLIDER_B_ID = 'geography-e013-b';
const A_OUT_ID = 'geography-e013-a-value';
const B_OUT_ID = 'geography-e013-b-value';
const CANVAS_ID = 'geography-e013-canvas';
const READOUT_ID = 'geography-e013-readout';
const PLAY_ID = 'geography-e013-play';
const LEGEND_ID = 'geography-e013-legend';
const BADGE_ID = 'geography-e013-badge';
const TABLE_ID = 'geography-e013-table';

const MODE_ORDER = ['sejour', 'bilan', 'strat', 'trophie', 'niveau'];

/* Configuration déterministe de chaque expérience (borne = choix unique). */
const MODES = {
  sejour: {
    titre: 'Temps de séjour τ = V / Q',
    a: { label: 'Volume du lac V', unit: 'km³', min: 1000, max: 30000, step: 100, value: 12100 },
    b: { label: 'Débit de sortie Q', unit: 'km³/an', min: 1, max: 200, step: 1, value: 64 },
  },
  bilan: {
    titre: 'Bilan hydrologique ΔS = P + R − E − Qs',
    a: { label: 'Précipitations P', unit: 'km³/an', min: 0, max: 200, step: 1, value: 60 },
    b: { label: 'Évaporation E', unit: 'km³/an', min: 0, max: 200, step: 1, value: 50 },
  },
  strat: {
    titre: 'Stratification thermique et densité',
    a: { label: 'Température de surface', unit: '°C', min: 4, max: 30, step: 1, value: 22 },
    b: { label: 'Profondeur maximale', unit: 'm', min: 10, max: 1642, step: 2, value: 1000 },
  },
  trophie: {
    titre: 'Trophie et phosphore total',
    a: { label: 'Phosphore total TP', unit: 'µg/L', min: 2, max: 150, step: 1, value: 12 },
    b: { label: 'Profondeur moyenne', unit: 'm', min: 5, max: 300, step: 1, value: 40 },
  },
  niveau: {
    titre: 'Retrait du niveau et perte de rives',
    a: { label: 'Niveau (en % du repère)', unit: '%', min: 60, max: 100, step: 1, value: 100 },
    b: { label: 'Exposant de forme p', unit: '', min: 1, max: 3, step: 0.1, value: 2 },
  },
};

const LEGENDES = {
  sejour: 'Traits pleins : bassin et flux. Flèches étiquetées : entrée (V) et sortie (Q). La barre compare le temps de séjour au repère de 190 ans ; la gouttelette animée suit l’exutoire.',
  bilan: 'Barres vers le haut : entrées P et R ; vers le bas : sorties E et Qs. Le tiret horizontal marque l’équilibre ; le bilan ΔS est écrit en toutes lettres.',
  strat: 'Courbe pleine : profil de température. Tirets : thermocline (légèrement animée). Textes : épilimnion, thermocline, hypolimnion à 4 °C.',
  trophie: 'Hachures de plus en plus denses : trophie croissante. Textes et traits : seuils 10 / 35 / 100 µg/L. Le repère vertical marque le phosphore total.',
  niveau: 'Tirets : rives de référence à 100 %. Trait plein et hachures : étendue actuelle. La perte de surface est écrite en pourcentage, jamais par la seule couleur.',
};

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'sejour',
  a: MODES.sejour.a.value,
  b: MODES.sejour.b.value,
  playing: false,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

const fmt = (n, d = 1) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

/* Densité de l'eau douce (kg/m³), approximation polynomiale standard :
 * le maximum se produit vers 3,98 °C — c'est le chantier E013-07. */
function waterDensity(t) {
  return 1000 * (1 - ((t + 288.9414) / (508929.2 * (t + 68.12963))) * Math.pow(t - 3.9863, 2));
}

/* ---------- Modèles déterministes (E013-05 à E013-09) ---------- */

function modelSejour() {
  const V = S.a;
  const Q = Math.max(1, S.b);
  return { V, Q, tau: V / Q, ref: 190 };
}

function modelBilan() {
  const P = S.a;
  const E = S.b;
  const R = 40; /* ruissellement et affluents, repère fixe */
  const Qs = 60; /* exutoire, repère fixe */
  return { P, R, E, Qs, dS: P + R - E - Qs };
}

function modelStrat() {
  const Ts = S.a;
  const H = S.b;
  return {
    Ts,
    H,
    rhoS: waterDensity(Ts),
    rho4: waterDensity(4),
    zTherm: Math.max(8, H * 0.15),
  };
}

function modelTrophie() {
  const tp = S.a;
  const Hm = S.b;
  let classe;
  let seuil;
  if (tp < 10) { classe = 'oligotrophe'; seuil = 'moins de 10 µg/L'; }
  else if (tp < 35) { classe = 'mésotrophe'; seuil = '10 à 35 µg/L'; }
  else if (tp < 100) { classe = 'eutrophe'; seuil = '35 à 100 µg/L'; }
  else { classe = 'hypereutrophe'; seuil = 'plus de 100 µg/L'; }
  return { tp, Hm, classe, seuil, transparence: Math.max(0.5, 8 / (1 + tp / 12)) };
}

function modelNiveau() {
  const h = S.a;
  const p = S.b;
  const A0 = 31700; /* km², repère d'un grand lac (ordre de grandeur) */
  const area = A0 * Math.pow(Math.max(0, Math.min(1, h / 100)), p);
  return { h, p, A0, area, perte: 100 * (1 - area / A0) };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e013-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e013-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e013-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e013-panel p{margin:5px 0;max-width:68ch}
#geography-e013-panel .geography-e013-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e013-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#geography-e013-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e013-table th,#geography-e013-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e013-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e013-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e013-mode legend{padding:0 4px;color:var(--muted)}
#geography-e013-panel .geography-e013-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin:0 8px 0 0;
  padding:2px 6px;cursor:pointer;
}
#geography-e013-panel .geography-e013-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
.geography-e013-slider-row{margin:7px 0}
.geography-e013-slider-row label{display:block;color:var(--ink-soft,#d7d1c6)}
.geography-e013-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e013-panel input[type="range"]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
}
#geography-e013-canvas{
  display:block;width:100%;height:220px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e013-legend{font-size:10px;color:var(--muted)}
#geography-e013-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e013-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e013-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e013-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e013-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e013-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e013-panel[data-geography-e013-reduced="1"] button,
#geography-e013-panel[data-geography-e013-reduced="1"] .geography-e013-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e013-panel button,.geography-e013-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e013-panel{font-size:10px;padding:9px}
  #geography-e013-canvas{height:180px}
  #geography-e013-panel .geography-e013-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans animation) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un lac est une étendue d’eau continentale, plus vaste et plus profonde qu’un étang ; aucun seuil universel de superficie ne fait consensus, la distinction est surtout un usage. Un étang reste peu profond (souvent moins de cinq mètres) et une mare est plus petite encore, parfois temporaire.',
    'À titre de repères : le lac Supérieur couvre environ 82 100 km² et reste le plus grand lac d’eau douce du monde par la superficie ; le lac Baïkal atteint environ 1 642 m de profondeur et renferme près de 20 % de l’eau douce de surface non glaciaire de la planète.',
    'L’eau douce est la plus dense vers 4 °C : en hiver, cette eau descend au fond tandis que la glace flotte en surface, ce qui permet à la vie aquatique de survivre sous le gel. C’est le moteur de la stratification saisonnière des lacs tempérés.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e013-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Classement qualitatif des plans d’eau : les seuils chiffrés varient selon les auteurs, aucun chiffre unique ne sépare un lac d’un étang.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Type', 'Origine', 'Profondeur typique', 'Renouvellement'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Lac naturel', 'Bassin creusé par la nature (tectonique, glaciaire, volcanique)', 'quelques m à plus de 1 000 m', 'lent : années à siècles'],
    ['Lac de barrage', 'Rivière coupée par un ouvrage artificiel', 'quelques m à environ 200 m', 'rapide : mois à années'],
    ['Étang', 'Petit bassin peu profond, souvent artificiel', 'moins de 5 m', 'rapide'],
    ['Mare', 'Très petite dépression, parfois temporaire', 'moins de 2 m', 'très rapide, saisonnier'],
    ['Bassin endoréique', 'Bassin fermé, sans exutoire vers la mer', 'variable', 'évaporation dominante'],
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
      radios: MODE_ORDER.map((m) => document.getElementById('geography-e013-mode-' + m)),
      a: document.getElementById(SLIDER_A_ID),
      b: document.getElementById(SLIDER_B_ID),
      aOut: document.getElementById(A_OUT_ID),
      bOut: document.getElementById(B_OUT_ID),
      aLabel: document.getElementById('geography-e013-a-label'),
      bLabel: document.getElementById('geography-e013-b-label'),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e013-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Lacs et plans d’eau — laboratoire');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un plan d’eau se lit comme un bilan : ce qui entre, ce qui sort, et le temps que l’eau y séjourne. Les cinq expériences ci-dessous illustrent des formules déterministes à partir de quelques grandeurs chiffrées et de repères connus (Supérieur, Baïkal).');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Expérience observée (choix unique)';
  fieldset.appendChild(legend);
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e013-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e013-mode';
    radio.id = 'geography-e013-mode-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value].titre));
    fieldset.appendChild(lab);
  });

  const sub = ctx.el('h3', '', 'Régler le modèle');

  const aRow = ctx.el('div', 'geography-e013-slider-row');
  const aLabel = document.createElement('label');
  aLabel.id = 'geography-e013-a-label';
  aLabel.setAttribute('for', SLIDER_A_ID);
  const aOut = document.createElement('span');
  aOut.id = A_OUT_ID;
  aOut.className = 'geography-e013-valeur';
  aLabel.appendChild(document.createTextNode('Grandeur A : '));
  aLabel.appendChild(aOut);
  const a = document.createElement('input');
  a.type = 'range';
  a.id = SLIDER_A_ID;
  a.setAttribute('aria-label', 'Grandeur A du modèle, bornes et unité affichées dans le libellé');
  aRow.append(aLabel, a);

  const bRow = ctx.el('div', 'geography-e013-slider-row');
  const bLabel = document.createElement('label');
  bLabel.id = 'geography-e013-b-label';
  bLabel.setAttribute('for', SLIDER_B_ID);
  const bOut = document.createElement('span');
  bOut.id = B_OUT_ID;
  bOut.className = 'geography-e013-valeur';
  bLabel.appendChild(document.createTextNode('Grandeur B : '));
  bLabel.appendChild(bOut);
  const b = document.createElement('input');
  b.type = 'range';
  b.id = SLIDER_B_ID;
  b.setAttribute('aria-label', 'Grandeur B du modèle, bornes et unité affichées dans le libellé');
  bRow.append(bLabel, b);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire sur les lacs : flèches gauche et droite pour changer d’expérience, haut et bas pour régler la grandeur A, Maj+haut et Maj+bas pour régler la grandeur B. Les valeurs sont énoncées dans le bandeau de lecture.');

  const legendText = ctx.el('p', 'geography-e013-legend', LEGENDES[S.mode]);
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e013-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', '▶ Animer le laboratoire');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, aRow, bRow, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: MODE_ORDER.map((m) => document.getElementById('geography-e013-mode-' + m)),
    a, b, aOut, bOut, aLabel, bLabel, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule boucle) ---------- */

function drawSejour(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.46;
  const rx = iw * 0.20;
  const ry = ih * 0.24;

  g.setLineDash([]);
  g.strokeStyle = 'rgba(214,207,193,.65)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(120,170,200,.35)';
  g.lineWidth = 1;
  for (let x = cx - rx; x <= cx + rx; x += 8) {
    g.beginPath();
    g.moveTo(x, cy - ry);
    g.lineTo(x + ry, cy + ry);
    g.stroke();
  }
  g.restore();

  g.strokeStyle = 'rgba(244,214,158,.9)';
  g.lineWidth = 2;
  const span = iw * 0.18;
  g.beginPath();
  g.moveTo(cx + rx, cy); g.lineTo(cx + rx + span, cy); g.stroke();
  g.beginPath();
  g.moveTo(cx + rx + span - 8, cy - 5); g.lineTo(cx + rx + span, cy); g.lineTo(cx + rx + span - 8, cy + 5); g.stroke();
  g.beginPath();
  g.moveTo(cx - rx, cy); g.lineTo(cx - rx - span, cy); g.stroke();
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText('V entrant', cx - rx - span, cy - 8);
  g.fillText('Q sortie', cx + rx + 4, cy - 8);

  const f = (S.phase / (Math.PI * 2)) % 1;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.arc(cx + rx + span * f, cy, 3, 0, Math.PI * 2);
  g.fill();

  const frac = Math.min(1, m.tau / (m.ref * 2));
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 1;
  g.strokeRect(pad, pad + ih - 22, iw, 6);
  g.fillStyle = 'rgba(244,214,158,.85)';
  g.fillRect(pad, pad + ih - 22, iw * frac, 6);
  g.fillText(`τ ≈ ${fmt(m.tau, 0)} ans · repère ≈ ${m.ref} ans`, pad, pad + ih - 28);
}

function drawBilan(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const mid = pad + ih * 0.48;
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, mid); g.lineTo(pad + iw, mid); g.stroke();
  g.setLineDash([]);
  const max = Math.max(m.P, m.R, m.E, m.Qs, 1);
  const items = [['P +', m.P, 1], ['R +', m.R, 1], ['E −', m.E, -1], ['Qs −', m.Qs, -1]];
  const bw = iw / 5;
  g.font = '10px sans-serif';
  items.forEach((it, i) => {
    const lab = it[0];
    const val = it[1];
    const sign = it[2];
    const x = pad + i * bw + bw * 0.25;
    const len = (val / max) * (ih * 0.34);
    const y = sign > 0 ? mid - len : mid;
    g.fillStyle = 'rgba(214,207,193,.30)';
    g.fillRect(x, y, bw * 0.5, len);
    g.strokeStyle = 'rgba(214,207,193,.85)';
    g.lineWidth = 1;
    g.strokeRect(x, y, bw * 0.5, len);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.fillText(`${lab} ${fmt(val, 0)}`, x, sign > 0 ? mid - len - 4 : mid + len + 12);
  });
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Bilan ΔS = ${m.dS >= 0 ? '+' : ''}${fmt(m.dS, 0)} km³/an`, pad, pad + ih - 6);
}

function drawStrat(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const left = pad + iw * 0.12;
  const right = pad + iw * 0.88;
  const top = pad + ih * 0.14;
  const bottom = pad + ih * 0.80;
  const zTherm = m.zTherm + 2 * Math.sin(S.phase);

  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([]);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    const z = f * m.H;
    const T = 4 + (m.Ts - 4) * Math.exp(-z / zTherm);
    const x = left + (T / 30) * (right - left);
    const y = top + f * (bottom - top);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  const yTh = top + (zTherm / m.H) * (bottom - top);
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.75)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(left, yTh); g.lineTo(right, yTh); g.stroke();
  g.setLineDash([]);

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText('Épilimnion (eau chaude)', left, top - 5);
  g.fillText('Thermocline', right - 62, yTh - 5);
  g.fillText('Hypolimnion ≈ 4 °C', left, bottom + 13);
  g.fillText(`Surface ${fmt(m.Ts, 0)} °C · profondeur ${fmt(m.H, 0)} m · ρ(4 °C) ≈ ${fmt(m.rho4, 3)} kg/m³`, pad, pad + ih - 4);
}

function drawTrophie(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const x0 = pad;
  const yTop = pad + ih * 0.30;
  const yH = ih * 0.28;
  const maxTP = 150;
  const classes = [
    ['Oligotrophe', 0, 10, 9],
    ['Mésotrophe', 10, 35, 7],
    ['Eutrophe', 35, 100, 5],
    ['Hypereutrophe', 100, 150, 3],
  ];
  g.font = '9px sans-serif';
  classes.forEach((cl) => {
    const xa = x0 + (cl[1] / maxTP) * iw;
    const xb = x0 + (cl[2] / maxTP) * iw;
    g.fillStyle = 'rgba(214,207,193,.10)';
    g.fillRect(xa, yTop, xb - xa, yH);
    g.strokeStyle = 'rgba(214,207,193,.55)';
    g.lineWidth = 1;
    g.setLineDash([]);
    g.strokeRect(xa, yTop, xb - xa, yH);
    g.strokeStyle = 'rgba(214,207,193,.35)';
    for (let x = xa + 3; x < xb; x += cl[3]) {
      g.beginPath();
      g.moveTo(x, yTop + yH); g.lineTo(x + 8, yTop); g.stroke();
    }
    g.fillStyle = 'rgba(244,214,158,.9)';
    g.fillText(cl[0], xa + 2, yTop - 5);
  });
  const mx = x0 + (Math.min(maxTP, m.tp) / maxTP) * iw;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(mx, yTop - 2); g.lineTo(mx, yTop + yH + 2); g.stroke();
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`Repères : 10 / 35 / 100 µg/L · transparence ≈ ${fmt(m.transparence, 1)} m · profondeur ${fmt(m.Hm, 0)} m`, pad, pad + ih - 20);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`TP ${fmt(m.tp, 0)} µg/L → ${m.classe}`, pad, pad + ih - 6);
}

function drawNiveau(g, w, h, m) {
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const cx = pad + iw * 0.5;
  const baseY = pad + ih * 0.80;
  const halfW = iw * 0.34;
  const maxH = ih * 0.60;
  const f = Math.max(0, Math.min(1, m.h / 100));
  const wRef = halfW;
  const yTopRef = baseY - maxH;
  const wCur = halfW * Math.pow(f, m.p / 2);
  const yCur = baseY - maxH * f;

  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,255,255,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - wRef, yTopRef); g.lineTo(cx, baseY); g.lineTo(cx + wRef, yTopRef); g.stroke();
  g.setLineDash([]);

  g.beginPath();
  g.moveTo(cx - wCur, yCur); g.lineTo(cx, baseY); g.lineTo(cx + wCur, yCur); g.closePath();
  g.fillStyle = 'rgba(120,170,200,.18)';
  g.fill();
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.stroke();

  g.save();
  g.beginPath();
  g.moveTo(cx - wCur, yCur); g.lineTo(cx, baseY); g.lineTo(cx + wCur, yCur); g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(120,170,200,.35)';
  g.lineWidth = 1;
  for (let x = cx - wCur; x < cx + wCur; x += 8) {
    g.beginPath();
    g.moveTo(x, baseY); g.lineTo(x + maxH, yCur); g.stroke();
  }
  g.restore();

  const osc = 1.5 * Math.sin(S.phase);
  g.strokeStyle = 'rgba(214,207,193,.85)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - wCur, yCur + osc); g.lineTo(cx + wCur, yCur + osc); g.stroke();

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText('Rives de référence = tirets', pad, pad + 10);
  g.fillText(`Niveau ${fmt(m.h, 0)} % · surface ≈ ${fmt(m.area, 0)} km² · perte ≈ ${fmt(m.perte, 0)} %`, pad, pad + ih - 6);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 220;
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
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, Math.max(10, cssW - pad * 2), Math.max(10, cssH - pad * 2));

  if (S.mode === 'sejour') drawSejour(g, cssW, cssH, modelSejour());
  else if (S.mode === 'bilan') drawBilan(g, cssW, cssH, modelBilan());
  else if (S.mode === 'strat') drawStrat(g, cssW, cssH, modelStrat());
  else if (S.mode === 'trophie') drawTrophie(g, cssW, cssH, modelTrophie());
  else if (S.mode === 'niveau') drawNiveau(g, cssW, cssH, modelNiveau());
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const add = (t) => n.appendChild(document.createTextNode(t));
  const put = (t) => {
    const s = document.createElement('strong');
    s.textContent = t;
    n.appendChild(s);
  };
  n.textContent = '';

  if (S.mode === 'sejour') {
    const m = modelSejour();
    add('Temps de séjour τ = V / Q = ');
    put(`${fmt(m.V, 0)} / ${fmt(m.Q, 0)} ≈ ${fmt(m.tau, 0)} ans`);
    add('. Repère : le lac Supérieur se renouvelle en environ 190 ans, soit ');
    put(m.tau > m.ref ? 'un séjour plus long' : 'un séjour plus court');
    add(' que ce repère. Un grand volume et un faible débit allongent le séjour.');
  } else if (S.mode === 'bilan') {
    const m = modelBilan();
    add('Bilan ΔS = P + R − E − Qs = ');
    put(`${fmt(m.P, 0)} + ${fmt(m.R, 0)} − ${fmt(m.E, 0)} − ${fmt(m.Qs, 0)} = ${m.dS >= 0 ? '+' : ''}${fmt(m.dS, 0)} km³/an`);
    add('. ');
    put(m.dS > 0 ? 'Le lac se remplit' : m.dS < 0 ? 'Le lac se vide' : 'Le lac est à l’équilibre');
    add(' ; R = 40 et Qs = 60 km³/an sont des repères fixes du modèle.');
  } else if (S.mode === 'strat') {
    const m = modelStrat();
    add('À ');
    put(`${fmt(m.Ts, 0)} °C`);
    add(' en surface, la densité vaut environ ');
    put(`${fmt(m.rhoS, 3)} kg/m³`);
    add(' ; elle atteint son maximum ');
    put(`${fmt(m.rho4, 3)} kg/m³ vers 4 °C`);
    add('. L’eau froide et dense reste au fond : le lac est stratifié sur ');
    put(`${fmt(m.H, 0)} m`);
    add(' de profondeur.');
  } else if (S.mode === 'trophie') {
    const m = modelTrophie();
    add('Avec ');
    put(`${fmt(m.tp, 0)} µg/L de phosphore total`);
    add(' (repères : ');
    put(m.seuil);
    add('), le lac est ');
    put(m.classe);
    add(' ; la transparence estimée est de ');
    put(`${fmt(m.transparence, 1)} m`);
    add(' pour une profondeur moyenne de ');
    put(`${fmt(m.Hm, 0)} m`);
    add('. Un apport accru de nutriments réduit la transparence.');
  } else if (S.mode === 'niveau') {
    const m = modelNiveau();
    add('À un niveau de ');
    put(`${fmt(m.h, 0)} % du repère`);
    add(' avec un exposant de forme p = ');
    put(fmt(m.p, 1));
    add(', la surface passe d’environ ');
    put(`${fmt(m.A0, 0)} km²`);
    add(' à ');
    put(`${fmt(m.area, 0)} km²`);
    add(', soit une perte de ');
    put(`${fmt(m.perte, 0)} % de rives`);
    add('. La perte est calculée depuis la puissance du niveau, pas lue sur une couleur.');
  }
}

function syncControls() {
  const n = S.nodes;
  if (!n.a || !n.b) return;
  const cfg = MODES[S.mode];

  n.radios.forEach((r) => {
    if (r) r.checked = r.value === S.mode;
  });

  [['a', S.a, cfg.a], ['b', S.b, cfg.b]].forEach(([key, value, c]) => {
    const slider = n[key];
    const out = key === 'a' ? n.aOut : n.bOut;
    const label = key === 'a' ? n.aLabel : n.bLabel;
    slider.min = String(c.min);
    slider.max = String(c.max);
    slider.step = String(c.step);
    slider.value = String(value);
    if (out) out.textContent = `${fmt(value, c.step < 1 ? 1 : 0)} ${c.unit}`.trim();
    if (label) {
      const suffix = c.unit ? ` (${c.unit})` : '';
      label.firstChild.textContent = (key === 'a' ? 'Grandeur A : ' : 'Grandeur B : ') + c.label + suffix + ' = ';
    }
  });

  if (n.legend) n.legend.textContent = LEGENDES[S.mode];
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le laboratoire';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
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
    if (S.playing && !reduced) S.phase = (S.phase + dt * 0.0009) % (Math.PI * 2);
  }
  S.lastTs = ts;
  drawLab();
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE013Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge du schéma sur la carte existante (E013-01) ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e013-badge', 'Plans d’eau : schémas déterministes (séjour, bilan, stratification), sans fond de carte réel chargé.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E013', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE013Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        const cfg = MODES[S.mode];
        S.a = cfg.a.value;
        S.b = cfg.b.value;
        syncControls();
      });
    });
    n.a.addEventListener('input', () => {
      const c = MODES[S.mode].a;
      const v = Math.max(c.min, Math.min(c.max, Number(n.a.value)));
      S.a = c.step < 1 ? Math.round(v * 10) / 10 : Math.round(v / c.step) * c.step;
      syncControls();
    });
    n.b.addEventListener('input', () => {
      const c = MODES[S.mode].b;
      const v = Math.max(c.min, Math.min(c.max, Number(n.b.value)));
      S.b = c.step < 1 ? Math.round(v * 10) / 10 : Math.round(v / c.step) * c.step;
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
        const i = MODE_ORDER.indexOf(S.mode);
        S.mode = MODE_ORDER[(i + step + MODE_ORDER.length) % MODE_ORDER.length];
        S.a = MODES[S.mode].a.value;
        S.b = MODES[S.mode].b.value;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const sign = event.key === 'ArrowUp' ? 1 : -1;
        const c = event.shiftKey ? MODES[S.mode].b : MODES[S.mode].a;
        const v = (event.shiftKey ? S.b : S.a) + sign * c.step;
        const clamped = Math.max(c.min, Math.min(c.max, v));
        const val = c.step < 1 ? Math.round(clamped * 10) / 10 : clamped;
        if (event.shiftKey) S.b = val; else S.a = val;
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
