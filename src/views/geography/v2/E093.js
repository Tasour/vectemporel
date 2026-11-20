import { register } from './registry.js';

/* Lentille E093 (V2) — vue GEOGRAPHIE.
 * Thème : distance du grand cercle (formule de haversine) entre lieux.
 *
 * Les dix chantiers E093-01 … E093-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E093.md et réellement implémentés ici :
 * aucun stub, aucune fonction vide. Tout est local : aucune requête réseau,
 * aucune graine aléatoire, aucune journalisation, aucun fichier partagé modifié.
 * Le contenu pédagogique est du texte sémantique réel (titre, paragraphes,
 * tableaux, listes, radiogroupes, curseur, défi) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre la formule.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e093- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e093';

/* Identifiants, tous préfixés geography-v2-e093-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const LEAD_ID = P + '-lead';
const FAITS_ID = P + '-faits';
const NOTE_ID = P + '-note';
const TABLE_ID = P + '-table';
const MESURES_ID = P + '-mesures';
const FROM_FS_ID = P + '-from';
const TO_FS_ID = P + '-to';
const FROM_PREFIX = P + '-from-';
const TO_PREFIX = P + '-to-';
const RAYON_ID = P + '-rayon';
const RAYON_OUT_ID = P + '-rayon-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const CLAVIER_ID = P + '-clavier';
const READOUT_ID = P + '-readout';
const COMPARE_ID = P + '-compare';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const NARROW = '\u202f'; // espace fine (milliers)
const MINUS = '\u2212';  // signe moins typographique

/* Rayon moyen de référence (km) : toutes les grandeurs statiques sont
   recalculées avec cette valeur. 2πR ≈ 40 030 km sert de référence explicite. */
const R_DEFAUT = 6371;
const R_MIN = 6350;
const R_MAX = 6400;
const VITESSE = 0.00018; // fraction d'arc par milliseconde de balayage

/* Lieux de référence : coordonnées canoniques énoncées, jamais fabriquées.
   latitude positive = nord, longitude positive = est. */
