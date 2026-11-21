import { register } from './registry.js';

/* Lentille E100 — vue GEOGRAPHIE.
 * Thème : lisibilité cognitive et charge mentale — synthèse des bonnes
 * pratiques d'accessibilité de la vue (longueur de ligne, contraste,
 * mémoire de travail, cibles tactiles, mouvement, annonces).
 *
 * Les dix chantiers E100-01 … E100-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E100.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau captioné) présent dans le DOM ; le canvas n'est
 * qu'un laboratoire déterministe qui illustre des seuils vérifiables.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e100';
const PANEL_ID = 'geography-e100-panel';
const TITLE_ID = 'geography-e100-title';
const TABLE_ID = 'geography-e100-table';
const METRIC_ID = 'geography-e100-metric';
const VALUE_ID = 'geography-e100-value';
const VALUE_OUT_ID = 'geography-e100-value-out';
const OVERLOAD_ID = 'geography-e100-overload';
const MOTION_ID = 'geography-e100-motion';
const PLAY_ID = 'geography-e100-play';
const CANVAS_ID = 'geography-e100-canvas';
const LEGEND_ID = 'geography-e100-legend';
const READOUT_ID = 'geography-e100-readout';
const BADGE_ID = 'geography-e100-badge';

/* Fabricant fourni par la coque ; repli local avant la première execution. */
let mk = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
};

/* Quatre grandeurs mesurables, chacune rapportée à une référence explicite. */
const METRICS = [
  {
    key: 'lignes', label: 'Longueur de ligne', short: 'ligne', unite: 'car.',
    min: 30, max: 120, low: 45, high: 75, resol: 1,
    ref: '45 à 75 caractères par ligne',
    source: 'WCAG 1.4.8 : 45 à 75 caractères par ligne',
  },
  {
    key: 'contraste', label: 'Contraste du texte', short: 'contraste', unite: ': 1',
    min: 1, max: 21, low: 4.5, high: 21, resol: 0.1,
    ref: 'au moins 4,5 : 1',
    source: 'WCAG 1.4.3 (AA) : 4,5 : 1 pour le texte courant',
  },
  {
    key: 'memoire', label: 'Éléments à retenir', short: 'mémoire', unite: 'éléments',
    min: 3, max: 15, low: 5, high: 9, resol: 1,
    ref: '7 ± 2 éléments',
    source: 'Miller (1956) : 7 ± 2 éléments en mémoire de travail',
  },
  {
    key: 'cible', label: 'Taille des cibles', short: 'cible', unite: 'px',
    min: 16, max: 64, low: 44, high: 64, resol: 1,
    ref: 'au moins 44 × 44 px',
    source: 'WCAG 2.5.5 (AAA) : 44 × 44 px ; 2.5.8 (AA) : 24 × 24 px',
  },
];

const METRIC_PAR_DEFAUT = 'lignes';
const INDEX_REF = 25; /* indice de charge ≤ 25 = charge faible (référence pédagogique). */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  values: { lignes: 70, contraste: 4.5, memoire: 7, cible: 44 },
  metric: METRIC_PAR_DEFAUT,
  playing: false,
  sweep: 0.5,
  overload: false,
  forcedReduced: false,
  osReduced: false,
  snapshot: null,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

function fmtVal(m, v) {
  if (m.resol === 1) return String(Math.round(v));
  return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
}

/* Retourne la valeur courante de la grandeur m. */
function valeur(m) {
  return S.values[m.key];
}

/* Pénalité normalisée 0 (conforme) … 1 (hors recommandation). */
function penalty(m) {
  const v = valeur(m);
  if (m.key === 'lignes') {
    if (v >= m.low && v <= m.high) return 0;
    const ecart = v < m.low ? m.low - v : v - m.high;
    return Math.min(1, ecart / 45);
  }
  if (m.key === 'contraste') {
    if (v >= 4.5) return 0;
    return Math.min(1, (4.5 - v) / 3.5);
  }
  if (m.key === 'memoire') {
    if (v <= m.high) return 0;
    return Math.min(1, (v - m.high) / 6);
  }
  if (m.key === 'cible') {
    if (v >= 44) return 0;
    return Math.min(1, (44 - v) / 28);
  }
  return 0;
}

