import { register } from './registry.js';

/* Lentille E019 — vue GEOGRAPHIE.
 * Thème : capitales et villes principales.
 *
 * Les dix chantiers E019-01 … E019-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E019.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau, fieldset, label, select) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre des formules
 * déterministes appliquées à un petit jeu de repères de villes factuels.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e019-panel';
const TITLE_ID = 'geography-e019-title';
const CITY_GROUP_ID = 'geography-e019-city';
const LAT_ID = 'geography-e019-lat';
const LAT_OUT_ID = 'geography-e019-lat-value';
const COMPARE_ID = 'geography-e019-compare';
const SELECTED_ID = 'geography-e019-selected';
const CANVAS_ID = 'geography-e019-canvas';
const READOUT_ID = 'geography-e019-readout';
const PLAY_ID = 'geography-e019-play';
const LEGEND_ID = 'geography-e019-legend';
const BADGE_ID = 'geography-e019-badge';

const RAD = Math.PI / 180;
const EARTH_R = 6371;          // km — rayon moyen de la Terre (référence).
const CIRCUMFERENCE = 40075;   // km — tour de Terre à l'équateur (référence).

/* Repères factuels : coordonnées arrondies (degrés décimaux), rôle et ordre de
   grandeur de l'aire urbaine. Aucune valeur n'est fabriquée par le code. */
const CITIES = [
  { id: 'paris',    name: 'Paris',     country: 'France',     lat: 48.86,  lon: 2.35,    capital: true,  pop: 11.1 },
  { id: 'newyork',  name: 'New York',  country: 'États-Unis', lat: 40.71,  lon: -74.01,  capital: false, pop: 18.8 },
  { id: 'tokyo',    name: 'Tokyo',     country: 'Japon',      lat: 35.68,  lon: 139.69,  capital: true,  pop: 37.4 },
  { id: 'sydney',   name: 'Sydney',    country: 'Australie',  lat: -33.87, lon: 151.21,  capital: false, pop: 5.3  },
  { id: 'cairo',    name: 'Le Caire',  country: 'Égypte',     lat: 30.04,  lon: 31.24,   capital: true,  pop: 21.3 },
  { id: 'saopaulo', name: 'São Paulo', country: 'Brésil',     lat: -23.55, lon: -46.63,  capital: false, pop: 22.4 },
  { id: 'nairobi',  name: 'Nairobi',   country: 'Kenya',      lat: -1.29,  lon: 36.82,   capital: true,  pop: 5.1  },
  { id: 'reykjavik',name: 'Reykjavík', country: 'Islande',    lat: 64.15,  lon: -21.94,  capital: true,  pop: 0.13 },
];

const CITY_BY_ID = {};
CITIES.forEach((c) => { CITY_BY_ID[c.id] = c; });

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  selected: 'paris',
  compare: 'tokyo',
  latRef: 0,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* Distance du grand cercle (formule de haversine), en kilomètres. */
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const p1 = a.lat * RAD;
  const p2 = b.lat * RAD;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* Décalage solaire théorique : 15° de longitude ≈ 1 heure (heure légale exclue). */
function solarOffset(lon) {
  return Math.round(lon / 15);
}

function hemisphere(lat, lon) {
  const ns = lat > 0 ? 'Nord' : (lat < 0 ? 'Sud' : 'sur l’équateur');
  const ew = lon > 0 ? 'Est' : (lon < 0 ? 'Ouest' : 'sur Greenwich');
  return `${ns} / ${ew}`;
}

