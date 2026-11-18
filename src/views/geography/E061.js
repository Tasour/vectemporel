import { register } from './registry.js';

/* Lentille E061 — vue GEOGRAPHIE.
 * Thème : typographie et hiérarchie visuelle.
 *
 * Les dix chantiers E061-01 … E061-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E061.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucun appel à console.*, aucun fichier
 * partagé modifié. Le savoir est du texte sémantique réel (titres,
 * paragraphes, tableau captioné, légende) présent dans le DOM ; le canvas
 * n'est qu'un laboratoire qui illustre des formules déterministes de
 * typographie, calculées ici même.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e061';
const PANEL_ID = 'geography-e061-panel';
const TITLE_ID = 'geography-e061-title';
const ECHELLE_ID = 'geography-e061-echelle';
const INTERLIGNE_ID = 'geography-e061-interligne';
const POIDS_ID = 'geography-e061-poids';
const BASE_ID = 'geography-e061-base';
const MESURE_ID = 'geography-e061-mesure';
const TRACKING_ID = 'geography-e061-tracking';
const CANVAS_ID = 'geography-e061-canvas';
const READOUT_ID = 'geography-e061-readout';
const LEGEND_ID = 'geography-e061-legend';
const BADGE_ID = 'geography-e061-badge';
const HELP_ID = 'geography-e061-help';
const PLAY_ID = 'geography-e061-play';
const TABLE_ID = 'geography-e061-table';

/* Échelles modulaires : le facteur est appliqué à chaque pas de niveau.
   Le cas « voisinage » (1,1) est un contre-exemple falsifiable : son pas de
   10 % reste sous le seuil perceptif de 20 %. */
const ECHELLES = {
  voisin: { label: 'Voisinage (×1,1) — trop faible', ratio: 1.1 },
  tierce: { label: 'Tierce majeure (×1,25)', ratio: 1.25 },
  quarte: { label: 'Quarte parfaite (×1,333)', ratio: 4 / 3 },
  quinte: { label: 'Quinte parfaite (×1,5)', ratio: 1.5 },
};
const ECHELLE_ORDER = ['voisin', 'tierce', 'quarte', 'quinte'];

const INTERLIGNES = {
  '1.3': { label: 'Serré (1,3)', valeur: 1.3 },
  '1.5': { label: 'Courant (1,5)', valeur: 1.5 },
  '1.7': { label: 'Aéré (1,7)', valeur: 1.7 },
};
const INTERLIGNE_ORDER = ['1.3', '1.5', '1.7'];

const POIDS = {
  '400': { label: 'Normal (400)', valeur: 400 },
  '700': { label: 'Gras (700)', valeur: 700 },
};
const POIDS_ORDER = ['400', '700'];

/* Seuils pédagogiques (valeurs de référence explicites, jamais devinées). */
const SEUIL_PAS = 0.20;          /* écart relatif minimal entre deux niveaux */
const MESURE_MIN = 45;           /* caractères par ligne, borne basse */
const MESURE_MAX = 75;           /* caractères par ligne, borne haute */
const MESURE_CIBLE = 66;         /* mesure idéale couramment citée */
const CAR_LARGEUR_EM = 0.5;      /* largeur moyenne d'un caractère, en em */
const LEADING_MIN = 1.4;         /* interlignage conseillé, borne basse */
const LEADING_MAX = 1.6;         /* interlignage conseillé, borne haute */
const ZOOM_WCAG = 2;             /* WCAG 1.4.4 : texte lisible à 200 % */

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  base: 16,
  echelle: 'tierce',
  interligne: '1.5',
  mesure: MESURE_CIBLE,
  poids: '700',
  tracking: 0,
  playing: false,
  sweep: 0,
  dir: 1,
  inView: true,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Mathématiques déterministes ---------- */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function fmt0(n) {
  return String(Math.round(n));
}
function fmt1(n) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}
function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}
function pct(n) {
  return fmt0(n * 100) + ' %';
}

