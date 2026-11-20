import { register } from './registry.js';

/* Lentille E017 — vue GEOGRAPHIE.
 * Thème : zones climatiques et températures, isothermes.
 *
 * Les dix chantiers E017-01 … E017-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E017.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui trace des isothermes à partir d'un modèle
 * schématique déterministe, jamais des relevés climatiques.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e017';
const PANEL_ID = 'geography-e017-panel';
const TITLE_ID = 'geography-e017-title';
const SAISON_ID = 'geography-e017-saison';
const RADIO_JANVIER_ID = 'geography-e017-saison-janvier';
const RADIO_JUILLET_ID = 'geography-e017-saison-juillet';
const LAT_ID = 'geography-e017-lat';
const LAT_OUT_ID = 'geography-e017-lat-value';
const ALT_ID = 'geography-e017-alt';
const ALT_OUT_ID = 'geography-e017-alt-value';
const CANVAS_ID = 'geography-e017-canvas';
const READOUT_ID = 'geography-e017-readout';
const PLAY_ID = 'geography-e017-play';
const LEGEND_ID = 'geography-e017-legend';
const BADGE_ID = 'geography-e017-badge';
const TABLE_ID = 'geography-e017-table';

/* Un seul point de scheduling : une seule boucle rAF, jamais deux. */
const RAF = typeof requestAnimationFrame === 'function'
  ? (callback) => requestAnimationFrame(callback)
  : null;

const RAD = Math.PI / 180;
const OBLIQUITE = 23.44;   // Obliquité de l'axe terrestre, en degrés.
const GRADIENT = 6.5;      // Gradient thermique normal de la troposphère, °C/km (ISA/OMM).
const TROPOPAUSE_KM = 11;  // Hauteur de la tropopause de l'atmosphère standard, km.
const JOUR_JANVIER = 15;   // Mi-janvier, jour 15 de l'année civile.
const JOUR_JUILLET = 196;  // Mi-juillet, jour 196 de l'année civile.
const SEUILS = [30, 20, 10, 0, -10];
const LONS = [];
const LATS = [];

for (let lon = -180; lon <= 180; lon += 10) {
  LONS.push({ deg: lon, cos: Math.cos(lon * RAD) });
}
for (let lat = -89; lat <= 89; lat += 2) {
  LATS.push({ deg: lat, sin: Math.sin(lat * RAD), cos: Math.cos(lat * RAD) });
}

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  saison: 'janvier',
  lat: 45,
  alt: 0,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  lastAnnouncedDay: -999,
  reduced: false,
  nodes: {},
};

/* ---------- E017-05 : modèle déterministe, aucune donnée fabriquée ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* Déclinaison solaire : approximation de Cooper, référence classique. */
function declinaison(jour) {
  return OBLIQUITE * Math.sin((2 * Math.PI * (jour - 81)) / 365);
}

function jourActif() {
  if (S.playing) return 1 + Math.floor(S.sweep * 364);
  return S.saison === 'janvier' ? JOUR_JANVIER : JOUR_JUILLET;
}

/* Température schématique d'enseignement :
 *   T = -8 + 35 cos Z + 5 (delta / 23,44) cos lambda - 6,5 h
 * avec Z l'angle zénithal solaire à midi, delta la déclinaison, lambda la
 * longitude (modulation continent/océan schématique) et h l'altitude en km.
 * Les constantes -8 et 35 calent l'échelle du modèle ; le gradient 6,5 °C/km
 * est, lui, une grandeur de référence de l'atmosphère standard. */
function temperatureGrille(point, decSin, decCos, facteurSaison, altKm) {
  const cosZ = Math.max(0, point.sin * decSin + point.cos * decCos);
  return -8 + 35 * cosZ + 5 * facteurSaison * point.cosLon - GRADIENT * altKm;
}

function temperature(lat, lon, jour, alt) {
  const delta = declinaison(jour);
  const dec = delta * RAD;
  const phi = lat * RAD;
  const cosZ = Math.max(0, Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec));
  return -8 + 35 * cosZ + 5 * (delta / OBLIQUITE) * Math.cos(lon * RAD) - GRADIENT * (alt / 1000);
}

/* Classement thermique d'après les seuls températures mensuelles ; la classe
 * B (aride) exige des précipitations et ne peut pas être déduite ici. */
function classeThermique() {
  const tJanvier = temperature(S.lat, 0, JOUR_JANVIER, S.alt);
  const tJuillet = temperature(S.lat, 0, JOUR_JUILLET, S.alt);
  const froid = Math.min(tJanvier, tJuillet);
  const chaud = Math.max(tJanvier, tJuillet);
  if (chaud < 10) return 'E — polaire';
  if (froid >= 18) return 'A — tropical';
  if (froid <= -3) return 'D — boréal';
  return 'C — tempéré';
}

