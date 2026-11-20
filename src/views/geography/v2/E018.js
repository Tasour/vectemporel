import { register } from './registry.js';

/* V2 — lentille E018 (vague GEOGRAPHIE).
 * Thème : fuseaux horaires (longitude, UTC, heure solaire et heure légale).
 *
 * Les dix chantiers E018-01 … E018-10 sont RÉELLEMENT implémentés ici :
 *   01 section sémantique d'introduction, lisible sans JS ;
 *   02 tableau de référence des fuseaux comparé à UTC+0 ;
 *   03 sélecteur de villes en radiogroupe (choix unique) ;
 *   04 curseur de longitude + formules solaire / légal ;
 *   05 laboratoire canvas unique et déterministe (DPR ≤ 2) ;
 *   06 grandeurs chiffrées annoncées dans un readout role=status ;
 *   07 codes visuels non chromatiques (hachures, traits, libellés) ;
 *   08 boucle rAF unique, pause sur document.hidden, mouvement réduit ;
 *   09 défi falsifiable en cinq temps + badge textuel sur la carte ;
 *   10 accessibilité clavier, cibles tactiles, idempotence, zéro aléa/réseau.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucun
 * console.*, aucun innerHTML, aucun fichier partagé modifié. Le contenu
 * pédagogique est du texte sémantique réel (titres, paragraphes, tableau,
 * liste ordonnée, role="note") présent dans le DOM même sans animation ; le
 * canvas n'est qu'un laboratoire qui illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e018-) ---------- */

const CSS_ID = 'geography-v2-e018';
const PANEL_ID = 'geography-v2-e018-panel';
const TITLE_ID = 'geography-v2-e018-title';
const PRESET_ID = 'geography-v2-e018-preset';
const PRESET_LEGEND_ID = 'geography-v2-e018-preset-legend';
const RADIO_NAME = 'geography-v2-e018-ville';
const LON_ID = 'geography-v2-e018-lon';
const LON_OUT_ID = 'geography-v2-e018-lon-value';
const CANVAS_ID = 'geography-v2-e018-canvas';
const READOUT_ID = 'geography-v2-e018-readout';
const PLAY_ID = 'geography-v2-e018-play';
const LEGEND_ID = 'geography-v2-e018-legend';
const KEYS_ID = 'geography-v2-e018-keys';
const LIMITE_ID = 'geography-v2-e018-limite';
const DEFI_ID = 'geography-v2-e018-defi';
const TABLE_ID = 'geography-v2-e018-table';
const BADGE_ID = 'geography-v2-e018-badge';

/* Constantes canoniques : 24 fuseaux, 15° par fuseau, référence UTC+0. */
const ZONES = 24;
const DEG_PAR_ZONE = 15;
const REFERENCE = 'UTC+0 au méridien de Greenwich (0°)';