function qualite(m) {
  const p = penalty(m);
  if (p === 0) return 'conforme';
  if (p < 0.5) return 'à améliorer';
  return 'hors recommandation';
}

/* Indice synthétique : moyenne des pénalités × 100, borné [0, 100]. */
function indexCharge() {
  let somme = 0;
  METRICS.forEach((m) => { somme += penalty(m); });
  return Math.round((somme / METRICS.length) * 100);
}

function estReduit() {
  return !!(S.osReduced || S.forcedReduced);
}

function metriqueCourante() {
  return METRICS.find((m) => m.key === S.metric) || METRICS[0];
}

function appliquerValeur(m, v) {
  const borne = Math.max(m.min, Math.min(m.max, v));
  S.values[m.key] = m.resol === 1 ? Math.round(borne) : Math.round(borne * 10) / 10;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e100-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e100-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e100-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e100-panel p{margin:5px 0;max-width:70ch}
#geography-e100-panel .geography-e100-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e100-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#geography-e100-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e100-table th,#geography-e100-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e100-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e100-panel fieldset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e100-panel legend{padding:0 4px;color:var(--muted)}
#geography-e100-panel .geography-e100-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#geography-e100-panel .geography-e100-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#geography-e100-value{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e100-value-out{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e100-canvas{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e100-legend{font-size:10px;color:var(--muted)}
#geography-e100-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e100-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e100-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e100-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e100-panel button[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16);
}
#geography-e100-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e100-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);
  color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e100-panel[data-geography-e100-reduced="1"] button,
#geography-e100-panel[data-geography-e100-reduced="1"] .geography-e100-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e100-panel button,.geography-e100-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e100-panel{font-size:10px;padding:9px}
  #geography-e100-canvas{height:230px}
  #geography-e100-panel .geography-e100-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique (lisible sans animation) ---------- */

function staticFacts() {
  const wrap = mk('div', '');
  const faits = [
    'La charge cognitive intrinsèque tient à la difficulté propre de la tâche ; la charge extrinsèque vient de la manière dont l’information est présentée. Une interface lisible réduit la charge extrinsèque sans jamais retirer le savoir.',
    'Mieux vaut reconnaître que se souvenir : afficher les libellés, garder les choix visibles et rester cohérent économise la mémoire de travail. Un groupe de 7 éléments au plus se parcourt d’un coup d’œil.',
    'Un seuil n’est utile que s’il est vérifiable : 45 à 75 caractères par ligne, 4,5 : 1 de contraste et 44 px de cible sont des mesures que l’on peut contrôler, pas des préférences de goût.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(mk('p', 'geography-e100-fait', texte));
  });
  return wrap;
}