/* ---------- E017-06 : contours d'isothermes par interpolation linéaire ---------- */

function lignesIsothermes(jour, alt) {
  const delta = declinaison(jour);
  const decSin = Math.sin(delta * RAD);
  const decCos = Math.cos(delta * RAD);
  const facteurSaison = delta / OBLIQUITE;
  const altKm = alt / 1000;
  const grille = LATS.map((p) => ({ sin: p.sin, cos: p.cos, cosLon: 0 }));
  const resultats = [];

  LONS.forEach((lon) => {
    grille.forEach((p) => { p.cosLon = lon.cos; });
    SEUILS.forEach((seuil) => {
      if (!resultats[seuil]) resultats[seuil] = [];
      const crossings = [];
      let precedent = temperatureGrille(grille[0], decSin, decCos, facteurSaison, altKm) - seuil;
      for (let i = 1; i < grille.length; i += 1) {
        const courant = temperatureGrille(grille[i], decSin, decCos, facteurSaison, altKm) - seuil;
        if ((precedent <= 0 && courant > 0) || (precedent > 0 && courant <= 0)) {
          const fraction = precedent === courant ? 0.5 : precedent / (precedent - courant);
          crossings.push(LATS[i - 1].deg + (LATS[i].deg - LATS[i - 1].deg) * fraction);
        }
        precedent = courant;
      }
      crossings.forEach((lat, index) => {
        if (!resultats[seuil][index]) resultats[seuil][index] = [];
        resultats[seuil][index].push([lon.deg, lat]);
      });
    });
  });

  const lignes = [];
  SEUILS.forEach((seuil) => {
    (resultats[seuil] || []).forEach((points) => {
      if (points.length > 1) lignes.push({ seuil, points });
    });
  });
  return lignes;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e017-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e017-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e017-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e017-panel p{margin:5px 0;max-width:68ch}
#geography-e017-panel .geography-e017-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e017-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e017-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e017-table th,#geography-e017-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e017-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e017-saison{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e017-saison legend{padding:0 4px;color:var(--muted)}
#geography-e017-panel .geography-e017-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e017-panel .geography-e017-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e017-lat,#geography-e017-alt{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.geography-e017-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e017-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e017-legend{font-size:10px;color:var(--muted)}
#geography-e017-readout{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e017-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e017-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e017-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e017-panel button:disabled{opacity:.6;cursor:not-allowed}
#geography-e017-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e017-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e017-panel[data-geography-e017-reduced="1"] button,
#geography-e017-panel[data-geography-e017-reduced="1"] .geography-e017-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e017-panel button,.geography-e017-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e017-panel{font-size:10px;padding:9px}
  #geography-e017-canvas{height:190px}
  #geography-e017-panel .geography-e017-choix{margin-right:4px}
}
`;

/* ---------- E017-01 / E017-02 : texte sémantique et tableau statique ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une zone climatique regroupe des régions dont le régime de température et d’humidité se ressemble : la classification Köppen-Geiger définit ses groupes par des seuils mensuels chiffrés.',
    'Une isotherme relie les points d’une carte qui ont la même température à un instant donné ; son tracé quitte les parallèles sous l’effet des continents, des courants marins et de l’altitude.',
    'Le laboratoire utilise un modèle schématique et transparent : T = −8 + 35 cos Z + 5 (δ / 23,44) cos λ − 6,5 h, avec δ la déclinaison solaire, Z l’angle zénithal solaire à midi, λ la longitude et h l’altitude en kilomètres. Il illustre les mécanismes, il ne remplace pas des relevés.',
    'Le gradient de 6,5 °C/km est la valeur de l’atmosphère standard (ISA/OMM), valable jusqu’à la tropopause vers 11 km : c’est une grandeur de référence, distincte des constantes de calage du modèle.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e017-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Seuils Köppen-Geiger et constantes de référence, indépendants du modèle schématique.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Grandeur', 'Valeur', 'Définition ou référence'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Obliquité de l’axe terrestre', '23,44°', 'Amplitude maximale de la déclinaison solaire'],
    ['Déclinaison (approx. de Cooper)', '±23,44°', 'δ = 23,44 sin[2π(jour − 81)/365]'],
    ['Gradient thermique normal (ISA/OMM)', '6,5 °C/km', `Jusqu’à la tropopause, vers ${TROPOPAUSE_KM} km`],
    ['Température ISA au niveau de la mer', '15 °C', 'Référence de l’atmosphère standard'],
    ['Climat tropical (A)', '≥ 18 °C', 'Température du mois le plus froid'],
    ['Climat tempéré (C)', '−3 °C à 18 °C', 'Mois le plus froid (variante : 0 °C)'],
    ['Climat boréal (D)', '≤ −3 °C', 'Mois le plus froid ; mois le plus chaud > 10 °C'],
    ['Climat polaire (E)', '< 10 °C', 'Température du mois le plus chaud'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((contenu, index) => {
      const cellule = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cellule.scope = 'row';
      cellule.textContent = contenu;
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans animation) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      janvier: document.getElementById(RADIO_JANVIER_ID),
      juillet: document.getElementById(RADIO_JUILLET_ID),
      lat: document.getElementById(LAT_ID),
      latOut: document.getElementById(LAT_OUT_ID),
      alt: document.getElementById(ALT_ID),
      altOut: document.getElementById(ALT_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e017-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Zones climatiques et températures, isothermes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Comparer les isothermes de janvier et de juillet montre que la température dépend de la latitude, de l’altitude et de la position des continents : aucune carte climatique n’est un simple décalque des parallèles.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = SAISON_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Saison de référence (choix unique)';
  fieldset.appendChild(legend);
  [
    [RADIO_JANVIER_ID, 'janvier', 'Janvier (jour 15)'],
    [RADIO_JUILLET_ID, 'juillet', 'Juillet (jour 196)'],
  ].forEach(([id, valeur, libelle]) => {
    const lab = ctx.el('label', 'geography-e017-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e017-saison';
    radio.id = id;
    radio.value = valeur;
    radio.checked = S.saison === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  const sousTitre = ctx.el('h3', '', 'Observer la température');

  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', LAT_ID);
  latLabel.appendChild(document.createTextNode('Latitude : '));
  const latOut = document.createElement('span');
  latOut.id = LAT_OUT_ID;
  latOut.className = 'geography-e017-valeur';
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = LAT_ID;
  lat.min = '0';
  lat.max = '80';
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude, de 0 à 80 degrés');

  const altRow = ctx.el('p', '');
  const altLabel = document.createElement('label');
  altLabel.setAttribute('for', ALT_ID);
  altLabel.appendChild(document.createTextNode('Altitude : '));
  const altOut = document.createElement('span');
  altOut.id = ALT_OUT_ID;
  altOut.className = 'geography-e017-valeur';
  altLabel.appendChild(altOut);
  altRow.appendChild(altLabel);

  const alt = document.createElement('input');
  alt.type = 'range';
  alt.id = ALT_ID;
  alt.min = '0';
  alt.max = '4000';
  alt.step = '250';
  alt.value = String(S.alt);
  alt.setAttribute('aria-label', 'Altitude, de 0 à 4000 mètres');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte schématique des isothermes de −10 à 30 degrés Celsius. Flèches gauche et droite : changer de saison ; flèches haut et bas : changer la latitude ; Page précédente et Page suivante : changer l’altitude.');

  const legendText = ctx.el('p', 'geography-e017-legend', 'Traits pleins : isothermes positives ; tirets : isothermes négatives ; pointillés : isotherme 0 °C. Les valeurs sont écrites sur le tracé et reprises dans le statut, jamais portées par la seule couleur.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e017-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', '▶ Animer l’année');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, sousTitre,
    latRow, lat, altRow, alt, canvas, legendText, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    janvier: document.getElementById(RADIO_JANVIER_ID),
    juillet: document.getElementById(RADIO_JUILLET_ID),
    lat, latOut, alt, altOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- E017-06 / E017-09 : laboratoire canvas ---------- */

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

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (lon) => pad + ((lon + 180) / 360) * iw;
  const py = (lat) => pad + ((90 - lat) / 180) * ih;

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  for (let lon = -120; lon <= 120; lon += 60) {
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

  lignesIsothermes(jourActif(), S.alt).forEach(({ seuil, points }) => {
    const dash = seuil < 0 ? [5, 4] : (seuil === 0 ? [2, 3] : []);
    if (g.setLineDash) g.setLineDash(dash);
    g.strokeStyle = seuil === 0 ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.65)';
    g.lineWidth = seuil === 0 ? 2 : 1.2;
    g.beginPath();
    points.forEach(([lon, lat], index) => {
      const x = px(lon);
      const y = py(lat);
      if (index === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
    const dernier = points[points.length - 1];
    if (g.setLineDash) g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '10px sans-serif';
    g.fillText(`${seuil} °C`, px(dernier[0]) - 34, py(dernier[1]) - 4);
  });

  /* Repère non chromatique du lieu observé : croix cerclée à longitude 0. */
  const x = px(0);
  const y = py(S.lat);
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, 5, 0, 2 * Math.PI);
  g.moveTo(x - 9, y); g.lineTo(x + 9, y);
  g.moveTo(x, y - 9); g.lineTo(x, y + 9);
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  const nomSaison = S.playing ? `jour ${jourActif()}/365` : (S.saison === 'janvier' ? 'janvier' : 'juillet');
  g.fillText(`Isothermes schématiques — ${nomSaison}`, pad + 2, pad + 13);
  g.fillText(`${S.lat}° de latitude · ${S.alt} m`, pad + 2, cssH - pad - 4);
}

/* ---------- E017-07 : grandeurs chiffrées et comparaison à une référence ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const jour = jourActif();
  const t = temperature(S.lat, 0, jour, S.alt);
  const delta = declinaison(jour);
  const correction = GRADIENT * (S.alt / 1000);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${S.lat}° de latitude et ${S.alt} m d’altitude (jour ${jour}) : température schématique `));
  n.appendChild(fort(`${fmt(t)} °C`));
  n.appendChild(document.createTextNode(' ; déclinaison solaire '));
  n.appendChild(fort(`${fmt(delta)}°`));
  n.appendChild(document.createTextNode(' ; correction d’altitude '));
  n.appendChild(fort(`−${fmt(correction)} °C`));
  n.appendChild(document.createTextNode(` (référence ISA/OMM : ${fmt(GRADIENT)} °C/km, tropopause vers ${TROPOPAUSE_KM} km) ; classe d’après le seul régime thermique : `));
  n.appendChild(fort(classeThermique()));
  n.appendChild(document.createTextNode(' (seuil Köppen 18 °C pour le climat tropical ; le climat aride B dépend des précipitations, absentes du modèle).'));
}

