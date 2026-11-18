import { register } from './registry.js';

/* Lentille E087 — vue GEOGRAPHIE.
 * Thème : chiffres significatifs et précision des mesures géographiques.
 *
 * Les dix chantiers E087-01 … E087-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E087.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, légende) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre des calculs déterministes
 * sur l'arrondi et l'incertitude de grandeurs géographiques.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e087-panel';
const TITLE_ID = 'geography-e087-title';
const TABLE_ID = 'geography-e087-table';
const SIG_ID = 'geography-e087-sig';
const SIG_OUT_ID = 'geography-e087-sig-value';
const RADIO_GRP_ID = 'geography-e087-mesure-groupe';
const CANVAS_ID = 'geography-e087-canvas';
const READOUT_ID = 'geography-e087-readout';
const LEGEND_ID = 'geography-e087-legend';
const PLAY_ID = 'geography-e087-play';
const BADGE_ID = 'geography-e087-badge';
const DEFI_ID = 'geography-e087-defi';
const DEFI_BTN_ID = 'geography-e087-defi-btn';
const DEFI_REP_ID = 'geography-e087-defi-rep';

/* Jeu de démonstration : grandeurs choisies pour des calculs vérifiables.
   Elles servent uniquement de supports d'arrondi : aucune carte, aucun
   marqueur et aucune donnée de dataset.js n'en dépend. Le champ `complet`
   conserve l'écriture littérale de la valeur, pour ne jamais tronquer la
   colonne « Valeur complète » du tableau en la formatant à 7 chiffres. */
const LAT_REF = 48.856371;
const KM_PAR_DEGRE = 111.32; /* 1° de latitude ≈ 111,32 km (référence). */
const MESURES = [
  { id: 'lat', nom: 'Latitude', valeur: LAT_REF, unite: '°', complet: '48,856371', detail: 'La latitude de référence vaut 48,856371°.' },
  { id: 'lon', nom: 'Longitude', valeur: 2.352228, unite: '°', complet: '2,352228', detail: 'La longitude de référence vaut 2,352228°.' },
  { id: 'alt', nom: 'Altitude', valeur: 35.72, unite: 'm', complet: '35,72', detail: 'L’altitude de référence vaut 35,72 m.' },
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  sig: 4,
  mesureId: 'lat',
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  observedCanvas: null,
  reducedMotion: null,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée en cache) ---------- */

/* Signe moins typographique et virgule décimale à la française. */
const fr = (s) => String(s).replace(/-/g, '\u2212');

/* Valeur arrondie à n chiffres significatifs. */
function arrondir(v, n) {
  if (!v || !isFinite(v)) return v;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const facteur = Math.pow(10, exp - n + 1);
  return Math.round(v / facteur) * facteur;
}

/* Écriture d'une valeur avec exactement n chiffres significatifs. */
function formatSig(v, n) {
  if (!isFinite(v)) return '—';
  if (v === 0) return fr((0).toFixed(Math.max(0, n - 1)));
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const decimals = Math.max(0, n - 1 - exp);
  return fr(v.toFixed(decimals));
}

/* Demi-unité du dernier chiffre retenu : c'est l'incertitude d'arrondi. */
function incertitude(v, n) {
  if (!v || !isFinite(v)) return 0;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  return 0.5 * Math.pow(10, exp - n + 1);
}

function kmParDegreLongitude(lat) {
  return KM_PAR_DEGRE * Math.cos(lat * Math.PI / 180);
}

function mesureCourante() {
  return MESURES.find((m) => m.id === S.mesureId) || MESURES[0];
}