/* E061-03 — T(n) = T0 × r^n, n étant le niveau de titre. */
function echelleSizes(base, ratio, steps) {
  const out = [];
  for (let n = 0; n <= steps; n += 1) out.push(base * Math.pow(ratio, n));
  return out;
}

/* E061-04 — mesure : un caractère moyen occupe ≈ 0,5 em. */
function largeurIdeale(base, mesure) {
  return mesure * CAR_LARGEUR_EM * base;
}

/* E061-06 — pas relatif entre deux niveaux consécutifs. */
function pasRelatif(ratio) {
  return ratio - 1;
}

/* E061-10 — facteur de zoom, 100 % → 200 % (balayage déterministe). */
function zoomFactor() {
  return S.playing ? ZOOM_WCAG - (ZOOM_WCAG - 1) * (1 - S.sweep) : 1;
}

function verdictPas(ratio) {
  return pasRelatif(ratio) >= SEUIL_PAS ? 'distinct' : 'trop faible';
}
function verdictMesure(m) {
  if (m < MESURE_MIN) return 'trop courte';
  if (m > MESURE_MAX) return 'trop longue';
  return 'dans la plage';
}
function verdictLeading(k) {
  if (k < LEADING_MIN) return 'serré';
  if (k > LEADING_MAX) return 'aéré';
  return 'conseillé';
}
function verdictZoom(z) {
  return z >= ZOOM_WCAG ? 'objectif WCAG atteint' : 'sous l’objectif';
}