function syncControls() {
  const n = S.nodes;
  if (n.janvier) n.janvier.checked = S.saison === 'janvier';
  if (n.juillet) n.juillet.checked = S.saison === 'juillet';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.alt) n.alt.value = String(S.alt);
  if (n.altOut) n.altOut.textContent = `${S.alt} m`;
  if (n.play) {
    n.play.textContent = S.reduced
      ? '▶ Animation désactivée (mouvement réduit)'
      : (S.playing ? '■ Arrêter l’animation' : '▶ Animer l’année');
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.disabled = S.reduced;
  }
  if (n.panel) n.panel.dataset.geographyE017Reduced = S.reduced ? '1' : '0';
  S.lastAnnouncedDay = jourActif();
  updateReadout();
  drawLab();
}

/* ---------- E017-08 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function scheduleFrame() {
  if (RAF) S.rafId = RAF(tick);
}

function startLoop() {
  if (S.rafId || !RAF) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  S.lastTs = 0;
  scheduleFrame();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (Math.abs(jourActif() - S.lastAnnouncedDay) >= 20) {
    S.lastAnnouncedDay = jourActif();
    updateReadout();
  }
  if (S.playing && !S.reduced) scheduleFrame();
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        if (S.reduced) {
          S.playing = false;
          stopLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E017-10 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e017-badge', 'Carte schématique : aucun relevé climatique n’est projeté ici. Les isothermes du laboratoire sont un modèle d’enseignement.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée : les dix chantiers sont branchés ici ---------- */

