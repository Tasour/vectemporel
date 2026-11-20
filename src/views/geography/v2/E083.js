import { register } from './registry.js';

/* Lentille E083 (V2) — vue GEOGRAPHIE.
 * Thème : projection de points lat/lon vers l'écran — du degré au pixel.
 *
 * Les dix chantiers E083-01 … E083-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E083.md et réellement implémentés ici :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau,
 * aucune graine aléatoire, aucune journalisation, aucun fichier partagé modifié.
 * Le contenu pédagogique est du texte sémantique réel (titre, paragraphes,
 * tableau, listes, radiogroupe, défi) présent dans le DOM même sans animation ;
 * le canvas n'est qu'un laboratoire qui illustre la formule affine.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e083- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e083';

/* Identifiants, tous préfixés geography-v2-e083-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const FAITS_ID = P + '-faits';
const NOTE_ID = P + '-note';
const FRAMESET_ID = P + '-frames';
const FRAME_PREFIX = P + '-frame-';
const LON_ID = P + '-lon';
const LAT_ID = P + '-lat';
const LON_OUT_ID = P + '-lon-value';
const LAT_OUT_ID = P + '-lat-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const MESURES_ID = P + '-mesures';
const CLAVIER_ID = P + '-clavier';
const PLAY_ID = P + '-play';
const CENTER_ID = P + '-center';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const NARROW = '\u202f'; // espace fine (milliers)
const MINUS = '\u2212';  // signe moins typographique
const VITESSE = 0.012;   // degrés de longitude par millisecondre de balayage

/* Écran virtuel : mêmes dimensions que la carte de la vue (geography.js). */
const VIRTUAL_W = 900;
const VIRTUAL_H = 620;

/* Cadres de démonstration : valeurs arbitraires, pas des lieux réels. */
const FRAMES = {
  monde: { label: 'Monde entier', minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 },
  europe: { label: 'Europe (démonstration)', minLon: -12, maxLon: 32, minLat: 34, maxLat: 72 },
  hexagone: { label: 'Hexagone (démonstration)', minLon: -5, maxLon: 10, minLat: 41, maxLat: 52 },
};
const FRAME_ORDER = ['monde', 'europe', 'hexagone'];

/* État de module : survit au vidage du `stage` par la coque. */
const S = {
  frame: 'hexagone',
  lon: 2,
  lat: 47,
  playing: false,
  debriefOuvert: false,
  lastTs: 0,
  elapsed: 0,
  sweepBase: 2,
  rafId: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  readoutText: '',
  nodes: {},
};

/* ---------- Formules déterministes (E083-05) ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function num(value, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? ',' + parts[1] : ''}`;
}

function frame() {
  return FRAMES[S.frame] || FRAMES.hexagone;
}

function spanLon(f) {
  return f.maxLon - f.minLon;
}

function spanLat(f) {
  return f.maxLat - f.minLat;
}

/* x = ((λ − λmin) / (λmax − λmin)) × largeur ; y = ((φmax − φ) / hauteur) × hauteur. */
function projectToScreen(lon, lat, f) {
  const sl = spanLon(f);
  const sa = spanLat(f);
  if (!(sl > 0) || !(sa > 0)) return null;
  return {
    x: ((lon - f.minLon) / sl) * VIRTUAL_W,
    y: ((f.maxLat - lat) / sa) * VIRTUAL_H,
    inside: lon >= f.minLon && lon <= f.maxLon && lat >= f.minLat && lat <= f.maxLat,
  };
}

/* Pas clavier adapté à l'étendue du cadre. */
function stepFor(span) {
  return span >= 100 ? 5 : 1;
}

/* Valeurs de référence recalculées une seule fois depuis la formule (cadre Hexagone). */
const DEMO = (() => {
  const f = FRAMES.hexagone;
  const p = projectToScreen(2, 47, f);
  return {
    f, p,
    largeur: spanLon(f),
    hauteur: spanLat(f),
    pxParDegLon: VIRTUAL_W / spanLon(f),
    pxParDegLat: VIRTUAL_H / spanLat(f),
  };
})();