function signedHour(n) {
  if (n > 0) return `+${n} h`;
  if (n < 0) return `−${Math.abs(n)} h`;
  return '±0 h';
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e019-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e019-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e019-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e019-panel p{margin:5px 0;max-width:68ch}
#geography-e019-panel .geography-e019-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e019-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e019-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e019-table th,#geography-e019-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e019-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e019-city{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e019-city legend{padding:0 4px;color:var(--muted)}
#geography-e019-panel .geography-e019-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin:0 8px 2px 0;
  padding:2px 6px;cursor:pointer;
}
#geography-e019-panel .geography-e019-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e019-lat{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e019-lat-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e019-compare{
  width:100%;min-height:44px;margin:4px 0;padding:6px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(8,12,18,.86);color:var(--ink);font:inherit;font-size:11px;
}
#geography-e019-selected{padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
#geography-e019-selected strong{color:var(--gold-bright,#f4d69e)}
#geography-e019-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e019-legend{font-size:10px;color:var(--muted)}
#geography-e019-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e019-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e019-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e019-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e019-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e019-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e019-panel[data-geography-e019-reduced="1"] button,
#geography-e019-panel[data-geography-e019-reduced="1"] .geography-e019-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e019-panel button,.geography-e019-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e019-panel{font-size:10px;padding:9px}
  #geography-e019-canvas{height:200px}
  #geography-e019-panel .geography-e019-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une capitale est la ville où siègent les institutions centrales de l’État : c’est une fonction politique, qui ne coïncide pas toujours avec la ville la plus peuplée.',
    'Une « ville principale » peut désigner la plus grande agglomération d’un pays, son centre économique ou un pôle culturel : le critère change selon la question posée.',
    'Latitude et longitude repèrent une ville sur le globe ; la longitude donne aussi une estimation du décalage solaire (15° ≈ 1 heure), indépendamment des fuseaux légaux.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e019-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e019-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Capitales et villes les plus peuplées : le siège du pouvoir ne coïncide pas toujours avec la plus grande agglomération (repères généraux).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Siège du pouvoir', 'Plus grande ville', 'Repère'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Suisse', 'Berne (siège fédéral)', 'Zurich', 'Berne abrite les autorités fédérales.'],
    ['Australie', 'Canberra', 'Sydney', 'Canberra fondée en 1911 comme capitale fédérale.'],
    ['Canada', 'Ottawa', 'Toronto', 'Ottawa choisie au XIXᵉ siècle pour le Canada-Uni.'],
    ['Brésil', 'Brasília', 'São Paulo', 'Brasília, ville planifiée inaugurée en 1960.'],
    ['Inde', 'New Delhi', 'Mumbai', 'New Delhi : gouvernement ; Mumbai : centre financier.'],
    ['Turquie', 'Ankara', 'Istanbul', 'Ankara est la capitale depuis 1923.'],
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

function buildCityRadios(fieldset) {
  CITIES.forEach((city) => {
    const lab = ctxEl('label', 'geography-e019-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e019-ville';
    radio.id = `geography-e019-ville-${city.id}`;
    radio.value = city.id;
    radio.checked = S.selected === city.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(city.name));
    fieldset.appendChild(lab);
  });
}

/* Petit fabricant local (évite de dépendre de ctx.el pour les nœuds créés à part). */
function ctxEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return { panel: existant, fresh: false, ...collectNodes() };
  }

  const panel = ctx.el('section', 'geography-e019-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Capitales et villes principales');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une capitale est un choix politique, pas forcément la plus grande ville d’un pays. Ce laboratoire permet de repérer quelques villes sur le globe et de comparer leurs distances et leurs décalages solaires.');

  const h3Cities = ctx.el('h3', '', 'Choisir une ville repère');
  const fieldset = document.createElement('fieldset');
  fieldset.id = CITY_GROUP_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Ville sélectionnée (choix unique)';
  fieldset.appendChild(legend);
  buildCityRadios(fieldset);

  const selected = ctx.el('p', 'geography-e019-selected');
  selected.id = SELECTED_ID;

  const h3Obs = ctx.el('h3', '', 'Observer la répartition');
  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude de référence : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '-60';
  lat.max = '70';
  lat.step = '10';
  lat.value = String(S.latRef);
  lat.setAttribute('aria-label', 'Latitude de référence, de moins 60 à plus 70 degrés');

  const cmpRow = ctx.el('p', '');
  const cmpLabel = document.createElement('label');
  cmpLabel.setAttribute('for', COMPARE_ID);
  cmpLabel.appendChild(document.createTextNode('Comparer avec : '));
  cmpRow.appendChild(cmpLabel);
  const compare = document.createElement('select');
  compare.id = COMPARE_ID;
  CITIES.forEach((city) => {
    const opt = document.createElement('option');
    opt.value = city.id;
    opt.textContent = `${city.name} (${city.country})`;
    opt.selected = S.compare === city.id;
    compare.appendChild(opt);
  });

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Repères de villes sur un graticule équirectangulaire. Carré : capitale ; rond : ville principale ; croix : ville sélectionnée ; losange : ville de comparaison. Flèches gauche et droite : changer de ville ; flèches haut et bas : changer la latitude de référence.');

  const legendText = ctx.el('p', 'geography-e019-legend', 'Carré = capitale · rond = ville principale · croix = ville sélectionnée · losange = ville de comparaison · tirets gras = latitude de référence · tirets fins = méridien balayé. Les formes et les libellés distinguent les repères, indépendamment de la couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e019-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, staticFacts(), staticTable(), h3Cities, fieldset, selected,
    h3Obs, latRow, lat, cmpRow, compare, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true, ...collectNodes() };
}

