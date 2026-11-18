import { register } from './registry.js';

/*
 * Lentille E063 — repères visuels et grille de lecture (vue GEOGRAPHIE).
 *
 * Dix chantiers, tous réellement implémentés dans CE seul module :
 * E063-01 … E063-10. Aucun stub, aucun fichier partagé modifié.
 *
 * Contrat : register('E063', (ctx) => { … }) avec
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Feuille de styles unique, injectée sous l'identifiant `geography-e063`.
 * Tous les identifiants DOM sont préfixés `geography-e063-*`.
 * Zéro console, zéro réseau, zéro aléa, au plus une requête d'animation en vol
 * (suspendue quand le document est masqué). Tout le contenu est du texte DOM
 * lisible sans script ; le canvas ne détient aucune information exclusive.
 *
 * Thème : comment lit-on une carte ? La « grille de lecture » est le quadrillage
 * des méridiens et parallèles (le canevas schématique en plate carrée) ; les
 * « repères visuels » sont les symboles de lieu qui arriment la lecture. La
 * lentille enseigne la lecture des coordonnées, le pas de grille et la précision,
 * l'orientation par flèche du nord, l'échelle et sa barre, le décodage des
 * symboles par la forme (jamais la couleur seule), et les limites d'une grille
 * schématique. Toutes les grandeurs sont recalculées depuis leur formule et
 * depuis des constantes choisies — aucune mesure de terrain n'est inventée.
 */

const CSS_ID = 'geography-e063';
const SECTION_ID = 'geography-e063-section';
const MAP_W = 900;                 // largeur du cadre schématique, unités
const MAP_H = 620;                 // hauteur du cadre schématique, unités
const WORLD_KM = 40000;            // largeur du monde représentée (~ tour de la Terre)
const HALF_WORLD_KM = 20000;       // distance pôle à pôle représentée
const EARTH_EQUATOR_KM = 40075;    // référence : circonférence équatoriale réelle
const BAR_KM = 2000;               // distance de la barre d'échelle de référence
const SWEEP_MS = 9000;             // période du balayage continu
const NARROW = '\u202f';           // espace insécable fine (typographie française)
const MINUS = '\u2212';            // signe moins typographique
const RAD = Math.PI / 180;

/* Pas de grille disponibles (degrés). Le pas fin divise la précision de lecture
   par trois par rapport au pas grossier : 30 / 10 = 3. */
const PASSES = [
  { key: 'grossier', nom: 'Grossier', pas: 30 },
  { key: 'moyen', nom: 'Moyen', pas: 20 },
  { key: 'fin', nom: 'Fin', pas: 10 },
];

/* Azimut du « haut de la carte » : la direction cardinale qui pointe vers le
   haut. La flèche du nord indique alors la direction opposée sur l'écran. */
const AZIMUTS = [
  { cap: 0, nom: 'Nord' },
  { cap: 45, nom: 'Nord-est' },
  { cap: 90, nom: 'Est' },
  { cap: 135, nom: 'Sud-est' },
  { cap: 180, nom: 'Sud' },
];

/* Repères visuels schématiques : coordonnées choisies, jamais tirées au hasard.
   La forme du glyphe distingue le repère, nunca la seule couleur. */
const LANDMARKS = [
  { id: 'cap-nord', nom: 'Cap Nord', genre: 'Phare', forme: 'etoile', lon: 25, lat: 71 },
  { id: 'pic-central', nom: 'Pic Central', genre: 'Montagne', forme: 'triangle', lon: -10, lat: 35 },
  { id: 'ville-aurore', nom: 'Ville Aurore', genre: 'Ville', forme: 'carre', lon: 15, lat: 48 },
  { id: 'base-boreale', nom: 'Base Boréale', genre: 'Station', forme: 'croix', lon: -45, lat: 65 },
  { id: 'sommet-est', nom: 'Sommet Est', genre: 'Sommet', forme: 'losange', lon: 100, lat: 30 },
  { id: 'port-sud', nom: 'Port Sud', genre: 'Capitale', forme: 'cercle', lon: -60, lat: -35 },
];

/* État module : la vue reconstruit son DOM à chaque rendu, donc on relit
   toujours le dernier contexte. Les écouteurs globaux sont posés une seule fois. */