/* Villes de référence : leur longitude est un multiple exact de 15°. */
const PRESETS = [
  ['greenwich', 0, 'Greenwich (UTC+0)'],
  ['newyork', -75, 'New York (UTC−5)'],
  ['tokyo', 135, 'Tokyo (UTC+9)'],
  ['sydney', 150, 'Sydney (UTC+10)'],
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  lon: 0,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  hatch: null,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Heure légale approchée : on arrondit la longitude au fuseau entier. */
function legalOffset(lon) {
  return clamp(Math.round(lon / DEG_PAR_ZONE), -12, 12);
}

/* Heure solaire moyenne, continue : longitude / 15. */
function solarOffset(lon) {
  return lon / DEG_PAR_ZONE;
}

/* Signe typographique pour un offset entier (UTC+4, UTC−5). */
function signOffset(n) {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/* Offset solaire signé à deux décimales (+4,00 / −4,00 / 0,00). */
function fmtSigned(n) {
  const v = Math.round(n * 100) / 100;
  if (v === 0) return '0,00';
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`;
}

/* Méridien où il est midi solaire : il recule vers l'ouest à mesure que la
   Terre tourne. `sweep` = 0 → 180° E, `sweep` = 1 → 180° O. */
function noonMeridian(sweep) {
  return 180 - sweep * 360;
}

/* Heure solaire locale (0..24) à une longitude donnée. */
function localSolarHour(lon, sweep) {
  const h = 12 + (lon - noonMeridian(sweep)) / DEG_PAR_ZONE;
  return ((h % 24) + 24) % 24;
}

function dirLabel(lon) {
  if (lon > 0) return ' E';
  if (lon < 0) return ' O';
  return ' (Greenwich)';
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-v2-e018-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e018-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e018-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e018-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e018-panel .geography-v2-e018-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-v2-e018-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-v2-e018-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e018-table th,#geography-v2-e018-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e018-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e018-preset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e018-preset legend{padding:0 4px;color:var(--muted)}
#geography-v2-e018-panel .geography-v2-e018-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e018-panel .geography-v2-e018-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e018-lon{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e018-lon-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e018-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-v2-e018-legend,#geography-v2-e018-keys{font-size:10px;color:var(--muted)}
#geography-v2-e018-limite{
  margin:8px 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;
  font-size:10px;color:var(--muted);
}
#geography-v2-e018-defi{margin:6px 0;padding-left:18px;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#geography-v2-e018-defi li{margin:2px 0}
#geography-v2-e018-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e018-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e018-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e018-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e018-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-v2-e018-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e018-panel[data-geography-v2-e018-reduced="1"] button,
#geography-v2-e018-panel[data-geography-v2-e018-reduced="1"] .geography-v2-e018-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e018-panel button,.geography-v2-e018-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e018-panel{font-size:10px;padding:9px}
  #geography-v2-e018-canvas{height:190px}
  #geography-v2-e018-panel .geography-v2-e018-choix{margin-right:4px}
}
`;

/* ---------- Chantier 01 : section sémantique (texte lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un fuseau horaire est une bande de longitude d’environ 15° dont les lieux partagent la même heure légale. La Terre tournant de 360° en 24 heures, un fuseau correspond à une heure : 360° ÷ 24 = 15°.',
    'Le méridien de Greenwich (0°) sert de référence : l’heure UTC+0 y est l’heure solaire moyenne. À l’est, l’heure est en avance (UTC+) ; à l’ouest, elle est en retard (UTC−).',
    'L’heure légale est une convention politique : elle suit approximativement le soleil, mais des pays décalent leur fuseau (Inde UTC+5:30, Népal UTC+5:45) et la ligne de changement de date, près de 180°, sépare UTC+12 et UTC−12.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e018-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- Chantier 02 : tableau de référence comparé à UTC+0 ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = `Référence : ${REFERENCE}. Un fuseau = 15° de longitude = 1 heure.`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Longitude', 'Heure solaire', 'Fuseau légal', 'Repère'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['0° (Greenwich)', '+0,00 h', 'UTC+0', 'référence'],
    ['15° E', '+1,00 h', 'UTC+1', 'un fuseau à l’est'],
    ['60° E', '+4,00 h', 'UTC+4', 'quatre fuseaux à l’est'],
    ['180° (ligne de date)', '+12 / −12 h', 'UTC±12', 'changement de date'],
    ['60° O', '−4,00 h', 'UTC−4', 'quatre fuseaux à l’ouest'],
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

/* ---------- Chantier 09 : défi falsifiable en cinq temps (texte dans le DOM) ---------- */

function staticDefi() {
  const wrap = document.createElement('div');
  const titre = document.createElement('h3');
  titre.textContent = 'À vous de jouer : l’écart à UTC vaut-il longitude ÷ 15 ?';
  const ol = document.createElement('ol');
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : à 60° E, l’heure solaire doit valoir +4,00 h et le fuseau légal UTC+4.',
    'Réglage : placez le curseur à 60° E (ou cochez une ville), puis lisez le readout.',
    'Résultat attendu : « +4,00 h », « UTC+4 » et un écart nul à UTC+0 de +4,00 h.',
    'Falsification : si le fuseau légal change sans changement de longitude, ou si l’écart à UTC+0 cesse de valoir longitude ÷ 15 (0° → 0,00 h ; 60° E → +4,00 h ; 180° → +12 h), le modèle est faux.',
    'Débrief : le Népal (87° E) montre la limite — le modèle arrondit à UTC+6 alors que l’heure officielle est UTC+5:45 ; c’est une limite du modèle, pas une erreur de calcul.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.append(titre, ol);
  return wrap;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: PRESETS.map(([v]) => document.getElementById(`${RADIO_NAME}-${v}`)),
      libre: document.getElementById(`${RADIO_NAME}-libre`),
      lon: document.getElementById(LON_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-v2-e018-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Fuseaux horaires : la longitude devient heure');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Vingt-quatre fuseaux découpent le globe en bandes de 15° de longitude. Explorer ce découpage montre que l’heure d’un lieu est une convention fondée sur sa position est-ouest, avec Greenwich pour origine.');

  /* Chantier 03 : radiogroupe natif (fieldset + legend + radios), choix unique. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PRESET_ID;
  fieldset.setAttribute('role', 'radiogroup');
  const legend = document.createElement('legend');
  legend.id = PRESET_LEGEND_ID;
  legend.textContent = 'Ville de référence (choix unique)';
  fieldset.setAttribute('aria-labelledby', PRESET_LEGEND_ID);
  fieldset.appendChild(legend);
  PRESETS.forEach(([value, lon, label]) => {
    const lab = ctx.el('label', 'geography-v2-e018-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${RADIO_NAME}-${value}`;
    radio.value = value;
    radio.dataset.lon = String(lon);
    radio.checked = S.lon === lon;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });
  const labLibre = ctx.el('label', 'geography-v2-e018-choix');
  const radioLibre = document.createElement('input');
  radioLibre.type = 'radio';
  radioLibre.name = RADIO_NAME;
  radioLibre.id = `${RADIO_NAME}-libre`;
  radioLibre.value = 'libre';
  radioLibre.checked = !PRESETS.some(([, lon]) => lon === S.lon);
  labLibre.appendChild(radioLibre);
  labLibre.appendChild(document.createTextNode('Autre longitude'));
  fieldset.appendChild(labLibre);

  /* Chantier 04 : curseur de longitude et ses deux formules. */
  const sub = ctx.el('h3', '', 'Explorer la longitude');
  const lonRow = ctx.el('p', '');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Longitude sélectionnée : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);

  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '-180';
  lon.max = '180';
  lon.step = '5';
  lon.value = String(S.lon);
  lon.setAttribute('aria-label', 'Longitude, de 180 degrés ouest à 180 degrés est, par pas de 5 degrés');

  /* Chantier 05 : laboratoire canvas, focusable et décrit pour lecteur d'écran. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Bande des vingt-quatre fuseaux horaires de 180 degrés ouest à 180 degrés est. Les hachures marquent la nuit, le tireté le méridien de midi solaire, le trait plein doré le fuseau sélectionné. Flèches gauche et droite : changer de 15 degrés ; haut et bas : changer de 5 degrés.');

  /* Chantier 07 : légende DOM qui répète les codes en toutes lettres. */
  const legendText = ctx.el('p', 'geography-v2-e018-legend', 'Hachures = nuit ; trait tireté = midi solaire ; trait pointillé = minuit solaire ; trait plein doré + triangle = fuseau sélectionné : aucun code ne repose sur la couleur seule.');
  legendText.id = LEGEND_ID;

  /* Chantier 06 : readout annoncé, mis à jour sur interaction seulement. */
  const readout = ctx.el('p', 'geography-v2-e018-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const keys = ctx.el('p', 'geography-v2-e018-keys', 'Clavier : ← / → changent de 15° (un fuseau), ↑ / ↓ de 5°, Début = 180° O, Fin = 180° E. Le bouton Animer fait reculer le méridien de midi vers l’ouest.');
  keys.id = KEYS_ID;

  const limite = ctx.el('p', '', 'Limite falsifiable — le modèle arrondit la longitude au fuseau entier (UTC = arrondi(longitude ÷ 15)). Il donne ainsi UTC+6 pour le Népal (87° E) alors que l’heure officielle y est UTC+5:45 : cet écart est une limite du modèle, pas une erreur de calcul. Le modèle serait falsifié si un fuseau affiché changeait sans changement de longitude, ou si l’écart à UTC+0 cessait de valoir longitude ÷ 15 (0° → 0,00 h ; 60° E → +4,00 h ; 180° → +12 h).');
  limite.id = LIMITE_ID;
  limite.setAttribute('role', 'note');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sub, lonRow,
    lon, canvas, legendText, readout, play, keys, staticDefi(), limite);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: PRESETS.map(([v]) => document.getElementById(`${RADIO_NAME}-${v}`)),
    libre: document.getElementById(`${RADIO_NAME}-libre`),
    lon, lonOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- Chantiers 05 / 07 : rendu du laboratoire (un seul canvas) ---------- */

function getHatch(g) {
  if (S.hatch) return S.hatch;
  const motif = document.createElement('canvas');
  motif.width = 8;
  motif.height = 8;
  const mg = motif.getContext('2d');
  if (mg) {
    mg.strokeStyle = 'rgba(214,207,193,.16)';
    mg.lineWidth = 1;
    mg.beginPath();
    mg.moveTo(-2, 10);
    mg.lineTo(10, -2);
    mg.stroke();
    S.hatch = g.createPattern(motif, 'repeat');
  }
  return S.hatch;
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

  const pad = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const bandTop = pad + 16;
  const bandH = Math.max(20, cssH - bandTop - pad - 16);
  const lonToX = (lon) => pad + ((lon + 180) / 360) * iw;

  /* Fond du cadre et bande des 24 fuseaux. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, cssH - pad * 2);

  for (let z = 0; z < ZONES; z += 1) {
    const lonA = -180 + z * DEG_PAR_ZONE;
    const xA = lonToX(lonA);
    const xB = lonToX(lonA + DEG_PAR_ZONE);
    g.fillStyle = z % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.055)';
    g.fillRect(xA + 0.5, bandTop, Math.max(1, xB - xA - 1), bandH);
    g.strokeStyle = 'rgba(255,255,255,.20)';
    g.beginPath();
    g.moveTo(xA, bandTop);
    g.lineTo(xA, bandTop + bandH);
    g.stroke();
    if (z % 2 === 0) {
      const centre = lonA + DEG_PAR_ZONE / 2;
      g.fillStyle = 'rgba(214,207,193,.55)';
      g.font = '9px sans-serif';
      g.textAlign = 'center';
      g.fillText(signOffset(legalOffset(centre)), (xA + xB) / 2, bandTop + bandH + 12);
    }
  }
  g.strokeStyle = 'rgba(255,255,255,.20)';
  g.beginPath();
  g.moveTo(pad + iw, bandTop);
  g.lineTo(pad + iw, bandTop + bandH);
  g.stroke();

  /* Région nocturne : hachures + assombrissement, jamais la couleur seule. */
  const hatch = getHatch(g);
  for (let x = 0; x < iw; x += 2) {
    const lon = -180 + (x / iw) * 360;
    const h = localSolarHour(lon, S.sweep);
    if (h < 6 || h >= 18) {
      g.fillStyle = 'rgba(0,0,0,.30)';
      g.fillRect(pad + x, bandTop, 2, bandH);
      if (hatch) {
        g.fillStyle = hatch;
        g.fillRect(pad + x, bandTop, 2, bandH);
      }
    }
  }

  /* Méridien de midi (tireté) et son opposé de minuit (pointillé) : deux styles
     de trait distincts, doublés de libellés. */
  const midi = noonMeridian(S.sweep);
  const minuit = midi > 0 ? midi - 180 : midi + 180;
  [[midi, [6, 4], 'midi solaire', 'rgba(255,255,255,.85)'],
    [minuit, [2, 4], 'minuit solaire', 'rgba(214,207,193,.7)']].forEach(([lon, dash, label, color]) => {
    const x = lonToX(lon);
    if (g.setLineDash) g.setLineDash(dash);
    g.strokeStyle = color;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, bandTop - 6);
    g.lineTo(x, bandTop + bandH + 2);
    g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    g.fillStyle = color;
    g.font = '9px sans-serif';
    g.textAlign = 'center';
    g.fillText(label, x, bandTop - 8);
  });

  /* Fuseau sélectionné : trait plein doré + triangle, libellé UTC. */
  const sx = lonToX(S.lon);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(sx, bandTop);
  g.lineTo(sx, bandTop + bandH);
  g.stroke();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath();
  g.moveTo(sx - 5, bandTop - 1);
  g.lineTo(sx + 5, bandTop - 1);
  g.lineTo(sx, bandTop + 7);
  g.closePath();
  g.fill();
  g.font = 'bold 10px sans-serif';
  g.textAlign = S.lon > 140 ? 'right' : (S.lon < -140 ? 'left' : 'center');
  g.fillText(`UTC${signOffset(legalOffset(S.lon))}`, sx, bandTop + bandH - 6);

  /* Heure solaire locale au fuseau choisi (illustration animée). */
  g.textAlign = 'left';
  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.95)';
  const hLocal = localSolarHour(S.lon, S.sweep);
  const hh = Math.floor(hLocal);
  const mm = Math.floor((hLocal - hh) * 60);
  g.fillText(`Heure solaire locale : ${String(hh).padStart(2, '0')} h ${String(mm).padStart(2, '0')}`, pad + 2, cssH - pad + 3);
  g.fillStyle = 'rgba(214,207,193,.7)';
  g.textAlign = 'right';
  g.fillText(`${Math.abs(S.lon)}°${dirLabel(S.lon).trim()}`, pad + iw, cssH - pad + 3);
  g.textAlign = 'left';
}

/* ---------- Chantier 06 : grandeurs chiffrées comparées à UTC+0 ---------- */

function updateReadout() {
  const lon = S.lon;
  const solar = solarOffset(lon);
  const legal = legalOffset(lon);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${Math.abs(lon)}°${dirLabel(lon)} : heure solaire `));
  n.appendChild(fort(`UTC${fmtSigned(solar)}`));
  n.appendChild(document.createTextNode(` (${fmt(solar)} h) ; fuseau légal `));
  n.appendChild(fort(`UTC${signOffset(legal)}`));
  n.appendChild(document.createTextNode(`. Écart à la référence UTC+0 : `));
  n.appendChild(fort(fmtSigned(solar)));
  n.appendChild(document.createTextNode(`. Un fuseau vaut 15° = 1 h (360° ÷ 24) ; ${ZONES} fuseaux couvrent le globe.`));
}

/* ---------- Synchronisation des contrôles ---------- */

function syncRadios() {
  const n = S.nodes;
  const preset = PRESETS.find(([, lon]) => lon === S.lon);
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = !!preset && preset[0] === PRESETS[i][0];
  });
  if (n.libre) n.libre.checked = !preset;
}

function syncControls() {
  const n = S.nodes;
  syncRadios();
  if (n.lon) n.lon.value = String(S.lon);
  if (n.lonOut) n.lonOut.textContent = `${Math.abs(S.lon)}°${dirLabel(S.lon)}`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter la rotation' : '▶ Animer la rotation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- Chantier 08 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced || !S.playing || typeof requestAnimationFrame !== 'function') {
    drawLab();
    return;
  }
  if (!S.rafId) {
    S.lastTs = 0;
    S.rafId = requestAnimationFrame(tick);
  }
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs && S.playing && !S.reduced) {
    const dt = Math.min(80, ts - S.lastTs);
    /* Rotation complète en 50 s : 360° en 50 000 ms. */
    S.sweep = (S.sweep + dt * 0.00002) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !S.reduced) S.rafId = requestAnimationFrame(tick);
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
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E018Reduced = S.reduced ? '1' : '0';
        if (S.reduced) { stopLoop(); drawLab(); }
        else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Chantier 09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || document.getElementById('c3b-map'))
    : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e018-badge', 'Longitudes → fuseaux : référence UTC+0 à Greenwich, 15° par heure.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Chantier 10 : point d'entrée unique, idempotent ---------- */

register('E018', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyV2E018Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.lon = PRESETS[i][1];
        syncControls();
      });
    });
    if (n.libre) {
      n.libre.addEventListener('change', () => {
        if (n.libre.checked) syncRadios();
      });
    }
    n.lon.addEventListener('input', () => {
      S.lon = clamp(Math.round(Number(n.lon.value) / 5) * 5, -180, 180);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft') S.lon = clamp(S.lon - 15, -180, 180);
      else if (event.key === 'ArrowRight') S.lon = clamp(S.lon + 15, -180, 180);
      else if (event.key === 'ArrowUp') S.lon = clamp(S.lon + 5, -180, 180);
      else if (event.key === 'ArrowDown') S.lon = clamp(S.lon - 5, -180, 180);
      else if (event.key === 'Home') S.lon = -180;
      else if (event.key === 'End') S.lon = 180;
      else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});