function staticTable() {
  const table = mk('table', '');
  table.id = TABLE_ID;
  table.appendChild(mk('caption', '',
    'Seuils de référence de la lisibilité et coût cognitif d’un écart (valeurs vérifiables, non des opinions).'));

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pratique', 'Seuil de référence', 'Risque si l’on s’en écarte', 'Origine du seuil'].forEach((h) => {
    const th = mk('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Longueur de ligne', '45 à 75 car.', 'Allers-retours oculaires, perte du fil', 'WCAG 1.4.8'],
    ['Contraste du texte', '≥ 4,5 : 1', 'Lecture lente, fatigue visuelle', 'WCAG 1.4.3 (AA)'],
    ['Éléments à retenir', '7 ± 2', 'Surcharge de la mémoire de travail', 'Miller (1956)'],
    ['Taille des cibles', '≥ 44 × 44 px', 'Clics manqués, hésitation', 'WCAG 2.5.5 / 2.5.8'],
    ['Mouvement', '≤ 500 ms, pas de clignotement', 'Distraction, inconfort vestibulaire', 'WCAG 2.2.2 / 2.3.1'],
    ['Annonces', 'région live polie', 'Information manquée au lecteur d’écran', 'WCAG 4.1.3'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((texte, i) => {
      const cell = mk(i === 0 ? 'th' : 'td', '', texte);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau ---------- */

function radioGroup() {
  const fieldset = document.createElement('fieldset');
  fieldset.id = METRIC_ID;
  fieldset.appendChild(mk('legend', '', 'Grandeur observée (choix unique)'));
  METRICS.forEach((m) => {
    const lab = mk('label', 'geography-e100-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e100-metrique';
    radio.id = `${METRIC_ID}-${m.key}`;
    radio.value = m.key;
    radio.checked = S.metric === m.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(m.label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function ensurePanel() {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: METRICS.map((m) => document.getElementById(`${METRIC_ID}-${m.key}`)),
      value: document.getElementById(VALUE_ID),
      valueOut: document.getElementById(VALUE_OUT_ID),
      overload: document.getElementById(OVERLOAD_ID),
      motion: document.getElementById(MOTION_ID),
      play: document.getElementById(PLAY_ID),
      canvas: document.getElementById(CANVAS_ID),
      legend: document.getElementById(LEGEND_ID),
      readout: document.getElementById(READOUT_ID),
    };
  }

  const panel = mk('section', '');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = mk('h2', '', 'Lisibilité cognitive et charge mentale');
  title.id = TITLE_ID;
  const lead = mk('p', '',
    'Une carte se lit avec les yeux et avec la mémoire de travail. Ce panneau rassemble les repères qui réduisent l’effort de lecture : mesure des lignes, contraste, nombre d’éléments, taille des cibles. Le laboratoire ci-dessous les compare à leur seuil, sans jamais cacher la valeur mesurée.');
  const sousTitre = mk('h3', '', 'Trois définitions pour orienter le regard');
  const sousTitre2 = mk('h3', '', 'Seuils vérifiables');
  const sousTitre3 = mk('h3', '', 'Laboratoire : estimer la charge');

  const valueRow = mk('p', '');
  const valueLabel = document.createElement('label');
  valueLabel.setAttribute('for', VALUE_ID);
  valueLabel.appendChild(document.createTextNode('Valeur de la grandeur sélectionnée : '));
  const valueOut = mk('span', '', '');
  valueOut.id = VALUE_OUT_ID;
  valueLabel.appendChild(valueOut);
  valueRow.appendChild(valueLabel);

  const value = document.createElement('input');
  value.type = 'range';
  value.id = VALUE_ID;
  value.setAttribute('aria-label', 'Valeur de la grandeur observée, de son minimum à son maximum');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Quatre barres comparant chaque pratique à sa zone de recommandation. Losange plein : conforme ; carré vide : à améliorer ; croix : hors recommandation. Flèches gauche et droite : déplacer le balayage ; flèches haut et bas : changer de grandeur.');

  const legend = mk('p', 'geography-e100-legend', '');
  legend.id = LEGEND_ID;

  const readout = mk('p', 'geography-e100-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = mk('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const overload = mk('button', '', 'Simuler une charge élevée');
  overload.type = 'button';
  overload.id = OVERLOAD_ID;
  overload.setAttribute('aria-pressed', 'false');

  const motion = mk('button', '', 'Simuler le mouvement réduit');
  motion.type = 'button';
  motion.id = MOTION_ID;
  motion.setAttribute('aria-pressed', 'false');

  panel.append(title, lead, sousTitre, staticFacts(), sousTitre2, staticTable(),
    sousTitre3, radioGroup(), valueRow, value, canvas, legend, readout,
    play, overload, motion);

  const host = ctxHost();
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : null;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, fresh: true,
    radios: METRICS.map((m) => document.getElementById(`${METRIC_ID}-${m.key}`)),
    value, valueOut, overload, motion, play, canvas, legend, readout,
  };
}

/* Hôte courant, mémorisé par la lentille pour les reconstructions. */
let hostRef = null;
function ctxHost() { return hostRef; }

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 260;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const left = 18;
  const right = cssW - 18;
  const trackW = Math.max(20, right - left);
  const top = 32;
  const rowH = Math.max(40, Math.min(48, (cssH - top - 44) / METRICS.length));
  const xFor = (m, val) => left + ((val - m.min) / (m.max - m.min)) * trackW;

  g.font = '11px sans-serif';
  g.textAlign = 'left';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Indice de charge mentale : ${indexCharge()} / 100  ·  référence ≤ ${INDEX_REF}`, left, 18);

  METRICS.forEach((m, i) => {
    const y = top + i * rowH;
    const v = valeur(m);
    const p = penalty(m);
    const xv = xFor(m, v);
    const xa = xFor(m, m.low);
    const xb = xFor(m, m.high);

    /* Piste et zone de recommandation (cadre en tirets, pas la seule couleur). */
    g.fillStyle = 'rgba(255,255,255,.05)';
    g.fillRect(left, y + 14, trackW, 10);
    g.strokeStyle = 'rgba(230,185,111,.55)';
    g.lineWidth = 1;
    g.setLineDash([3, 3]);
    g.strokeRect(xa, y + 12, Math.max(1, xb - xa), 14);
    g.setLineDash([]);

    /* Rempli jusqu'à la valeur mesurée. */
    g.fillStyle = p === 0 ? 'rgba(244,214,158,.85)' : 'rgba(214,207,193,.55)';
    g.fillRect(left, y + 14, Math.max(0, xv - left), 10);

    /* Marqueur : forme = état, indépendamment de la couleur. */
    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.lineWidth = 2;
    const my = y + 19;
    if (p === 0) {
      g.beginPath();
      g.moveTo(xv, my - 6); g.lineTo(xv + 6, my); g.lineTo(xv, my + 6); g.lineTo(xv - 6, my);
      g.closePath(); g.fill();
    } else if (p < 0.5) {
      g.strokeRect(xv - 5, my - 5, 10, 10);
    } else {
      g.beginPath();
      g.moveTo(xv - 5, my - 5); g.lineTo(xv + 5, my + 5);
      g.moveTo(xv + 5, my - 5); g.lineTo(xv - 5, my + 5);
      g.stroke();
    }

    g.fillStyle = 'rgba(240,236,226,.95)';
    g.fillText(`${m.label} : ${fmtVal(m, v)} ${m.unite} — ${qualite(m)}`, left, y + 9);
    g.fillStyle = 'rgba(184,178,166,.9)';
    g.fillText(`zone ${fmtVal(m, m.low)} à ${fmtVal(m, m.high)} ${m.unite}`, left, y + 38);
  });

  /* Curseur de balayage : position déterministe, jamais aléatoire. */
  const xs = left + S.sweep * trackW;
  g.strokeStyle = 'rgba(230,185,111,.70)';
  g.lineWidth = 1;
  g.setLineDash([3, 4]);
  g.beginPath();
  g.moveTo(xs, top - 4);
  g.lineTo(xs, top + METRICS.length * rowH - 10);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(230,185,111,.9)';
  g.fillText('balayage', Math.min(xs + 4, right - 52), top + METRICS.length * rowH + 4);
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Cadre en tirets = zone de recommandation ; losange plein = conforme, carré vide = à améliorer, croix = hors recommandation. Les formes et les libellés portent l’information, pas la seule couleur.';
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = metriqueCourante();
  const v = valeur(m);
  const idx = indexCharge();
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Grandeur : '));
  n.appendChild(fort(m.label));
  n.appendChild(document.createTextNode('. Valeur : '));
  n.appendChild(fort(`${fmtVal(m, v)} ${m.unite}`));
  n.appendChild(document.createTextNode('. Référence : '));
  n.appendChild(fort(m.ref));
  n.appendChild(document.createTextNode(` (${m.source}). État : `));
  n.appendChild(fort(qualite(m)));
  n.appendChild(document.createTextNode('. Indice de charge mentale : '));
  n.appendChild(fort(`${idx} / 100`));
  n.appendChild(document.createTextNode(`, référence ≤ ${INDEX_REF} pour une charge faible. `));
  if (S.overload) {
    n.appendChild(fort('Simulation de surcharge active : '));
    n.appendChild(document.createTextNode('les quatre pratiques sont volontairement dégradées ; retirez la simulation pour retrouver vos réglages.'));
  } else {
    n.appendChild(document.createTextNode('Aucune information n’est portée par la seule couleur.'));
  }
}

function syncControls() {
  const n = S.nodes;
  const m = metriqueCourante();

  n.radios.forEach((radio, i) => { if (radio) radio.checked = METRICS[i].key === S.metric; });

  if (n.value) {
    n.value.min = String(m.min);
    n.value.max = String(m.max);
    n.value.step = m.resol === 1 ? '1' : '0.1';
    n.value.value = String(valeur(m));
    n.value.setAttribute('aria-label',
      `${m.label} : de ${fmtVal(m, m.min)} à ${fmtVal(m, m.max)} ${m.unite}`);
  }
  if (n.valueOut) n.valueOut.textContent = `${fmtVal(m, valeur(m))} ${m.unite}`;

  if (n.overload) {
    n.overload.setAttribute('aria-pressed', S.overload ? 'true' : 'false');
    n.overload.textContent = S.overload ? 'Retirer la simulation de surcharge' : 'Simuler une charge élevée';
  }
  if (n.motion) {
    n.motion.setAttribute('aria-pressed', S.forcedReduced ? 'true' : 'false');
    n.motion.textContent = S.forcedReduced ? 'Réactiver le balayage animé' : 'Simuler le mouvement réduit';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.disabled = estReduit();
  }
  if (n.panel) n.panel.dataset.geographyE100Reduced = estReduit() ? '1' : '0';

  updateLegend();
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
  if (estReduit()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (estReduit()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt * 0.00008) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

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
        S.osReduced = mq.matches;
        if (S.osReduced) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge honnête sur la carte existante ---------- */

function addMapBadge() {
  const scope = hostRef;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = mk('div', 'geography-e100-badge',
    'Indice pédagogique : l’estimation de charge est schématique, ce n’est pas un audit d’accessibilité certifié.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E100', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  mk = ctx.el;
  hostRef = ctx.layout || ctx.stage;
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel();
  addMapBadge();

  S.osReduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.osReduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.metric = METRICS[i].key;
        syncControls();
      });
    });
    if (n.value) {
      n.value.addEventListener('input', () => {
        const m = metriqueCourante();
        appliquerValeur(m, Number(n.value.value));
        syncControls();
      });
    }
    if (n.play) {
      n.play.addEventListener('click', () => {
        if (estReduit()) return;
        S.playing = !S.playing;
        if (S.playing) startLoop(); else stopLoop();
        syncControls();
      });
    }
    if (n.motion) {
      n.motion.addEventListener('click', () => {
        S.forcedReduced = !S.forcedReduced;
        if (S.forcedReduced) { S.playing = false; stopLoop(); }
        syncControls();
      });
    }
    if (n.overload) {
      n.overload.addEventListener('click', () => {
        if (S.overload) {
          if (S.snapshot) S.values = { ...S.snapshot };
          S.snapshot = null;
          S.overload = false;
        } else {
          S.snapshot = { ...S.values };
          /* Pires réglages : contraste au minimum (1), pas 2, pour que la
           * pénalité vaille bien 1 et que l'indice agrégé atteigne 100. */
          S.values = { lignes: 120, contraste: 1, memoire: 15, cible: 16 };
          S.overload = true;
        }
        syncControls();
      });
    }
    if (n.canvas) {
      n.canvas.addEventListener('keydown', (event) => {
        let used = true;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const step = event.key === 'ArrowRight' ? 0.05 : -0.05;
          S.sweep = Math.max(0, Math.min(1, S.sweep + step));
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const dir = event.key === 'ArrowUp' ? 1 : -1;
          const i = METRICS.findIndex((m) => m.key === S.metric);
          const next = Math.max(0, Math.min(METRICS.length - 1, i + dir));
          S.metric = METRICS[next].key;
        } else {
          used = false;
        }
        if (used) {
          event.preventDefault();
          syncControls();
        }
      });
    }
  }

  installGlobalListeners();
  if (S.playing && !estReduit()) startLoop();
});