/* ---------- Feuille de style unique (E061-02) ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .geography-e061-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} code{font-size:10px;color:var(--gold-bright,#f4d69e)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} td.geography-e061-ok{color:#bfe3b0}
#${TABLE_ID} td.geography-e061-ko{color:#f0b4a8}
#${ECHELLE_ID},#${INTERLIGNE_ID},#${POIDS_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PANEL_ID} fieldset legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-e061-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-e061-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .geography-e061-curseur{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-height:36px;margin:5px 0;
}
#${PANEL_ID} .geography-e061-curseur label{min-width:130px;color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} input[type="range"]{
  flex:1 1 160px;min-width:120px;min-height:24px;accent-color:var(--gold,#e6b96f);
}
#${PANEL_ID} .geography-e061-valeur{
  min-width:64px;color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;
}
#${CANVAS_ID}{
  display:block;width:100%;height:280px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${PANEL_ID} .geography-e061-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.geography-e061-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-geography-e061-reduced="1"] button,
#${PANEL_ID}[data-geography-e061-reduced="1"] .geography-e061-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.geography-e061-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:230px}
  #${PANEL_ID} .geography-e061-choix{margin-right:4px}
  #${PANEL_ID} .geography-e061-curseur label{min-width:100px}
}
`;

/* ---------- Contenu sémantique lisible sans laboratoire (E061-01, E061-09) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une échelle modulaire fixe les tailles de titre par une relation géométrique : T(n) = T0 × r^n, où T0 est la taille de base, r le ratio et n le niveau. Avec une base de 16 px et une tierce majeure de 1,25, les trois premiers niveaux donnent 20, 25 et 31,25 px.',
    'La mesure d’une ligne est le nombre de caractères qu’elle contient. Une plage de 45 à 75 caractères est recommandée, avec une cible d’environ 66 : en deçà la lecture saccade, au-delà l’œil perd la fin de la ligne. Un caractère moyen occupant environ 0,5 em, une mesure de 66 caractères à 16 px correspond à une colonne d’environ 528 px.',
    'L’interlignage, ou leading, est la hauteur totale d’une ligne rapportée à la taille de police. Un texte courant se lit confortablement entre 1,4 et 1,6 fois la taille : plus la ligne est longue, plus il faut d’espace pour retrouver la ligne suivante sans effort.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e061-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const items = [
    ['Échelle (E061-03)', 'T(n) = T0 × r^n. Le niveau 0 est le corps de texte, les niveaux 1 à 3 sont les titres ; chaque cran multiplie la taille par le même ratio.'],
    ['Mesure (E061-04)', 'largeur idéale ≈ mesure × 0,5 × T0, car un caractère moyen vaut environ 0,5 em. La mesure reste comprise entre 45 et 75 caractères pour une lecture confortable.'],
    ['Pas perceptif (E061-06)', 'Δ = (T(n+1) − T(n)) / T(n) = r − 1. Sous un écart relatif d’environ 20 %, deux niveaux de titre se confondent à l’œil : la hiérarchie devient invisible.'],
    ['Zoom WCAG (E061-10)', 'Le critère 1.4.4 exige que le texte reste lisible et fonctionnel à 200 % de zoom, sans perte de contenu : les tailles doivent donc suivre le navigateur, pas être figées en pixels.'],
  ];
  items.forEach(([titre, texte]) => {
    const p = document.createElement('p');
    p.className = 'geography-e061-fait';
    const t = document.createElement('strong');
    t.textContent = titre + ' — ';
    p.appendChild(t);
    p.appendChild(document.createTextNode(texte));
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Tailles de titre calculées depuis une base de 16 px par T(n) = T0 × r^n. Le pas indique l’écart relatif entre deux niveaux : sous 20 %, la hiérarchie devient difficile à percevoir.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Échelle', 'Pas', 'T0', 'T1', 'T2', 'T3'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  ECHELLE_ORDER.forEach((key) => {
    const e = ECHELLES[key];
    const sizes = echelleSizes(16, e.ratio, 3);
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = e.label;
    tr.appendChild(th);
    const tdPas = document.createElement('td');
    const ok = pasRelatif(e.ratio) >= SEUIL_PAS;
    tdPas.className = ok ? 'geography-e061-ok' : 'geography-e061-ko';
    tdPas.textContent = (ok ? '✓ ' : '✗ ') + pct(pasRelatif(e.ratio));
    tr.appendChild(tdPas);
    sizes.forEach((v) => {
      const td = document.createElement('td');
      td.textContent = fmt2(v) + ' px';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function radioSet(id, name, legendTexte, order, dict, current) {
  const fieldset = document.createElement('fieldset');
  fieldset.id = id;
  const legend = document.createElement('legend');
  legend.textContent = legendTexte;
  fieldset.appendChild(legend);
  order.forEach((value) => {
    const lab = document.createElement('label');
    lab.className = 'geography-e061-choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.id = id + '-' + value;
    radio.value = value;
    radio.checked = current === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(dict[value].label));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function rangeRow(labelText, id, min, max, step, value) {
  const row = document.createElement('div');
  row.className = 'geography-e061-curseur';
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(labelText));
  row.appendChild(label);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  row.appendChild(input);
  const val = document.createElement('span');
  val.className = 'geography-e061-valeur';
  val.id = id + '-valeur';
  row.appendChild(val);
  return { row, input, val };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      echelles: ECHELLE_ORDER.map((k) => document.getElementById(ECHELLE_ID + '-' + k)),
      interlignes: INTERLIGNE_ORDER.map((k) => document.getElementById(INTERLIGNE_ID + '-' + k)),
      poids: POIDS_ORDER.map((k) => document.getElementById(POIDS_ID + '-' + k)),
      base: document.getElementById(BASE_ID),
      baseVal: document.getElementById(BASE_ID + '-valeur'),
      mesure: document.getElementById(MESURE_ID),
      mesureVal: document.getElementById(MESURE_ID + '-valeur'),
      tracking: document.getElementById(TRACKING_ID),
      trackingVal: document.getElementById(TRACKING_ID + '-valeur'),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e061-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Typographie et hiérarchie visuelle');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '',
    'Ce laboratoire montre comment une échelle modulaire, la mesure de ligne, l’interlignage, le poids et l’espacement des lettres construisent une hiérarchie lisible. Le savoir est écrit en texte ; le canvas ne fait qu’illustrer les formules, calculées localement.');

  const echelleSet = radioSet(ECHELLE_ID, 'geography-e061-echelle-groupe',
    'Échelle modulaire (choix unique — fixe le ratio)', ECHELLE_ORDER, ECHELLES, S.echelle);
  const interligneSet = radioSet(INTERLIGNE_ID, 'geography-e061-interligne-groupe',
    'Interlignage (choix unique)', INTERLIGNE_ORDER, INTERLIGNES, S.interligne);
  const poidsSet = radioSet(POIDS_ID, 'geography-e061-poids-groupe',
    'Poids du corps de texte (choix unique)', POIDS_ORDER, POIDS, S.poids);
  const baseRow = rangeRow('Taille de base', BASE_ID, 12, 24, 1, S.base);
  const mesureRow = rangeRow('Mesure (caractères/ligne)', MESURE_ID, 30, 100, 1, S.mesure);
  const trackingRow = rangeRow('Espacement des lettres (em)', TRACKING_ID, -0.05, 0.15, 0.01, S.tracking);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de typographie. Flèches gauche et droite : changer d’échelle ; flèches haut et bas : changer l’interlignage ; plus et moins : ajuster la taille de base ; Page précédente et Page suivante : ajuster la mesure ; Espace : lancer ou arrêter le zoom de 100 à 200 pour cent.');

  const legendText = ctx.el('p', 'geography-e061-legend', '');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e061-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const help = ctx.el('p', 'geography-e061-sr',
    'Commandes du laboratoire : groupes de boutons radio pour l’échelle, l’interlignage et le poids ; curseurs pour la taille de base, la mesure et l’espacement des lettres ; flèches gauche et droite sur le graphique pour changer d’échelle, haut et bas pour l’interlignage, plus et moins pour la taille, Page précédente et Page suivante pour la mesure, Espace pour le zoom.');
  help.id = HELP_ID;
  panel.setAttribute('aria-describedby', help.id);

  const play = ctx.el('button', '', '▶ Zoomer de 100 à 200 %');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  panel.append(title, lead, staticFacts(), staticFormules(), echelleSet, interligneSet,
    poidsSet, baseRow.row, mesureRow.row, trackingRow.row, canvas, legendText,
    readout, staticTable(), help, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    echelles: ECHELLE_ORDER.map((k) => document.getElementById(ECHELLE_ID + '-' + k)),
    interlignes: INTERLIGNE_ORDER.map((k) => document.getElementById(INTERLIGNE_ID + '-' + k)),
    poids: POIDS_ORDER.map((k) => document.getElementById(POIDS_ID + '-' + k)),
    base: baseRow.input, baseVal: baseRow.val,
    mesure: mesureRow.input, mesureVal: mesureRow.val,
    tracking: trackingRow.input, trackingVal: trackingRow.val,
    canvas, readout, legend: legendText, play,
  };
}

/* ---------- Rendu du laboratoire (E061-03 … E061-08, E061-10) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
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

  const ratio = ECHELLES[S.echelle].ratio;
  const zoom = zoomFactor();
  const sizes = echelleSizes(S.base * zoom, ratio, 3);
  const leading = INTERLIGNES[S.interligne].valeur * S.base * zoom;
  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);

  /* E061-08 — grille de base et rythme vertical : repères tous les
     `leading` pixels, alignés sur l’interlignage courant. */
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.lineWidth = 1;
  const step = Math.max(8, leading);
  for (let y = pad; y < pad + ih; y += step) {
    g.beginPath();
    g.moveTo(pad, y);
    g.lineTo(pad + iw, y);
    g.stroke();
  }

  /* E061-03/06/07 — échelle de titres : quatre niveaux, tailles calculées,
     poids et espacement appliqués. Chaque ligne porte son libellé chiffré. */
  g.save();
  g.beginPath();
  g.rect(pad, pad, iw, ih - 46);
  g.clip();
  let y = pad + 26;
  for (let n = 3; n >= 0; n -= 1) {
    const size = sizes[n];
    g.font = POIDS[S.poids].valeur + ' ' + Math.round(size) + 'px system-ui, sans-serif';
    if (typeof g.letterSpacing === 'string') {
      g.letterSpacing = (S.tracking * size) + 'px';
    }
    g.fillStyle = n === 0 ? 'rgba(214,207,193,.92)' : 'rgba(244,214,158,' + (0.62 + 0.09 * n) + ')';
    const label = n === 0 ? 'Corps · ' + fmt1(size) + ' px' : 'T' + n + ' · ' + fmt1(size) + ' px';
    g.fillText(label, pad + 6, y);
    y += Math.max(18, size * 1.15);
    if (typeof g.letterSpacing === 'string') g.letterSpacing = '0px';
  }
  g.restore();

  /* E061-04 — mesure : une barre d’échantillon dont la largeur est
     proportionnelle à la mesure choisie, bornée à la zone disponible. */
  const barY = pad + ih - 34;
  const barW = iw * clamp(S.mesure / MESURE_MAX, 0, 1);
  g.fillStyle = 'rgba(230,185,111,.20)';
  g.fillRect(pad, barY, barW, 10);
  g.strokeStyle = 'rgba(244,214,158,.75)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, barW, 10);
  g.fillStyle = 'rgba(244,214,158,.92)';
  g.font = '10px sans-serif';
  g.fillText('Mesure ' + fmt0(S.mesure) + ' car. · largeur ≈ ' + fmt0(largeurIdeale(S.base, S.mesure)) + ' px', pad, barY - 5);

  /* E061-10 — zoom affiché, comparé à l’objectif WCAG de 200 %. */
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText('Zoom ' + pct(zoom) + ' · ' + verdictZoom(zoom)
    + ' · pas ' + pct(pasRelatif(ratio)) + ' (' + verdictPas(ratio) + ')', pad, cssH - pad + 4);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const ratio = ECHELLES[S.echelle].ratio;
  const sizes = echelleSizes(S.base, ratio, 3);
  const zoom = zoomFactor();
  const leading = INTERLIGNES[S.interligne].valeur;
  const mesure = S.mesure;
  const strong = (t) => { const s = document.createElement('strong'); s.textContent = t; return s; };
  const add = (t) => n.appendChild(document.createTextNode(t));

  n.textContent = '';
  add('Échelle ');
  n.appendChild(strong(sizes.map((v) => fmt1(v)).join(' / ') + ' px'));
  add('. Pas ');
  n.appendChild(strong(pct(pasRelatif(ratio))));
  add(' : hiérarchie ');
  n.appendChild(strong(verdictPas(ratio)));
  add(' (seuil ' + pct(SEUIL_PAS) + '). Mesure ');
  n.appendChild(strong(fmt0(mesure) + ' car.'));
  add(' — ' + verdictMesure(mesure) + ' (plage ' + MESURE_MIN + '–' + MESURE_MAX
    + ', cible ' + MESURE_CIBLE + '), largeur ≈ ' + fmt0(largeurIdeale(S.base, mesure)) + ' px. Interlignage ');
  n.appendChild(strong(fmt1(leading)));
  add(' : ' + verdictLeading(leading) + ' (conseillé ' + fmt1(LEADING_MIN)
    + '–' + fmt1(LEADING_MAX) + '). Poids ' + POIDS[S.poids].valeur
    + ', tracking ' + fmt2(S.tracking) + ' em. Zoom ');
  n.appendChild(strong(pct(zoom)));
  add(' — ' + verdictZoom(zoom) + ' (WCAG ' + pct(ZOOM_WCAG) + ').');
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = 'Quatre niveaux de titre sont dessinés du plus grand au corps de texte ; les filets horizontaux materialisent la grille de base alignée sur l’interlignage. La barre dorée montre la mesure choisie. Les verdicts sont écrits : aucune information ne repose sur la couleur seule.';
}