/* ---------- E083-01 : faits sourcés, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'Projeter un point, c’est convertir une paire de coordonnées (latitude φ, longitude λ) en une paire de pixels (x, y) : on mesure la fraction parcourue dans le cadre, puis on la multiplie par la largeur ou la hauteur de l’écran. La vue GEOGRAPHIE applique exactement x = ((λ − λmin) / (λmax − λmin)) × largeur et y = ((φmax − φ) / (φmax − φmin)) × hauteur.',
    'L’axe vertical est inversé : sur l’écran, y = 0 est en haut alors que la latitude augmente vers le nord. La formule utilise donc (φmax − φ) et non (φ − φmin). Inverser ce sens placerait le nord en bas : c’est un choix de construction, pas une propriété du territoire.',
    'Cette projection affine est une équirectangulaire locale : elle garde les proportions en degrés à l’intérieur du cadre, mais pas les distances réelles du globe. Un degré de longitude n’égale un degré de latitude qu’à l’équateur, et la distance entre deux méridiens diminue vers les pôles. (Référence : équirectangulaire, géodésie élémentaire.)',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.id = NOTE_ID;
  note.textContent = 'Les nombres ci-dessous sont un exemple numérique de démonstration (cadre « Hexagone », point 2°, 47°), pas la coordonnée d’un lieu réel. Les cadres « Europe » et « Hexagone » sont des bornes choisies pour l’exercice de calcul.';
  wrap.appendChild(note);
  return wrap;
}

/* ---------- E083-02 : tableau de travail, valeurs recalculées depuis la formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Exemple de travail — cadre « Hexagone » : λ ∈ [−5°, 10°], φ ∈ [41°, 52°], écran virtuel 900 × 620 px.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Formule', 'Valeur'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Largeur en degrés', 'λmax − λmin = 10 − (−5)', num(DEMO.largeur) + '°'],
    ['Hauteur en degrés', 'φmax − φmin = 52 − 41', num(DEMO.hauteur) + '°'],
    ['Abscisse du point (2°, 47°)', '((2 + 5) / 15) × 900', num(DEMO.p.x) + ' px'],
    ['Ordonnée du point (2°, 47°)', '((52 − 47) / 11) × 620', num(DEMO.p.y) + ' px'],
    ['Centre du cadre (référence)', '900 / 2 ; 620 / 2', num(VIRTUAL_W / 2) + ' px ; ' + num(VIRTUAL_H / 2) + ' px'],
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

/* ---------- Listes sémantiques (E083-08) ---------- */

function staticList(id, entrees) {
  const list = document.createElement('ul');
  list.id = id;
  entrees.forEach((texte) => {
    const item = document.createElement('li');
    item.textContent = texte;
    list.appendChild(item);
  });
  return list;
}

/* Repères chiffrés, tous recalculés depuis leur formule et comparés au centre. */
function staticMesures() {
  const centreX = VIRTUAL_W / 2;
  const centreY = VIRTUAL_H / 2;
  return staticList(MESURES_ID, [
    'Cadre « Hexagone » : λmax − λmin = 10 − (−5) = ' + num(DEMO.largeur) +
      '°, φmax − φmin = 52 − 41 = ' + num(DEMO.hauteur) + '°.',
    'Point de démonstration (2°, 47°) : x = ((2 + 5) / 15) × 900 = ' + num(DEMO.p.x) +
      ' px ; y = ((52 − 47) / 11) × 620 = ' + num(DEMO.p.y) + ' px.',
    'Référence au centre du cadre : x = 900 / 2 = ' + num(centreX) + ' px, y = 620 / 2 = ' +
      num(centreY) + ' px ; écarts Δx = ' + num(DEMO.p.x - centreX) + ' px et Δy = ' +
      num(DEMO.p.y - centreY) + ' px.',
    'Échelle du cadre : un degré vaut 900 / 15 = ' + num(DEMO.pxParDegLon) +
      ' px en longitude et 620 / 11 = ' + num(DEMO.pxParDegLat) +
      ' px en latitude : l’affine conserve les proportions en degrés, pas les distances du globe.',
  ]);
}

/* ---------- Feuille de style unique, injectée une seule fois via ctx.css ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p,#${PANEL_ID} ul{margin:5px 0;max-width:68ch}
#${PANEL_ID} ul{padding-left:18px}
#${PANEL_ID} li{margin:3px 0}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${FRAMESET_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${FRAMESET_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.${P}-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;max-width:340px;height:auto;aspect-ratio:900 / 620;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{max-width:240px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
  #${TABLE_ID}{font-size:9px}
}
`;

/* ---------- E083-06 : laboratoire canvas unique et déterministe ---------- */

