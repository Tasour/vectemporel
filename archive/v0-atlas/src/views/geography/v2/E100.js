import { register } from './registry.js';

/* Lentille E100 — passe V2, vue GEOGRAPHIE.
 * Thème : lisibilité cognitive et charge mentale — synthèse des bonnes
 * pratiques d'accessibilité de la vue (longueur de ligne, contraste,
 * mémoire de travail, cibles tactiles, mouvement, annonces).
 *
 * Les dix chantiers E100-01 … E100-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E100.md.
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur
 * aléatoire, aucun fichier partagé ou module de la passe 1 modifié. Le contenu
 * pédagogique est du texte sémantique réel (h2, h3, p, dl, table, fieldset,
 * label, ol) inséré dans le DOM : il reste lisible et indexable même sans
 * animation ni interaction. Le canvas n'est qu'un laboratoire déterministe
 * qui illustre des seuils vérifiables ; aucune mesure ne dépend du dessin.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e100';
const P = 'geography-v2-e100-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const GLOSSARY_ID = P + 'glossary';
const TABLE_ID = P + 'table';
const METRIC_ID = P + 'metric';
const VALUE_ID = P + 'value';
const VALUE_OUT_ID = P + 'value-out';
const OVERLOAD_ID = P + 'overload';
const MOTION_ID = P + 'motion';
const PLAY_ID = P + 'play';
const CANVAS_ID = P + 'canvas';
const LEGEND_ID = P + 'legend';
const READOUT_ID = P + 'readout';
const DEFI_ID = P + 'defi';
const BADGE_ID = P + 'badge';

const INDEX_REF = 25; /* indice de charge ≤ 25 = charge faible (référence pédagogique). */

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
  offscreen: false,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  intersection: null,
  resize: null,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée (les helpers l'utilisent). */
let E = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
  const borne = clamp(v, m.min, m.max);
  S.values[m.key] = m.resol === 1 ? Math.round(borne) : Math.round(borne * 10) / 10;
}

/* ---------- Feuille de style unique, tous ids préfixés ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .geography-v2-e100-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${GLOSSARY_ID}{margin:6px 0;max-width:70ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${METRIC_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${METRIC_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e100-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e100-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${VALUE_ID}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${VALUE_OUT_ID}{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${CANVAS_ID}{
  display:block;width:100%;height:260px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEFI_ID} ol{margin:5px 0;padding-left:20px}
#${DEFI_ID} li{margin:3px 0;max-width:70ch}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button:disabled{opacity:.55;cursor:not-allowed}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e100-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);
  color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-v2-e100-reduced="1"] button,
#${PANEL_ID}[data-geography-v2-e100-reduced="1"] .geography-v2-e100-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-v2-e100-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:230px}
  #${PANEL_ID} .geography-v2-e100-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique (lisible sans animation ni JS) ---------- */

function staticFacts() {
  const wrap = E('div', 'geography-v2-e100-groupe');
  wrap.appendChild(E('h3', '', 'Trois définitions pour orienter le regard'));
  const faits = [
    'La charge cognitive intrinsèque tient à la difficulté propre de la tâche ; la charge extrinsèque vient de la manière dont l’information est présentée. Une interface lisible réduit la charge extrinsèque sans jamais retirer le savoir.',
    'Mieux vaut reconnaître que se souvenir : afficher les libellés, garder les choix visibles et rester cohérent économise la mémoire de travail. Un groupe de 7 éléments au plus se parcourt d’un coup d’œil.',
    'Un seuil n’est utile que s’il est vérifiable : 45 à 75 caractères par ligne, 4,5 : 1 de contraste et 44 px de cible sont des mesures que l’on peut contrôler, pas des préférences de goût.',
  ];
  faits.forEach((texte) => wrap.appendChild(E('p', 'geography-v2-e100-fait', texte)));
  return wrap;
}