function collectNodes() {
  return {
    radios: Array.prototype.slice.call(document.querySelectorAll('input[name="geography-e019-ville"]')),
    selected: document.getElementById(SELECTED_ID),
    lat: document.getElementById(LAT_ID),
    latOut: document.getElementById(LAT_OUT_ID),
    compare: document.getElementById(COMPARE_ID),
    canvas: document.getElementById(CANVAS_ID),
    readout: document.getElementById(READOUT_ID),
    play: document.getElementById(PLAY_ID),
    legend: document.getElementById(LEGEND_ID),
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, un seul dessin par frame) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (lon) => pad + ((lon + 180) / 360) * iw;
  const py = (lat) => pad + ((90 - lat) / 180) * ih;

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);

  /* Graticule équirectangulaire : u = λ/180, v = φ/90 (linéaire). */
  g.strokeStyle = 'rgba(214,207,193,.42)';
  if (g.setLineDash) g.setLineDash([2, 4]);
  for (let lon = -150; lon <= 150; lon += 30) {
    g.beginPath();
    g.moveTo(px(lon), pad);
    g.lineTo(px(lon), pad + ih);
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(pad, py(lat));
    g.lineTo(pad + iw, py(lat));
    g.stroke();
  }
  if (g.setLineDash) g.setLineDash([]);

  /* Équateur et méridien de Greenwich : repères explicites. */
  g.strokeStyle = 'rgba(214,207,193,.8)';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(pad, py(0)); g.lineTo(pad + iw, py(0)); g.stroke();
  g.beginPath(); g.moveTo(px(0), pad); g.lineTo(px(0), pad + ih); g.stroke();
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.font = '9px sans-serif';
  g.fillText('Équateur 0°', pad + 3, py(0) - 3);
  g.fillText('Greenwich 0°', px(0) + 3, pad + 10);

  /* Latitude de référence : tirets gras, jamais la couleur seule. */
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  if (g.setLineDash) g.setLineDash([7, 4]);
  g.beginPath(); g.moveTo(pad, py(S.latRef)); g.lineTo(pad + iw, py(S.latRef)); g.stroke();
  if (g.setLineDash) g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`Référence ${S.latRef > 0 ? '+' : ''}${S.latRef}°`, pad + 3, py(S.latRef) - 4);

  /* Méridien balayé : seul élément animé, position déterministe = f(S.sweep). */
  const sweepLon = -180 + S.sweep * 360;
  g.strokeStyle = 'rgba(255,255,255,.85)';
  g.lineWidth = 1.2;
  if (g.setLineDash) g.setLineDash([3, 3]);
  g.beginPath(); g.moveTo(px(sweepLon), pad); g.lineTo(px(sweepLon), pad + ih); g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  /* Villes : formes distinctes pour capitale / ville principale. */
  CITIES.forEach((city) => {
    const x = px(city.lon);
    const y = py(city.lat);
    g.strokeStyle = 'rgba(244,214,158,.95)';
    g.fillStyle = 'rgba(244,214,158,.16)';
    g.lineWidth = 1.4;
    g.beginPath();
    if (city.capital) {
      g.rect(x - 4, y - 4, 8, 8);            // carré = capitale
    } else {
      g.arc(x, y, 4, 0, Math.PI * 2);        // rond = ville principale
    }
    g.fill(); g.stroke();

    if (city.id === S.compare && city.id !== S.selected) {
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.beginPath();                          // losange = comparaison
      g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y);
      g.closePath(); g.stroke();
    }
    if (city.id === S.selected) {
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = 2;
      g.beginPath();                          // croix = sélection
      g.moveTo(x - 8, y); g.lineTo(x + 8, y);
      g.moveTo(x, y - 8); g.lineTo(x, y + 8);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.font = 'bold 10px sans-serif';
      g.fillText(city.name, x + 9, y - 6);
    }
  });

  g.fillStyle = 'rgba(244,214,158,.9)';
  g.font = '10px sans-serif';
  g.fillText('Repères de villes — projection équirectangulaire (λ/180, φ/90)', pad + 2, pad - 5);
}