function toCanvasPx(p, pad, iw, ih) {
  return [pad + (p.x / VIRTUAL_W) * iw, pad + (p.y / VIRTUAL_H) * ih];
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const largeur = Math.max(180, Math.min(340, cv.clientWidth || 340));
  const hauteur = Math.round(largeur * (VIRTUAL_H / VIRTUAL_W));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(largeur * dpr);
  const pxH = Math.round(hauteur * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, largeur, hauteur);

  const pad = Math.max(18, Math.round(largeur * 0.09));
  const iw = Math.max(10, largeur - pad * 2);
  const ih = Math.max(10, hauteur - pad * 2);
  const f = frame();
  const encre = 'rgba(244,214,158,.98)';

  /* Cadre : rectangle de l'écran virtuel. */
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Graticule : les motifs de trait distinguent méridiens/parallèles, pas la couleur. */
  if (g.setLineDash) g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(214,207,193,.45)';
  for (let i = 1; i < 4; i += 1) {
    const x = pad + (i / 4) * iw;
    g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([2, 3]);
  for (let i = 1; i < 4; i += 1) {
    const y = pad + (i / 4) * ih;
    g.beginPath(); g.moveTo(pad, y); g.lineTo(pad + iw, y); g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);

  /* Centre du cadre : référence 450 px / 310 px, repère en croix. */
  const [cx, cy] = toCanvasPx({ x: VIRTUAL_W / 2, y: VIRTUAL_H / 2 }, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.7)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - 5, cy); g.lineTo(cx + 5, cy);
  g.moveTo(cx, cy - 5); g.lineTo(cx, cy + 5);
  g.stroke();

  const p = projectToScreen(S.lon, S.lat, f);
  if (!p) return;
  const [px, py] = toCanvasPx(p, pad, iw, ih);

  if (p.inside) {
    /* Guides jusqu'aux bords, puis croix pleine cerclée : lecture sans couleur. */
    if (g.setLineDash) g.setLineDash([4, 4]);
    g.strokeStyle = 'rgba(244,214,158,.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad, py); g.lineTo(px, py);
    g.moveTo(px, py); g.lineTo(px, pad + ih);
    g.stroke();
    if (g.setLineDash) g.setLineDash([]);
    g.strokeStyle = encre;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px - 7, py); g.lineTo(px + 7, py);
    g.moveTo(px, py - 7); g.lineTo(px, py + 7);
    g.stroke();
    g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.stroke();
  } else {
    /* Hors cadre : losange creux sur le bord, jamais un faux point à l'intérieur. */
    const bx = clamp(px, pad, pad + iw);
    const by = clamp(py, pad, pad + ih);
    g.strokeStyle = encre;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx, by - 6); g.lineTo(bx + 6, by);
    g.lineTo(bx, by + 6); g.lineTo(bx - 6, by); g.closePath(); g.stroke();
  }

  g.fillStyle = encre;
  g.font = Math.max(8, Math.round(largeur * 0.032)) + 'px sans-serif';
  g.textAlign = 'left';
  g.fillText('λ ' + num(S.lon) + '° · φ ' + num(S.lat) + '° → x ' + num(p.x) +
    ' px, y ' + num(p.y) + ' px', 4, hauteur - 6);
  g.font = Math.max(7, Math.round(largeur * 0.028)) + 'px sans-serif';
  g.fillText('λ → x', 4, pad - 5);
  g.fillText('φ → y inversé', 4, pad + 10);
  g.textAlign = 'right';
  g.fillText(p.inside ? 'DANS LE CADRE' : 'HORS CADRE', largeur - 4, pad - 5);
  g.textAlign = 'left';
}

