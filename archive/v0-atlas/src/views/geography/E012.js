import { register } from './registry.js';

/* Lentille E012 — vue GEOGRAPHIE.
 * Thème : fleuves et cours d'eau (débit, profil en long, régime, tarage,
 * confluence, ordre de Strahler).
 *
 * Les dix chantiers E012-01 … E012-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E012.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, légendes) présent dans le DOM ; le canvas n'est qu'un
 * laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e012';
const PANEL_ID = 'geography-e012-panel';
const TITLE_ID = 'geography-e012-title';
const MODE_ID = 'geography-e012-mode';
const VIT_ID = 'geography-e012-vitesse';
const VIT_OUT_ID = 'geography-e012-vitesse-value';
const DIST_ID = 'geography-e012-distance';
const DIST_OUT_ID = 'geography-e012-distance-value';
const CANVAS_ID = 'geography-e012-canvas';
const READOUT_ID = 'geography-e012-readout';
const PLAY_ID = 'geography-e012-play';
const CONFL_ID = 'geography-e012-confluence';
const LEGEND_ID = 'geography-e012-legend';
const BADGE_ID = 'geography-e012-badge';

/* Constantes hydrologiques de référence (ordres de grandeur, deterministes). */
const SECTION_M2 = 1200;      // section mouillée de référence (m²)
const AFFLUENT_Q = 900;       // débit de l'affluent de la confluence (m³/s)
const RHIN_MODULE = 2330;     // module du Rhin, référence comparée (m³/s)
const DENIVELE = 1200;        // dénivelé source → embouchure (m)
const LONGUEUR_KM = 1200;     // longueur du cours (km)
const EXP_PROFIL = 1.8;       // exposant du profil concave
const TARAGE_C = 14;          // coefficient de la courbe de tarage
const TARAGE_N = 2.1;         // exposant de la courbe de tarage
const H_MIN = 0.4;            // hauteur minimale de lecture (m)
const H_MAX = 8;              // hauteur maximale de lecture (m)

const MODES = {
  profil: 'Profil en long',
  regime: 'Régime saisonnier',
  tarage: 'Courbe de tarage',
};
const MODE_ORDER = ['profil', 'regime', 'tarage'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  mode: 'profil',
  vitesse: 1.5,
  distance: 600,
  confluence: false,
  playing: false,
  sweep: 0,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}
function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* Chantier 03 — débit Q = S × v. */
function debit(vitesse) {
  return SECTION_M2 * vitesse;
}

/* Chantier 04 — profil en long concave h(x) = H0·(1 − x/L)^p et pente locale. */
function profileAt(xkm) {
  const t = clamp(xkm / LONGUEUR_KM, 0, 1);
  const rest = 1 - t;
  return {
    t,
    h: DENIVELE * Math.pow(rest, EXP_PROFIL),
    // |dh/dx| en m/km ; 1 m/km = 1 ‰.
    pente: (DENIVELE * EXP_PROFIL / LONGUEUR_KM) * Math.pow(rest, EXP_PROFIL - 1),
  };
}

/* Chantier 05 — régime saisonnier : débit relatif au module (sinusoïde). */
function regimeAt(mois, type) {
  const phase = type === 'nival' ? 3 : 10;
  const amp = type === 'nival' ? 0.55 : 0.45;
  return 1 + amp * Math.sin((2 * Math.PI * (mois - phase)) / 12);
}

/* Chantier 06 — courbe de tarage Q = C·h^n. */
function ratingAt(h) {
  return TARAGE_C * Math.pow(Math.max(0, h), TARAGE_N);
}