register('E017', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'geography') return;

  /* E017-01 (texte sémantique), E017-02 (tableau), E017-09 et E017-10 :
     feuille de style unique, puis panneau et badge insérés une seule fois. */
  ctx.css(CSS_ID, CSS);
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) S.playing = false;

  /* E017-03 (choix de saison), E017-04 (curseurs), E017-05 (modèle),
     E017-06 (isothermes), E017-07 (statut) : première synchronisation. */
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.janvier, n.juillet].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.saison = radio.value;
        S.playing = false;
        stopLoop();
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(0, Math.min(80, Math.round(Number(n.lat.value) / 5) * 5));
      syncControls();
    });
    n.alt.addEventListener('input', () => {
      S.alt = Math.max(0, Math.min(4000, Math.round(Number(n.alt.value) / 250) * 250));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (S.reduced) return;
      S.playing = !S.playing;
      if (S.playing) startLoop(); else stopLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.saison = S.saison === 'janvier' ? 'juillet' : 'janvier';
        S.playing = false;
        stopLoop();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = Math.max(0, Math.min(80, S.lat + pas));
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const pas = event.key === 'PageUp' ? 250 : -250;
        S.alt = Math.max(0, Math.min(4000, S.alt + pas));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  /* E017-08 (boucle rAF unique) et E017-10 (mouvement réduit, robustesse). */
  installGlobalListeners(ctx);
  if (S.playing && !S.reduced) startLoop();
});