function updateSelectedLine() {
  const city = CITY_BY_ID[S.selected];
  const n = S.nodes.selected;
  if (!n || !city) return;
  const role = city.capital ? 'capitale' : 'ville principale';
  const ns = city.lat >= 0 ? 'Nord' : 'Sud';
  const ew = city.lon >= 0 ? 'Est' : 'Ouest';
  n.textContent = '';
  const strong = document.createElement('strong');
  strong.textContent = city.name;
  n.appendChild(strong);
  n.appendChild(document.createTextNode(` — ${city.country} · ${role} · aire urbaine ≈ ${fmt(city.pop)} M hab. · ${fmt(Math.abs(city.lat))}° ${ns}, ${fmt(Math.abs(city.lon))}° ${ew}.`));
}

function updateReadout() {
  const a = CITY_BY_ID[S.selected];
  const b = CITY_BY_ID[S.compare];
  const n = S.nodes.readout;
  if (!n || !a || !b) return;
  const d = haversine(a, b);
  const part = (d / CIRCUMFERENCE) * 100;
  const nord = CITIES.filter((c) => c.lat > S.latRef).length;
  const sud = CITIES.filter((c) => c.lat < S.latRef).length;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`${a.name} → ${b.name} : distance grand cercle `));
  n.appendChild(fort(`${Math.round(d)} km`));
  n.appendChild(document.createTextNode(`, soit ${fmt(part)} % du tour de Terre (référence ${CIRCUMFERENCE} km) ; décalage solaire théorique `));
  n.appendChild(fort(signedHour(solarOffset(a.lon) - solarOffset(b.lon))));
  n.appendChild(document.createTextNode(` entre les deux villes (heure légale non incluse). ${a.name} est dans l’hémisphère ${hemisphere(a.lat, a.lon)}. Par rapport à la latitude de référence ${S.latRef}°, ${nord} repère(s) au nord et ${sud} au sud.`));
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio) => { radio.checked = radio.value === S.selected; });
  if (n.lat) n.lat.value = String(S.latRef);
  if (n.latOut) n.latOut.textContent = `${S.latRef > 0 ? '+' : ''}${S.latRef}°`;
  if (n.compare) n.compare.value = S.compare;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateSelectedLine();
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
  const reduced = typeof ctxReduced() === 'boolean' ? ctxReduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

let cachedReduced = null;
function ctxReduced() {
  if (cachedReduced !== null) return cachedReduced;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
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
        cachedReduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE019Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.playing = false;
          stopLoop();
          syncControls();
        }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge textuel de portée sur la carte locale existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e019-badge', 'Carte locale : lieux vérifiés du jeu de données, pas une carte mondiale des capitales.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E019', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css('geography-e019', CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  cachedReduced = reduced;
  S.nodes.panel.dataset.geographyE019Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.selected = radio.value;
        syncControls();
      });
    });
    n.compare.addEventListener('change', () => {
      if (CITY_BY_ID[n.compare.value]) S.compare = n.compare.value;
      syncControls();
    });
    n.lat.addEventListener('input', () => {
      S.latRef = Math.max(-60, Math.min(70, Math.round(Number(n.lat.value) / 10) * 10));
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
        const i = CITIES.findIndex((c) => c.id === S.selected);
        S.selected = CITIES[(i + step + CITIES.length) % CITIES.length].id;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 10 : -10;
        S.latRef = Math.max(-60, Math.min(70, S.latRef + step));
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