const LIEUX = [
  { id: 'paris', nom: 'Paris', lat: 48.8566, lon: 2.3522 },
  { id: 'lyon', nom: 'Lyon', lat: 45.7640, lon: 4.8357 },
  { id: 'marseille', nom: 'Marseille', lat: 43.2965, lon: 5.3698 },
  { id: 'newyork', nom: 'New York', lat: 40.7128, lon: -74.0060 },
  { id: 'tokyo', nom: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'sydney', nom: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { id: 'capetown', nom: 'Le Cap', lat: -33.9249, lon: 18.4241 },
  { id: 'reykjavik', nom: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
];

/* Paires du tableau statique (valeurs recalculées par haversine, R = 6371). */
const PAIRES_REFERENCE = [
  ['paris', 'lyon'],
  ['paris', 'newyork'],
  ['paris', 'tokyo'],
  ['paris', 'sydney'],
];

/* État de module : survit au vidage du `stage` par la coque. */
const S = {
  from: 'paris',
  to: 'lyon',
  rayon: R_DEFAUT,
  playing: false,
  debriefOuvert: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  readoutText: '',
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function grouper(entier) {
  return String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
}

function fmt(n, d) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const digits = d === undefined ? 1 : d;
  const neg = n < 0;
  const parts = Math.abs(n).toFixed(digits).split('.');
  parts[0] = grouper(parts[0]);
  return (neg ? MINUS : '') + parts.join(',');
}

function lieuParId(id) {
  return LIEUX.find((p) => p.id === id) || LIEUX[0];
}

/* Angle central δ (radians) par haversine — stable même à faible distance. */
function angleCentral(a, b) {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = p2 - p1;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const h = clamp(s, 0, 1);
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* Angle central par la loi des cosinus sphériques (comparaison numérique). */
function angleCosinus(a, b) {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(clamp(c, -1, 1));
}

function mesures(a, b, rayon) {
  const delta = angleCentral(a, b);
  const deltaCos = angleCosinus(a, b);
  return {
    delta,
    distance: rayon * delta,
    distanceCos: rayon * deltaCos,
    ecart: Math.abs(rayon * deltaCos - rayon * delta),
    part: (delta / (2 * Math.PI)) * 100,
    tour: 2 * Math.PI * rayon,
  };
}

/* Coordonnées cartésiennes unitaires d'un lieu (pour l'interpolation slerp). */
function vecteurUnitaire(p) {
  const phi = p.lat * DEG;
  const lam = p.lon * DEG;
  const cp = Math.cos(phi);
  return { x: cp * Math.cos(lam), y: cp * Math.sin(lam), z: Math.sin(phi) };
}

/* Point de l'orthodrome à la fraction t (0 = départ, 1 = arrivée). */
function pointSurArc(a, b, t) {
  const A = vecteurUnitaire(a);
  const B = vecteurUnitaire(b);
  const delta = angleCentral(a, b);
  const sinD = Math.sin(delta);
  if (Math.abs(sinD) < 1e-12 || delta < 1e-12) {
    return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  }
  const wa = Math.sin((1 - t) * delta) / sinD;
  const wb = Math.sin(t * delta) / sinD;
  const x = wa * A.x + wb * B.x;
  const y = wa * A.y + wb * B.y;
  const z = wa * A.z + wb * B.z;
  return { lat: Math.asin(clamp(z, -1, 1)) * RAD, lon: Math.atan2(y, x) * RAD };
}

/* ---------- E093-01 : fiche de vérité, texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'Sur une sphère, le chemin le plus court entre deux lieux suit un grand cercle : l’intersection de la sphère avec un plan passant par son centre. L’équateur et tous les méridiens en sont des exemples. L’arc de grand cercle réalise la distance minimale à la surface — ce n’est pas une droite tracée sur une carte plate. (Référence : géométrie sphérique élémentaire.)',
    'La haversine s’écrit a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2), puis δ = 2 · atan2(√a, √1−a) et d = R · δ, avec φ la latitude, λ la longitude, δ l’angle central et R le rayon. Le carré du sinus half-angle reste stable quand les deux lieux sont très proches : c’est pourquoi cette forme est préférée à la loi des cosinus pour les petites distances.',
    'Le résultat dépend du rayon R retenu : 6 371 km est le rayon moyen, 6 357 km le rayon polaire et 6 378 km le rayon équatorial. La Terre étant aplatie, la haversine donne un ordre de grandeur, pas une mesure géodésique. Le tour de Terre théorique 2πR ≈ 40 030 km sert ici de grandeur de référence à laquelle chaque distance est comparée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.id = NOTE_ID;
  note.className = P + '-note';
  note.textContent = 'Les huit lieux portent des coordonnées canoniques énoncées, jamais tirées au sort. Les distances du tableau sont recalculées depuis la formule avec R = 6 371 km : elles sont un exemple de calcul, pas une mesure terrain.';
  wrap.appendChild(note);
  return wrap;
}

/* ---------- E093-04 : tableau captioné, valeurs recalculées depuis la formule ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Distances du grand cercle depuis Paris, recalculées par haversine avec R = 6 371 km (tour de Terre théorique 2πR ≈ 40 030 km).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Trajets', 'Distance (km)', 'Angle central δ', 'Part du tour de Terre'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PAIRES_REFERENCE.forEach(([idA, idB]) => {
    const a = lieuParId(idA);
    const b = lieuParId(idB);
    const m = mesures(a, b, R_DEFAUT);
    const tr = document.createElement('tr');
    const cells = [
      a.nom + ' → ' + b.nom,
      fmt(m.distance, 0) + ' km',
      fmt(m.delta * RAD, 2) + '°',
      fmt(m.part, 2) + ' %',
    ];
    cells.forEach((texte, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = texte;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E093-07 : mesures référencées, recalculées et comparées ---------- */

function staticList(id, entrees) {
  const list = document.createElement('ul');
  list.id = id;
  entrees.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    list.appendChild(li);
  });
  return list;
}

function staticMesures() {
  const tour = 2 * Math.PI * R_DEFAUT;
  const ref = mesures(lieuParId('paris'), lieuParId('lyon'), R_DEFAUT);
  return staticList(MESURES_ID, [
    'Grandeur de référence : tour de Terre théorique 2πR = 2 × π × ' + fmt(R_DEFAUT, 0) +
      ' = ' + fmt(tour, 0) + ' km.',
    'Paris → Lyon : ' + fmt(ref.distance, 1) + ' km, soit ' + fmt(ref.delta * RAD, 2) +
      '° et ' + fmt(ref.part, 2) + ' % du tour de Terre — trois grandeurs lues directement dans le tableau.',
    'Rayons de référence : polaire ' + fmt(6357, 0) + ' km, moyen ' + fmt(R_DEFAUT, 0) +
      ' km, équatorial ' + fmt(6378, 0) + ' km ; l’aplatissement est de ' + fmt(6378 - 6357, 0) + ' km.',
    'Proportionnalité : d = R · δ. Doubler R double la distance, tandis que δ et la part du tour restent inchangés, car ils ne dépendent que de la géométrie des deux lieux.',
  ]);
}

/* ---------- E093-02 : feuille de style unique, injectée une seule fois ---------- */

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
#${PANEL_ID} .${P}-note{color:var(--muted);font-size:10px}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} fieldset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PANEL_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin:2px 6px 2px 0;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.${P}-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;max-width:420px;height:230px;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${COMPARE_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${COMPARE_ID}{color:var(--muted)}
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
  #${CANVAS_ID}{max-width:240px;height:200px}
  #${TABLE_ID}{font-size:9px}
}
`;

/* ---------- E093-05 : laboratoire canvas unique et déterministe ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
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
  const toPx = (p) => [pad + ((p.lon + 180) / 360) * iw, pad + ((90 - p.lat) / 180) * ih];

  /* Graticule équirectangulaire : les motifs de trait distinguent méridiens
     (tirets longs) et parallèles (pointillés), jamais la couleur seule. */
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeStyle = 'rgba(255,255,255,.30)';
  g.strokeRect(pad, pad, iw, ih);
  if (g.setLineDash) g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(214,207,193,.42)';
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 60) {
    const [x] = toPx({ lon, lat: 0 });
    g.moveTo(x, pad); g.lineTo(x, pad + ih);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([2, 3]);
  g.beginPath();
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = toPx({ lon: 0, lat });
    g.moveTo(pad, y); g.lineTo(pad + iw, y);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  const a = lieuParId(S.from);
  const b = lieuParId(S.to);

  /* Orthodrome : on échantillonne l'interpolation sphérique, pas une droite. */
  if (g.setLineDash) g.setLineDash([7, 5]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.beginPath();
  const steps = 72;
  for (let i = 0; i <= steps; i += 1) {
    const [x, y] = toPx(pointSurArc(a, b, i / steps));
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* Extrémités : croix + libellé, distinctes même en niveaux de gris. */
  [a, b].forEach((p, index) => {
    const [x, y] = toPx(p);
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - 6, y); g.lineTo(x + 6, y);
    g.moveTo(x, y - 6); g.lineTo(x, y + 6);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.font = '10px sans-serif';
    g.fillText(p.nom, x + 8, y - 6 - index * 0);
  });

  /* Voyageur : position déterministe = f(S.sweep), jamais aléatoire. */
  const t = clamp(S.sweep, 0, 1);
  const [vx, vy] = toPx(pointSurArc(a, b, t));
  g.fillStyle = 'rgba(230,185,111,.95)';
  g.beginPath();
  g.arc(vx, vy, 4.5, 0, 2 * Math.PI);
  g.fill();

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Arc de grand cercle · R = ' + fmt(S.rayon, 0) + ' km', pad + 2, cssH - pad - 4);
}

/* ---------- E093-07 : statut unique relaté en texte, relaté par <strong> ---------- */

function updateReadout() {
  const a = lieuParId(S.from);
  const b = lieuParId(S.to);
  const m = mesures(a, b, S.rayon);
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(a.nom + ' → ' + b.nom + ' · distance grand cercle '));
  frag.appendChild(fort(fmt(m.distance, 1) + ' km'));
  frag.appendChild(document.createTextNode(' (R = ' + fmt(S.rayon, 0) + ' km) ; angle central δ = '));
  frag.appendChild(fort(fmt(m.delta * RAD, 2) + '°'));
  frag.appendChild(document.createTextNode(' ; soit '));
  frag.appendChild(fort(fmt(m.part, 2) + ' %'));
  frag.appendChild(document.createTextNode(' du tour de Terre théorique ' + fmt(m.tour, 0) + ' km. '));
  frag.appendChild(fort('La distance est proportionnelle à R : doubler R double d.'));

  const c = S.nodes.compare;
  if (c) {
    c.textContent = 'Contrôle de cohérence — loi des cosinus sphériques : ' +
      fmt(m.distanceCos, 1) + ' km ; écart avec la haversine : ' + fmt(m.ecart * 1000, 2) +
      ' m. Les deux formules concordent ; la haversine reste mieux conditionnée quand les deux lieux sont très proches (sinus half-angle).';
  }

  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  const n = S.nodes.readout;
  if (n) {
    n.textContent = '';
    n.appendChild(frag);
  }
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      fromRadios: LIEUX.map((p) => document.getElementById(FROM_PREFIX + p.id)),
      toRadios: LIEUX.map((p) => document.getElementById(TO_PREFIX + p.id)),
      rayon: document.getElementById(RAYON_ID),
      rayonOut: document.getElementById(RAYON_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      compare: document.getElementById(COMPARE_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Distance grand cercle — la formule de haversine (V2)');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'La vue GEOGRAPHIE place des lieux par une projection affine sans rien dire de la distance réelle qui les sépare. Ce laboratoire rend explicite la distance du grand cercle : chaque grandeur annoncée est recalculée par la formule de haversine et écrite en toutes lettres.');
  lead.id = LEAD_ID;

  /* E093-01, E093-04, E093-07 : faits, tableaux et mesures lisibles sans canvas. */
  const faits = staticFacts();
  const table = staticTable();
  const mesures = staticMesures();

  /* E093-03 : deux radiogroupes (choix unique) départ / arrivée. */
  const sub = ctx.el('h3', '', 'Laboratoire : deux lieux, un rayon, un arc');

  function buildLieuxFieldset(kind, labelText, prefix, selected) {
    const fs = document.createElement('fieldset');
    fs.id = kind === 'from' ? FROM_FS_ID : TO_FS_ID;
    fs.setAttribute('role', 'radiogroup');
    fs.setAttribute('aria-label', labelText + ', choix unique');
    const legend = document.createElement('legend');
    legend.textContent = labelText + ' (choix unique)';
    fs.appendChild(legend);
    const radios = LIEUX.map((p) => {
      const lab = ctx.el('label', P + '-choix');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = P + '-' + kind;
      radio.id = prefix + p.id;
      radio.value = p.id;
      radio.checked = selected === p.id;
      lab.appendChild(radio);
      lab.appendChild(document.createTextNode(p.nom + ' (' + fmt(p.lat, 4) + '°, ' + fmt(p.lon, 4) + '°)'));
      fs.appendChild(lab);
      return radio;
    });
    return { fs, radios };
  }

  const fromGroup = buildLieuxFieldset('from', 'Lieu de départ', FROM_PREFIX, S.from);
  const toGroup = buildLieuxFieldset('to', 'Lieu d’arrivée', TO_PREFIX, S.to);

  /* E093-06 : curseur de rayon, valeur annoncée dans un span. */
  const rayonRow = ctx.el('p', '');
  const rayonLabel = document.createElement('label');
  rayonLabel.setAttribute('for', RAYON_ID);
  rayonLabel.appendChild(document.createTextNode('Rayon R utilisé : '));
  const rayonOut = document.createElement('span');
  rayonOut.id = RAYON_OUT_ID;
  rayonOut.className = P + '-value';
  rayonLabel.appendChild(rayonOut);
  rayonRow.appendChild(rayonLabel);
  const rayon = document.createElement('input');
  rayon.type = 'range';
  rayon.id = RAYON_ID;
  rayon.min = String(R_MIN);
  rayon.max = String(R_MAX);
  rayon.step = '1';
  rayon.value = String(S.rayon);
  rayon.className = P + '-range';
  rayon.setAttribute('aria-label', 'Rayon de la Terre en kilomètres, de 6 350 à 6 400');

  /* E093-05 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Orthodrome tracée sur une grille équirectangulaire. Flèches gauche et droite : changer le lieu d’arrivée ; flèches haut et bas : ajuster le rayon ; Début et Fin : extrémités de la liste ; Espace : animation.');
  canvas.setAttribute('aria-describedby', LEGEND_ID + ' ' + CLAVIER_ID);

  /* E093-08 : légende des repères sans couleur. */
  const legend = ctx.el('p', '', 'Repères sans couleur : tirets longs = orthodrome (arc de grand cercle) ; pointillés = parallèles ; croix + libellé = extrémités ; cercle plein = voyageur. Les formes et les motifs distinguent tout, même en niveaux de gris.');
  legend.id = LEGEND_ID;
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les deux radiogroupes, le curseur de rayon, le balayage, la remise à zéro, le débrief puis le schéma. Sur le schéma, ← → changent le lieu d’arrivée, ↑ ↓ ajustent le rayon, Début/Fin vont aux extrémités de la liste, Espace bascule l’animation.');
  clavier.id = CLAVIER_ID;

  /* E093-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  const compare = ctx.el('p', '');
  compare.id = COMPARE_ID;

  /* E093-09 : bascule indépendante -> aria-pressed autorisé ; remise à zéro. */
  const play = ctx.el('button', '', S.playing ? '■ Arrêter le voyage' : '▶ Animer le voyage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);
  const reset = ctx.el('button', '', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  /* E093-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : en doublant le rayon R, que deviennent la distance et l’angle central δ ? 2) Réglage : choisissez Paris → Lyon, puis faites glisser R de 6 350 à 6 400 km. 3) Résultat attendu : la distance suit R (391,5 km à 6 371 km), alors que δ reste 3,52° et la part 0,98 % du tour de 40 030 km. 4) Falsification : si δ changeait quand vous bougez seulement R, l’hypothèse « δ est intrinsèque aux deux lieux » serait réfutée — vérifiez. 5) Débrief : ouvrez le paragraphe ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : δ ne dépend que de la géométrie des deux lieux (latitudes et longitudes), donc de la forme de la Terre, pas de l’échelle choisie. La distance d = R · δ lui est proportionnelle : doubler R double d. La limite du modèle est l’aplatissement réel — la Terre n’est pas une sphère parfaite, et 6 371 km n’est qu’un rayon moyen : la haversine donne un ordre de grandeur, pas une mesure géodésique.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, table, mesures, sub, fromGroup.fs, toGroup.fs,
    rayonRow, rayon, canvas, legend, clavier, readout, compare, play, reset,
    defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    fromRadios: fromGroup.radios, toRadios: toGroup.radios,
    rayon, rayonOut, canvas, readout, compare, play, reset, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function syncControls() {
  const n = S.nodes;
  n.fromRadios.forEach((radio, i) => { if (radio) radio.checked = LIEUX[i].id === S.from; });
  n.toRadios.forEach((radio, i) => { if (radio) radio.checked = LIEUX[i].id === S.to; });
  if (n.rayon) n.rayon.value = String(clamp(Math.round(S.rayon), R_MIN, R_MAX));
  if (n.rayonOut) n.rayonOut.textContent = fmt(S.rayon, 0) + ' km (moyen : ' + fmt(R_DEFAUT, 0) + ' km)';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le voyage' : '▶ Animer le voyage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reducedNow() ? '1' : '0');
  updateReadout();
  drawLab();
}

/* ---------- E093-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  S.sweep = (S.sweep + 0.25) % 1;
  syncControls();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.sweep = (S.sweep + dt * VITESSE) % 1;
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

/* ---------- E093-09 : IntersectionObserver et badge sur la carte ---------- */

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
  const badge = ctx.el('div', P + '-map-badge',
    'Les distances annoncées suivent l’arc de grand cercle (haversine, R = 6 371 km), pas une ligne droite tracée sur la carte schématique.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

function resetState() {
  S.from = 'paris';
  S.to = 'lyon';
  S.rayon = R_DEFAUT;
  S.playing = false;
  S.debriefOuvert = false;
  S.sweep = 0;
  stopLoop();
  syncControls();
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E093', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(P, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.playing = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.fromRadios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.from = LIEUX[i].id;
        syncControls();
      });
    });
    n.toRadios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.to = LIEUX[i].id;
        S.sweep = 0;
        syncControls();
      });
    });
    n.rayon.addEventListener('input', () => {
      const v = Number(n.rayon.value);
      S.rayon = Number.isFinite(v) ? clamp(Math.round(v), R_MIN, R_MAX) : R_DEFAUT;
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
      if (!S.playing) stopLoop();
      else startLoop();
      syncControls();
    });
    n.reset.addEventListener('click', resetState);
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = LIEUX.findIndex((p) => p.id === S.to);
        S.to = LIEUX[(i + step + LIEUX.length) % LIEUX.length].id;
        S.sweep = 0;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 1 : -1;
        S.rayon = clamp(S.rayon + step, R_MIN, R_MAX);
      } else if (event.key === 'Home') {
        S.to = LIEUX[0].id;
        S.sweep = 0;
      } else if (event.key === 'End') {
        S.to = LIEUX[LIEUX.length - 1].id;
        S.sweep = 0;
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (reducedNow() || typeof requestAnimationFrame !== 'function') {
          S.playing = false;
          stopLoop();
          stepSweep();
        } else {
          S.playing = !S.playing;
          if (S.playing) startLoop(); else stopLoop();
        }
      } else {
        used = false;
      }
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