function syncControls() {
  const n = S.nodes;
  n.echelles.forEach((radio, i) => { if (radio) radio.checked = ECHELLE_ORDER[i] === S.echelle; });
  n.interlignes.forEach((radio, i) => { if (radio) radio.checked = INTERLIGNE_ORDER[i] === S.interligne; });
  n.poids.forEach((radio, i) => { if (radio) radio.checked = POIDS_ORDER[i] === S.poids; });
  if (n.base) n.base.value = String(S.base);
  if (n.baseVal) n.baseVal.textContent = fmt0(S.base) + ' px';
  if (n.mesure) n.mesure.value = String(S.mesure);
  if (n.mesureVal) n.mesureVal.textContent = fmt0(S.mesure) + ' car.';
  if (n.tracking) n.tracking.value = String(S.tracking);
  if (n.trackingVal) n.trackingVal.textContent = fmt2(S.tracking) + ' em';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le zoom' : '▶ Zoomer de 100 à 200 %';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- E061-10 : boucle rAF unique, pause et accessibilité ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function canRun() {
  return typeof document === 'undefined' ? false : (!document.hidden && S.inView);
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
  const reduced = typeof ctxReduced === 'function' ? ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (!reduced) {
      S.sweep += S.dir * dt * 0.00035;
      if (S.sweep >= 1) { S.sweep = 1; S.dir = -1; }
      if (S.sweep <= 0) { S.sweep = 0; S.dir = 1; }
    }
  }
  S.lastTs = ts;
  syncControls();
  if (!reduced) S.rafId = requestAnimationFrame(tick);
}