/* ---------- E083-07 : région de statut unique, relatée en texte ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const f = frame();
  const p = projectToScreen(S.lon, S.lat, f);
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('Cadre : λ ∈ [' + num(f.minLon) + '° ; ' + num(f.maxLon) +
    '°] (largeur ' + num(spanLon(f)) + '°), φ ∈ [' + num(f.minLat) + '° ; ' + num(f.maxLat) +
    '°] (hauteur ' + num(spanLat(f)) + '°). Point (λ ' + num(S.lon) + '°, φ ' + num(S.lat) + ') : x = ((λ − λmin) / ' +
    num(spanLon(f)) + ') × 900 = '));
  frag.appendChild(fort(p ? num(p.x) + ' px' : 'indéfini'));
  frag.appendChild(document.createTextNode(' ; y = ((φmax − φ) / ' + num(spanLat(f)) + ') × 620 = '));
  frag.appendChild(fort(p ? num(p.y) + ' px' : 'indéfini'));
  frag.appendChild(document.createTextNode('. Référence : au centre, x = 900 / 2 = ' +
    num(VIRTUAL_W / 2) + ' px et y = 620 / 2 = ' + num(VIRTUAL_H / 2) + ' px ; écarts '));
  frag.appendChild(fort(p ? 'Δx ' + num(p.x - VIRTUAL_W / 2) + ' px, Δy ' +
    num(p.y - VIRTUAL_H / 2) + ' px' : 'non définis'));
  frag.appendChild(document.createTextNode('. '));
  frag.appendChild(fort(p && p.inside ? 'Point dans le cadre.' :
    'Point hors du cadre : sa position est signalée sur le bord par un losange creux.'));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: FRAME_ORDER.map((k) => document.getElementById(FRAME_PREFIX + k)),
      lon: document.getElementById(LON_ID),
      lat: document.getElementById(LAT_ID),
      lonOut: document.getElementById(LON_OUT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      center: document.getElementById(CENTER_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Du lat/lon à l’écran : la projection affine');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'La vue place chaque lieu avec une transformation simple de (λ, φ) vers (x, y). Ce laboratoire rend explicite chaque étape du calcul et montre ce qui se passe quand le point sort du cadre.');

  /* E083-01, E083-02 : faits sourcés et tableau lisible sans canvas. */
  const faits = staticFacts();
  const table = staticTable();

  /* E083-03 : cadre de démonstration -> radiogroupe (choix unique). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = FRAMESET_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Cadre de démonstration, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Cadre de démonstration (choix unique)';
  fieldset.appendChild(legend);
  const radios = FRAME_ORDER.map((key) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-frame';
    radio.id = FRAME_PREFIX + key;
    radio.value = key;
    radio.checked = S.frame === key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(FRAMES[key].label));
    fieldset.appendChild(lab);
    return radio;
  });

  const sub = ctx.el('h3', '', 'Déplacer le point à projeter');

  /* E083-04 : deux curseurs bornés et étiquetés. */
  const lonRow = ctx.el('p', '');
  const lonLabel = document.createElement('label');
  lonLabel.setAttribute('for', LON_ID);
  lonLabel.appendChild(document.createTextNode('Longitude λ : '));
  const lonOut = document.createElement('span');
  lonOut.id = LON_OUT_ID;
  lonLabel.appendChild(lonOut);
  lonRow.appendChild(lonLabel);
  const lon = document.createElement('input');
  lon.type = 'range';
  lon.id = LON_ID;
  lon.min = '-180';
  lon.max = '180';
  lon.step = '1';
  lon.value = String(S.lon);
  lon.className = P + '-range';
  lon.setAttribute('aria-label', 'Longitude du point, de moins 180 à 180 degrés');

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
  lat.min = '-90';
  lat.max = '90';
  lat.step = '1';
  lat.value = String(S.lat);
  lat.className = P + '-range';
  lat.setAttribute('aria-label', 'Latitude du point, de moins 90 à 90 degrés');

  /* E083-06 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Cadre de projection et point projeté. Flèche gauche ou droite : longitude ; flèche haut ou bas : latitude ; Début : recentrer ; Page précédente et Page suivante : changer de cadre.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID);

  /* E083-09 : légende des repères sans couleur. */
  const legendText = ctx.el('p', '', 'Repères sans couleur : trait plein et croix cerclée = point projeté ; tirets longs = méridiens ; pointillés = parallèles ; croix courte = centre du cadre ; losange creux = point hors cadre. Les formes et les motifs distinguent tout, même sans couleur.');
  legendText.id = LEGEND_ID;

  /* E083-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E083-08 : repères chiffrés recalculés depuis leur formule. */
  const mesures = staticMesures();

  /* E083-09/E083-10 : équivalent clavier explicite. */
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les trois cadres, les deux curseurs, le balayage, le recentrage puis le schéma. Sur le schéma, ← → déplacent la longitude, ↑ ↓ la latitude, Début recentre, Page précédente et Page suivante changent de cadre. Le balayage est une bascule indépendante : son état est toujours écrit, jamais porté par le seul pixel.');
  clavier.id = CLAVIER_ID;

  /* E083-10 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Balayer la longitude');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  const center = ctx.el('button', '', 'Recentrer le point');
  center.type = 'button';
  center.id = CENTER_ID;

  /* E083-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : dans le cadre « Hexagone », où tombe le point (2°, 47°) par rapport au centre (450 px, 310 px) ? 2) Réglage : placez λ = 2° et φ = 47°, puis essayez les autres cadres. 3) Résultat attendu : x = 420,0 px et y = 281,8 px, donc à gauche et au-dessus du centre (Δx = −30,0 px, Δy = −28,2 px). 4) Falsification : si une paire (λ, φ) donne les mêmes pixels dans deux cadres différents, l’hypothèse « la projection dépend des bornes » est réfutée — vérifiez. 5) Débrief : vérifiez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : la formule est affine et déterministe — x dépend de λ, y de (φmax − φ) ; changer les bornes change donc les pixels d’une même paire. Les cadres « Europe » et « Hexagone » sont des bornes de démonstration, pas une affirmation géographique. La projection garde les proportions en degrés mais pas les distances du globe : à l’équateur seulement, 1° de longitude vaut 1° de latitude.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, table, fieldset, sub, lonRow, lon, latRow, lat,
    canvas, legendText, readout, mesures, clavier, play, center, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios, lon, lat, lonOut, latOut, canvas, readout,
    play, center, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function syncControls() {
  const n = S.nodes;
  const f = frame();
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = FRAME_ORDER[i] === S.frame;
  });
  if (n.lon) n.lon.value = String(clamp(Math.round(S.lon), -180, 180));
  if (n.lat) n.lat.value = String(clamp(Math.round(S.lat), -90, 90));
  if (n.lonOut) n.lonOut.textContent = num(S.lon) + '°';
  if (n.latOut) n.latOut.textContent = num(S.lat) + '°';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Balayer la longitude';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reducedNow() ? '1' : '0');
  void f;
  updateReadout();
  drawLab();
}

/* ---------- E083-10 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.onScreen || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Un seul pas discret, utilisé en mouvement réduit. */
function stepSweep() {
  const f = frame();
  const largeur = spanLon(f);
  S.lon = f.minLon + (((S.lon - f.minLon) + stepFor(largeur)) % largeur + largeur) % largeur;
  syncControls();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  const f = frame();
  const largeur = spanLon(f);
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.elapsed += dt;
    S.lon = f.minLon + ((((S.sweepBase - f.minLon) + S.elapsed * VITESSE) % largeur) + largeur) % largeur;
  }
  S.lastTs = ts;
  syncControls();
  if (S.playing && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

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
        if (mq.matches) { S.playing = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* ---------- E083-10 : IntersectionObserver et badge sur la carte ---------- */

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', 'Projection pédagogique : bornes de démonstration, formule et calcul écrits en texte dans le panneau.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E083', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.playing = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.frame = FRAME_ORDER[i];
        const f = frame();
        S.lon = clamp(S.lon, f.minLon, f.maxLon);
        S.lat = clamp(S.lat, f.minLat, f.maxLat);
        syncControls();
      });
    });
    n.lon.addEventListener('input', () => {
      S.lon = clamp(Math.round(Number(n.lon.value)), -180, 180);
      syncControls();
    });
    n.lat.addEventListener('input', () => {
      S.lat = clamp(Math.round(Number(n.lat.value)), -90, 90);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow() || typeof requestAnimationFrame !== 'function') {
        S.playing = false;
        stopLoop();
        stepSweep(); // palier discret : jamais d'animation en mouvement réduit.
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) {
        stopLoop();
      } else {
        S.sweepBase = S.lon;
        S.elapsed = 0;
        startLoop();
      }
      syncControls();
    });
    n.center.addEventListener('click', () => {
      const f = frame();
      S.lon = Math.round((f.minLon + f.maxLon) / 2);
      S.lat = Math.round((f.minLat + f.maxLat) / 2);
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      const f = frame();
      const dLon = stepFor(spanLon(f));
      const dLat = stepFor(spanLat(f));
      let used = true;
      if (event.key === 'ArrowLeft') S.lon = clamp(S.lon - dLon, -180, 180);
      else if (event.key === 'ArrowRight') S.lon = clamp(S.lon + dLon, -180, 180);
      else if (event.key === 'ArrowUp') S.lat = clamp(S.lat + dLat, -90, 90);
      else if (event.key === 'ArrowDown') S.lat = clamp(S.lat - dLat, -90, 90);
      else if (event.key === 'Home') {
        S.lon = Math.round((f.minLon + f.maxLon) / 2);
        S.lat = Math.round((f.minLat + f.maxLat) / 2);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const stepSens = event.key === 'PageDown' ? 1 : -1;
        const i = FRAME_ORDER.indexOf(S.frame);
        S.frame = FRAME_ORDER[(i + stepSens + FRAME_ORDER.length) % FRAME_ORDER.length];
      } else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.playing && !reducedNow()) startLoop();
});