function staticGlossary() {
  const wrap = E('div', 'geography-v2-e100-groupe');
  wrap.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Charge intrinsèque', 'Difficulté propre de la tâche et du savoir à traiter ; réduire la lisibilité ne doit jamais la retirer.'],
    ['Charge extrinsèque', 'Effort supplémentaire imposé par la présentation de l’information ; c’est elle que la lisibilité cherche à diminuer.'],
    ['Mémoire de travail', 'Capacité limitée qui retient et manipule quelques éléments à la fois (référence : 7 ± 2 éléments).'],
    ['Seuil vérifiable', 'Valeur mesurable et documentée (ex. 4,5 : 1 de contraste), distincte d’une préférence esthétique.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  wrap.appendChild(dl);
  return wrap;
}

function staticTable() {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '',
    'Seuils de référence de la lisibilité et coût cognitif d’un écart (valeurs vérifiables, non des opinions).'));

  const thead = E('thead');
  const hr = E('tr');
  ['Pratique', 'Seuil de référence', 'Risque si l’on s’en écarte', 'Origine du seuil'].forEach((h) => {
    const th = E('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  const lignes = [
    ['Longueur de ligne', '45 à 75 car.', 'Allers-retours oculaires, perte du fil', 'WCAG 1.4.8'],
    ['Contraste du texte', '≥ 4,5 : 1', 'Lecture lente, fatigue visuelle', 'WCAG 1.4.3 (AA)'],
    ['Éléments à retenir', '7 ± 2', 'Surcharge de la mémoire de travail', 'Miller (1956)'],
    ['Taille des cibles', '≥ 44 × 44 px', 'Clics manqués, hésitation', 'WCAG 2.5.5 / 2.5.8'],
    ['Mouvement', '≤ 500 ms, pas de clignotement', 'Distraction, inconfort vestibulaire', 'WCAG 2.2.2 / 2.3.1'],
    ['Annonces', 'région live polie', 'Information manquée au lecteur d’écran', 'WCAG 4.1.3'],
  ];
  lignes.forEach((cells) => {
    const tr = E('tr');
    cells.forEach((texte, i) => {
      const cell = E(i === 0 ? 'th' : 'td', '', texte);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticDefi() {
  const wrap = E('section', 'geography-v2-e100-groupe');
  wrap.id = DEFI_ID;
  wrap.appendChild(E('h3', '', 'Défi falsifiable — la lisibilité réduit-elle la charge ?'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : que se passe-t-il si l’on dégrade simultanément les quatre pratiques mesurées ?',
    'Réglage : activer « Simuler une charge élevée », qui fige lignes à 120, contraste à 1, mémoire à 15 et cible à 16.',
    'Résultat attendu : indice exactement 100/100, quatre marqueurs en croix et annonce explicite dans la région live.',
    'Falsification : si une seule mesure disparaît, si un marqueur reste conforme ou si l’indice ne monte pas à 100, l’implémentation est en défaut.',
    'Débrief : retirer la simulation restaure les réglages ; la lisibilité réduit la charge extrinsèque sans jamais masquer le savoir.',
  ];
  etapes.forEach((t) => ol.appendChild(E('li', '', t)));
  wrap.appendChild(ol);
  return wrap;
}

function radioGroup() {
  const fieldset = E('fieldset');
  fieldset.id = METRIC_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Grandeur observée (choix unique)');
  fieldset.appendChild(E('legend', '', 'Grandeur observée (choix unique)'));
  METRICS.forEach((m) => {
    const lab = E('label', 'geography-v2-e100-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + 'metrique';
    radio.id = P + 'metric-' + m.key;
    radio.value = m.key;
    radio.checked = S.metric === m.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(m.label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

/* ---------- Construction du panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: METRICS.map((m) => document.getElementById(P + 'metric-' + m.key)),
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

  const panel = E('section', 'geography-v2-e100-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = E('h2', '', 'Lisibilité cognitive et charge mentale');
  title.id = TITLE_ID;
  const lead = E('p', '',
    'Une carte se lit avec les yeux et avec la mémoire de travail. Ce panneau rassemble les repères qui réduisent l’effort de lecture : mesure des lignes, contraste, nombre d’éléments, taille des cibles. Le laboratoire ci-dessous les compare à leur seuil, sans jamais cacher la valeur mesurée.');

  const valueRow = E('p', '');
  const valueLabel = document.createElement('label');
  valueLabel.setAttribute('for', VALUE_ID);
  valueLabel.appendChild(document.createTextNode('Valeur de la grandeur sélectionnée : '));
  const valueOut = E('span', '', '');
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

  const legendText = E('p', 'geography-v2-e100-legend', '');
  legendText.id = LEGEND_ID;

  const readout = E('p', 'geography-v2-e100-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = E('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const overload = E('button', '', 'Simuler une charge élevée');
  overload.type = 'button';
  overload.id = OVERLOAD_ID;
  overload.setAttribute('aria-pressed', 'false');

  const motion = E('button', '', 'Simuler le mouvement réduit');
  motion.type = 'button';
  motion.id = MOTION_ID;
  motion.setAttribute('aria-pressed', 'false');

  panel.append(
    title, lead, staticFacts(), staticGlossary(), staticTable(), radioGroup(),
    valueRow, value, canvas, legendText, readout, play, overload, motion, staticDefi(),
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (cible && typeof cible.insertBefore === 'function') cible.insertBefore(panel, cible.firstChild);
  else if (cible && typeof cible.appendChild === 'function') cible.appendChild(panel);

  return {
    panel, fresh: true,
    radios: METRICS.map((m) => document.getElementById(P + 'metric-' + m.key)),
    value, valueOut, overload, motion, play, canvas, legend: legendText, readout,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 260;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
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
  if (n.panel) n.panel.dataset.geographyV2E100Reduced = estReduit() ? '1' : '0';

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

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (estReduit() || S.offscreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (estReduit() || S.offscreen) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt * 0.00008) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.osReduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (estReduit()) { S.playing = false; stopLoop(); }
        else startLoop();
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* Observateurs : pause hors écran et redessin lors d'un changement de taille. */
function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.observersInstalled) {
    S.observersInstalled = true;
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.offscreen = !e.isIntersecting;
      if (S.offscreen) stopLoop(); else startLoop();
    }, { rootMargin: '40px' });
    if (typeof ResizeObserver === 'function') {
      S.resize = new ResizeObserver(() => drawLab());
    }
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    if (S.observedCanvas && S.resize) S.resize.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
    if (S.resize) S.resize.observe(cv);
  }
}

/* Badge honnête sur la carte existante, sans toucher au SVG d'origine. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-map') : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = E('div', 'geography-v2-e100-badge',
    'Indice pédagogique : l’estimation de charge est schématique, ce n’est pas un audit d’accessibilité certifié. Le panneau V2 détaille les seuils vérifiables.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E100', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);
  installObservers();

  S.osReduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (estReduit()) { S.playing = false; stopLoop(); }
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
        if (estReduit()) { S.playing = false; stopLoop(); }
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
          S.sweep = clamp(S.sweep + step, 0, 1);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const dir = event.key === 'ArrowUp' ? 1 : -1;
          const i = METRICS.findIndex((m) => m.key === S.metric);
          const next = clamp(i + dir, 0, METRICS.length - 1);
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

  installGlobalListeners(ctx);
  startLoop();
});