function calculer() {
  const m = mesureCourante();
  const v = m.valeur;
  const arr = arrondir(v, S.sig);
  const inc = incertitude(v, S.sig);
  const errAbs = Math.abs(arr - v);
  const errRel = (errAbs / Math.abs(v)) * 100;
  const incRel = (inc / Math.abs(v)) * 100;
  /* La conversion en kilomètres ne s'applique qu'aux grandeurs angulaires.
     Pour la longitude, le facteur dépend de la latitude de référence ; pour
     l'altitude, l'erreur reste en mètres. `v * 111,32` n'est PAS une longueur
     de degré : c'est la distance à l'équateur, et n'a donc pas sa place ici. */
  const angulaire = m.id !== 'alt';
  const kmParDegre = m.id === 'lon' ? kmParDegreLongitude(LAT_REF) : KM_PAR_DEGRE;
  return {
    m, v, arr, inc, errAbs, errRel, incRel, angulaire, kmParDegre,
    errKm: angulaire ? errAbs * kmParDegre : null,
    incKm: angulaire ? inc * kmParDegre : null,
    texte: `${formatSig(arr, S.sig)} ${m.unite}`,
    incTexte: `± ${fr(formatSig(inc, 1))} ${m.unite}`,
    kmLongitude: kmParDegreLongitude(LAT_REF),
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e087-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e087-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e087-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e087-panel p{margin:5px 0;max-width:68ch}
#geography-e087-panel .geography-e087-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e087-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e087-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e087-table th,#geography-e087-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e087-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
.geography-e087-ctrl{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
.geography-e087-ctrl legend{padding:0 4px;color:var(--muted)}
.geography-e087-ctrl label{display:block;min-height:24px;margin:3px 0}
.geography-e087-ctrl input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e087-ctrl input[type="radio"]{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.geography-e087-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e087-canvas{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e087-legend{font-size:10px;color:var(--muted)}
#geography-e087-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e087-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e087-defi{margin:10px 0;padding:8px;border:1px dashed var(--gold,#e6b96f);border-radius:8px}
#geography-e087-defi h3{margin-top:0}
#geography-e087-defi ol{margin:4px 0;padding-left:20px}
#geography-e087-defi li{margin:2px 0}
#geography-e087-defi-rep{color:var(--gold-bright,#f4d69e)}
#geography-e087-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e087-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e087-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e087-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:58%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e087-panel[data-geography-e087-reduced="1"] button,
#geography-e087-panel[data-geography-e087-reduced="1"] .geography-e087-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e087-panel button,.geography-e087-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e087-panel{font-size:10px;padding:9px}
  #geography-e087-canvas{height:200px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un chiffre significatif est un chiffre qui porte une information sur la mesure : tous les chiffres non nuls le sont, les zéros encadrés par des chiffres non nuls le sont, les zéros placés avant le premier chiffre non nul ne le sont pas, et les zéros finaux après la virgule le sont car ils indiquent la précision.',
    'La précision désigne la finesse de la mesure — la plus petite variation que l’instrument peut distinguer — tandis que l’exactitude désigne la proximité avec la valeur vraie. Une mesure peut être très précise sans être exacte : des chiffres nombreux ne garantissent pas la justesse.',
    'Écrire une coordonnée avec trop de décimales suggère une précision que le capteur n’a pas : c’est une précision trompeuse. À l’inverse, trop peu de chiffres jettent une information réellement mesurée.',
    'L’incertitude d’arrondi vaut la moitié de l’unité du dernier chiffre conservé : pour 48,86° (deux décimales), elle est de ± 0,005°. L’erreur d’arrondi ne dépasse jamais cette demi-unité.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e087-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Trois grandeurs de référence arrondies à 7 puis à 2 chiffres significatifs. Référence : 1° de latitude ≈ 111,32 km ; 1° de longitude ≈ 111,32 × cos(lat) km.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur complète', '7 chiffres', '2 chiffres', 'Incertitude à 2 chiffres'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  MESURES.forEach((m) => {
    const cells = [
      m.nom,
      `${m.complet} ${m.unite}`,
      `${formatSig(arrondir(m.valeur, 7), 7)} ${m.unite}`,
      `${formatSig(arrondir(m.valeur, 2), 2)} ${m.unite}`,
      `± ${fr(formatSig(incertitude(m.valeur, 2), 1))} ${m.unite}`,
    ];
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
      sig: document.getElementById(SIG_ID),
      sigOut: document.getElementById(SIG_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
      defiBtn: document.getElementById(DEFI_BTN_ID),
      defiRep: document.getElementById(DEFI_REP_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e087-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Chiffres significatifs et précision des mesures');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une coordonnée géographique est une mesure, pas un nombre pur : le nombre de chiffres que l’on écrit annonce la précision du capteur. Ce laboratoire montre comment un arrondi à n chiffres significatifs change l’incertitude et l’erreur, puis propage cette erreur lors de la conversion en kilomètres. Les valeurs employées sont des grandeurs de démonstration, jamais des relevés de terrain : elles servent uniquement à rendre les calculs vérifiables.');

  const defsTitle = ctx.el('h3', '', 'Repères de vocabulaire');

  const sigField = document.createElement('fieldset');
  sigField.className = 'geography-e087-ctrl';
  const sigLegend = document.createElement('legend');
  sigLegend.textContent = 'Nombre de chiffres significatifs';
  sigField.appendChild(sigLegend);
  const sigLabel = document.createElement('label');
  sigLabel.setAttribute('for', SIG_ID);
  sigLabel.appendChild(document.createTextNode('Chiffres conservés : '));
  const sigOut = ctx.el('span', 'geography-e087-val', String(S.sig));
  sigOut.id = SIG_OUT_ID;
  sigLabel.appendChild(sigOut);
  sigField.appendChild(sigLabel);
  const sig = document.createElement('input');
  sig.type = 'range';
  sig.id = SIG_ID;
  sig.min = '1';
  sig.max = '7';
  sig.step = '1';
  sig.value = String(S.sig);
  sig.setAttribute('aria-label', 'Nombre de chiffres significatifs conservés, de 1 à 7');
  sigField.appendChild(sig);

  const mesureField = document.createElement('fieldset');
  mesureField.className = 'geography-e087-ctrl';
  mesureField.setAttribute('aria-label', 'Grandeur à mesurer');
  const mesureLegend = document.createElement('legend');
  mesureLegend.textContent = 'Grandeur mesurée (choix unique)';
  mesureField.appendChild(mesureLegend);
  mesureField.setAttribute('role', 'radiogroup');
  mesureField.id = RADIO_GRP_ID;
  MESURES.forEach((m) => {
    const lab = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e087-mesure';
    radio.id = `geography-e087-mesure-${m.id}`;
    radio.value = m.id;
    radio.checked = m.id === S.mesureId;
    radio.setAttribute('aria-label', `${m.nom} : ${m.detail}`);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(` ${m.nom} (${m.complet} ${m.unite})`));
    mesureField.appendChild(lab);
  });

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Droite numérique zoomée : le trait tirets marque la valeur de référence, le disque la valeur arrondie et la bande l’intervalle d’incertitude. Flèches gauche et droite : nombre de chiffres significatifs ; flèches haut et bas : grandeur mesurée.');

  const legend = ctx.el('p', 'geography-e087-legend', 'Trait en tirets = valeur de référence ; disque = valeur arrondie ; bande = intervalle d’incertitude ; losange = balayage déterministe. Les formes distinguent les éléments, indépendamment de la couleur.');
  legend.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e087-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const defi = document.createElement('div');
  defi.id = DEFI_ID;
  const defiTitle = ctx.el('h3', '', 'À vous de jouer — défi en cinq temps');
  const ol = document.createElement('ol');
  [
    'Prédiction : en passant de 7 à 2 chiffres significatifs sur la latitude, par combien l’incertitude est-elle multipliée ?',
    'Réglage : choisissez la latitude et placez le curseur à 2 chiffres significatifs.',
    'Résultat attendu : l’incertitude annoncée doit être de ± 0,5° (unité du dernier chiffre = 1°).',
    'Falsification : si la lecture affiche ± 0,05°, vous avez arrondi à une décimale (48,9°) ; si elle affiche ± 0,005°, vous avez compté deux décimales (48,86°) au lieu de deux chiffres significatifs (49°).',
    'Débrief : révélez la réponse, puis observez que l’erreur sur la distance en kilomètres est multipliée par 111,32.',
  ].forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ol.appendChild(li);
  });
  const defiBtn = ctx.el('button', '', 'Révéler le débrief');
  defiBtn.type = 'button';
  defiBtn.id = DEFI_BTN_ID;
  defiBtn.setAttribute('aria-expanded', 'false');
  defiBtn.setAttribute('aria-controls', DEFI_REP_ID);
  const defiRep = ctx.el('p', '', 'Réponse : retrancher cinq chiffres significatifs (de 7 à 2) fait gagner cinq puissances de dix à l’unité du dernier chiffre, qui passe de 10⁻⁵° à 10⁰°. L’incertitude passe donc de ± 0,000005° à ± 0,5°, soit un facteur 100 000. L’erreur absolue sur la distance vaut l’erreur angulaire effective multipliée par 111,32 km par degré : arrondir ne rend pas la mesure plus précise, cela masque seulement des chiffres.');
  defiRep.id = DEFI_REP_ID;
  defiRep.hidden = true;
  defi.append(defiTitle, ol, defiBtn, defiRep);

  panel.append(title, lead, defsTitle, staticFacts(), staticTable(), sigField,
    mesureField, canvas, legend, readout, play, defi);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    sig, sigOut,
    canvas, readout, play, legend, defiBtn, defiRep,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas dessiné par frame) ---------- */

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

  const c = calculer();
  const v = c.v;
  const span = Math.max(c.inc * 8, Math.abs(v) * 0.02, 0.0005);
  const min = v - span;
  const max = v + span;
  const pad = 22;
  const iw = Math.max(10, cssW - pad * 2);
  const y = Math.round(cssH * 0.55);
  const toPx = (val) => pad + ((val - min) / (max - min)) * iw;

  /* Axe et graduations (repère non chromatique). */
  g.strokeStyle = 'rgba(255,255,255,.30)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  for (let i = 0; i <= 8; i += 1) {
    const xx = pad + (i / 8) * iw;
    g.beginPath(); g.moveTo(xx, y - 5); g.lineTo(xx, y + 5); g.stroke();
  }

  /* Bande d'incertitude autour de la valeur arrondie. */
  const x0 = toPx(c.arr - c.inc);
  const x1 = toPx(c.arr + c.inc);
  g.fillStyle = 'rgba(230,185,111,.18)';
  g.fillRect(x0, y - 20, Math.max(2, x1 - x0), 40);
  g.strokeStyle = 'rgba(230,185,111,.70)';
  g.setLineDash([3, 3]);
  g.strokeRect(x0, y - 20, Math.max(2, x1 - x0), 40);
  g.setLineDash([]);

  /* Valeur de référence : trait tirets et triangle. */
  const xv = toPx(v);
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.setLineDash([4, 3]);
  g.beginPath(); g.moveTo(xv, 14); g.lineTo(xv, cssH - 14); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.moveTo(xv, 12); g.lineTo(xv - 5, 4); g.lineTo(xv + 5, 4); g.closePath(); g.fill();

  /* Valeur arrondie : disque plein. */
  const xa = toPx(c.arr);
  g.beginPath(); g.arc(xa, y, 6, 0, Math.PI * 2); g.fill();

  /* Balayage déterministe : un losange court sur l'axe. */
  const sx = pad + S.sweep * iw;
  const sy = y - 30;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.moveTo(sx, sy - 5); g.lineTo(sx + 5, sy); g.lineTo(sx, sy + 5); g.lineTo(sx - 5, sy);
  g.closePath(); g.fill();

  /* Étiquettes textuelles. */
  g.font = '11px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.fillText(`${c.m.nom} arrondie : ${c.texte}   ${c.incTexte}`, pad, 24);
  g.fillStyle = 'rgba(214,207,193,.95)';
  g.fillText(`référence ${c.m.complet} ${c.m.unite} — erreur ${fr(formatSig(c.errAbs, 2))} ${c.m.unite}`, pad, cssH - 10);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const c = calculer();
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Grandeur : '));
  n.appendChild(fort(c.m.nom));
  n.appendChild(document.createTextNode(`. Référence ${c.m.complet} ${c.m.unite} ; arrondi à ${S.sig} chiffres : `));
  n.appendChild(fort(c.texte));
  n.appendChild(document.createTextNode(`. Incertitude ${c.incTexte} (${fr(c.incRel.toFixed(2).replace('.', ','))} % de la valeur) ; erreur d’arrondi `));
  n.appendChild(fort(`${fr(formatSig(c.errAbs, 2))} ${c.m.unite}`));
  n.appendChild(document.createTextNode(` (${fr(c.errRel.toFixed(3).replace('.', ','))} %). À titre de comparaison : 1° de latitude ≈ ${fr(KM_PAR_DEGRE.toFixed(2))} km, mais 1° de longitude à 48,86° ≈ ${fr(c.kmLongitude.toFixed(2).replace('.', ','))} km, soit un facteur ${fr((KM_PAR_DEGRE / c.kmLongitude).toFixed(2).replace('.', ','))}. `));
  if (c.angulaire) {
    n.appendChild(document.createTextNode('Conversion de l’erreur angulaire en distance : '));
    n.appendChild(fort(`± ${fr(c.errKm.toFixed(2).replace('.', ','))} km`));
    n.appendChild(document.createTextNode(` d’erreur effective (${fr(c.incKm.toFixed(2).replace('.', ','))} km au maximum), au facteur ${fr(c.kmParDegre.toFixed(2).replace('.', ','))} km par degré.`));
  } else {
    n.appendChild(document.createTextNode('L’altitude est une longueur : son erreur reste exprimée en mètres, sans conversion angulaire.'));
  }
}

function syncControls() {
  const n = S.nodes;
  if (n.sig) n.sig.value = String(S.sig);
  if (n.sigOut) n.sigOut.textContent = String(S.sig);
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
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
  if (!S.onScreen) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  /* `ctx.reducedMotion()` fourni par le registre reste la source ; le
     matchMedia local ne sert que de repli si le contrat est absent. */
  const reduced = (typeof S.reducedMotion === 'function' && !!S.reducedMotion()) || ctxReduced();
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00012) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function ctxReduced() {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  } catch { /* préférence indisponible. */ }
  return false;
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
        if (panel) panel.dataset.geographyE087Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  /* Le panneau peut être reconstruit (`stage.innerHTML = ''`) : le canvas
     observé change d'identité. On se réabonne sur le nouveau nœud, sinon la
     boucle resterait figée sur une référence détachée du document. */
  if (S.nodes.canvas && typeof IntersectionObserver === 'function'
      && S.observedCanvas !== S.nodes.canvas) {
    try {
      if (S.observer) S.observer.disconnect();
      S.observedCanvas = S.nodes.canvas;
      S.onScreen = true;
      S.observer = new IntersectionObserver((entries) => {
        S.onScreen = entries.length ? entries[0].isIntersecting : true;
        if (!S.onScreen) stopLoop();
        else if (S.playing) startLoop();
      }, { threshold: 0.05 });
      S.observer.observe(S.nodes.canvas);
    } catch { /* observateur indisponible : la boucle reste active. */ }
  }
  void ctx;
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e087-badge', 'Chiffres significatifs : écrire trop de décimales suggère une précision que le capteur n’a pas ; l’incertitude vaut la demi-unité du dernier chiffre.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E087', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('geography-e087', CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = typeof S.reducedMotion === 'function' ? !!S.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE087Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.sig.addEventListener('input', () => {
      S.sig = Math.max(1, Math.min(7, Math.round(Number(n.sig.value))));
      syncControls();
    });
    MESURES.forEach((m) => {
      const radio = document.getElementById(`geography-e087-mesure-${m.id}`);
      if (radio) radio.addEventListener('change', () => {
        if (radio.checked) { S.mesureId = m.id; syncControls(); }
      });
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.defiBtn.addEventListener('click', () => {
      const ouvert = n.defiBtn.getAttribute('aria-expanded') === 'true';
      n.defiBtn.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
      n.defiBtn.textContent = ouvert ? 'Révéler le débrief' : 'Masquer le débrief';
      n.defiRep.hidden = ouvert;
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') S.sig = Math.max(1, S.sig - 1);
      else if (event.key === 'ArrowRight') S.sig = Math.min(7, S.sig + 1);
      else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const i = MESURES.findIndex((m) => m.id === S.mesureId);
        const dir = event.key === 'ArrowDown' ? 1 : -1;
        S.mesureId = MESURES[(i + dir + MESURES.length) % MESURES.length].id;
        MESURES.forEach((m) => {
          const r = document.getElementById(`geography-e087-mesure-${m.id}`);
          if (r) r.checked = m.id === S.mesureId;
        });
      } else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.playing) startLoop();
});