let ctxReduced = null;
let ctxLayout = null;
let ctxStage = null;

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
        if (panel) panel.dataset.geographyE061Reduced = mq.matches ? '1' : '0';
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

function addMapBadge() {
  const scope = ctxLayout || ctxStage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = 'geography-e061-badge';
  badge.id = BADGE_ID;
  badge.textContent = 'Typographie locale : échelle modulaire, mesure 45–75 caractères, interlignage 1,4–1,6, seuil perceptif 20 % et zoom WCAG 200 % — tout est calculé ici, rien n’est chargé.';
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E061', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctxStage = ctx.stage;
  ctxLayout = ctx.layout || ctx.stage;
  ctxReduced = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  /* E061-02 : une seule feuille de style, injectée une seule fois. */
  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge();

  const reduced = ctxReduced();
  S.nodes.panel.dataset.geographyE061Reduced = reduced ? '1' : '0';
  if (reduced) {
    S.playing = false;
    S.sweep = 1;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.echelles.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.echelle = radio.value;
        syncControls();
      });
    });
    n.interlignes.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.interligne = radio.value;
        syncControls();
      });
    });
    n.poids.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.poids = radio.value;
        syncControls();
      });
    });
    n.base.addEventListener('input', () => {
      S.base = clamp(Number(n.base.value) || 16, 12, 24);
      syncControls();
    });
    n.mesure.addEventListener('input', () => {
      S.mesure = clamp(Number(n.mesure.value) || MESURE_CIBLE, 30, 100);
      syncControls();
    });
    n.tracking.addEventListener('input', () => {
      S.tracking = clamp(Number(n.tracking.value) || 0, -0.05, 0.15);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (ctxReduced()) {
        S.playing = false;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = ECHELLE_ORDER.indexOf(S.echelle);
        S.echelle = ECHELLE_ORDER[(i + step + ECHELLE_ORDER.length) % ECHELLE_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        const i = INTERLIGNE_ORDER.indexOf(S.interligne);
        S.interligne = INTERLIGNE_ORDER[clamp(i + step, 0, INTERLIGNE_ORDER.length - 1)];
      } else if (event.key === '+' || event.key === '=') {
        S.base = clamp(S.base + 1, 12, 24);
      } else if (event.key === '-' || event.key === '−') {
        S.base = clamp(S.base - 1, 12, 24);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        S.mesure = clamp(S.mesure + (event.key === 'PageUp' ? 5 : -5), 30, 100);
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (ctxReduced()) {
          S.playing = false;
          stopLoop();
        } else {
          S.playing = !S.playing;
          if (!S.playing) stopLoop(); else startLoop();
        }
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