let latest = null;
let installed = false;
let frame = 0;
let selectedPas = 1;   // PASSES[1] : pas moyen 20°, par défaut
let azimut = 0;        // degrés, azimut du haut de la carte
let showGrid = true;   // bascule indépendante (aria-pressed)
let showNorth = true;  // bascule indépendante (aria-pressed)
let playing = false;
let renders = 0;

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/* Formatage décimal déterministe, sans Intl ni aléa. */
function num(value, digits) {
  if (!finite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${value < 0 ? MINUS : ''}${grouped}${parts[1] ? `,${parts[1]}` : ''}`;
}

/* E063-03 — transformation équirectangulaire schématique (plate carrée) entre
   les unités du cadre et les degrés. Toutes les lectures de coordonnées passent
   par ces formules ; rien n'est saisi à la main. */
function lonAt(x) { return -180 + (x / MAP_W) * 360; }
function latAt(y) { return 90 - (y / MAP_H) * 180; }
function xFromLon(lon) { return ((lon + 180) / 360) * MAP_W; }
function yFromLat(lat) { return ((90 - lat) / 180) * MAP_H; }
function clampCoord(x, y) {
  return {
    x: Math.max(0, Math.min(MAP_W, finite(x) ? x : MAP_W / 2)),
    y: Math.max(0, Math.min(MAP_H, finite(y) ? y : MAP_H / 2)),
  };
}

/* E063-03 — incertitude de lecture : la moitié du pas, car on lit au plus près
   de la ligne de grille la plus proche. */
function precisionOf(pas) { return pas / 2; }

/* E063-04 — nombre de cases du canevas pour un pas donné. */
function cellsOf(pas) {
  return { lon: Math.round(360 / pas), lat: Math.round(180 / pas) };
}

/* E063-06 — échelles recalculées : la largeur du cadre vaut WORLD_KM, la
   hauteur HALF_WORLD_KM. En plate carrée, les deux échelles different : c'est
   l'angle mort de la lentille (une seule barre ne peut pas être juste partout). */
const KM_PAR_UNITE_LON = WORLD_KM / MAP_W;
const KM_PAR_UNITE_LAT = HALF_WORLD_KM / MAP_H;
const DISTORSION = KM_PAR_UNITE_LON / KM_PAR_UNITE_LAT;
function barUnits(km) { return km / KM_PAR_UNITE_LON; }

/* E063-05 — nom cardinal de l'azimut du haut (0 = Nord, 180 = Sud). */
function compassOf(cap) {
  let best = AZIMUTS[0];
  let dist = Infinity;
  AZIMUTS.forEach((a) => {
    const d = Math.abs(a.cap - cap);
    if (d < dist) { dist = d; best = a; }
  });
  return best.nom;
}

/* E063-07 — repère le plus proche du curseur, en distance euclidienne dans le
   cadre. Déterministe : même curseur → même repère, sans graine aléatoire. */
function nearestLandmark(x, y) {
  let best = LANDMARKS[0];
  let bestD = Infinity;
  LANDMARKS.forEach((landmark) => {
    const lx = xFromLon(landmark.lon);
    const ly = yFromLat(landmark.lat);
    const d = Math.sqrt((lx - x) ** 2 + (ly - y) ** 2);
    if (d < bestD) { bestD = d; best = landmark; }
  });
  return { landmark: best, distanceUnites: bestD };
}

/* E063-02 — feuille de styles unique et identifiants préfixés. Cadrée par
   [data-geography-e063="on"] posé sur .geo-layout. Aucune règle ne déborde,
   aucune information n'est portée par la seule couleur, cibles tactiles ≥ 44 px,
   focus visible. Injectée une seule fois via ctx.css(CSS_ID, RULES). */
const RULES = `
.geo-layout[data-geography-e063="on"] .geography-e063-section {
  margin: 12px 0 6px; padding: 10px 12px;
  border: 1px solid var(--line); border-left: 3px solid var(--gold);
  border-radius: 8px; background: rgba(255,255,255,.02);
  color: var(--muted); font-size: 11px; line-height: 1.6;
}
.geo-layout[data-geography-e063="on"] .geography-e063-section h2 {
  margin: 0 0 8px; color: var(--gold-bright); font-size: 12px; font-weight: 600;
}
.geo-layout[data-geography-e063="on"] .geography-e063-line {
  margin: 0 0 7px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.geo-layout[data-geography-e063="on"] .geography-e063-line:last-child { margin-bottom: 0; }
.geo-layout[data-geography-e063="on"] .geography-e063-line strong { color: var(--gold-bright); font-weight: 600; }
.geo-layout[data-geography-e063="on"] .geography-e063-value { color: var(--ink); }
.geo-layout[data-geography-e063="on"] .geography-e063-list { margin: 4px 0 8px; padding-left: 18px; }
.geo-layout[data-geography-e063="on"] .geography-e063-list li { margin: 0 0 4px; }
.geo-layout[data-geography-e063="on"] .geography-e063-group {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0;
}
.geo-layout[data-geography-e063="on"] .geography-e063-pas {
  min-height: 44px; min-width: 44px; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--muted); font: inherit; font-size: 10px;
  line-height: 1.35; text-align: left; cursor: pointer;
}
.geo-layout[data-geography-e063="on"] .geography-e063-pas:hover { border-color: var(--gold); color: var(--gold-bright); }
.geo-layout[data-geography-e063="on"] .geography-e063-pas[aria-checked="true"] {
  border-color: var(--gold-bright); color: var(--gold-bright);
  background: rgba(230,185,111,.10); box-shadow: 0 0 0 1px var(--gold-bright) inset;
}
.geo-layout[data-geography-e063="on"] .geography-e063-azimut {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0;
}
.geo-layout[data-geography-e063="on"] .geography-e063-azimut input[type="range"] {
  flex: 1 1 160px; min-height: 24px; accent-color: var(--gold); cursor: pointer;
}
.geo-layout[data-geography-e063="on"] .geography-e063-azimut-output { color: var(--gold-bright); font-variant-numeric: tabular-nums; }
.geo-layout[data-geography-e063="on"] .geography-e063-readout {
  margin: 8px 0; padding: 7px 9px; min-height: 34px;
  border: 1px dashed var(--line); border-radius: 7px;
  color: var(--gold-bright); font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e063="on"] .geography-e063-figure { margin: 8px 0; text-align: center; }
.geo-layout[data-geography-e063="on"] .geography-e063-canvas {
  display: block; width: 100%; max-width: 320px; height: auto; aspect-ratio: 900 / 620;
  margin: 0 auto; touch-action: none; cursor: crosshair;
}
.geo-layout[data-geography-e063="on"] .geography-e063-caption { margin-top: 5px; font-size: 10px; color: var(--muted); }
.geo-layout[data-geography-e063="on"] .geography-e063-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.geo-layout[data-geography-e063="on"] .geography-e063-toggle,
.geo-layout[data-geography-e063="on"] .geography-e063-play {
  min-height: 44px; min-width: 44px; padding: 6px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: transparent; color: var(--gold-bright); font: inherit; font-size: 10px; cursor: pointer;
}
.geo-layout[data-geography-e063="on"] .geography-e063-toggle:hover,
.geo-layout[data-geography-e063="on"] .geography-e063-play:hover { border-color: var(--gold); }
.geo-layout[data-geography-e063="on"] .geography-e063-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright); background: rgba(230,185,111,.10);
}
.geo-layout[data-geography-e063="on"] .geography-e063-pas:focus-visible,
.geo-layout[data-geography-e063="on"] .geography-e063-canvas:focus-visible,
.geo-layout[data-geography-e063="on"] .geography-e063-toggle:focus-visible,
.geo-layout[data-geography-e063="on"] .geography-e063-play:focus-visible,
.geo-layout[data-geography-e063="on"] .geography-e063-azimut input:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(230,185,111,.14);
}
.geo-layout[data-geography-e063="on"] .geography-e063-table {
  width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px;
}
.geo-layout[data-geography-e063="on"] .geography-e063-table caption {
  caption-side: top; text-align: left; color: var(--gold-bright); font-size: 11px; margin-bottom: 4px;
}
.geo-layout[data-geography-e063="on"] .geography-e063-table th,
.geo-layout[data-geography-e063="on"] .geography-e063-table td {
  border: 1px solid var(--line); padding: 4px 6px; text-align: left; font-variant-numeric: tabular-nums;
}
.geo-layout[data-geography-e063="on"] .geography-e063-table thead th { color: var(--gold-bright); }
@media (max-width: 620px) {
  .geo-layout[data-geography-e063="on"] .geography-e063-section { padding: 9px 10px; font-size: 10px; }
  .geo-layout[data-geography-e063="on"] .geography-e063-group { grid-template-columns: 1fr; }
  .geo-layout[data-geography-e063="on"] .geography-e063-canvas { max-width: 280px; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-layout[data-geography-e063="on"] .geography-e063-section * {
    transition: none !important; animation: none !important; scroll-behavior: auto !important;
  }
}
`;

/* E063-07 — tracé d'un symbole par sa FORME (jamais la seule couleur).
   Chaque genre a une silhouette distincte, y compris en niveaux de gris. */
function drawSymbol(painter, forme, x, y, size) {
  painter.beginPath();
  if (forme === 'cercle') {
    painter.arc(x, y, size, 0, Math.PI * 2);
  } else if (forme === 'carre') {
    painter.rect(x - size, y - size, size * 2, size * 2);
  } else if (forme === 'triangle') {
    painter.moveTo(x, y - size * 1.2);
    painter.lineTo(x + size, y + size);
    painter.lineTo(x - size, y + size);
    painter.closePath();
  } else if (forme === 'losange') {
    painter.moveTo(x, y - size * 1.2);
    painter.lineTo(x + size, y);
    painter.lineTo(x, y + size * 1.2);
    painter.lineTo(x - size, y);
    painter.closePath();
  } else if (forme === 'croix') {
    painter.moveTo(x - size, y); painter.lineTo(x + size, y);
    painter.moveTo(x, y - size); painter.lineTo(x, y + size);
  } else { /* etoile : huit rayons */
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? size * 1.2 : size * 0.5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) painter.moveTo(px, py); else painter.lineTo(px, py);
    }
    painter.closePath();
  }
  painter.stroke();
}

/* E063-03 / E063-04 / E063-05 / E063-06 / E063-07 — dessin déterministe du
   laboratoire. Un seul canvas, DPR plafonné à 2, couleurs lues dans les variables
   de thème avec repli. Le canevas, la flèche du nord, la barre d'échelle, les
   repères et le curseur ne détiennent aucune information exclusive : tout est
   aussi écrit en texte dans le panneau. */
function drawScene(canvas, scene) {
  if (!canvas || typeof canvas.getContext !== 'function' || !scene) return;
  const painter = canvas.getContext('2d');
  if (!painter) return;
  const cssW = Math.max(160, Math.min(320, canvas.clientWidth || 320));
  const cssH = cssW * (MAP_H / MAP_W);
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  let theme = null;
  try { theme = typeof getComputedStyle === 'function' ? getComputedStyle(canvas) : null; } catch { /* repli */ }
  const color = (name, fallback) => {
    const value = theme ? theme.getPropertyValue(name).trim() : '';
    return value || fallback;
  };
  const ink = color('--ink', '#e8e6e0');
  const gold = color('--gold', '#d9b166');
  const bright = color('--gold-bright', '#f0d18c');
  const muted = color('--muted', '#9aa0a8');
  const sx = cssW / MAP_W;
  const sy = cssH / MAP_H;

  /* Cadre. */
  painter.lineWidth = 1;
  painter.strokeStyle = muted;
  painter.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  /* E063-04 — grille de lecture : méridiens et parallèles au pas choisi. */
  const pas = PASSES[scene.pasIndex].pas;
  if (scene.showGrid) {
    painter.strokeStyle = muted;
    painter.globalAlpha = 0.35;
    painter.lineWidth = 1;
    painter.setLineDash([2, 4]);
    for (let lon = -180; lon <= 180; lon += pas) {
      const gx = xFromLon(lon) * sx;
      painter.beginPath(); painter.moveTo(gx, 0); painter.lineTo(gx, cssH); painter.stroke();
    }
    for (let lat = -90; lat <= 90; lat += pas) {
      const gy = yFromLat(lat) * sy;
      painter.beginPath(); painter.moveTo(0, gy); painter.lineTo(cssW, gy); painter.stroke();
    }
    painter.setLineDash([]);
    painter.globalAlpha = 1;
  }

  /* Repères de lecture : méridien de Greenwich (0°) et équateur (0°), tracés
     avec un tiret plus long — distincts par la forme du trait, pas la couleur. */
  painter.strokeStyle = gold;
  painter.globalAlpha = 0.7;
  painter.setLineDash([6, 3]);
  painter.beginPath();
  const gx0 = xFromLon(0) * sx;
  painter.moveTo(gx0, 0); painter.lineTo(gx0, cssH);
  const gy0 = yFromLat(0) * sy;
  painter.moveTo(0, gy0); painter.lineTo(cssW, gy0);
  painter.stroke();
  painter.setLineDash([]);
  painter.globalAlpha = 1;

  /* E063-07 — repères visuels schématiques, dispersés sur le canevas. */
  painter.strokeStyle = ink;
  painter.lineWidth = 1.6;
  const markSize = Math.max(3, Math.round(cssW * 0.014));
  LANDMARKS.forEach((landmark) => {
    drawSymbol(painter, landmark.forme, xFromLon(landmark.lon) * sx, yFromLat(landmark.lat) * sy, markSize);
  });

  /* E063-06 — barre d'échelle de BAR_KM, longueur recalculée depuis l'échelle
     en longitude. Un Trait final marque la borne : la grandeur est lisible même
     sans distinguer la couleur. */
  const barPx = barUnits(BAR_KM) * sx;
  const barX = cssW - barPx - 8;
  const barY = cssH - 10;
  painter.strokeStyle = bright;
  painter.lineWidth = 2;
  painter.beginPath();
  painter.moveTo(barX, barY); painter.lineTo(barX + barPx, barY);
  painter.moveTo(barX, barY - 3); painter.lineTo(barX, barY + 3);
  painter.moveTo(barX + barPx, barY - 3); painter.lineTo(barX + barPx, barY + 3);
  painter.stroke();
  painter.fillStyle = bright;
  painter.font = `${Math.max(8, Math.round(cssW * 0.032))}px sans-serif`;
  painter.fillText(`${BAR_KM} km`, barX, barY - 5);

  /* E063-05 — flèche du nord : elle pointe à l'opposé de l'azimut du haut. */
  if (scene.showNorth) {
    const nx = 16;
    const ny = 18;
    const angle = -scene.azimut * RAD;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const len = Math.max(12, cssW * 0.06);
    painter.strokeStyle = bright;
    painter.fillStyle = bright;
    painter.lineWidth = 1.6;
    painter.beginPath();
    painter.moveTo(nx, ny);
    painter.lineTo(nx + dx * len, ny + dy * len);
    painter.stroke();
    const tipX = nx + dx * len;
    const tipY = ny + dy * len;
    const perpX = -dy;
    const perpY = dx;
    painter.beginPath();
    painter.moveTo(tipX, tipY);
    painter.lineTo(tipX - dx * 5 + perpX * 3, tipY - dy * 5 + perpY * 3);
    painter.lineTo(tipX - dx * 5 - perpX * 3, tipY - dy * 5 - perpY * 3);
    painter.closePath();
    painter.fill();
    painter.font = `bold ${Math.max(8, Math.round(cssW * 0.036))}px sans-serif`;
    painter.fillText('N', tipX + dx * 8 - 3, tipY + dy * 8 + 3);
  }

  /* Curseur de lecture : une croix, dont la position est redondée en texte. */
  const cx = scene.cursor.x * sx;
  const cy = scene.cursor.y * sy;
  painter.strokeStyle = gold;
  painter.lineWidth = 1.4;
  painter.beginPath();
  painter.moveTo(cx - 7, cy); painter.lineTo(cx + 7, cy);
  painter.moveTo(cx, cy - 7); painter.lineTo(cx, cy + 7);
  painter.stroke();
  painter.beginPath();
  painter.arc(cx, cy, 3, 0, Math.PI * 2);
  painter.stroke();
}

/* E063-09 — région live unique : toute action est annoncée en toutes lettres. */
function writeReadout(scene, cause) {
  if (!scene || !scene.readout) return;
  const lon = lonAt(scene.cursor.x);
  const lat = latAt(scene.cursor.y);
  const pas = PASSES[scene.pasIndex].pas;
  const precision = precisionOf(pas);
  const near = nearestLandmark(scene.cursor.x, scene.cursor.y);
  const verbs = {
    balayage: 'Balayage en cours',
    clavier: 'Lecture au clavier',
    pointeur: 'Lecture au pointeur',
    pas: 'Pas de grille modifié',
    azimut: 'Orientation modifiée',
    grille: 'Grille de lecture',
    nord: 'Flèche du nord',
    demarrage: 'Balayage lancé',
    arret: 'Balayage arrêté',
  };
  scene.readout.textContent =
    `${verbs[cause] || 'Lecture'} · curseur à longitude ${num(lon, 1)}°, latitude ${num(lat, 1)}° · ` +
    `grille pas ${num(pas, 0)}°, incertitude de lecture ±${num(precision, 0)}° · ` +
    `haut de carte : ${compassOf(scene.azimut)} (azimut ${num(scene.azimut, 0)}°) · ` +
    `échelle ${num(KM_PAR_UNITE_LON, 2)} km/unité en longitude · ` +
    `repère le plus proche : ${near.landmark.nom} (${num(near.distanceUnites, 0)} unités).`;
}

/* E063-04 — sélection du pas : textes, aria-checked, roving tabindex, annonce.
   Choix unique : pas d'aria-pressed ici. */
function applyPas(index, scene, fromAnimation) {
  const sceneRef = scene || latest;
  if (!sceneRef) return;
  selectedPas = Math.max(0, Math.min(PASSES.length - 1, index));
  sceneRef.pasIndex = selectedPas;
  const pas = PASSES[selectedPas].pas;
  const cells = cellsOf(pas);
  sceneRef.radios.forEach((radio, i) => {
    const on = i === selectedPas;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    radio.tabIndex = on ? 0 : -1;
  });
  if (sceneRef.pasText) {
    sceneRef.pasText.textContent =
      `Pas ${num(pas, 0)}° : ${cells.lon} méridiens × ${cells.lat} parallèles, ` +
      `soit ${cells.lon * cells.lat} cases ; incertitude de lecture ±${num(precisionOf(pas), 0)}°.`;
  }
  drawScene(sceneRef.canvas, sceneRef);
  writeReadout(sceneRef, fromAnimation ? 'balayage' : 'pas');
}

/* E063-10 — une seule frame, court-circuitée quand l'onglet est masqué. Le
   balayage suit une courbe déterministe (sin/cos de l'horodatage rAF), sans
   aucun tirage aléatoire : le curseur reste toujours dans le cadre par clampCoord(). */
function loop(timestamp) {
  frame = 0;
  const scene = latest;
  if (!scene || !scene.canvas || !scene.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return; // pause hors écran

  if (scene.playing && !scene.reduced()) {
    if (scene.last === null) scene.last = timestamp;
    scene.elapsed += timestamp - scene.last;
    scene.last = timestamp;
    const phase = (scene.elapsed / SWEEP_MS) * Math.PI * 2;
    const spanX = MAP_W / 2 - 20;
    const spanY = MAP_H / 2 - 20;
    const cx = MAP_W / 2 + spanX * Math.sin(phase);
    const cy = MAP_H / 2 + spanY * Math.sin(phase * 0.8 + 0.6);
    scene.cursor = clampCoord(cx, cy);
    drawScene(scene.canvas, scene);
    writeReadout(scene, 'balayage');
    ensureLoop();
  } else {
    scene.last = null;
    if (scene.playing && scene.reduced()) {
      playing = false;
      scene.playing = false;
      if (scene.play) scene.play.textContent = 'Lancer le balayage';
    }
  }
}

function ensureLoop() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { loop(0); return; }
  frame = requestAnimationFrame(loop);
}

/* E063-10 — installation unique et silencieuse des écouteurs globaux. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (latest && latest.playing && !latest.reduced()) ensureLoop();
      else if (latest) drawScene(latest.canvas, latest);
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      if (latest) latest.last = null;
    }
  });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', () => {
        if (latest && latest.playing && latest.reduced()) {
          playing = false;
          latest.playing = false;
          if (latest.play) latest.play.textContent = 'Lancer le balayage';
        }
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        if (latest) drawScene(latest.canvas, latest);
      });
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

function line(ctx, parent, index, label, text, valueId) {
  const paragraph = ctx.el('p', 'geography-e063-line');
  paragraph.id = `geography-e063-line-${String(index).padStart(2, '0')}`;
  paragraph.appendChild(ctx.el('strong', '', `E063-${String(index).padStart(2, '0')} · ${label}. `));
  const value = ctx.el('span', 'geography-e063-value', text);
  if (valueId) value.id = valueId;
  paragraph.appendChild(value);
  parent.appendChild(paragraph);
  return value;
}

/* Construction de la fiche sémantique complète (texte lisible sans JS). */
function buildSection(ctx, layout) {
  const previous = layout.querySelector(`#${SECTION_ID}`);
  if (previous && previous.parentNode) previous.parentNode.removeChild(previous);

  const panel = layout.querySelector('.geo-panel') || layout;
  const section = ctx.el('section', 'geography-e063-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-label', 'Repères visuels et grille de lecture');
  section.setAttribute('data-sim', 'grille-lecture-reperes-visuels');

  section.appendChild(ctx.el('h2', '', 'Repères visuels et grille de lecture — comment lire une carte'));

  /* E063-01 — amorce textuelle, lisible sans aucune interaction. */
  const intro = ctx.el('p', 'geography-e063-line');
  intro.id = 'geography-e063-intro';
  intro.appendChild(ctx.el('strong', '', 'E063-01 · Principe. '));
  intro.appendChild(document.createTextNode(
    'Une carte se lit grâce à deux couches invisibles mais essentielles : une grille de lecture ' +
    '(les méridiens et les parallèles qui portent les coordonnées) et des repères visuels ' +
    '(des symboles de lieu qui arriment le regard). Le schéma ci-dessous est un canevas ' +
    'schématique en plate carrée : toutes les valeurs sont aussi écrites en texte, ' +
    'la couleur n\'est jamais le seul support d\'information.'
  ));
  section.appendChild(intro);

  /* E063-03 — lecture des coordonnées, formules explicites. */
  line(ctx, section, 3, 'Lire une coordonnée',
    `lon(x) = −180 + x × 360 / ${MAP_W} ; lat(y) = 90 − y × 180 / ${MAP_H}. ` +
    `Le centre du cadre vaut longitude 0°, latitude 0° (croisée du méridien de Greenwich et de l’équateur).`);
  const cursorText = line(ctx, section, 3, 'Curseur de lecture',
    `Position initiale : centre du cadre, longitude 0,0°, latitude 0,0°.`,
    'geography-e063-cursor-text');

  /* E063-04 — pas de grille et précision de lecture. */
  const pasText = line(ctx, section, 4, 'Pas et précision',
    `Pas moyen 20° : ${cellsOf(20).lon} méridiens × ${cellsOf(20).lat} parallèles, ` +
    `soit ${cellsOf(20).lon * cellsOf(20).lat} cases ; incertitude de lecture ±${num(precisionOf(20), 0)}°.`,
    'geography-e063-pas-text');

  /* E063-05 — orientation par flèche du nord. */
  line(ctx, section, 5, 'Orientation',
    `L’azimut du haut indique quelle direction cardinale pointe vers le haut de la carte ; ` +
    `la flèche du nord montre l’opposé. Réglage initial : 0°, haut = Nord, flèche vers le haut.`);

  /* E063-06 — échelle et barre, grandeurs référencées. */
  line(ctx, section, 6, 'Échelle et barre',
    `1 unité = ${num(KM_PAR_UNITE_LON, 2)} km en longitude. ` +
    `Une barre de ${BAR_KM} km mesure ${num(barUnits(BAR_KM), 1)} unités, soit ` +
    `${num((barUnits(BAR_KM) / MAP_W) * 100, 1)} % de la largeur du cadre.`);

  /* E063-06 — mesures chiffrées, dont une comparée à une référence réelle. */
  const measures = ctx.el('ul', 'geography-e063-list');
  measures.id = 'geography-e063-mesures';
  const items = [
    `Référence : la largeur du cadre vaut ${num(WORLD_KM, 0)} km, soit presque le tour de la Terre à ` +
    `l’équateur (${num(EARTH_EQUATOR_KM, 0)} km) — un rapport de ${num(WORLD_KM / EARTH_EQUATOR_KM, 3)}.`,
    `Échelle en longitude : ${num(WORLD_KM, 0)} km / ${MAP_W} unités = ${num(KM_PAR_UNITE_LON, 2)} km par unité.`,
    `Échelle en latitude : ${num(HALF_WORLD_KM, 0)} km / ${MAP_H} unités = ${num(KM_PAR_UNITE_LAT, 2)} km par unité.`,
    `Distorsion : rapport de ${num(DISTORSION, 3)} entre les deux échelles ; ` +
    `le pas fin (10°) réduit l’incertitude d’un facteur ${num(PASSES[0].pas / PASSES[2].pas, 0)} ` +
    `par rapport au pas grossier (30°).`,
    `Barre de ${BAR_KM} km : ${num(barUnits(BAR_KM), 1)} unités en longitude.`,
  ];
  items.forEach((text, i) => {
    const item = ctx.el('li', '', text);
    item.id = `geography-e063-mesure-${i}`;
    measures.appendChild(item);
  });
  section.appendChild(measures);

  /* E063-04 — radiogroupe de trois pas de grille (choix unique). */
  const group = ctx.el('div', 'geography-e063-group');
  group.id = 'geography-e063-group';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Choisir le pas de la grille de lecture');
  PASSES.forEach((preset, i) => {
    const radio = ctx.el('button', 'geography-e063-pas',
      `${preset.nom} — ${num(preset.pas, 0)}° (±${num(precisionOf(preset.pas), 0)}°)`);
    radio.type = 'button';
    radio.id = `geography-e063-radio-${i}`;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', i === selectedPas ? 'true' : 'false');
    radio.tabIndex = i === selectedPas ? 0 : -1;
    group.appendChild(radio);
  });
  section.appendChild(group);

  /* E063-05 — réglage de l'azimut du haut (curseur déterministe). */
  const azimutRow = ctx.el('div', 'geography-e063-azimut');
  const azimutLabel = ctx.el('label', '', 'Azimut du haut de la carte');
  azimutLabel.id = 'geography-e063-azimut-label';
  azimutLabel.htmlFor = 'geography-e063-azimut-input';
  const slider = ctx.el('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '180';
  slider.step = '15';
  slider.value = String(azimut);
  slider.id = 'geography-e063-azimut-input';
  slider.setAttribute('aria-describedby', 'geography-e063-azimut-output');
  const azimutOutput = ctx.el('span', 'geography-e063-azimut-output',
    `${num(azimut, 0)}° — haut ${compassOf(azimut)}`);
  azimutOutput.id = 'geography-e063-azimut-output';
  azimutRow.append(azimutLabel, slider, azimutOutput);
  section.appendChild(azimutRow);

  /* E063-09 — région live unique. */
  const readout = ctx.el('p', 'geography-e063-readout', '');
  readout.id = 'geography-e063-readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);

  /* E063-03 / E063-07 — laboratoire canvas, redondant avec le texte. */
  const figure = ctx.el('figure', 'geography-e063-figure');
  figure.id = 'geography-e063-figure';
  const canvas = ctx.el('canvas', 'geography-e063-canvas');
  canvas.id = 'geography-e063-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Canevas schématique de lecture : une grille de méridiens et de parallèles, des symboles de repères ' +
    'par forme, une flèche du nord et une barre d’échelle, avec un curseur de lecture. ' +
    'Flèches pour déplacer le curseur, Plus et Moins pour changer le pas, G pour la grille, N pour le nord, zéro pour le centre.');
  canvas.setAttribute('aria-describedby', 'geography-e063-clavier');
  const caption = ctx.el('figcaption', 'geography-e063-caption',
    'Canevas schématique en plate carrée, non à l’échelle du terrain : le trait long est le méridien 0° et l’équateur, ' +
    'la croix est le curseur, la barre porte sa valeur en kilomètres. Coordonnées, échelle et repères sont écrits en texte.');
  caption.id = 'geography-e063-caption';
  figure.append(canvas, caption);
  section.appendChild(figure);

  /* E063-07 — légende en glyphes, jamais la seule couleur. */
  const legend = ctx.el('p', 'geography-e063-line',
    'E063-07 · Repères : ● capitale · ■ ville · ▲ montagne · ◆ sommet · ✛ station · ✦ phare. ' +
    'Chaque genre a une silhouette distincte, reconnaissable même en niveaux de gris : ' +
    'la couleur n’est jamais le seul indice.');
  legend.id = 'geography-e063-legend';
  section.appendChild(legend);

  /* E063-08 — tableau captioné décodant les symboles (texte sémantique). */
  const table = ctx.el('table', 'geography-e063-table');
  table.id = 'geography-e063-table';
  const captionTable = ctx.el('caption', '', 'Symboles de repères visuels et coordonnée lue');
  table.appendChild(captionTable);
  const thead = ctx.el('thead');
  const headRow = ctx.el('tr');
  ['Symbole', 'Genre', 'Nom du repère', 'Longitude ; latitude'].forEach((label) => {
    const th = ctx.el('th', '', label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = ctx.el('tbody');
  const glyphs = { cercle: '●', carre: '■', triangle: '▲', losange: '◆', croix: '✛', etoile: '✦' };
  LANDMARKS.forEach((landmark, i) => {
    const tr = ctx.el('tr');
    const th = ctx.el('th', '', glyphs[landmark.forme] || '◆');
    th.scope = 'row';
    tr.appendChild(th);
    tr.appendChild(ctx.el('td', '', landmark.genre));
    tr.appendChild(ctx.el('td', '', landmark.nom));
    tr.appendChild(ctx.el('td', '',
      `${num(landmark.lon, 0)}° ; ${num(landmark.lat, 0)}°`));
    tr.id = `geography-e063-repere-${i}`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);

  /* E063-09 — bascules indépendantes (aria-pressed légitime) et balayage. */
  const actions = ctx.el('div', 'geography-e063-actions');
  const gridBtn = ctx.el('button', 'geography-e063-toggle',
    showGrid ? 'Grille : affichée' : 'Grille : masquée');
  gridBtn.type = 'button';
  gridBtn.id = 'geography-e063-grid';
  gridBtn.setAttribute('aria-pressed', showGrid ? 'true' : 'false');
  gridBtn.setAttribute('aria-controls', 'geography-e063-canvas');
  actions.appendChild(gridBtn);

  const northBtn = ctx.el('button', 'geography-e063-toggle',
    showNorth ? 'Nord : affiché' : 'Nord : masqué');
  northBtn.type = 'button';
  northBtn.id = 'geography-e063-north';
  northBtn.setAttribute('aria-pressed', showNorth ? 'true' : 'false');
  northBtn.setAttribute('aria-controls', 'geography-e063-canvas');
  actions.appendChild(northBtn);

  const play = ctx.el('button', 'geography-e063-play', playing ? 'Arrêter le balayage' : 'Lancer le balayage');
  play.type = 'button';
  play.id = 'geography-e063-play';
  play.setAttribute('aria-controls', 'geography-e063-readout');
  actions.appendChild(play);
  section.appendChild(actions);

  /* E063-09 — aide clavier. */
  const clavier = ctx.el('p', 'geography-e063-line',
    'E063-09 · Clavier : Tab atteint les trois pas, le curseur d’azimut, le canevas, puis les boutons. ' +
    'Sur le canevas, ← → déplacent le curseur d’une case en longitude, ↑ ↓ d’une case en latitude, ' +
    '+ et − changent le pas, 0 revient au centre, G bascule la grille, N bascule la flèche du nord, ' +
    'Espace lance ou arrête le balayage. Le pointeur fait le même travail que les flèches.');
  clavier.id = 'geography-e063-clavier';
  section.appendChild(clavier);

  /* E063-10 — limite falsifiable en cinq temps, alignée sur l'angle mort. */
  const limite = ctx.el('p', 'geography-e063-line',
    'E063-10 · Limite et vérification : 1) prédire qu’au centre la lecture donne longitude 0°, latitude 0° ; ' +
    `2) régler le pas fin (10°) ; 3) attendre l’incertitude annoncée, ±${num(precisionOf(10), 0)}°, ` +
    `contre ±${num(precisionOf(30), 0)}° au pas grossier ; ` +
    '4) falsifier si l’écart entre deux lectures voisines dépasse la moitié du pas annoncé ; ' +
    `5) débrief : la grille est une plate carrée schématique — l’échelle vaut ${num(KM_PAR_UNITE_LON, 2)} km/unité ` +
    `en longitude mais ${num(KM_PAR_UNITE_LAT, 2)} km/unité en latitude (rapport ${num(DISTORSION, 3)}), ` +
    'donc aucune barre unique n’est juste partout et les distances près des pôles sont déformées.'
  );
  limite.id = 'geography-e063-limite';
  section.appendChild(limite);

  panel.appendChild(section);

  const radios = Array.from(group.querySelectorAll('.geography-e063-pas'));
  return {
    section, radios, readout, canvas, play, gridBtn, northBtn, slider, azimutOutput,
    cursorText, pasText,
    cursor: clampCoord(MAP_W / 2, MAP_H / 2),
    pasIndex: selectedPas,
    azimut,
    showGrid,
    showNorth,
  };
}

register('E063', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);

  const layout = ctx.layout;
  renders += 1;
  layout.setAttribute('data-geography-e063', 'on');

  const scene = buildSection(ctx, layout);
  layout.setAttribute('data-geography-e063-render', String(renders));
  layout.setAttribute('data-geography-e063-pas', String(PASSES[selectedPas].pas));
  layout.setAttribute('data-geography-e063-azimut', String(azimut));

  scene.reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : () => false;
  scene.playing = playing;
  scene.elapsed = 0;
  scene.last = null;

  /* E063-03 / E063-09 — clavier : curseur, pas, grille, nord, balayage. */
  const onKey = (event) => {
    const target = event.target;
    const isRadio = target && target.classList && target.classList.contains('geography-e063-pas');
    const isCanvas = target === scene.canvas;
    if (!isRadio && !isCanvas) return;
    const stepLon = (PASSES[scene.pasIndex].pas / 360) * MAP_W;
    const stepLat = (PASSES[scene.pasIndex].pas / 180) * MAP_H;
    const c = scene.cursor;
    if (event.key === 'ArrowRight') scene.cursor = clampCoord(c.x + stepLon, c.y);
    else if (event.key === 'ArrowLeft') scene.cursor = clampCoord(c.x - stepLon, c.y);
    else if (event.key === 'ArrowDown') scene.cursor = clampCoord(c.x, c.y + stepLat);
    else if (event.key === 'ArrowUp') scene.cursor = clampCoord(c.x, c.y - stepLat);
    else if (event.key === '+' || event.key === '=') {
      applyPas(scene.pasIndex + 1, scene, false);
      return;
    } else if (event.key === '-' || event.key === '_') {
      applyPas(scene.pasIndex - 1, scene, false);
      return;
    } else if (event.key === '0') {
      scene.cursor = clampCoord(MAP_W / 2, MAP_H / 2);
    } else if (event.key === 'g' || event.key === 'G') {
      toggleGrid(scene);
      return;
    } else if (event.key === 'n' || event.key === 'N') {
      toggleNorth(scene);
      return;
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      togglePlay(scene);
      return;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    drawScene(scene.canvas, scene);
    refreshCursorText(scene);
    writeReadout(scene, 'clavier');
  };
  scene.section.addEventListener('keydown', (event) => {
    /* Sur un radio, ← → changent de pas (convention radiogroupe). */
    const isRadio = event.target && event.target.classList
      && event.target.classList.contains('geography-e063-pas');
    if (isRadio && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      const dir = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
      applyPas((selectedPas + dir + PASSES.length) % PASSES.length, scene, false);
      scene.radios[selectedPas].focus();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKey(event);
  });

  scene.radios.forEach((radio, i) => {
    radio.addEventListener('click', () => applyPas(i, scene, false));
  });

  /* E063-05 — azimut du haut, lu sur le curseur et recalculé en toutes lettres. */
  scene.slider.addEventListener('input', () => {
    const value = Number(scene.slider.value);
    azimut = Number.isFinite(value) ? Math.max(0, Math.min(180, value)) : 0;
    scene.azimut = azimut;
    scene.azimutOutput.textContent = `${num(azimut, 0)}° — haut ${compassOf(azimut)}`;
    layout.setAttribute('data-geography-e063-azimut', String(azimut));
    drawScene(scene.canvas, scene);
    writeReadout(scene, 'azimut');
  });

  /* E063-09 — glisser sur le canevas : même relation que les flèches. */
  let drag = null;
  scene.canvas.addEventListener('pointerdown', (event) => {
    drag = true;
    try { scene.canvas.setPointerCapture(event.pointerId); } catch { /* capture indisponible */ }
    movePointer(event);
  });
  const movePointer = (event) => {
    if (!drag) return;
    const rect = scene.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * MAP_W;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_H;
    scene.cursor = clampCoord(x, y);
    drawScene(scene.canvas, scene);
    refreshCursorText(scene);
    writeReadout(scene, 'pointeur');
  };
  scene.canvas.addEventListener('pointermove', movePointer);
  const endDrag = () => { drag = false; };
  scene.canvas.addEventListener('pointerup', endDrag);
  scene.canvas.addEventListener('pointercancel', endDrag);

  function refreshCursorText(target) {
    if (!target.cursorText) return;
    const lon = lonAt(target.cursor.x);
    const lat = latAt(target.cursor.y);
    target.cursorText.textContent =
      `Curseur : longitude ${num(lon, 1)}°, latitude ${num(lat, 1)}° ` +
      `(recalculé depuis la position dans le cadre ${MAP_W} × ${MAP_H}).`;
  }

  function toggleGrid(target) {
    showGrid = !showGrid;
    target.showGrid = showGrid;
    target.gridBtn.setAttribute('aria-pressed', showGrid ? 'true' : 'false');
    target.gridBtn.textContent = showGrid ? 'Grille : affichée' : 'Grille : masquée';
    drawScene(target.canvas, target);
    writeReadout(target, 'grille');
  }

  function toggleNorth(target) {
    showNorth = !showNorth;
    target.showNorth = showNorth;
    target.northBtn.setAttribute('aria-pressed', showNorth ? 'true' : 'false');
    target.northBtn.textContent = showNorth ? 'Nord : affiché' : 'Nord : masqué';
    drawScene(target.canvas, target);
    writeReadout(target, 'nord');
  }

  function togglePlay(target) {
    if (target.reduced()) {
      target.cursor = clampCoord(
        target.cursor.x < MAP_W / 2 ? MAP_W * 0.75 : MAP_W * 0.25,
        target.cursor.y
      );
      drawScene(target.canvas, target);
      refreshCursorText(target);
      writeReadout(target, 'clavier');
      return;
    }
    playing = !playing;
    target.playing = playing;
    target.play.textContent = playing ? 'Arrêter le balayage' : 'Lancer le balayage';
    if (playing) {
      target.last = null;
      target.elapsed = 0;
      ensureLoop();
      writeReadout(target, 'demarrage');
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      target.last = null;
      writeReadout(target, 'arret');
    }
  }

  scene.gridBtn.addEventListener('click', () => toggleGrid(scene));
  scene.northBtn.addEventListener('click', () => toggleNorth(scene));
  scene.play.addEventListener('click', () => togglePlay(scene));

  latest = scene;
  install();
  applyPas(selectedPas, scene, true);
  drawScene(scene.canvas, scene);
  writeReadout(scene, 'balayage');
});