/* Chantier 08 — ordre de Strahler : fusion récursive de branches de même ordre. */
function strahler(orders) {
  let list = orders.slice().sort((a, b) => b - a);
  if (!list.length) return 0;
  while (list.length > 1) {
    const a = list[0];
    const b = list[1];
    if (a === b) {
      list = [a + 1].concat(list.slice(2)).sort((x, y) => y - x);
    } else {
      list = list.slice(1);
    }
  }
  return list[0];
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e012-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e012-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e012-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e012-panel p{margin:5px 0;max-width:68ch}
#geography-e012-panel .geography-e012-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e012-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e012-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e012-table th,#geography-e012-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e012-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e012-mode{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e012-mode legend{padding:0 4px;color:var(--muted)}
#geography-e012-panel .geography-e012-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e012-panel .geography-e012-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e012-panel input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e012-panel .geography-e012-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e012-vitesse,#geography-e012-distance{display:block}
#geography-e012-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e012-legend{font-size:10px;color:var(--muted)}
#geography-e012-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e012-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e012-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e012-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e012-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e012-panel .geography-e012-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-e012-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e012-panel[data-geography-e012-reduced="1"] button,
#geography-e012-panel[data-geography-e012-reduced="1"] .geography-e012-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e012-panel button,.geography-e012-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e012-panel{font-size:10px;padding:9px}
  #geography-e012-canvas{height:190px}
  #geography-e012-panel .geography-e012-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un fleuve est un cours d’eau permanent qui draine un bassin versant et rejoint une mer, un lac ou un autre fleuve ; il se distingue d’une rivière par son débit et sa longueur.',
    'Le débit Q est le volume d’eau écoulé par unité de temps : Q = S × v, avec S la section mouillée et v la vitesse moyenne du courant. Le module est le débit moyen interannuel.',
    'Le profil en long d’un cours d’eau est concave : la pente est forte à l’amont et faible à l’aval, parce que l’énergie disponible diminue au fil de la distance parcourue.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e012-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e012-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Grands fleuves — débits moyens approximatifs (ordres de grandeur, m³/s) et régime dominant.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Fleuve', 'Débit moyen (m³/s)', 'Régime dominant'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Amazonie', '≈ 209 000', 'Pluvial'],
    ['Congo', '≈ 41 000', 'Pluvial'],
    ['Danube', '≈ 6 500', 'Pluvio-nival'],
    ['Nil', '≈ 2 830', 'Pluvial (crue estivale)'],
    ['Rhin', '≈ 2 330', 'Pluvio-nival'],
    ['Loire', '≈ 900', 'Pluvial'],
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

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.className = 'geography-e012-valeur';
  out.id = outId;
  label.appendChild(out);
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', aria);
  row.appendChild(input);
  return { row, input, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: MODE_ORDER.map((m) => document.getElementById('geography-e012-mode-' + m)),
      vitesse: document.getElementById(VIT_ID),
      vitesseOut: document.getElementById(VIT_OUT_ID),
      distance: document.getElementById(DIST_ID),
      distanceOut: document.getElementById(DIST_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      confluence: document.getElementById(CONFL_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e012-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Fleuves et cours d’eau');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le laboratoire ci-dessous illustre quatre grandes questions de l’hydrologie : combien d’eau coule (débit), comment la rivière descend (profil), quand elle grossit (régime) et comment on la mesure (tarage).');

  const fieldset = document.createElement('fieldset');
  fieldset.id = MODE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Vue du laboratoire (choix unique)';
  fieldset.appendChild(legend);
  MODE_ORDER.forEach((value) => {
    const lab = ctx.el('label', 'geography-e012-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e012-mode';
    radio.id = 'geography-e012-mode-' + value;
    radio.value = value;
    radio.checked = S.mode === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(MODES[value]));
    fieldset.appendChild(lab);
  });

  const vit = rangeRow('Vitesse du courant', VIT_ID, VIT_OUT_ID, 0.2, 3, 0.1, S.vitesse, 'Vitesse moyenne du courant, de 0,2 à 3 mètres par seconde');
  const dist = rangeRow('Distance depuis la source', DIST_ID, DIST_OUT_ID, 0, LONGUEUR_KM, 25, S.distance, 'Distance depuis la source, de 0 à 1 200 kilomètres');

  const conflLab = ctx.el('label', 'geography-e012-choix');
  const confl = document.createElement('input');
  confl.type = 'checkbox';
  confl.id = CONFL_ID;
  confl.checked = S.confluence;
  conflLab.appendChild(confl);
  conflLab.appendChild(document.createTextNode('Confluence : ajouter un affluent de 900 m³/s'));

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire hydrologique. Flèches gauche et droite : changer de vue ; flèches haut et bas : déplacer le curseur de lecture.');

  const legendText = ctx.el('p', 'geography-e012-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e012-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', 'geography-e012-sr', 'Commandes du laboratoire : choix unique de la vue avec les boutons radio ; flèches gauche et droite sur le graphique pour changer de vue, flèches haut et bas pour déplacer le curseur ; le bouton Animer lance ou arrête la goutte qui descend le profil.');
  help.id = 'geography-e012-help';
  panel.setAttribute('aria-describedby', help.id);

  const play = ctx.el('button', '', '▶ Animer la goutte');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, vit.row, dist.row, conflLab, canvas, legendText, readout, help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: MODE_ORDER.map((m) => document.getElementById('geography-e012-mode-' + m)),
    vitesse: document.getElementById(VIT_ID),
    vitesseOut: document.getElementById(VIT_OUT_ID),
    distance: document.getElementById(DIST_ID),
    distanceOut: document.getElementById(DIST_OUT_ID),
    canvas, readout, play, confluence: confl, legend: legendText,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, trois vues) ---------- */

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

  const pad = 20;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const X = (u) => pad + u * iw;
  const Y = (v) => pad + (1 - v) * ih;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Repère en croix : jamais la couleur seule. */
  const cross = (x, y) => {
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
  };

  if (S.mode === 'profil') {
    g.fillStyle = 'rgba(244,214,158,.10)';
    g.beginPath();
    g.moveTo(X(0), Y(0));
    for (let km = 0; km <= LONGUEUR_KM; km += 20) {
      g.lineTo(X(km / LONGUEUR_KM), Y(profileAt(km).h / DENIVELE));
    }
    g.lineTo(X(1), Y(0));
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    g.beginPath();
    for (let km = 0; km <= LONGUEUR_KM; km += 20) {
      const pt = profileAt(km);
      if (km === 0) g.moveTo(X(pt.t), Y(pt.h / DENIVELE));
      else g.lineTo(X(pt.t), Y(pt.h / DENIVELE));
    }
    g.stroke();

    const curseur = profileAt(S.distance);
    cross(X(curseur.t), Y(curseur.h / DENIVELE));

    const goutteKm = S.sweep * LONGUEUR_KM;
    const goutte = profileAt(goutteKm);
    const gx = X(goutte.t);
    const gy = Y(goutte.h / DENIVELE);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath();
    g.arc(gx, gy, 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.setLineDash([2, 3]);
    g.beginPath();
    g.moveTo(gx, gy); g.lineTo(gx, Y(0));
    g.stroke();
    g.setLineDash([]);

    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Profil en long — 1 200 m de dénivelé sur 1 200 km', pad + 2, pad + 13);
    g.fillText('source', pad + 2, cssH - pad - 4);
    g.fillText('embouchure', cssW - pad - 60, cssH - pad - 4);
  } else if (S.mode === 'regime') {
    const qMax = 1.7;
    const drawCurve = (type, dash, color) => {
      g.strokeStyle = color;
      g.lineWidth = 2;
      if (g.setLineDash) g.setLineDash(dash);
      g.beginPath();
      for (let m = 1; m <= 12; m += 0.1) {
        const v = regimeAt(m, type) / qMax;
        if (m === 1) g.moveTo(X((m - 1) / 11), Y(v));
        else g.lineTo(X((m - 1) / 11), Y(v));
      }
      g.stroke();
      if (g.setLineDash) g.setLineDash([]);
    };
    drawCurve('nival', [], 'rgba(244,214,158,.95)');
    drawCurve('pluvial', [6, 4], 'rgba(214,207,193,.75)');

    const mois = 1 + Math.floor((S.distance / LONGUEUR_KM) * 11);
    const mx = X((mois - 1) / 11);
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(mx, pad); g.lineTo(mx, Y(0)); g.stroke();
    g.setLineDash([]);
    cross(mx, Y(regimeAt(mois, 'nival') / qMax));

    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Régime nival (plein) / pluvial (tirets)', pad + 2, pad + 13);
    g.fillText('Débit relatif au module — mois ' + mois, pad + 2, cssH - pad - 4);
  } else {
    const qMax = ratingAt(H_MAX) * 1.05;
    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    g.beginPath();
    for (let h = 0; h <= H_MAX; h += 0.1) {
      const v = ratingAt(h) / qMax;
      if (h === 0) g.moveTo(X(h / H_MAX), Y(v));
      else g.lineTo(X(h / H_MAX), Y(v));
    }
    g.stroke();

    const h = H_MIN + (S.distance / LONGUEUR_KM) * (H_MAX - H_MIN);
    const hx = X(h / H_MAX);
    const hy = Y(ratingAt(h) / qMax);
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(hx, pad); g.lineTo(hx, Y(0)); g.stroke();
    g.setLineDash([]);
    cross(hx, hy);

    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '11px sans-serif';
    g.fillText('Courbe de tarage Q = 14 × h^2,1', pad + 2, pad + 13);
    g.fillText('Hauteur h = ' + fmt2(h) + ' m', pad + 2, cssH - pad - 4);
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const q = debit(S.vitesse);
  const qTot = S.confluence ? q + AFFLUENT_Q : q;
  const pct = Math.round((qTot / RHIN_MODULE) * 100);
  const ordre = strahler(S.confluence ? [1, 1] : [1]);
  const prof = profileAt(S.distance);
  const mois = 1 + Math.floor((S.distance / LONGUEUR_KM) * 11);
  const h = H_MIN + (S.distance / LONGUEUR_KM) * (H_MAX - H_MIN);

  n.textContent = '';
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  add('Débit Q = S × v = 1 200 m² × ' + fmt2(S.vitesse) + ' m/s = ');
  n.appendChild(strong(fmtInt(q) + ' m³/s'));
  if (S.confluence) {
    add(' ; avec l’affluent (+900 m³/s) : ');
    n.appendChild(strong(fmtInt(qTot) + ' m³/s'));
  }
  add('. Référence — module du Rhin ≈ 2 330 m³/s : ');
  n.appendChild(strong(pct + ' %'));
  add('. Ordre de Strahler aval : ');
  n.appendChild(strong(String(ordre)));
  add('. Lecture : ');
  if (S.mode === 'profil') {
    add('à ' + fmtInt(S.distance) + ' km, altitude ' + fmtInt(prof.h) + ' m, pente ' + fmt2(prof.pente) + ' ‰ (1 m/km = 1 ‰).');
  } else if (S.mode === 'regime') {
    add('au mois ' + mois + ', régime nival ' + fmt2(regimeAt(mois, 'nival')) + '× le module, régime pluvial ' + fmt2(regimeAt(mois, 'pluvial')) + '×.');
  } else {
    add('hauteur ' + fmt2(h) + ' m → débit taré ' + fmtInt(ratingAt(h)) + ' m³/s.');
  }
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  if (S.mode === 'profil') {
    n.textContent = 'Trait plein : profil concave. Croix : curseur de lecture. Point blanc : goutte animée, dont la position = fonction déterministe du temps (aucun aléa).';
  } else if (S.mode === 'regime') {
    n.textContent = 'Trait plein : régime nival (crue de fonte au printemps). Tirets : régime pluvial (crue d’hiver). La forme du trait distingue les courbes, indépendamment de la couleur.';
  } else {
    n.textContent = 'Courbe de tarage : le débit croît comme une puissance de la hauteur d’eau. La croix marque la hauteur lue sur le curseur.';
  }
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => { if (radio) radio.checked = MODE_ORDER[i] === S.mode; });
  if (n.vitesse) n.vitesse.value = String(S.vitesse);
  if (n.vitesseOut) n.vitesseOut.textContent = fmt2(S.vitesse) + ' m/s';
  if (n.distance) n.distance.value = String(S.distance);
  if (n.distanceOut) n.distanceOut.textContent = fmtInt(S.distance) + ' km';
  if (n.confluence) n.confluence.checked = S.confluence;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer la goutte';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden et hors écran ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined'
    ? false
    : (!document.hidden && S.inView);
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (!canRun()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (!canRun()) return;
  const reduced = typeof ctxReducedMotion === 'function' ? ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00007) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReducedMotion = null;

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
        if (panel) panel.dataset.geographyE012Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.observer && S.nodes.panel && typeof IntersectionObserver === 'function') {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const e = entries[0];
        S.inView = !e || e.isIntersecting;
        if (!S.inView) stopLoop();
        else if (S.playing) startLoop();
      });
      S.observer.observe(S.nodes.panel);
    } catch { /* observation indisponible : la boucle reste active. */ }
  }
}

/* ---------- Badge de rappel du cadre schématique ---------- */

function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = 'geography-e012-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Hydrologie schématique : courbes deterministes à partir de Q = S·v, d’un profil concave, d’un régime sinusoïdal et d’une courbe de tarage.';
  map.appendChild(badge);
}

let ctxLayout = null;
let ctxStage = null;

/* ---------- Point d'entrée ---------- */

register('E012', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;
  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();

  const reduced = ctxReducedMotion();
  S.nodes.panel.dataset.geographyE012Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.mode = radio.value;
        syncControls();
      });
    });
    n.vitesse.addEventListener('input', () => {
      S.vitesse = clamp(Math.round(Number(n.vitesse.value) * 10) / 10, 0.2, 3);
      syncControls();
    });
    n.distance.addEventListener('input', () => {
      S.distance = clamp(Math.round(Number(n.distance.value) / 25) * 25, 0, LONGUEUR_KM);
      syncControls();
    });
    n.confluence.addEventListener('change', () => {
      S.confluence = !!n.confluence.checked;
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
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 25 : -25;
        S.distance = clamp(S.distance + step, 0, LONGUEUR_KM);
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
  if (S.playing) startLoop();
});
